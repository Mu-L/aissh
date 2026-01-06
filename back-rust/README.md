# AI SSH Rust Backend

基于 Rust 重写的高性能 SSH 中转后端，旨在替代原有的 NestJS 版本。

## 🚀 优势
- **极小体积**：编译后的二进制文件约 10-20MB，远小于 Node.js 运行时。
- **高性能**：利用 Rust 的异步 IO 和零拷贝特性，提升 SSH 数据转发效率。
- **内存安全**：杜绝内存泄漏和运行时崩溃。

## 🛠 技术栈
- **Axum**: Web 框架
- **Socketioxide**: Socket.io 服务端实现
- **Ssh2-rs**: SSH 协议库
- **Tokio**: 异步运行时

## 📦 启动方式
1. 确保已安装 Rust 环境。
2. 进入目录：`cd back-rust`
3. 启动开发模式：`cargo run`
4. 默认监听端口：`3001`

## 🔌 兼容性
完全兼容原有的前端 Socket.io 事件：
- `ssh-connect`: 建立连接
- `ssh-command`: 发送命令
- `ssh-input`: 终端输入
- `ssh-resize`: 调整窗口
- `ssh-exec`: AI 命令执行（支持 Ack 回调）
- `ssh-disconnect`: 断开连接
