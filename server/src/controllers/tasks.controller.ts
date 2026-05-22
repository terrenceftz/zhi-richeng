import { Request, Response, NextFunction } from 'express';
import * as tasksService from '../services/tasks.service';
import * as llmService from '../services/llm.service';

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
