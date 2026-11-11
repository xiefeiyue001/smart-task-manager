# 智能任务管理系统（Node.js + Supabase）

一个可直接运行的全栈任务管理器：Node.js/Express 提供 REST 接口，Supabase（PostgreSQL）持久化数据，前端为纯 HTML/CSS/JS 单页界面。

## 功能

- 输入框 + 优先级下拉（高 / 中 / 低）添加任务
- 任务列表展示标题、优先级标签、完成状态与创建时间
- 每条任务支持「完成 / 未完成」切换（已完成标题加删除线）与「删除」
- 按优先级筛选：全部 / 高 / 中 / 低
- 任务按创建时间倒序排列
- 智能优先级推荐：输入标题时按关键词（紧急、截止、明天、有空、以后…）自动推荐优先级，并说明理由
- 顶部统计：全部 / 待完成 / 已完成数量
- 中文界面、响应式布局，手机端可用

## 项目结构

```
task-manager-node/
├── server.js            # Express 入口：REST 接口 + 静态资源
├── package.json         # 依赖与启动脚本
├── .env                 # 本地环境变量（含真实凭据，已在 .gitignore 中）
├── .env.example         # 环境变量模板
├── .gitignore
├── schema.sql           # Supabase 建表 + RLS 策略脚本
├── vercel.json          # Vercel 部署配置
├── README.md
├── lib/
│   ├── supabase.js      # Supabase 客户端初始化
│   ├── store.js         # 数据访问层（Supabase / 内存兜底）
│   └── smart.js         # 智能优先级推荐规则
└── public/
    ├── index.html       # 页面结构
    ├── styles.css       # 样式
    └── app.js           # 前端逻辑
```

## 1. 准备 Supabase

1. 登录 https://supabase.com ，新建项目（Region 选 Southeast Asia (Singapore) 速度较快）。
2. 打开 SQL Editor，把 `schema.sql` 全文粘贴进去执行，看到 `Success. No rows returned` 即成功。
3. 到 Project Settings → API Keys 复制两样东西：
   - **Project URL**：`https://xxxx.supabase.co`
   - **Publishable key**：`sb_publishable_...`（公开密钥）；legacy 的 anon key（eyJ 开头）也可以

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入自己的值：

```bash
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_ANON_KEY=sb_publishable_你的公开密钥
PORT=3000
```

不填也能启动，此时自动降级为内存存储（数据不持久化，仅用于本地看界面）。

## 3. 运行

```bash
npm install
npm start          # 或 npm run dev（文件改动自动重启）
```

浏览器打开 http://localhost:3000

## 4. 接口说明

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查，返回当前存储模式（supabase / memory） |
| GET | `/api/tasks?priority=全部\|高\|中\|低` | 任务列表，按创建时间倒序 |
| POST | `/api/tasks` | 新增任务，body：`{ "title": "...", "priority": "高" }` |
| PATCH | `/api/tasks/:id` | 切换完成状态，body：`{ "completed": true }` |
| DELETE | `/api/tasks/:id` | 删除任务 |
| GET | `/api/suggest?title=...` | 智能优先级建议，返回 `{ priority, reason }` |

## 5. 数据表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint identity | 主键，自增 |
| title | text not null | 任务标题 |
| priority | text check 高/中/低 | 优先级，默认「中」 |
| completed | boolean default false | 是否完成 |
| created_at | timestamptz default now() | 创建时间，用于倒序 |

`schema.sql` 同时开启了 RLS 并建立 4 条匿名读写策略（教学演示用）。正式项目应改为「登录用户只能操作自己的数据」。

## 6. 部署到 Vercel

1. Vercel 新建项目，导入本仓库，Framework 选 **Other**。
2. 在 Environment Variables 里加：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. 点 Deploy。`vercel.json` 已配置把请求交给 `server.js`（`@vercel/node`），并把 `public/` 打包进函数。

## 7. 安全说明

- 前端只调用本站 `/api`，Supabase 密钥只存在于服务端环境变量，不会出现在浏览器源码里。
- 仅使用 `sb_publishable_` / `anon` 这类公开密钥；`sb_secret_` / `service_role` 具有绕过 RLS 的权限，绝不能放进客户端代码或公开仓库。
