import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Send, Smartphone, Monitor, Trash2 } from 'lucide-react';
import client from '../api/client';
import { useToastStore } from '../stores/toastStore';
import { EmptyState } from '../components/ui/Feedback';

interface Idea {
  id: string;
  content: string;
  source: string;
  createdAt: string;
}

export default function InspirationPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToastStore();

  const loadIdeas = async () => {
    try {
      const { data } = await client.get('/ideas');
      setIdeas(data.ideas);
    } catch {
      toast.error('加载灵感失败');
    }
  };

  useEffect(() => {
    // 数据获取是 effect 的合法用途；此处关闭 react-hooks 编译器的过严规则
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    loadIdeas();
  }, []);

  const addIdea = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const { data } = await client.post('/ideas', { content: input.trim() });
      setIdeas([data.idea, ...ideas]);
      setInput('');
      inputRef.current?.focus();
    } catch {
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const deleteIdea = async (id: string) => {
    try {
      await client.delete(`/ideas/${id}`);
      setIdeas(ideas.filter((i) => i.id !== id));
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  const timeAgo = (d: string) => {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(d).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min} 分钟前`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} 小时前`;
    return new Date(d).toLocaleDateString('zh-CN');
  };

  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        <Lightbulb className="h-6 w-6 text-amber-500" />
        灵感记录
      </h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">随时记录一闪而过的想法，也可以在飞书中 @机器人 发送消息自动记录</p>

      <div className="mb-8 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900">
          <Lightbulb className="h-5 w-5 shrink-0 text-amber-500" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addIdea(); } }}
            placeholder="记录一个想法..."
            className="flex-1 bg-transparent py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          />
        </div>
        <button
          onClick={addIdea}
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          记录
        </button>
      </div>

      <AnimatePresence>
        {ideas.length === 0 ? (
          <EmptyState title="还没有灵感，开始记录吧" hint="飞书 @机器人 发送消息也会自动记录" icon={<Lightbulb className="h-6 w-6" />} />
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <motion.div
                key={idea.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                    {idea.source === 'feishu' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </span>
                  <p className="flex-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{idea.content}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">{timeAgo(idea.createdAt)}</span>
                    <button
                      onClick={() => deleteIdea(idea.id)}
                      aria-label="删除"
                      className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
