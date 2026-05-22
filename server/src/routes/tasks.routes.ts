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
