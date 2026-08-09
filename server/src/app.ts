import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/tasks.routes';
import userRoutes from './routes/users.routes';
import settingsRoutes from './routes/settings.routes';
import imRoutes from './routes/im.routes';
import ideasRoutes from './routes/ideas.routes';
import backupRoutes from './routes/backup.routes';
import migrateRoutes from './routes/migrate.routes';
import studentsRoutes from './routes/students.routes';
import counselingRoutes from './routes/counseling.routes';
import noticesRoutes from './routes/notices.routes';
import mentalRoutes from './routes/mental.routes';
import statsRoutes from './routes/stats.routes';
import bingRoutes from './routes/bing.routes';
import auditRoutes from './routes/audit.routes';
import recurringRoutes from './routes/recurring.routes';
import helmet from 'helmet';

const app = express();

// 生产环境在可信反向代理（nginx）之后才启用 trust proxy；
// 否则 X-Forwarded-For 可被客户端伪造从而绕过 express-rate-limit 的 IP 限流
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 安全响应头：X-Content-Type-Options / X-Frame-Options / Referrer-Policy 等
// 关闭 CSP 以免影响 Vite 开发热更新与第三方脚本注入
app.use(helmet({ contentSecurityPolicy: false }));

// 请求日志：开发环境用 dev 格式，生产环境用 combined
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/im', imRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/counseling', counselingRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/mental', mentalRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/bing-wallpaper', bingRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/recurring', recurringRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 生产环境：托管前端构建产物（单容器部署），SPA 回退到 index.html
if (process.env.NODE_ENV === 'production') {
  const path = require('path') as typeof import('path');
  const fs = require('fs') as typeof import('fs');
  const clientDist = path.resolve(process.cwd(), '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
    console.log(`[静态] 托管前端构建产物: ${clientDist}`);
  } else {
    console.warn(`[静态] 未找到前端构建产物: ${clientDist}`);
  }
}

app.use(errorMiddleware);

export default app;
