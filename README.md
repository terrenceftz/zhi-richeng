# 智日程 (ZhiRicheng)

AI 驱动的私人智能日程管理应用，面向高校辅导员的琐碎日程管理场景。

## 功能

### 核心能力

| 功能 | 说明 |
|------|------|
| **NLP 任务创建** | 输入 "明天下午3点在B座会议室开会" → AI 自动解析时间、地点、类型 |
| **文档批量提取** | 粘贴学校通知全文 → 自动提取所有截止节点和材料要求 |
| **邮件字段识别** | 识别通知中的收件邮箱、邮件主题、附件清单 |
| **子任务拆分** | 一键将复杂任务拆解为可执行的子步骤 |
| **自然语言查询** | "这周有哪些高优任务？" → AI 回答 |
| **冲突检测** | 创建任务时自动检测时间重叠并提示 |

### 任务管理

| 功能 | 说明 |
|------|------|
| 日/周/月视图 | 日历三视图切换，颜色标识优先级 |
| 状态流转 | 待办 → 进行中 → 完成，点击圆圈切换 |
| 拖拽排序 | 按优先级排列，支持后端持久化 |
| 分类标签 | 资料收集 / 审核 / 会议 / 通用 |
| 地点标记 | 记录会议室、教室等位置信息 |
| 提醒开关 | 每个任务可独立控制是否推送提醒 |

### 灵感记录

| 渠道 | 方式 |
|------|------|
| Web 页面 | 侧边栏 → 灵感 → 输入即存 |
| 飞书机器人 | 发 `灵感 可以做学生成绩预警看板` → 自动存入 |

### 飞书集成

| 能力 | 说明 |
|------|------|
| **消息添加任务** | @机器人发送自然语言，自动解析并创建 |
| **灵感记录** | 以 `灵感` 开头发送，自动存入灵感列表 |
| **原生提醒** | 创建飞书任务，到时间弹出原生通知 |
| **文字提醒** | 提前 15 分钟发送文字消息提醒（时间可调） |
| **每日简报** | 早 8 点自动推送当日任务摘要 |
| **WebSocket 长连接** | 无需公网 IP，本地即可开发调试 |

### UI

| 特性 | 说明 |
|------|------|
| 暗黑/亮色模式 | CSS 变量驱动，一键切换 |
| 响应式布局 | 桌面双栏 / 平板单栏 / 手机底部导航 |
| 动画过渡 | Framer Motion，任务增删有动画效果 |
| 高优标记 | 高优先级任务红色边框 + 外发光 + 标题加粗 |

---

## 技术栈

| 层 | 选型 |
|----|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| UI 样式 | TailwindCSS 3 |
| 动效 | Framer Motion |
| 状态管理 | Zustand |
| 后端框架 | Express + TypeScript |
| ORM | Prisma |
| 数据库 | SQLite（可切换 PostgreSQL） |
| 认证 | JWT (access + refresh token) |
| LLM | DeepSeek API (OpenAI SDK 兼容) |
| 飞书 SDK | @larksuiteoapi/node-sdk |

---

## 快速开始

### 环境要求

- Node.js >= 20
- 飞书开发者账号（可选，用于飞书功能）

### 1. 克隆项目

```bash
git clone https://github.com/terrenceftz/zhi-richeng.git
cd zhi-richeng
```

### 2. 安装依赖

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 3. 配置环境

编辑 `server/.env`：

```env
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="你的访问密钥"
JWT_REFRESH_SECRET="你的刷新密钥"
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxx"
PORT=3001
CLIENT_URL="http://localhost:5173"
FEISHU_APP_ID=""      # 飞书应用 ID（可选）
FEISHU_APP_SECRET=""  # 飞书应用密钥（可选）
```

### 4. 初始化数据库

```bash
cd server
npx prisma db push
npx prisma db seed
```

### 5. 启动

```bash
# 项目根目录
npm run dev
```

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 | http://localhost:3001 |

### Demo 账号

- 邮箱：`demo@zhi.com`
- 密码：`123456`

---

## 项目结构

```
zhi-richeng/
├── client/                        # Vite + React 18 前端
│   └── src/
│       ├── api/                   # Axios 实例 + API 请求
│       ├── components/
│       │   ├── calendar/          # 日历组件（日/周/月/迷你）
│       │   ├── layout/            # 布局组件（侧边栏/认证布局）
│       │   ├── tasks/             # 任务组件（卡片/列表/表单）
│       │   ├── ui/                # 基础 UI（按钮/输入框/弹窗）
│       │   ├── AIChatBar.tsx      # AI 查询栏
│       │   └── SmartInput.tsx     # NLP 智能输入
│       ├── pages/                 # 页面组件
│       ├── stores/                # Zustand 状态管理
│       ├── types/                 # TypeScript 类型定义
│       ├── App.tsx                # 路由配置
│       └── index.css              # TailwindCSS + 主题变量
├── server/                        # Express + Prisma 后端
│   ├── prisma/
│   │   ├── schema.prisma          # 数据模型
│   │   └── seed.ts                # 种子数据
│   └── src/
│       ├── controllers/           # 请求处理
│       ├── middleware/             # 认证 + 错误处理
│       ├── routes/                # API 路由
│       ├── services/              # 业务逻辑
│       │   ├── llm.service.ts     # DeepSeek LLM 调用
│       │   ├── feishu.service.ts  # 飞书 WebSocket + API
│       │   ├── reminder.service.ts # 提醒调度
│       │   ├── digest.service.ts  # 每日摘要
│       │   ├── tasks.service.ts   # 任务 CRUD
│       │   └── auth.service.ts    # 认证逻辑
│       ├── utils/                 # JWT + 密码工具
│       └── db.ts                  # Prisma 单例
└── docs/                          # 设计文档
```

---

## API 文档

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 `{ email, password, name }` |
| POST | /api/auth/login | 登录 `{ email, password }` → tokens |
| POST | /api/auth/refresh | 刷新 access token |
| POST | /api/auth/logout | 注销 |

### 任务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tasks | 列表 `?date=&status=&priority=&category=` |
| POST | /api/tasks | 创建 |
| GET | /api/tasks/:id | 详情 |
| PUT | /api/tasks/:id | 更新 |
| DELETE | /api/tasks/:id | 删除 |
| PATCH | /api/tasks/:id/status | 切换状态 |
| POST | /api/tasks/nlp | NLP 解析单条 |
| POST | /api/tasks/nlp/extract | 文档批量提取 |
| POST | /api/tasks/nlp/confirm | 确认 NLP 结果入库 |
| POST | /api/tasks/:id/decompose | AI 拆解子任务 |
| POST | /api/tasks/query | 自然语言查询 |
| POST | /api/tasks/:id/conflict | 冲突检测 |
| PATCH | /api/tasks/reorder | 拖拽排序 |

### 灵感

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/ideas | 列表 |
| POST | /api/ideas | 创建 `{ content, source? }` |
| DELETE | /api/ideas/:id | 删除 |

### 设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/settings | 获取配置 |
| PUT | /api/settings | 更新配置 |
| POST | /api/settings/regenerate-im-token | 重新生成 IM token |

### 用户可以

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/users/me | 个人信息 |
| PUT | /api/users/me | 更新信息 `{ name?, password? }` |

---

## 飞书集成配置

### 获取凭证

1. 访问 [飞书开放平台](https://open.feishu.cn)
2. 创建企业自建应用
3. 添加「机器人」能力
4. 权限管理 → 开通：`im:message`、`im:message:send_as_bot`、`im:message.p2p_msg`、`task:task`
5. 事件与回调 → 订阅方式选「使用长连接接收事件」→ 添加 `im.message.receive_v1`
6. 发布应用 → 创建版本 → 申请上线
7. 复制 App ID 和 App Secret

### 应用内配置

1. 打开智日程 → 设置 → 飞书互联
2. 填入 App ID 和 App Secret → 保存凭证
3. 给飞书机器人发消息 → 获取返回的 OpenID
4. 将 OpenID 填入设置页 → 绑定

### 使用

- 飞书 @机器人 → 发消息自动创建任务
- 发 `灵感 xxx` → 自动存入灵感记录
- 带时间任务自动创建飞书原生提醒

---

## 数据模型

| 模型 | 说明 |
|------|------|
| User | 用户（邮箱、密码、昵称） |
| Task | 任务（标题、描述、地点、优先级、状态、类型、截止日期/时间、标签、提醒开关、子任务） |
| RefreshToken | JWT 刷新令牌 |
| Setting | 键值对配置（API Key、飞书凭证等） |
| Idea | 灵感记录（内容、来源、时间） |

---

## License

MIT
