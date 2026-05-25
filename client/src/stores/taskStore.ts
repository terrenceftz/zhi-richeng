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

  parseNLP: async (text) => {
    const r = await tasksApi.parseNLP(text);
    return r.parsed;
  },

  extractNLP: (text) => tasksApi.extractNLP(text),

  confirmNLP: async (tasks) => {
    set({ error: null });
    try {
      const result = await tasksApi.confirmNLP(tasks);
      set({ tasks: [...get().tasks, ...result.tasks] });
    } catch (err: any) {
      const msg = err.response?.data?.message || '保存任务失败';
      set({ error: msg });
      throw err;
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  clearError: () => set({ error: null }),
}));
