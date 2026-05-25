import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';

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

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      const { data } = await client.get('/ideas');
      setIdeas(data.ideas);
    } catch {}
  };

  const addIdea = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const { data } = await client.post('/ideas', { content: input.trim() });
      setIdeas([data.idea, ...ideas]);
      setInput('');
      inputRef.current?.focus();
    } catch {} finally {
      setLoading(false);
    }
  };

  const deleteIdea = async (id: string) => {
    try {
      await client.delete(`/ideas/${id}`);
      setIdeas(ideas.filter((i) => i.id !== id));
    } catch {}
  };

  const timeAgo = (d: string) => {
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
      <h2 className="text-2xl font-bold mb-1">灵感记录</h2>
      <p className="text-muted text-sm mb-6">随时记录一闪而过的想法，也可以在飞书中 @机器人 发送消息自动记录</p>

      {/* Input */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex-1 flex items-center gap-2 bg-surface-light border border-border-light rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
          <span className="text-lg flex-shrink-0">💡</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addIdea(); }
            }}
            placeholder="记录一个想法..."
            className="flex-1 bg-transparent text-text placeholder-muted text-sm focus:outline-none"
          />
        </div>
        <button
          onClick={addIdea}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          记录
        </button>
      </div>

      {/* List */}
      <AnimatePresence>
        {ideas.length === 0 ? (
          <div className="text-center text-muted py-16">
            <p className="text-5xl mb-4">💡</p>
            <p className="text-sm">还没有灵感，开始记录吧</p>
            <p className="text-xs text-muted mt-2">飞书 @机器人 发送消息也会自动记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <motion.div
                key={idea.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="bg-surface-light border border-border rounded-xl p-4 group hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-sm flex-shrink-0">
                    {idea.source === 'feishu' ? '📱' : '💻'}
                  </span>
                  <p className="flex-1 text-sm text-text whitespace-pre-wrap">{idea.content}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted">{timeAgo(idea.createdAt)}</span>
                    <button
                      onClick={() => deleteIdea(idea.id)}
                      className="text-muted hover:text-danger text-xs opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ✕
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
