import { useState } from 'react';
import client from '../api/client';

export default function AIChatBar() {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await client.post('/tasks/query', { question: q });
      setAnswer(data.answer);
    } catch {
      setAnswer('查询失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 bg-surface-light border border-border-light rounded-xl px-3 py-2">
        <span className="text-sm flex-shrink-0">🤖</span>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setAnswer(''); }}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder='问问 AI，如"这周有几个高优任务？"'
          className="flex-1 bg-transparent text-text placeholder-muted text-sm py-1.5 focus:outline-none"
        />
        <button onClick={ask} disabled={loading} className="text-xs text-primary hover:underline flex-shrink-0">
          {loading ? '...' : '查询'}
        </button>
      </div>
      {answer && (
        <p className="mt-2 text-sm text-muted bg-surface-light border border-border rounded-lg px-3 py-2">
          {answer}
        </p>
      )}
    </div>
  );
}
