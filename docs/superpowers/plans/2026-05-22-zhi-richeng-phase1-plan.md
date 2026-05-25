# 智日程 Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 MVP of 智日程 — a personal smart scheduler with JWT auth, task CRUD, day/week/month calendar views, natural language task creation, and document deadline extraction via DeepSeek API.

**Architecture:** Monorepo with `client/` (Vite + React 18 + TailwindCSS + Zustand) and `server/` (Express + TypeScript + Prisma + PostgreSQL). REST API with JWT auth. DeepSeek API (OpenAI SDK compatible) for NLP task parsing and document deadline extraction.

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS, Framer Motion, Zustand, Express, Prisma, PostgreSQL, bcrypt, jsonwebtoken, OpenAI SDK (pointed at DeepSeek)

**Spec:** `docs/superpowers/specs/2026-05-22-zhi-richeng-phase1-design.md`

---

## File Map

```
zhi-richeng/
├── package.json                          # Root: workspace scripts
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                              # DATABASE_URL, JWT_SECRET, DEEPSEEK_API_KEY
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.ts                      # Entry: listen
│       ├── app.ts                        # Express app setup
│       ├── config.ts                     # Env vars
│       ├── utils/
│       │   ├── password.ts               # bcrypt hash/compare
│       │   └── jwt.ts                    # sign/verify access+refresh tokens
│       ├── middleware/
│       │   ├── auth.middleware.ts         # JWT verify, attach userId
│       │   └── error.middleware.ts        # Global error handler
│       ├── services/
│       │   ├── auth.service.ts            # register/login/refresh/logout
│       │   ├── tasks.service.ts           # CRUD + status + reorder
│       │   └── llm.service.ts            # DeepSeek parseTask + extractTasks
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   └── tasks.controller.ts
│       └── routes/
│           ├── auth.routes.ts
│           ├── tasks.routes.ts
│           └── users.routes.ts
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css                      # Tailwind directives + theme vars
│       ├── types/
│       │   └── index.ts                   # User, Task, ParsedTask, ExtractResult, ApiError
│       ├── api/
│       │   ├── client.ts                  # Axios instance + interceptors
│       │   ├── auth.ts                    # Auth API calls
│       │   └── tasks.ts                   # Task API calls
│       ├── stores/
│       │   ├── authStore.ts
│       │   ├── taskStore.ts
│       │   └── themeStore.ts
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── useTheme.ts
│       ├── components/
│       │   ├── ui/
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Drawer.tsx
│       │   │   └── ThemeToggle.tsx
│       │   ├── layout/
│       │   │   ├── AuthLayout.tsx
│       │   │   ├── AppLayout.tsx
│       │   │   └── Sidebar.tsx
│       │   ├── tasks/
│       │   │   ├── TaskCard.tsx
│       │   │   ├── TaskList.tsx
│       │   │   ├── TaskForm.tsx
│       │   │   └── TaskDetailDrawer.tsx
│       │   ├── calendar/
│       │   │   ├── DayView.tsx
│       │   │   ├── WeekView.tsx
│       │   │   ├── MonthView.tsx
│       │   │   └── MiniCalendar.tsx
│       │   └── SmartInput.tsx
│       └── pages/
│           ├── LoginPage.tsx
│           ├── RegisterPage.tsx
│           ├── DashboardPage.tsx
│           └── CalendarPage.tsx
```

---

### Task 1: Root workspace setup

**Files:**
- Create: `zhi-richeng/package.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "zhi-richeng",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "cd client && npm run build && cd ../server && npm run build",
    "db:migrate": "cd server && npx prisma migrate dev",
    "db:seed": "cd server && npx prisma db seed"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Install root deps**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && npm install
```

Expected: `concurrently` installed, no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git init && git add package.json && git commit -m "chore: init root workspace"
```

---

### Task 2: Server scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env`
- Create: `server/src/config.ts`

- [ ] **Step 1: Create server package.json**

```json
{
  "name": "zhi-richeng-server",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "openai": "^4.68.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/uuid": "^10.0.0",
    "prisma": "^5.22.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create server tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create .env file**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zhi_richeng?schema=public"
JWT_ACCESS_SECRET="change-me-access-secret-key"
JWT_REFRESH_SECRET="change-me-refresh-secret-key"
DEEPSEEK_API_KEY="sk-your-deepseek-api-key"
PORT=3001
CLIENT_URL="http://localhost:5173"
```

- [ ] **Step 4: Create server/src/config.ts**

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
};
```

- [ ] **Step 5: Install server deps**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng/server && npm install
```

Expected: all packages installed, no errors.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/ && git commit -m "chore: scaffold server with Express + TypeScript + Prisma"
```

---

### Task 3: Client scaffold

**Files:**
- Create: `client/` via Vite, then customize

- [ ] **Step 1: Scaffold Vite + React + TypeScript**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && npm create vite@latest client -- --template react-ts
```

- [ ] **Step 2: Install client deps**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng/client && npm install && npm install tailwindcss @tailwindcss/vite framer-motion zustand axios react-router-dom
```

- [ ] **Step 3: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' },
        accent: { DEFAULT: '#e2b714', light: '#f0d760', dark: '#b8920f' },
        surface: { DEFAULT: '#1a1a2e', light: '#252547', dark: '#0f0f1a' },
        danger: '#f7768e',
        info: '#7aa2f7',
        muted: '#565f89',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Configure vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 5: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Replace src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #7c3aed;
  --color-accent: #e2b714;
  --color-danger: #f7768e;
  --color-info: #7aa2f7;
  --color-muted: #565f89;
}

body {
  @apply bg-surface text-white font-sans;
  margin: 0;
  min-height: 100vh;
}

.light body, .light {
  --bg: #f8f9fa;
  --text: #1a1a2e;
}
```

- [ ] **Step 7: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/ && git commit -m "chore: scaffold client with Vite + React + TailwindCSS"
```

---

### Task 4: Prisma schema, migration, and seed

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/prisma/seed.ts`

- [ ] **Step 1: Write Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid()) @db.Uuid
  email         String         @unique
  password      String
  name          String
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  tasks         Task[]
  refreshTokens RefreshToken[]
}

model Task {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @db.Uuid
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  description String?
  status      String    @default("todo")
  priority    String    @default("medium")
  category    String?
  dueDate     DateTime? @db.Date
  dueTime     String?   @db.VarChar(5)
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

- [ ] **Step 2: Write prune seed script (server/prisma/seed.ts)**

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@zhi.com' },
    update: {},
    create: {
      email: 'demo@zhi.com',
      password,
      name: 'Demo用户',
      tasks: {
        create: [
          { title: '产品评审会', priority: 'high', category: '会议', dueDate: new Date('2026-05-22'), dueTime: '15:00', tags: ['工作'], sortOrder: 0 },
          { title: '提交周报', priority: 'medium', category: '资料收集', dueDate: new Date('2026-05-22'), dueTime: '17:00', tags: ['工作'], sortOrder: 1 },
          { title: '整理技术文档', priority: 'low', category: '通用', dueDate: new Date('2026-05-23'), tags: ['学习'], sortOrder: 2 },
          { title: '准备职称申报材料', priority: 'high', category: '资料收集', dueDate: new Date('2026-06-15'), tags: ['重要'], sortOrder: 3 },
          { title: '健身', priority: 'medium', category: '通用', tags: ['生活'], sortOrder: 4 },
        ],
      },
    },
  });
  console.log('Seed complete. Demo user:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Add seed config to server/package.json**

Edit `server/package.json` — add before the final `}`:

```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
```

- [ ] **Step 4: Run migration**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng/server && npx prisma migrate dev --name init
```

Expected: migration created, tables exist in PostgreSQL.

- [ ] **Step 5: Run seed**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng/server && npx prisma db seed
```

Expected: "Seed complete. Demo user: demo@zhi.com"

- [ ] **Step 6: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/prisma/ server/package.json && git commit -m "feat: add Prisma schema, migration, and seed data"
```

---

### Task 5: Password and JWT utilities

**Files:**
- Create: `server/src/utils/password.ts`
- Create: `server/src/utils/jwt.ts`

- [ ] **Step 1: Write server/src/utils/password.ts**

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 2: Write server/src/utils/jwt.ts**

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessExpiresIn });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/utils/ && git commit -m "feat: add password hashing and JWT utilities"
```

---

### Task 6: Auth service

**Files:**
- Create: `server/src/services/auth.service.ts`

- [ ] **Step 1: Write auth service**

```typescript
import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt';

const prisma = new PrismaClient();

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function register(input: RegisterInput): Promise<{ user: { id: string; email: string; name: string }; tokens: TokenPair }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('邮箱已被注册'), { statusCode: 409 });
  }

  const hashed = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, password: hashed, name: input.name },
    select: { id: true, email: true, name: true },
  });

  const payload: TokenPayload = { userId: user.id };
  const accessToken = signAccessToken(payload);
  const refreshTokenValue = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { user, tokens: { accessToken, refreshToken: refreshTokenValue } };
}

export async function login(input: LoginInput): Promise<{ user: { id: string; email: string; name: string }; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });
  }

  const valid = await comparePassword(input.password, user.password);
  if (!valid) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });
  }

  const payload: TokenPayload = { userId: user.id };
  const accessToken = signAccessToken(payload);
  const refreshTokenValue = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    tokens: { accessToken, refreshToken: refreshTokenValue },
  };
}

export async function refresh(refreshTokenValue: string): Promise<TokenPair> {
  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw Object.assign(new Error('无效的 refresh token'), { statusCode: 401 });
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshTokenValue } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('refresh token 已过期'), { statusCode: 401 });
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newPayload: TokenPayload = { userId: payload.userId };
  const accessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string, refreshTokenValue: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId, token: refreshTokenValue } });
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/services/auth.service.ts && git commit -m "feat: add auth service (register, login, refresh, logout)"
```

---

### Task 7: Auth controller and routes

**Files:**
- Create: `server/src/controllers/auth.controller.ts`
- Create: `server/src/routes/auth.routes.ts`

- [ ] **Step 1: Write auth controller**

```typescript
import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: '缺少必填字段：email, password, name' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '密码长度至少6位' });
    }
    const result = await authService.register({ email, password, name });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '缺少必填字段：email, password' });
    }
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: '缺少 refreshToken' });
    }
    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.userId!, refreshToken || '');
    res.json({ message: '已注销' });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Write auth routes**

```typescript
import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);

export default router;
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/controllers/auth.controller.ts server/src/routes/auth.routes.ts && git commit -m "feat: add auth controller and routes"
```

---

### Task 8: Middleware (auth + error handler)

**Files:**
- Create: `server/src/middleware/auth.middleware.ts`
- Create: `server/src/middleware/error.middleware.ts`

- [ ] **Step 1: Write auth middleware**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证 token' });
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: 'token 无效或已过期' });
  }
}
```

- [ ] **Step 2: Write error middleware**

```typescript
import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  console.error(`[ERROR] ${statusCode}: ${message}`);
  if (statusCode === 500) console.error(err.stack);
  res.status(statusCode).json({ message, status: statusCode });
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/middleware/ && git commit -m "feat: add auth middleware and error handler"
```

---

### Task 9: Task service (CRUD + status + reorder)

**Files:**
- Create: `server/src/services/tasks.service.ts`

- [ ] **Step 1: Write tasks service**

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  dueDate?: string;
  dueTime?: string;
  tags?: string[];
  parentId?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

export interface TaskFilters {
  date?: string;
  status?: string;
  priority?: string;
  category?: string;
}

export async function getTasks(userId: string, filters: TaskFilters) {
  const where: Prisma.TaskWhereInput = { userId };

  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.category) where.category = filters.category;
  if (filters.date) {
    const d = new Date(filters.date);
    where.dueDate = { equals: d };
  }

  return prisma.task.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { children: true },
  });
}

export async function getTaskById(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { children: true },
  });
  if (!task) throw Object.assign(new Error('任务不存在'), { statusCode: 404 });
  return task;
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const maxOrder = await prisma.task.aggregate({ where: { userId }, _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  return prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description || null,
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      category: input.category || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      dueTime: input.dueTime || null,
      tags: input.tags || [],
      parentId: input.parentId || null,
      sortOrder,
    },
    include: { children: true },
  });
}

export async function createTasksBatch(userId: string, inputs: CreateTaskInput[]) {
  const maxOrder = await prisma.task.aggregate({ where: { userId }, _max: { sortOrder: true } });
  let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const tasks = [];
  for (const input of inputs) {
    const task = await prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description || null,
        status: input.status || 'todo',
        priority: input.priority || 'medium',
        category: input.category || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        dueTime: input.dueTime || null,
        tags: input.tags || [],
        sortOrder: nextOrder++,
      },
    });
    tasks.push(task);
  }
  return tasks;
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  await getTaskById(userId, taskId); // ensure exists and belongs to user

  const data: any = { ...input };
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  delete data.id;
  delete data.userId;
  delete data.createdAt;
  delete data.updatedAt;

  return prisma.task.update({ where: { id: taskId }, data, include: { children: true } });
}

export async function deleteTask(userId: string, taskId: string) {
  await getTaskById(userId, taskId);
  return prisma.task.delete({ where: { id: taskId } });
}

export async function updateTaskStatus(userId: string, taskId: string, status: string) {
  await getTaskById(userId, taskId);
  return prisma.task.update({ where: { id: taskId }, data: { status } });
}

export async function reorderTasks(userId: string, orderedIds: string[]) {
  const updates = orderedIds.map((id, index) =>
    prisma.task.updateMany({ where: { id, userId }, data: { sortOrder: index } })
  );
  await prisma.$transaction(updates);
  return getTasks(userId, {});
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/services/tasks.service.ts && git commit -m "feat: add tasks service (CRUD, status toggle, reorder, batch create)"
```

---

### Task 10: Task controller and routes

**Files:**
- Create: `server/src/controllers/tasks.controller.ts`
- Create: `server/src/routes/tasks.routes.ts`

- [ ] **Step 1: Write tasks controller**

```typescript
import { Request, Response, NextFunction } from 'express';
import * as tasksService from '../services/tasks.service';

export async function getTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, status, priority, category } = req.query;
    const tasks = await tasksService.getTasks(req.userId!, {
      date: date as string | undefined,
      status: status as string | undefined,
      priority: priority as string | undefined,
      category: category as string | undefined,
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.getTaskById(req.userId!, req.params.id);
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.createTask(req.userId!, req.body);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.updateTask(req.userId!, req.params.id, req.body);
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    await tasksService.deleteTask(req.userId!, req.params.id);
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    if (!['todo', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }
    const task = await tasksService.updateTaskStatus(req.userId!, req.params.id, status);
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds 必须是数组' });
    }
    const tasks = await tasksService.reorderTasks(req.userId!, orderedIds);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

export async function confirmNLP(req: Request, res: Response, next: NextFunction) {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: 'tasks 必须是非空数组' });
    }
    const created = await tasksService.createTasksBatch(req.userId!, tasks);
    res.status(201).json({ tasks: created, count: created.length });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Write tasks routes**

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getTasks, getTask, createTask, updateTask, deleteTask,
  updateStatus, reorder, confirmNLP,
} from '../controllers/tasks.controller';
import { parseTask, extractTasks } from '../controllers/tasks.controller';

// Import NLP handlers separately (created in Task 16)
const nlpRouter = Router({ mergeParams: true });

const router = Router();
router.use(authMiddleware);

router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/status', updateStatus);
router.patch('/reorder', reorder);
router.post('/nlp/confirm', confirmNLP);

export default router;
```

**Note:** NLP parse and extract routes will be wired in Task 16.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/controllers/tasks.controller.ts server/src/routes/tasks.routes.ts && git commit -m "feat: add tasks controller and routes (CRUD, status, reorder, confirm)"
```

---

### Task 11: User routes

**Files:**
- Create: `server/src/routes/users.routes.ts`

- [ ] **Step 1: Write users routes**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();
const router = Router();
router.use(authMiddleware);

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ message: '用户不存在' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.put('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, password } = req.body;
    const data: any = {};
    if (name) data.name = name;
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: '密码长度至少6位' });
      data.password = await hashPassword(password);
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/routes/users.routes.ts && git commit -m "feat: add user profile routes (get/update me)"
```

---

### Task 12: Express app entry point

**Files:**
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Write app.ts**

```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/tasks.routes';
import userRoutes from './routes/users.routes';

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorMiddleware);

export default app;
```

- [ ] **Step 2: Write index.ts**

```typescript
import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
```

- [ ] **Step 3: Verify server starts**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng/server && npx tsx src/index.ts
```

Expected: "Server running on http://localhost:3001". Then Ctrl+C.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/app.ts server/src/index.ts && git commit -m "feat: add Express app entry point and server bootstrap"
```

---

### Task 13: LLM service (DeepSeek integration)

**Files:**
- Create: `server/src/services/llm.service.ts`

- [ ] **Step 1: Write LLM service**

```typescript
import OpenAI from 'openai';
import { config } from '../config';

const client = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseURL,
});

const PARSE_TASK_SYSTEM_PROMPT = `你是一个日程解析助手。将用户的自然语言输入解析为结构化任务数据。

规则：
- 提取任务标题、日期、时间、优先级、任务类型
- 识别相对日期（"明天"、"下周一"、"后天"）转为 YYYY-MM-DD（当前日期参考系统时间）
- 优先级关键词：高/紧急/high → high, 低/不急/low → low, 默认 medium
- 任务类型（category）识别：
  - 涉及"交/提交/上报/收集/材料/资料/申报" → "资料收集"
  - 涉及"审核/评审/审批/审查/公示" → "审核"
  - 涉及"开会/会议/讨论/汇报" → "会议"
  - 其他 → "通用"
- 如果没有明确时间，dueTime 为 null
- 如果没有明确日期，dueDate 为 null（待办任务）

请只返回 JSON，不要包含其他文字。`;

const EXTRACT_TASKS_SYSTEM_PROMPT = `你是一个公文/通知解析助手。从以下文档内容中提取所有关键时间节点和截止日期。

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

请只返回 JSON，不要包含其他文字。`;

export interface ParsedTask {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: 'high' | 'medium' | 'low';
  category: string;
  tags: string[];
}

export async function parseTask(text: string): Promise<ParsedTask> {
  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: PARSE_TASK_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

export async function extractTasks(text: string): Promise<{ tasks: ParsedTask[] }> {
  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: EXTRACT_TASKS_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '{"tasks":[]}';
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/services/llm.service.ts && git commit -m "feat: add LLM service (DeepSeek parseTask + extractTasks)"
```

---

### Task 14: NLP routes (parse + extract)

**Files:**
- Modify: `server/src/controllers/tasks.controller.ts` (add parseNLP, extractNLP handlers)
- Modify: `server/src/routes/tasks.routes.ts` (wire NLP routes)

- [ ] **Step 1: Add NLP handlers to tasks controller**

Add these functions to `server/src/controllers/tasks.controller.ts` (before the last export):

```typescript
import * as llmService from '../services/llm.service';

export async function parseNLP(req: Request, res: Response, next: NextFunction) {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: '缺少 text 字段' });
    }
    const parsed = await llmService.parseTask(text);
    res.json({ parsed, confirmed: false });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(422).json({ message: 'LLM 解析失败，请尝试更明确的表达' });
    }
    next(err);
  }
}

export async function extractNLP(req: Request, res: Response, next: NextFunction) {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: '缺少 text 字段' });
    }
    const result = await llmService.extractTasks(text);
    res.json({ tasks: result.tasks, confirmed: false });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(422).json({ message: '文档解析失败，请检查内容格式' });
    }
    next(err);
  }
}
```

- [ ] **Step 2: Update tasks routes imports and wire NLP routes**

Update `server/src/routes/tasks.routes.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getTasks, getTask, createTask, updateTask, deleteTask,
  updateStatus, reorder, confirmNLP, parseNLP, extractNLP,
} from '../controllers/tasks.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', getTasks);
router.post('/', createTask);
router.post('/nlp', parseNLP);
router.post('/nlp/extract', extractNLP);
router.post('/nlp/confirm', confirmNLP);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/status', updateStatus);
router.patch('/reorder', reorder);

export default router;
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add server/src/controllers/tasks.controller.ts server/src/routes/tasks.routes.ts && git commit -m "feat: wire NLP parse and extract routes"
```

---

### Task 15: Client types

**Files:**
- Create: `client/src/types/index.ts`

- [ ] **Step 1: Write shared types**

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  category?: string;
  dueDate?: string;
  dueTime?: string;
  tags: string[];
  parentId?: string;
  children?: Task[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedTask {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  tags: string[];
}

export interface ExtractResult {
  tasks: ParsedTask[];
  confirmed: false;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  '资料收集': '资料收集',
  '审核': '审核',
  '会议': '会议',
  '通用': '通用',
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: '#f7768e',
  medium: '#e2b714',
  low: '#7aa2f7',
};

export const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '完成',
};
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/types/ && git commit -m "feat: add client shared types"
```

---

### Task 16: Client API layer

**Files:**
- Create: `client/src/api/client.ts`
- Create: `client/src/api/auth.ts`
- Create: `client/src/api/tasks.ts`

- [ ] **Step 1: Write API client (axios instance)**

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return client(original);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
```

- [ ] **Step 2: Write auth API**

```typescript
import client from './client';
import type { AuthResponse } from '../types';

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const { data } = await client.post('/auth/register', { email, password, name });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

export async function refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await client.post('/auth/refresh', { refreshToken: token });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await client.post('/auth/logout', { refreshToken });
}
```

- [ ] **Step 3: Write tasks API**

```typescript
import client from './client';
import type { Task, ParsedTask, ExtractResult } from '../types';

export interface TaskFilters {
  date?: string;
  status?: string;
  priority?: string;
  category?: string;
}

export async function fetchTasks(filters?: TaskFilters): Promise<Task[]> {
  const { data } = await client.get('/tasks', { params: filters });
  return data.tasks;
}

export async function fetchTask(id: string): Promise<Task> {
  const { data } = await client.get(`/tasks/${id}`);
  return data.task;
}

export async function createTask(input: Partial<Task>): Promise<Task> {
  const { data } = await client.post('/tasks', input);
  return data.task;
}

export async function updateTask(id: string, input: Partial<Task>): Promise<Task> {
  const { data } = await client.put(`/tasks/${id}`, input);
  return data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await client.delete(`/tasks/${id}`);
}

export async function updateTaskStatus(id: string, status: string): Promise<Task> {
  const { data } = await client.patch(`/tasks/${id}/status`, { status });
  return data.task;
}

export async function reorderTasks(orderedIds: string[]): Promise<Task[]> {
  const { data } = await client.patch('/tasks/reorder', { orderedIds });
  return data.tasks;
}

export async function parseNLP(text: string): Promise<{ parsed: ParsedTask; confirmed: false }> {
  const { data } = await client.post('/tasks/nlp', { text });
  return data;
}

export async function extractNLP(text: string): Promise<ExtractResult> {
  const { data } = await client.post('/tasks/nlp/extract', { text });
  return data;
}

export async function confirmNLP(tasks: ParsedTask[]): Promise<{ tasks: Task[]; count: number }> {
  const { data } = await client.post('/tasks/nlp/confirm', { tasks });
  return data;
}
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/api/ && git commit -m "feat: add client API layer (axios instance, auth, tasks)"
```

---

### Task 17: Client stores (Zustand)

**Files:**
- Create: `client/src/stores/authStore.ts`
- Create: `client/src/stores/taskStore.ts`
- Create: `client/src/stores/themeStore.ts`

- [ ] **Step 1: Write authStore**

```typescript
import { create } from 'zustand';
import type { User } from '../types';
import * as authApi from '../api/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.login(email, password);
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      set({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.message || '登录失败' });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.register(email, password, name);
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      set({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.message || '注册失败' });
      throw err;
    }
  },

  logout: async () => {
    const token = get().refreshToken;
    if (token) {
      await authApi.logout(token).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),

  hydrate: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (accessToken && refreshToken) {
      set({ accessToken, refreshToken, isAuthenticated: true });
    }
  },
}));
```

- [ ] **Step 2: Write taskStore**

```typescript
import { create } from 'zustand';
import type { Task, ParsedTask, ExtractResult } from '../types';
import * as tasksApi from '../api/tasks';
import type { TaskFilters } from '../api/tasks';

interface TaskState {
  tasks: Task[];
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  createTask: (input: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, input: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  parseNLP: (text: string) => Promise<ParsedTask>;
  extractNLP: (text: string) => Promise<ExtractResult>;
  confirmNLP: (tasks: ParsedTask[]) => Promise<void>;
  setSelectedDate: (date: string) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedDate: new Date().toISOString().slice(0, 10),
  isLoading: false,
  error: null,

  fetchTasks: async (filters) => {
    set({ isLoading: true });
    try {
      const tasks = await tasksApi.fetchTasks(filters);
      set({ tasks, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.message || '获取任务失败' });
    }
  },

  createTask: async (input) => {
    const task = await tasksApi.createTask(input);
    set({ tasks: [...get().tasks, task] });
    return task;
  },

  updateTask: async (id, input) => {
    const task = await tasksApi.updateTask(id, input);
    set({ tasks: get().tasks.map((t) => (t.id === id ? task : t)) });
    return task;
  },

  deleteTask: async (id) => {
    await tasksApi.deleteTask(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  updateStatus: async (id, status) => {
    const task = await tasksApi.updateTaskStatus(id, status);
    set({ tasks: get().tasks.map((t) => (t.id === id ? task : t)) });
  },

  reorder: async (orderedIds) => {
    const tasks = await tasksApi.reorderTasks(orderedIds);
    set({ tasks });
  },

  parseNLP: (text) => tasksApi.parseNLP(text).then((r) => r.parsed),

  extractNLP: (text) => tasksApi.extractNLP(text),

  confirmNLP: async (tasks) => {
    const result = await tasksApi.confirmNLP(tasks);
    set({ tasks: [...get().tasks, ...result.tasks] });
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  clearError: () => set({ error: null }),
}));
```

- [ ] **Step 3: Write themeStore**

```typescript
import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'dark',

  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
    set({ theme: next });
  },

  setTheme: (t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('light', t === 'light');
    set({ theme: t });
  },
}));
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/stores/ && git commit -m "feat: add Zustand stores (auth, tasks, theme)"
```

---

### Task 18: Client router and App entry

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/main.tsx`
- Create: `client/src/hooks/useAuth.ts`

- [ ] **Step 1: Write useAuth hook**

```typescript
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    store.hydrate();
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.refreshToken(localStorage.getItem('refreshToken') || '')
        .then((tokens) => {
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
        })
        .catch(() => {
          store.logout();
        });
    }
  }, []);

  return store;
}
```

- [ ] **Step 2: Rewrite App.tsx**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Rewrite main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/App.tsx client/src/main.tsx client/src/hooks/useAuth.ts && git commit -m "feat: add router, protected routes, and app entry"
```

---

### Task 19: UI base components

**Files:**
- Create: `client/src/components/ui/Button.tsx`
- Create: `client/src/components/ui/Input.tsx`
- Create: `client/src/components/ui/Modal.tsx`
- Create: `client/src/components/ui/ThemeToggle.tsx`

- [ ] **Step 1: Write Button.tsx**

```typescript
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variants: Record<string, string> = {
  primary: 'bg-primary hover:bg-primary-light text-white',
  secondary: 'bg-surface-light hover:bg-[#353560] text-white border border-[#353560]',
  ghost: 'bg-transparent hover:bg-surface-light text-muted hover:text-white',
  danger: 'bg-danger hover:bg-[#f9859e] text-white',
};

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`font-medium transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Write Input.tsx**

```typescript
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm text-muted mb-1">{label}</label>}
    <input
      ref={ref}
      className={`w-full bg-surface-light border border-[#353560] rounded-lg px-4 py-2.5 text-white placeholder-muted focus:outline-none focus:border-primary transition-colors ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    />
    {error && <p className="text-danger text-xs mt-1">{error}</p>}
  </div>
));

export default Input;
```

- [ ] **Step 3: Write Modal.tsx**

```typescript
import { useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = '' };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-surface border border-[#353560] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          >
            {title && <h2 className="text-lg font-bold mb-4">{title}</h2>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Write ThemeToggle.tsx**

```typescript
import { useThemeStore } from '../../stores/themeStore';

export default function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <button
      onClick={toggle}
      className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-light hover:bg-[#353560] transition-colors"
      title={theme === 'dark' ? '切换亮色模式' : '切换暗黑模式'}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/components/ui/ && git commit -m "feat: add base UI components (Button, Input, Modal, ThemeToggle)"
```

---

### Task 20: AuthLayout, LoginPage, RegisterPage

**Files:**
- Create: `client/src/components/layout/AuthLayout.tsx`
- Create: `client/src/pages/LoginPage.tsx`
- Create: `client/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Write AuthLayout.tsx**

```typescript
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary-light bg-clip-text text-transparent">
            智日程
          </h1>
          <p className="text-muted mt-2">智能管理你的每一天</p>
        </div>
        <div className="bg-surface border border-[#353560] rounded-2xl p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write LoginPage.tsx**

```typescript
import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError, hydrate } = useAuthStore();
  const navigate = useNavigate();

  hydrate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {}
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">登录</h2>
      {error && <p className="text-danger text-sm mb-4 bg-danger/10 p-3 rounded-lg">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
        <Input label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码" required />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </form>
      <p className="text-muted text-sm text-center mt-4">
        还没有账号？<Link to="/register" className="text-primary hover:underline">注册</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Write RegisterPage.tsx**

```typescript
import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading, error, clearError, hydrate } = useAuthStore();
  const navigate = useNavigate();

  hydrate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register(email, password, name);
      navigate('/', { replace: true });
    } catch {}
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">注册</h2>
      {error && <p className="text-danger text-sm mb-4 bg-danger/10 p-3 rounded-lg">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="昵称" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" required />
        <Input label="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
        <Input label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少6位密码" required minLength={6} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '注册中...' : '注册'}
        </Button>
      </form>
      <p className="text-muted text-sm text-center mt-4">
        已有账号？<Link to="/login" className="text-primary hover:underline">登录</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/components/layout/AuthLayout.tsx client/src/pages/LoginPage.tsx client/src/pages/RegisterPage.tsx && git commit -m "feat: add AuthLayout and login/register pages"
```

---

### Task 21: AppLayout and Sidebar

**Files:**
- Create: `client/src/components/layout/Sidebar.tsx`
- Create: `client/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Write Sidebar.tsx**

```typescript
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ThemeToggle from '../ui/ThemeToggle';

const navItems = [
  { to: '/', label: '今日概览', icon: '📋' },
  { to: '/calendar', label: '日历', icon: '📅' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 h-screen bg-surface border-r border-[#252547] flex flex-col fixed left-0 top-0 z-40">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          智日程
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-muted hover:text-white hover:bg-surface-light'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#252547] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="text-sm text-white truncate">{user?.name || '用户'}</span>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-muted hover:text-danger transition-colors px-2"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Write AppLayout.tsx**

```typescript
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-6 lg:p-8 max-md:ml-0 max-md:pb-20">
        <Outlet />
      </main>
      {/* Mobile bottom nav */}
      <nav className="hidden max-md:flex fixed bottom-0 left-0 right-0 bg-surface border-t border-[#252547] z-40 justify-around py-2">
        <a href="/" className="flex flex-col items-center text-xs text-muted hover:text-primary px-4 py-1">
          <span className="text-lg">📋</span>概览
        </a>
        <a href="/calendar" className="flex flex-col items-center text-xs text-muted hover:text-primary px-4 py-1">
          <span className="text-lg">📅</span>日历
        </a>
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/components/layout/ && git commit -m "feat: add AppLayout with Sidebar and mobile bottom nav"
```

---

### Task 22: TaskCard and TaskList components

**Files:**
- Create: `client/src/components/tasks/TaskCard.tsx`
- Create: `client/src/components/tasks/TaskList.tsx`

- [ ] **Step 1: Write TaskCard.tsx**

```typescript
import { motion } from 'framer-motion';
import type { Task } from '../../types';
import { PRIORITY_COLORS, STATUS_LABELS } from '../../types';
import { useTaskStore } from '../../stores/taskStore';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  compact?: boolean;
}

export default function TaskCard({ task, onClick, compact }: TaskCardProps) {
  const updateStatus = useTaskStore((s) => s.updateStatus);

  const statusCycle: Record<string, string> = {
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateStatus(task.id, statusCycle[task.status]);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className={`bg-surface-light border border-[#252547] rounded-xl p-3 cursor-pointer hover:border-primary/50 transition-colors group ${task.status === 'done' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleStatusClick}
          className="mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors"
          style={{
            borderColor: task.status === 'done' ? '#565f89' : PRIORITY_COLORS[task.priority],
            backgroundColor: task.status === 'done' ? '#565f89' : task.status === 'in_progress' ? PRIORITY_COLORS[task.priority] : 'transparent',
          }}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${task.status === 'done' ? 'line-through text-muted' : 'text-white'}`}>
            {task.title}
          </p>
          {!compact && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {task.dueTime && <span className="text-xs text-muted">{task.dueTime}</span>}
              {task.category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{task.category}</span>
              )}
              <span className="text-xs text-muted">{STATUS_LABELS[task.status]}</span>
            </div>
          )}
        </div>
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          title={task.priority}
        />
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Write TaskList.tsx**

```typescript
import { AnimatePresence } from 'framer-motion';
import type { Task } from '../../types';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  emptyMessage?: string;
}

export default function TaskList({ tasks, onTaskClick, emptyMessage = '暂无任务' }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center text-muted py-12">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/components/tasks/TaskCard.tsx client/src/components/tasks/TaskList.tsx && git commit -m "feat: add TaskCard and TaskList components"
```

---

### Task 23: SmartInput component

**Files:**
- Create: `client/src/components/SmartInput.tsx`

- [ ] **Step 1: Write SmartInput.tsx**

```typescript
import { useState, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../stores/taskStore';
import type { ParsedTask } from '../types';
import Button from './ui/Button';

interface SmartInputProps {
  mode?: 'single' | 'extract';
}

export default function SmartInput({ mode = 'single' }: SmartInputProps) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [parsedList, setParsedList] = useState<ParsedTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { parseNLP, extractNLP, confirmNLP, fetchTasks } = useTaskStore();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      if (mode === 'extract') {
        const result = await extractNLP(text);
        setParsedList(result.tasks);
      } else {
        const result = await parseNLP(text);
        setParsed(result);
      }
    } catch {
      setError('AI 解析失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    const tasks = parsed ? [parsed] : parsedList;
    if (tasks.length === 0) return;
    await confirmNLP(tasks);
    setText('');
    setParsed(null);
    setParsedList([]);
    await fetchTasks();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (parsed || parsedList.length > 0) {
        handleConfirm();
      } else {
        handleSubmit();
      }
    }
  };

  const toggleTaskInList = (index: number) => {
    setParsedList((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <div className="flex items-center gap-3 bg-surface-light border border-[#353560] rounded-2xl p-1.5 focus-within:border-primary transition-colors">
          <div className="pl-3 text-lg flex-shrink-0">✨</div>
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setParsed(null); setParsedList([]); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'extract' ? '粘贴通知/公文内容，AI 自动提取关键节点...' : '试试输入 "明天下午3点产品评审会 高优先级"...'}
            className="flex-1 bg-transparent text-white placeholder-muted text-sm py-2.5 focus:outline-none"
          />
          <Button size="sm" onClick={parsed || parsedList.length > 0 ? handleConfirm : handleSubmit} disabled={isProcessing || !text.trim()}>
            {isProcessing ? '解析中...' : parsed || parsedList.length > 0 ? '确认添加' : '解析'}
          </Button>
        </div>
      </div>

      {error && <p className="text-danger text-xs mt-2">{error}</p>}

      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 bg-surface-light border border-primary/30 rounded-xl p-4"
          >
            <p className="text-xs text-muted mb-2">AI 解析结果 — 按 Enter 确认，或修改后确认</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted">标题：</span><span className="text-white">{parsed.title}</span></div>
              <div><span className="text-muted">类型：</span><span className="text-white">{parsed.category || '通用'}</span></div>
              <div><span className="text-muted">日期：</span><span className="text-white">{parsed.dueDate || '待定'}</span></div>
              <div><span className="text-muted">时间：</span><span className="text-white">{parsed.dueTime || '全天'}</span></div>
              <div><span className="text-muted">优先级：</span><span className="text-white">{parsed.priority}</span></div>
            </div>
          </motion.div>
        )}

        {parsedList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 bg-surface-light border border-primary/30 rounded-xl p-4 space-y-2"
          >
            <p className="text-xs text-muted mb-2">提取到 {parsedList.length} 个关键节点 — 点击移除不需要的，然后按 Enter 确认</p>
            {parsedList.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm hover:bg-surface p-2 rounded-lg group">
                <button onClick={() => toggleTaskInList(i)} className="text-danger/50 hover:text-danger text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                <span className="flex-1 text-white">{item.title}</span>
                <span className="text-muted text-xs">{item.dueDate}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{item.category}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/components/SmartInput.tsx && git commit -m "feat: add SmartInput with NLP parse/extract and confirm flow"
```

---

### Task 24: MiniCalendar

**Files:**
- Create: `client/src/components/calendar/MiniCalendar.tsx`

- [ ] **Step 1: Write MiniCalendar.tsx**

```typescript
import { useMemo } from 'react';
import { useTaskStore } from '../../stores/taskStore';

interface MiniCalendarProps {
  onDateSelect?: (date: string) => void;
}

export default function MiniCalendar({ onDateSelect }: MiniCalendarProps) {
  const { selectedDate, setSelectedDate, tasks } = useTaskStore();
  const today = new Date();
  const [year, month] = selectedDate.split('-').map(Number);

  const days = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay();
    const result: (number | null)[] = [];

    for (let i = 0; i < startPad; i++) result.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) result.push(d);
    return result;
  }, [year, month]);

  const datesWithTasks = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.dueDate) set.add(t.dueDate);
    });
    return set;
  }, [tasks]);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  const isSelected = (d: number) => {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return ds === selectedDate;
  };

  const handleClick = (d: number) => {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    setSelectedDate(ds);
    onDateSelect?.(ds);
  };

  const changeMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-surface border border-[#252547] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => changeMonth(-1)} className="text-muted hover:text-white text-sm">&lt;</button>
        <span className="text-sm font-medium">{year}年{month}月</span>
        <button onClick={() => changeMonth(1)} className="text-muted hover:text-white text-sm">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((d) => (
          <div key={d} className="text-xs text-muted py-1">{d}</div>
        ))}
        {days.map((d, i) => (
          <div key={i} className="py-1">
            {d !== null ? (
              <button
                onClick={() => handleClick(d)}
                className={`w-8 h-8 text-xs rounded-lg flex items-center justify-center transition-all relative ${
                  isSelected(d)
                    ? 'bg-primary text-white font-bold'
                    : isToday(d)
                    ? 'bg-accent/20 text-accent font-bold'
                    : 'text-white hover:bg-surface-light'
                }`}
              >
                {d}
                {datesWithTasks.has(
                  `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                ) && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            ) : (
              <span className="w-8 h-8 block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/components/calendar/MiniCalendar.tsx && git commit -m "feat: add MiniCalendar component"
```

---

### Task 25: Calendar views (Day, Week, Month)

**Files:**
- Create: `client/src/components/calendar/DayView.tsx`
- Create: `client/src/components/calendar/WeekView.tsx`
- Create: `client/src/components/calendar/MonthView.tsx`

- [ ] **Step 1: Write DayView.tsx**

```typescript
import { useMemo } from 'react';
import type { Task } from '../../types';

interface DayViewProps {
  date: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00-20:00

export default function DayView({ date, tasks, onTaskClick }: DayViewProps) {
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === date).sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || '')),
    [tasks, date]
  );

  return (
    <div>
      <div className="text-lg font-bold mb-4">{date}</div>
      {dayTasks.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">当天没有日程安排</p>
      ) : (
        <div>
          {HOURS.map((hour) => {
            const hourStr = `${String(hour).padStart(2, '0')}:00`;
            const hourTasks = dayTasks.filter((t) => t.dueTime && t.dueTime.startsWith(String(hour).padStart(2, '0')));
            return (
              <div key={hour} className="flex border-t border-[#252547] min-h-[56px]">
                <div className="w-16 text-xs text-muted py-3 flex-shrink-0">{hourStr}</div>
                <div className="flex-1 py-1 space-y-1">
                  {hourTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="bg-primary/20 border-l-2 border-primary rounded-r-lg px-3 py-2 cursor-pointer hover:bg-primary/30 transition-colors"
                      style={{ borderLeftColor: task.priority === 'high' ? '#f7768e' : task.priority === 'medium' ? '#e2b714' : '#7aa2f7' }}
                    >
                      <span className="text-sm">{task.title}</span>
                      {task.dueTime && <span className="text-xs text-muted ml-2">{task.dueTime}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write WeekView.tsx**

```typescript
import { useMemo } from 'react';
import type { Task } from '../../types';

interface WeekViewProps {
  selectedDate: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

function getWeekDates(dateStr: string): string[] {
  const d = new Date(dateStr);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt.toISOString().slice(0, 10);
  });
}

export default function WeekView({ selectedDate, tasks, onTaskClick }: WeekViewProps) {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const dates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dates.map((date, i) => (
          <div key={date} className={`text-center p-2 rounded-lg text-sm ${date === selectedDate ? 'bg-primary/20 text-primary font-bold' : 'text-muted'}`}>
            <div>{weekDays[i]}</div>
            <div>{date.slice(8)}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const dayTasks = tasks.filter((t) => t.dueDate === date);
          return (
            <div key={date} className="min-h-[120px] bg-surface-light rounded-lg p-2 space-y-1">
              {dayTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="text-xs bg-primary/20 px-2 py-1 rounded cursor-pointer hover:bg-primary/30 truncate"
                  style={{ borderLeft: `2px solid ${task.priority === 'high' ? '#f7768e' : task.priority === 'medium' ? '#e2b714' : '#7aa2f7'}` }}
                >
                  {task.title}
                </div>
              ))}
              {dayTasks.length > 3 && <p className="text-xs text-muted pl-2">+{dayTasks.length - 3} 项</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write MonthView.tsx**

```typescript
import { useMemo } from 'react';
import type { Task } from '../../types';

interface MonthViewProps {
  year: number;
  month: number;
  selectedDate: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateSelect: (date: string) => void;
}

export default function MonthView({ year, month, selectedDate, tasks, onTaskClick, onDateSelect }: MonthViewProps) {
  const days = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay();
    const result: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) result.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) result.push(d);
    return result;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.dueDate) {
        if (!map[t.dueDate]) map[t.dueDate] = [];
        map[t.dueDate].push(t);
      }
    });
    return map;
  }, [tasks]);

  const fmt = (d: number) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="text-center text-xs text-muted py-2 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square bg-surface-light/30 rounded-lg" />;
          const ds = fmt(d);
          const dayTasks = tasksByDate[ds] || [];
          const isSelected = ds === selectedDate;
          const isToday = ds === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={i}
              onClick={() => onDateSelect(ds)}
              className={`aspect-square bg-surface-light rounded-lg p-1 cursor-pointer hover:border-primary/50 border border-transparent transition-colors overflow-hidden ${isSelected ? 'border-primary bg-primary/10' : ''} ${isToday ? 'ring-1 ring-accent' : ''}`}
            >
              <div className={`text-xs mb-0.5 px-1 ${isToday ? 'text-accent font-bold' : 'text-muted'}`}>{d}</div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    className="text-[10px] px-1 py-0.5 rounded truncate bg-primary/20 text-primary cursor-pointer"
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 2 && <div className="text-[10px] text-muted px-1">+{dayTasks.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/components/calendar/DayView.tsx client/src/components/calendar/WeekView.tsx client/src/components/calendar/MonthView.tsx && git commit -m "feat: add DayView, WeekView, and MonthView calendar components"
```

---

### Task 26: TaskForm and TaskDetailDrawer

**Files:**
- Create: `client/src/components/tasks/TaskForm.tsx`
- Create: `client/src/components/tasks/TaskDetailDrawer.tsx`

- [ ] **Step 1: Write TaskForm.tsx**

```typescript
import { useState, FormEvent } from 'react';
import type { Task } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface TaskFormProps {
  initial?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function TaskForm({ initial, onSubmit, onCancel, isLoading }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [priority, setPriority] = useState(initial?.priority || 'medium');
  const [category, setCategory] = useState(initial?.category || '通用');
  const [dueDate, setDueDate] = useState(initial?.dueDate || '');
  const [dueTime, setDueTime] = useState(initial?.dueTime || '');
  const [status, setStatus] = useState(initial?.status || 'todo');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({ title: title.trim(), description: description.trim() || undefined, priority: priority as Task['priority'], category, dueDate: dueDate || undefined, dueTime: dueTime || undefined, status: status as Task['status'] });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="任务标题" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入任务标题" required />
      <div>
        <label className="block text-sm text-muted mb-1">备注</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="添加备注..."
          className="w-full bg-surface-light border border-[#353560] rounded-lg px-4 py-2.5 text-white placeholder-muted focus:outline-none focus:border-primary transition-colors resize-none h-20 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-muted mb-1">优先级</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary">
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">类型</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary">
            <option value="通用">通用</option>
            <option value="资料收集">资料收集</option>
            <option value="审核">审核</option>
            <option value="会议">会议</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">日期</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">时间</label>
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
            className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">状态</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary">
          <option value="todo">待办</option>
          <option value="in_progress">进行中</option>
          <option value="done">完成</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" disabled={isLoading}>{isLoading ? '保存中...' : '保存'}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Write TaskDetailDrawer.tsx**

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../../types';
import { useTaskStore } from '../../stores/taskStore';
import TaskForm from './TaskForm';
import Button from '../ui/Button';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export default function TaskDetailDrawer({ task, open, onClose }: TaskDetailDrawerProps) {
  const { updateTask, deleteTask, fetchTasks } = useTaskStore();

  if (!task) return null;

  const handleUpdate = async (data: Partial<Task>) => {
    await updateTask(task.id, data);
    onClose();
    await fetchTasks();
  };

  const handleDelete = async () => {
    if (!confirm('确定删除这个任务？')) return;
    await deleteTask(task.id);
    onClose();
    await fetchTasks();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-[#252547] z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">任务详情</h2>
                <button onClick={onClose} className="text-muted hover:text-white text-xl">&times;</button>
              </div>
              <TaskForm initial={task} onSubmit={handleUpdate} onCancel={onClose} />
              <div className="mt-6 pt-6 border-t border-[#252547]">
                <Button variant="danger" onClick={handleDelete} className="w-full">删除任务</Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/components/tasks/TaskForm.tsx client/src/components/tasks/TaskDetailDrawer.tsx && git commit -m "feat: add TaskForm and TaskDetailDrawer"
```

---

### Task 27: DashboardPage

**Files:**
- Create: `client/src/pages/DashboardPage.tsx`
- Create: `client/src/components/ui/Drawer.tsx`

- [ ] **Step 1: Write Drawer.tsx (generic)**

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function Drawer({ open, onClose, children, title }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-black/40 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-[#252547] z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{title || ''}</h2>
                <button onClick={onClose} className="text-muted hover:text-white text-xl">&times;</button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Write DashboardPage.tsx**

```typescript
import { useEffect, useState, useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import type { Task } from '../types';
import SmartInput from '../components/SmartInput';
import TaskList from '../components/tasks/TaskList';
import MiniCalendar from '../components/calendar/MiniCalendar';
import TaskForm from '../components/tasks/TaskForm';
import Drawer from '../components/ui/Drawer';

export default function DashboardPage() {
  const { tasks, selectedDate, isLoading, fetchTasks, createTask, setSelectedDate } = useTaskStore();
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks({ date: selectedDate });
  }, [selectedDate]);

  useEffect(() => {
    if (user && !useAuthStore.getState().user) {
      fetchTasks({ date: selectedDate });
    }
  }, [user]);

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === selectedDate),
    [tasks, selectedDate]
  );

  const unscheduledTasks = useMemo(
    () => tasks.filter((t) => !t.dueDate),
    [tasks]
  );

  const doneCount = todayTasks.filter((t) => t.status === 'done').length;
  const completionRate = todayTasks.length > 0 ? Math.round((doneCount / todayTasks.length) * 100) : 0;

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    fetchTasks({ date });
  };

  const handleFormSubmit = async (data: Partial<Task>) => {
    if (formMode === 'create') {
      await createTask({ ...data, dueDate: selectedDate });
    } else if (editingTask) {
      const { updateTask } = useTaskStore.getState();
      await updateTask(editingTask.id, data);
    }
    setShowForm(false);
    setEditingTask(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">
        你好，{user?.name || '用户'} 👋
      </h2>
      <p className="text-muted text-sm mb-6">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <SmartInput />

      <div className="flex gap-6 max-lg:flex-col">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">今日任务</h3>
            <button onClick={() => { setFormMode('create'); setEditingTask(null); setShowForm(true); }}
              className="text-sm text-primary hover:underline">+ 添加</button>
          </div>

          {isLoading ? (
            <div className="text-center text-muted py-12">加载中...</div>
          ) : (
            <TaskList
              tasks={todayTasks}
              onTaskClick={handleTaskClick}
              emptyMessage="今天还没有任务，用上方输入框快速添加"
            />
          )}

          {unscheduledTasks.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">待安排任务</h3>
              <TaskList tasks={unscheduledTasks} onTaskClick={handleTaskClick} />
            </div>
          )}
        </div>

        <div className="w-72 flex-shrink-0 max-lg:w-full space-y-4">
          <MiniCalendar onDateSelect={handleDateSelect} />

          <div className="bg-gradient-to-br from-surface-light to-[#1a1b3a] rounded-xl p-5">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">今日完成率</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {completionRate}%
            </p>
            <div className="mt-3 bg-[#1e1e3a] rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">
              {doneCount}/{todayTasks.length} 项已完成
            </p>
          </div>
        </div>
      </div>

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={formMode === 'create' ? '新建任务' : '编辑任务'}>
        <TaskForm
          initial={formMode === 'edit' ? editingTask || undefined : { dueDate: selectedDate }}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      </Drawer>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/pages/DashboardPage.tsx client/src/components/ui/Drawer.tsx && git commit -m "feat: add DashboardPage with SmartInput, task list, calendar, and completion stats"
```

---

### Task 28: CalendarPage

**Files:**
- Create: `client/src/pages/CalendarPage.tsx`

- [ ] **Step 1: Write CalendarPage.tsx**

```typescript
import { useEffect, useState, useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore';
import type { Task } from '../types';
import DayView from '../components/calendar/DayView';
import WeekView from '../components/calendar/WeekView';
import MonthView from '../components/calendar/MonthView';
import TaskDetailDrawer from '../components/tasks/TaskDetailDrawer';

type ViewMode = 'day' | 'week' | 'month';

export default function CalendarPage() {
  const { tasks, selectedDate, setSelectedDate, fetchTasks } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const [year, month] = selectedDate.split('-').map(Number);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    if (viewMode === 'month') setViewMode('day');
    fetchTasks({ date });
  };

  const tabs: { key: ViewMode; label: string }[] = [
    { key: 'day', label: '日' },
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">日历</h2>
        <div className="flex bg-surface-light rounded-xl p-1 gap-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-all ${viewMode === key ? 'bg-primary text-white font-medium' : 'text-muted hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-[#252547] rounded-2xl p-6">
        {viewMode === 'day' && <DayView date={selectedDate} tasks={tasks} onTaskClick={handleTaskClick} />}
        {viewMode === 'week' && <WeekView selectedDate={selectedDate} tasks={tasks} onTaskClick={handleTaskClick} />}
        {viewMode === 'month' && (
          <MonthView
            year={year}
            month={month}
            selectedDate={selectedDate}
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onDateSelect={handleDateSelect}
          />
        )}
      </div>

      <TaskDetailDrawer task={selectedTask} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add client/src/pages/CalendarPage.tsx && git commit -m "feat: add CalendarPage with day/week/month view toggle"
```

---

### Task 29: Verify full-stack integration

**Files:** None (verification only)

- [ ] **Step 1: Start PostgreSQL and verify connection**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng/server && npx prisma db push
```

Expected: "Your database is now in sync with your schema."

- [ ] **Step 2: Start server**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng/server && npm run dev
```

Expected: "Server running on http://localhost:3001"

- [ ] **Step 3: Test health endpoint**

```bash
curl http://localhost:3001/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Test auth flow**

```bash
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"123456\",\"name\":\"Test\"}"
```

Expected: 201 with user + tokens.

- [ ] **Step 5: Start client**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng/client && npm run dev
```

Expected: Vite dev server on http://localhost:5173

- [ ] **Step 6: Verify UI renders**

Open http://localhost:5173 in browser. Verify:
- Login page renders with gradient title
- Can log in with demo@zhi.com / 123456
- Dashboard shows tasks from seed data
- SmartInput renders
- Calendar page loads with week view
- Theme toggle works (dark/light)

- [ ] **Step 7: Fix any issues and commit**

```bash
cd C:/Users/HUAWEI/Desktop/zhi-richeng && git add -A && git commit -m "feat: complete Phase 1 MVP integration verified"
```
