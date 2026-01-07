#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ssh_service;
mod types;

use crate::ssh_service::SshService;
use crate::types::*;
use axum::routing::get;
use socketioxide::{
    extract::{AckSender, Data, SocketRef},
    SocketIo,
};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 设置默认日志级别为 info
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info");
    }

    let subscriber = FmtSubscriber::builder()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting Rust Backend...");

    // 监听 stdin，如果父进程关闭了 stdin (父进程退出)，则我们也退出
    // 这是一种防止僵尸进程的常用方法
    tokio::spawn(async move {
        use tokio::io::AsyncReadExt;
        let mut stdin = tokio::io::stdin();
        let mut buf = [0u8; 1];
        loop {
            match stdin.read(&mut buf).await {
                Ok(0) => {
                    info!("Stdin closed, parent process might have exited. Exiting...");
                    std::process::exit(0);
                }
                Err(_) => {
                    info!("Stdin error, exiting...");
                    std::process::exit(0);
                }
                _ => {
                    // 继续等待
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                }
            }
        }
    });

    let ssh_service = Arc::new(SshService::new());
    let ssh_service_handler = ssh_service.clone();

    let (layer, io) = SocketIo::builder().build_layer();

    io.ns("/", move |socket: SocketRef| async move {
        info!("Socket connected: {} from {:?}", socket.id, socket.req_parts().uri);

        let ssh_service_disconnect = ssh_service_handler.clone();
        socket.on_disconnect(move |socket: SocketRef| async move {
            info!("Socket disconnected: {}", socket.id);
            ssh_service_disconnect.disconnect_all(&socket.id.to_string());
        });

        let ssh_service_connect = ssh_service_handler.clone();
        socket.on("ssh-connect", move |socket: SocketRef, Data::<SshConnectionConfig>(config)| async move {
            info!("Client {} requesting connection to {} (Server: {})", socket.id, config.ip, config.server_id);
            ssh_service_connect.connect(socket, config);
        });

        let ssh_service_cmd = ssh_service_handler.clone();
        socket.on("ssh-command", move |socket: SocketRef, Data::<SshCommandPayload>(payload)| async move {
            let cmd = if payload.command.ends_with('\n') {
                payload.command
            } else {
                format!("{}\n", payload.command)
            };
            ssh_service_cmd.write(&socket.id.to_string(), &payload.server_id, &cmd);
        });

        let ssh_service_input = ssh_service_handler.clone();
        socket.on("ssh-input", move |socket: SocketRef, Data::<SshInputPayload>(payload)| async move {
            ssh_service_input.write(&socket.id.to_string(), &payload.server_id, &payload.data);
        });

        let ssh_service_resize = ssh_service_handler.clone();
        socket.on("ssh-resize", move |socket: SocketRef, Data::<SshResizePayload>(payload)| async move {
            ssh_service_resize.resize(&socket.id.to_string(), &payload.server_id, payload.cols, payload.rows);
        });

        let ssh_service_disconnect_evt = ssh_service_handler.clone();
        socket.on("ssh-disconnect", move |socket: SocketRef, Data::<SshDisconnectPayload>(payload)| async move {
            info!("Client {} requesting disconnect from server {}", socket.id, payload.server_id);
            ssh_service_disconnect_evt.disconnect(&socket.id.to_string(), &payload.server_id);
        });

        let ssh_service_exec = ssh_service_handler.clone();
        socket.on("ssh-exec", move |socket: SocketRef, Data::<SshCommandPayload>(payload), ack: AckSender| async move {
            info!("Exec command: {} on server {}", payload.command, payload.server_id);
            match ssh_service_exec.exec(&socket.id.to_string(), &payload.server_id, payload.command).await {
                Ok(output) => {
                    let _ = ack.send(&serde_json::json!({ "status": "ok", "output": output }));
                },
                Err(e) => {
                    let _ = ack.send(&serde_json::json!({ "status": "error", "message": e }));
                },
            }
        });
    });

    let app = axum::Router::new()
        .route("/", get(|| async { "AI SSH Rust Backend is running!" }))
        .layer(layer)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001").await?;
    info!("Rust Backend started on port 3001 (127.0.0.1)");
    axum::serve(listener, app).await?;

    Ok(())
}
