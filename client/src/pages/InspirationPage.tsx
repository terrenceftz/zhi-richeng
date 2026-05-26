import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Send, Smartphone, Monitor, Trash2 } from 'lucide-react';
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

  const cardColors = ['bg-rose', 'bg-blue', 'bg-mint', 'bg-cream', 'bg-lavender', 'bg-coral/20'];
  const getCardColor = (index: number) => cardColors[index % cardColors.length];

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
      <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
        <Lightbulb className="w-6 h-6" />
        灵感记录
      </h2>
      <p className="font-bold text-sm opacity-50 mb-6">随时记录一闪而过的想法，也可以在飞书中 @机器人 发送消息自动记录</p>

      {/* Input */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex-1 flex items-center gap-2 bg-white border-2 border-black rounded-xl px-3 py-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:border-black transition-all">
          <Lightbulb className="w-5 h-5 flex-shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addIdea(); }
            }}
            placeholder="记录一个想法..."
            className="flex-1 bg-transparent placeholder-gray-400 text-sm py-1 focus:outline-none font-bold"
          />
        </div>
        <button
          onClick={addIdea}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-black text-white text-sm rounded-xl font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 flex items-center gap-2"
        >
          <Send className="w-3.5 h-3.5" />
          记录
        </button>
      </div>

      {/* List */}
      <AnimatePresence>
        {ideas.length === 0 ? (
          <div className="text-center py-16">
            <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-bold opacity-50">还没有灵感，开始记录吧</p>
            <p className="text-xs font-bold opacity-40 mt-2">飞书 @机器人 发送消息也会自动记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea, i) => (
              <motion.div
                key={idea.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className={`${getCardColor(i)} border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all`}
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex-shrink-0 w-8 h-8 bg-white border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {idea.source === 'feishu' ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Monitor className="w-4 h-4" />
                    )}
                  </span>
                  <p className="flex-1 text-base font-black leading-relaxed">{idea.content}</p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-bold bg-white border-2 border-black rounded-full px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{timeAgo(idea.createdAt)}</span>
                    <button
                      onClick={() => deleteIdea(idea.id)}
                      className="opacity-0 group-hover:opacity-100 transition-all bg-white border-2 border-black rounded-xl p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-rose"
                    >
                      <Trash2 className="w-4 h-4" />
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
