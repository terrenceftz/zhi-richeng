import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { KIRBY_STICKERS } from '../theme/KirbyDecorations';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  width?: string;
}

export default function Drawer({ open, onClose, children, title, width = 'max-w-md' }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const isKirby = useThemeStore((s) => s.palette === 'kirby');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevActive = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      prevActive?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title || '抽屉'}
            className={`fixed right-0 top-0 z-50 flex h-full w-full ${width} flex-col border-l border-slate-200 bg-white shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-900`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-2">
                {isKirby && <img src={KIRBY_STICKERS.kirbyWink} alt="" aria-hidden className="h-6 w-6 shrink-0 object-contain" />}
                <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
