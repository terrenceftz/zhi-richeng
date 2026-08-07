import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getTasks, getTask, createTask, updateTask, deleteTask,
  updateStatus, reorder, confirmNLP, smart, parseNLP, extractNLP, decompose,
  queryNL, checkConflictAPI, getOverdue,
} from '../controllers/tasks.controller';

const router = Router();
router.use(authMiddleware);

// LLM 类接口限流：每 IP 每分钟 30 次
const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI 请求过于频繁，请稍后再试' },
});

router.get('/', getTasks);
router.get('/overdue', getOverdue);
router.post('/', createTask);
router.post('/nlp', llmLimiter, parseNLP);
router.post('/nlp/extract', llmLimiter, extractNLP);
router.post('/nlp/confirm', llmLimiter, confirmNLP);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/:id/decompose', llmLimiter, decompose);
router.post('/smart', llmLimiter, smart);
router.post('/query', llmLimiter, queryNL);
router.post('/:id/conflict', llmLimiter, checkConflictAPI);
router.patch('/:id/status', updateStatus);
router.patch('/reorder', reorder);

export default router;
