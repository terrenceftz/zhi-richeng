# 智日程 Phase 1 — 设计文档

**日期**: 2026-05-22
**版本**: v1
**状态**: 设计中

---

## 1. 概述

智日程是一款私人智能日程 Web 应用。Phase 1（MVP）聚焦核心日程管理 + AI 自然语言输入，暂不包含 iCloud 同步和复杂 AI 日程优化。

### Phase 1 范围

| 包含 | 不包含 |
|------|--------|
| 本地账号注册/登录（JWT） | OAuth 第三方登录 |
| 任务 CRUD（待办 + 日历事件统一模型） | iCloud 双向同步 |
| 日/周/月视图 | AI 每日自动生成 ToDo |
| 自然语言创建任务（DeepSeek API） | AI 日程优化建议 |
| 文档关键时间节点提取（粘贴文档 → LLM 解析多任务） | 文件上传解析 |
| 暗黑/亮色主题，响应式布局 | 甘特图可视化 |
| 拖拽排序、状态切换 | 团队协作 |

### 后续阶段预览

- **Phase 2**: AI 每日 ToDo 生成 + 日程优化建议
- **Phase 3**: iCloud 备忘录同步 + 移动端 PWA

---

## 2. 技术选型

| 层 | 选型 | 说明 |
|----|------|------|
| 前端框架 | React 18 + TypeScript | SPA |
| 构建工具 | Vite | HMR 秒级 |
| UI 样式 | TailwindCSS | 原子化 CSS |
| 动效 | Framer Motion | 过渡动画、拖拽 |
| 状态管理 | Zustand | 轻量、TS 友好 |
| 日历 | 自定义组件 | 日/周/月三视图 |
| 后端框架 | Express + TypeScript | REST API |
| ORM | Prisma | 类型安全 |
| 数据库 | PostgreSQL | 关系型 |
| 认证 | JWT (access + refresh token) | bcrypt 密码哈希 |
| LLM | DeepSeek API | OpenAI SDK 兼容模式 |

---

## 3. 项目结构

```
zhi-richeng/
├── client/                    # Vite + React 18
│   ├── src/
│   │   ├── components/        # 通用组件
│   │   │   ├── layout/        # AuthLayout, AppLayout, Sidebar
│   │   │   ├── tasks/         # TaskCard, TaskList, TaskForm
│   │   │   ├── calendar/      # DayView, WeekView, MonthView, MiniCalendar
│   │   │   ├── ui/            # Button, Input, Modal, Drawer, ThemeToggle
│   │   │   └── SmartInput.tsx  # 自然语言输入条
│   │   ├── pages/             # DashboardPage, CalendarPage, LoginPage, RegisterPage
│   │   ├── hooks/             # useAuth, useTasks, useCalendar
│   │   ├── api/               # axios 实例 + auth/tasks 请求函数
│   │   ├── stores/            # authStore, taskStore
│   │   ├── styles/            # Tailwind 入口 + 全局样式
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/                    # Express + Prisma
│   ├── src/
│   │   ├── routes/            # auth.routes.ts, tasks.routes.ts, users.routes.ts
│   │   ├── controllers/       # auth.controller.ts, tasks.controller.ts
│   │   ├── services/          # auth.service.ts, tasks.service.ts, llm.service.ts
│   │   ├── middleware/        # auth.middleware.ts (JWT verify), error.middleware.ts
│   │   ├── utils/             # jwt.ts, password.ts
│   │   ├── prisma/            # schema.prisma, migrations/
│   │   ├── app.ts             # Express 初始化
│   │   └── index.ts           # 入口
│   ├── tsconfig.json
│   └── package.json
├── package.json               # workspace root (scripts: dev, build)
└── docs/
    └── superpowers/
        └── specs/             # 设计文档
```

---

## 4. 数据模型

### 4.1 User

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID (PK) | 主键 |
| email | String (unique) | 邮箱 |
| password | String | bcrypt 哈希 |
| name | String | 显示名称 |
| createdAt | DateTime | 注册时间 |
| updatedAt | DateTime | 更新时间 |

### 4.2 Task

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID (PK) | 主键 |
| userId | UUID (FK → User) | 所属用户 |
| title | String | 任务标题（必填） |
| description | Text? | 备注（可选） |
| status | Enum(todo, in_progress, done) | 默认 todo |
| priority | Enum(high, medium, low) | 默认 medium |
| category | String? | 任务类型：资料收集/审核/会议/通用 等 |
| dueDate | Date? | 截止/日程日期，无则为待办 |
| dueTime | String? | 具体时间 HH:mm |
| tags | JsonB (String[]) | 标签数组 |
| parentId | UUID? | 父任务（子任务场景） |
| sortOrder | Int | 拖拽排序序号 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

**设计要点**: Task 统一了待办事项和日程事件。有 `dueDate` = 日历事件，没有 = 纯待办。日/周/月视图按 `dueDate` 筛选。

### 4.3 RefreshToken

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID (PK) | 主键 |
| userId | UUID (FK → User) | 所属用户 |
| token | String (unique) | refresh token |
| expiresAt | DateTime | 过期时间 |
| createdAt | DateTime | 创建时间 |

### 4.4 Prisma Schema

```prisma
model User {
  id           String         @id @default(uuid()) @db.Uuid
  email        String         @unique
  password     String
  name         String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  tasks        Task[]
  refreshTokens RefreshToken[]
}

model Task {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @db.Uuid
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  description String?
  status      String    @default("todo") // todo | in_progress | done
  priority    String    @default("medium") // high | medium | low
  category    String?   // 资料收集 | 审核 | 会议 | 通用 | ...
  dueDate     DateTime? @db.Date
  dueTime     String?   @db.VarChar(5) // HH:mm
  tags        Json      @default("[]")
  parentId    String?   @db.Uuid
  parent      Task?     @relation("SubTasks", fields: [parentId], references: [id])
  children    Task[]    @relation("SubTasks")
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

---

## 5. API 设计

### 5.1 基础信息

- Base URL: `http://localhost:3001/api`
- 认证: JWT Bearer Token（Header: `Authorization: Bearer <token>`）
- Access token 有效期: 15 分钟
- Refresh token 有效期: 7 天

### 5.2 认证

| 方法 | 路径 | 说明 | Auth |
|------|------|------|------|
| POST | /api/auth/register | 注册 | 否 |
| POST | /api/auth/login | 登录，返回 token 对 | 否 |
| POST | /api/auth/refresh | 刷新 access token | 否（用 refresh token） |
| POST | /api/auth/logout | 注销 refresh token | 是 |

### 5.3 任务

| 方法 | 路径 | 说明 | Auth |
|------|------|------|------|
| GET | /api/tasks | 获取任务列表 | 是 |
| POST | /api/tasks | 创建任务（表单） | 是 |
| POST | /api/tasks/nlp | 自然语言解析创建单条任务 | 是 |
| POST | /api/tasks/nlp/extract | 粘贴文档 → LLM 提取关键时间节点（多条） | 是 |
| POST | /api/tasks/nlp/confirm | 确认 NLP 解析结果并入库 | 是 |
| GET | /api/tasks/:id | 获取任务详情 | 是 |
| PUT | /api/tasks/:id | 更新任务 | 是 |
| DELETE | /api/tasks/:id | 删除任务 | 是 |
| PATCH | /api/tasks/:id/status | 快速切换状态 | 是 |
| PATCH | /api/tasks/reorder | 拖拽排序 | 是 |

**查询参数**（GET /api/tasks）: `?date=2026-05-22` `&status=todo` `&priority=high` `&category=资料收集`

### 5.4 用户

| 方法 | 路径 | 说明 | Auth |
|------|------|------|------|
| GET | /api/users/me | 获取个人信息 | 是 |
| PUT | /api/users/me | 更新个人信息 | 是 |

### 5.5 请求/响应格式

**POST /api/auth/register**
```json
// Request
{ "email": "user@example.com", "password": "123456", "name": "张三" }

// Response 201
{ "user": { "id": "...", "email": "...", "name": "..." },
  "accessToken": "...", "refreshToken": "..." }
```

**POST /api/tasks/nlp**
```json
// Request
{ "text": "明天下午3点产品评审会 高优先级" }

// Response 200（解析结果，待确认）
{ "parsed": { "title": "产品评审会", "dueDate": "2026-05-23", "dueTime": "15:00", "priority": "high" },
  "confirmed": false }
```

**POST /api/tasks/nlp/extract**
```json
// Request
{ "text": "关于2026年度职称评审工作的通知：\n1. 个人申报材料提交截止：2026年6月15日\n2. 单位审核公示：2026年7月1日-7月10日\n3. 评审委员会评审：2026年8月20日" }

// Response 200（返回解析出的多条任务）
{ "tasks": [
    { "title": "个人申报材料提交", "dueDate": "2026-06-15", "dueTime": null, "priority": "high", "category": "资料收集" },
    { "title": "单位审核公示", "dueDate": "2026-07-01", "dueTime": null, "priority": "high", "category": "审核" },
    { "title": "评审委员会评审", "dueDate": "2026-08-20", "dueTime": null, "priority": "medium", "category": "审核" }
  ],
  "confirmed": false }
```

**POST /api/tasks/nlp/confirm**
```json
// Request — 单条确认
{ "tasks": [
    { "title": "产品评审会", "dueDate": "2026-05-23", "dueTime": "15:00", "priority": "high", "category": "会议" }
  ] }

// Request — 批量确认（extract 结果，用户可修改/删减后提交）
{ "tasks": [
    { "title": "个人申报材料提交", "dueDate": "2026-06-15", "priority": "high", "category": "资料收集" },
    { "title": "评审委员会评审", "dueDate": "2026-08-20", "priority": "medium", "category": "审核" }
  ] }

// Response 201
{ "tasks": [{ "id": "...", "title": "产品评审会", ... }, ...],
  "count": 1 }
```

---

## 6. LLM 集成（DeepSeek API）

### 6.1 配置

- Base URL: `https://api.deepseek.com/v1`
- Model: `deepseek-chat`（OpenAI 兼容 SDK）
- 环境变量: `DEEPSEEK_API_KEY`

### 6.2 NLP 解析 Prompt

**单条任务解析** (`/api/tasks/nlp`)
```
你是一个日程解析助手。将用户的自然语言输入解析为结构化任务数据。

规则：
- 提取任务标题、日期、时间、优先级、任务类型
- 识别相对日期（"明天"、"下周一"、"后天"）转为 YYYY-MM-DD
- 优先级关键词：高/紧急/high → high, 低/不急/low → low, 默认 medium
- 任务类型（category）识别：
  - 涉及"交/提交/上报/收集/材料/资料/申报" → "资料收集"
  - 涉及"审核/评审/审批/审查/公示" → "审核"
  - 涉及"开会/会议/讨论/汇报" → "会议"
  - 其他 → "通用"
- 如果没有明确时间，dueTime 为 null
- 如果没有明确日期，dueDate 为 null（待办任务）

用户输入: {text}

请只返回 JSON，格式如下：
{ "title": "...", "dueDate": "YYYY-MM-DD|null", "dueTime": "HH:mm|null", "priority": "high|medium|low", "category": "资料收集|审核|会议|通用", "tags": [] }
```

**文档关键节点提取** (`/api/tasks/nlp/extract`)
```
你是一个公文/通知解析助手。从以下文档内容中提取所有关键时间节点和截止日期。

规则：
- 提取每一项有明确截止日期或时间要求的事项
- 每个事项生成一条任务，包含：标题、日期、优先级、任务类型
- 标题应简洁且保留原文关键信息
- 任务类型（category）识别：
  - 涉及"交/提交/上报/收集/材料/资料/申报/填报" → "资料收集"
  - 涉及"审核/评审/审批/审查/公示/复核/检查" → "审核"
  - 涉及"开会/会议/讨论/汇报" → "会议"
  - 其他 → "通用"
- 优先级判断：
  - "截止/必须/务必/逾期" → high
  - "建议/可以/推荐" → low
  - 默认 → medium
- 如果文档中没有明显截止日期的事项，返回空数组

文档内容: {text}

请只返回 JSON，格式如下：
{ "tasks": [
  { "title": "...", "dueDate": "YYYY-MM-DD", "dueTime": "HH:mm|null", "priority": "high|medium|low", "category": "资料收集|审核|会议|通用", "tags": [] }
]}
```

### 6.3 流程

**单条任务创建**
```
用户输入一句话
  → POST /api/tasks/nlp
  → llm.service.parseTask(text)
  → DeepSeek API 返回 { title, dueDate, ... }
  → 前端展示解析结果，用户确认/修改
  → POST /api/tasks/nlp/confirm → 入库
```

**文档批量提取**
```
用户粘贴文档（通知/公文/邮件）
  → POST /api/tasks/nlp/extract
  → llm.service.extractTasks(documentText)
  → DeepSeek API 返回 { tasks: [...] }
  → 前端展示多条任务列表
  → 用户勾选/编辑/删除
  → POST /api/tasks/nlp/confirm → 批量入库
```

---

## 7. 前端设计

### 7.1 路由

| 路径 | 页面 | 组件 |
|------|------|------|
| /login | 登录页 | LoginPage (AuthLayout) |
| /register | 注册页 | RegisterPage (AuthLayout) |
| / | 首页 Dashboard | DashboardPage (AppLayout) |
| /calendar | 日历视图 | CalendarPage (AppLayout) |

### 7.2 核心组件

- **AppLayout**: 侧边栏（导航 + 主题切换） + 顶部 + 内容区
- **SmartInput**: 自然语言输入条，支持键盘和语音提示
- **TaskList**: 可拖拽任务列表，按日期/状态分组
- **TaskCard**: 单个任务卡片，展示标题/时间/优先级/标签
- **TaskDetailDrawer**: 右侧滑出面板，编辑任务详情
- **DayView / WeekView / MonthView**: 日历三视图
- **MiniCalendar**: 小日历组件（Dashboard 右侧）

### 7.3 状态管理（Zustand）

```typescript
// authStore
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email, password) => Promise<void>;
  register: (email, password, name) => Promise<void>;
  logout: () => void;
}

// taskStore
interface TaskState {
  tasks: Task[];
  selectedDate: string; // YYYY-MM-DD
  isLoading: boolean;
  fetchTasks: (filters?) => Promise<void>;
  createTask: (data) => Promise<void>;
  createTaskNLP: (text) => Promise<ParsedTask>;
  extractTasksNLP: (text) => Promise<ExtractResult>;
  confirmTaskNLP: (tasks) => Promise<void>;
  updateTask: (id, data) => Promise<void>;
  deleteTask: (id) => Promise<void>;
  reorderTasks: (orderedIds: string[]) => Promise<void>;
}
```

### 7.4 UI 主题

- 暗黑模式（默认） + 亮色模式
- 主色调：紫色渐变 (#7c3aed → #e2b714)
- 优先级色：高 #f7768e（红）、中 #e2b714（黄）、低 #7aa2f7（蓝）
- 状态色：待办 #e2b714、进行中 #7aa2f7、完成 #565f89（灰）
- 动效：Framer Motion 页面过渡、任务卡片 hover/拖拽反馈

### 7.5 响应式

- 桌面（>=1024px）：侧边栏 + 双栏布局
- 平板（768-1023px）：收起侧边栏，单栏布局
- 手机（<768px）：底部导航栏代替侧边栏，单栏全宽

---

## 8. 数据结构类型

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  category?: string;   // 资料收集 | 审核 | 会议 | 通用
  dueDate?: string;   // YYYY-MM-DD
  dueTime?: string;   // HH:mm
  tags: string[];
  parentId?: string;
  children?: Task[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ParsedTask {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  tags: string[];
}

interface ExtractResult {
  tasks: ParsedTask[];
  confirmed: false;
}

interface ApiError {
  status: number;
  message: string;
  code?: string;
}
```

---

## 9. 安全

- 密码: bcrypt(12 rounds) 哈希存储，不存明文
- JWT: access token 15min 过期，refresh token 7 天过期
- API 验证: 除 `/api/auth/*` 外全部需要 JWT
- SQL 注入: Prisma 参数化查询默认防护
- XSS: React 默认转义 + Content-Security-Policy header
- CORS: 仅允许 `http://localhost:5173`（开发环境）

---

## 10. 开发流程

1. 项目脚手架：Vite + Express 初始化
2. 数据库：Prisma Schema → 迁移 → seed
3. 后端：认证模块 → 任务 CRUD → NLP 集成
4. 前端：布局 → 路由 → 认证页 → Dashboard → 日历
5. 集成测试 + UI 验收
