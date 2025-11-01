# Study Trail

学迹（Study Trail）是一个用于家庭打卡与积分管理的全栈应用，后端使用 Node.js +
Express，前端为存放在 `public/` 中的静态页面，由同一个服务器托管。

## 先决条件
- Node.js 18 或更高版本（开发期间推荐使用 Node.js 20）
- npm 9+
- 可访问的 MySQL 实例（默认配置见 `src/config.js`）

如需自定义环境变量，在仓库根目录创建 `.env.local` 并覆盖下列值：

```bash
PORT=3000
SESSION_SECRET=choose-a-strong-secret
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=study-trail
UPLOADS_DIR=uploads
```

安装依赖仅需一次：

```bash
npm install
```

初始化数据库结构与种子数据（可选）：

```bash
npm run db:init
```

## 后端服务（API 与静态资源托管）
- 启动开发模式：`npm run dev`
  - 该命令会在收到修改时自动重载 `src/server.js`
  - 服务默认在 `http://localhost:3000` 监听，健康检查在
    `http://localhost:3000/api/health`
- 启动生产模式（无自动重载）：`npm start`
- 后台运行（Windows PowerShell）：`Start-Process node.exe src/server.js -WindowStyle Hidden`
- 停止服务：聚焦运行命令的终端并按 `Ctrl+C`
- 假如通过 PowerShell 后台模式启动，使用
  `Stop-Process -Name node` 或在任务管理器中结束该 Node 进程

## 前端界面（静态站点）
- 前端文件位于 `public/`，由上述后端服务直接托管
- 启动前端只需确保后端正在运行，然后访问
  `http://localhost:3000`、`/admin.html` 或 `/student.html`
- 若想在不启动后端的情况下预览静态页面，可临时启动本地静态服务器，例如：
  `npx serve public` 或 `python -m http.server 8000 --directory public`
- 停止前端：关闭浏览器标签页即可；若启用了静态服务器，按下
  `Ctrl+C` 结束该额外的本地服务

## 常见问题
- **端口占用**：修改 `.env.local` 中的 `PORT` 并重新启动服务
- **上传目录缺失**：服务器会在启动时自动创建 `UPLOADS_DIR`。若手动运行，请确认
  对应路径存在或具有写权限。
- **数据库连接失败**：核对 `.env.local` 的 MySQL 配置，与数据库服务确认账号或权限。
