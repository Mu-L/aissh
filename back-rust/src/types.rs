use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SshConnectionConfig {
    pub ip: String,
    pub port: Option<u16>,
    pub username: String,
    pub password: Option<String>,
    #[serde(rename = "privateKey")]
    pub private_key: Option<String>,
    #[serde(rename = "serverId")]
    pub server_id: String,
}

#[derive(Debug, Serialize)]
pub struct SshStatusPayload {
    #[serde(rename = "serverId")]
    pub server_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SshDataPayload {
    #[serde(rename = "serverId")]
    pub server_id: String,
    pub data: String,
}

#[derive(Debug, Serialize)]
pub struct SshErrorPayload {
    #[serde(rename = "serverId")]
    pub server_id: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct SshCommandPayload {
    #[serde(rename = "serverId")]
    pub server_id: String,
    pub command: String,
}

#[derive(Debug, Deserialize)]
pub struct SshInputPayload {
    #[serde(rename = "serverId")]
    pub server_id: String,
    pub data: String,
}

#[derive(Debug, Deserialize)]
pub struct SshResizePayload {
    #[serde(rename = "serverId")]
    pub server_id: String,
    pub cols: u32,
    pub rows: u32,
}

#[derive(Debug, Deserialize)]
pub struct SshDisconnectPayload {
    #[serde(rename = "serverId")]
    pub server_id: String,
}
