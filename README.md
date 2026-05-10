# CloudPackage

轻量级企业文件管理系统 — 基于 Cloudflare Workers 的无服务器架构，支持 Markdown 编辑、多用户协作、WebDAV、30+ 格式预览和多存储后端。

## 特性

- **文件管理** — 树状目录、拖拽上传、分块断点续传、批量操作（移动/复制/删除/重命名）
- **Markdown 编辑器** — 基于 Vditor，支持数学公式、流程图、思维导图，实时预览
- **全文搜索** — D1 FTS5 引擎，支持文件名与内容搜索、搜索建议
- **多用户协作** — Durable Objects + WebSocket，OT 操作转换，实时光标同步
- **30+ 文件预览** — 图片、视频、音频、PDF、代码、Office、电子书、压缩包
- **分享链接** — 支持密码保护、访问次数限制、过期时间
- **WebDAV 协议** — 支持 PROPFIND/GET/PUT/DELETE/MKCOL/MOVE/COPY，可作为网络驱动器挂载
- **多存储后端** — S3 兼容（R2/B2/MinIO/OSS/COS）、WebDAV 远程、本地文件系统
- **国际化** — 中文 / English 双语言
- **暗色模式** — 主题系统 + CSS 变量自定义

## 技术栈

| 层 | 技术 |
|---|------|
| **后端运行时** | Cloudflare Workers (Hono 框架) |
| **数据库** | Cloudflare D1 (SQLite + FTS5 全文搜索) |
| **对象存储** | Cloudflare R2 (S3 兼容) |
| **实时协作** | Cloudflare Durable Objects + WebSocket |
| **认证** | JWT (jose) + API Key (SHA-256) |
| **校验** | Zod (前后端共享) |
| **前端** | Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router + Vue-i18n |
| **编辑器** | Vditor (Markdown) |
| **图表** | Chart.js + Vue-chartjs |
| **包管理** | pnpm workspaces (monorepo) |
| **CI/CD** | GitHub Actions → Cloudflare Workers + Pages |

## 项目结构

```
cloudpackage/
├── packages/
│   ├── shared/                  # 共享类型、Zod 校验、错误类、常量
│   │   └── src/
│   │       ├── types/           # D1 表类型 + API DTO + 配置类型
│   │       ├── validation/      # 15+ Zod schema
│   │       └── utils/           # AppError 层次、常量
│   │
│   ├── worker/                  # Cloudflare Worker 后端
│   │   └── src/
│   │       ├── db/              # D1 迁移 + 种子数据
│   │       ├── do/              # Durable Objects (协作房间、上传会话)
│   │       ├── drivers/storage/ # 存储驱动 (S3/WebDAV/Local)
│   │       ├── middleware/      # CORS、Auth、错误处理、速率限制、日志
│   │       ├── routes/          # 12 个路由模块
│   │       └── services/        # 11 个业务服务
│   │
│   └── frontend/                # Vue 3 SPA
│       └── src/
│           ├── components/      # 52 个组件 (13 类)
│           ├── composables/     # 7 个组合式函数
│           ├── i18n/            # 中英文语言包
│           ├── router/          # 路由 + 导航守卫
│           ├── stores/          # Pinia 状态管理
│           └── views/           # 16 个页面视图
│
├── .github/workflows/           # GitHub Actions CI/CD
├── Dockerfile                   # 多阶段 Docker 构建
├── docker-compose.yml           # Docker Compose (含 MinIO)
└── LICENSE                      # MIT
```

## 快速开始

### 前置条件

- Node.js ≥ 18
- pnpm ≥ 8（`npm install -g pnpm`）
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)（`pnpm add -g wrangler`）

### 安装

```bash
git clone https://github.com/chunkburst/cloudpackage.git
cd cloudpackage
pnpm install
```

### 开发

```bash
# 启动后端（本地 Worker + D1 + R2 模拟）
cd packages/worker
wrangler d1 execute cloudpackage-db --local --file=src/db/migrations/0001_initial.sql
wrangler dev

# 启动前端（Vite dev server，代理到 Worker）
cd packages/frontend
pnpm dev
```

前端运行在 http://localhost:5173，API 请求自动代理到 wrangler dev (localhost:8787)。

### 类型检查

```bash
pnpm --filter @cloudpackage/worker exec tsc --noEmit
pnpm --filter @cloudpackage/frontend exec vue-tsc --noEmit
```

### 生产构建

```bash
# 前端
pnpm --filter @cloudpackage/frontend build    # 输出到 dist/

# Worker（dry-run 验证）
pnpm --filter @cloudpackage/worker build
```

## 部署

### Cloudflare（推荐）

1. 登录 Cloudflare：`wrangler login`
2. 创建云资源：

```bash
wrangler d1 create cloudpackage-db
wrangler d1 execute cloudpackage-db --remote --file=src/db/migrations/0001_initial.sql
wrangler r2 bucket create cloudpackage-files
```

3. 设置机密：

```bash
wrangler secret put JWT_SECRET
wrangler secret put API_KEY_ENCRYPTION_KEY
```

4. 部署：

```bash
wrangler deploy                           # Worker API
wrangler pages deploy packages/frontend/dist --project-name=cloudpackage   # 前端
```

### GitHub Actions 自动部署

Push 到 `main` 分支自动触发部署。需在仓库设置中添加 Secrets：

| Secret | 说明 |
|--------|------|
| `CF_API_TOKEN` | Cloudflare API Token（Workers + D1 + R2 + Pages 权限） |
| `CF_ACCOUNT_ID` | Cloudflare Account ID |

### Docker

```bash
docker compose up -d           # 仅应用
docker compose --profile full up -d   # 含 MinIO S3 存储
```

## API 概览

| 路由 | 认证 | 说明 |
|------|------|------|
| `POST /api/auth/register` | - | 用户注册 |
| `POST /api/auth/login` | - | 用户登录 |
| `POST /api/auth/refresh` | JWT | 刷新 Token |
| `GET /api/files` | JWT | 文件列表 |
| `POST /api/files` | JWT | 创建文件/文件夹 |
| `GET /api/files/:id/download` | JWT | 文件下载 |
| `POST /api/files/:id/upload/init` | JWT | 初始化上传 |
| `DELETE /api/files/:id` | JWT | 删除文件 |
| `POST /api/share` | JWT | 创建分享链接 |
| `GET /api/share/:token` | - | 访问分享 |
| `GET /api/search?q=` | JWT | 全文搜索 |
| `GET /api/themes` | - | 主题列表 |
| `ALL /webdav/*` | WebDAV Token | WebDAV 协议 |
| `GET /api/admin/stats` | Admin | 系统统计 |
| `GET /api/admin/users` | Admin | 用户管理 |

## 许可证

MIT © [chunkburst](https://github.com/chunkburst)
