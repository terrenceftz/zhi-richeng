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

const app = express();

app.set('trust proxy', 1);

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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorMiddleware);

export default app;
