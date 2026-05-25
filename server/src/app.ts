import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/tasks.routes';
import userRoutes from './routes/users.routes';
import settingsRoutes from './routes/settings.routes';
import imRoutes from './routes/im.routes';
import ideasRoutes from './routes/ideas.routes';

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/im', imRoutes);
app.use('/api/ideas', ideasRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorMiddleware);

export default app;
