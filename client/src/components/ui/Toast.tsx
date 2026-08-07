import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToastStore, type ToastTone } from '../../stores/toastStore';

const toneConfig: Record<ToastTone, { icon: typeof CheckCircle2; color: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-500' },
  error: { icon: XCircle, color: 'text-red-500' },
  info: { icon: Info, color: 'text-brand-500' },
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const { icon: Icon, color } = toneConfig[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
              <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="关闭"
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
