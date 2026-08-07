import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (tone: ToastTone, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (tone, message) => {
    const id = `toast-${++counter}`;
    set({ toasts: [...get().toasts, { id, tone, message }] });
    setTimeout(() => get().dismiss(id), 3500);
  },
  success: (m) => get().show('success', m),
  error: (m) => get().show('error', m),
  info: (m) => get().show('info', m),
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
