import { useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, Send } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import type { ParsedTask } from '../types';
import Button from './ui/Button';
import client from '../api/client';

export default function SmartBar() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{
    type: 'schedule' | 'query' | 'chat';
    parsed?: ParsedTask;
    answer?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirmNLP, fetchTasks } = useTaskStore();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await client.post('/tasks/smart', { text: text.trim() });
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!result?.parsed) return;
    setIsSaving(true);
    setError(null);
    try {
      await confirmNLP([result.parsed]);
      const d = result.parsed.dueDate;
      const today = new Date().toISOString().slice(0, 10);
      let msg = '已添加到待安排任务';
      if (d && d !== today) {
        const dt = new Date(d);
        msg = `已添加到 ${dt.getMonth() + 1}月${dt.getDate()}日 的日程中`;
      } else if (d === today) {
        msg = '已添加到今日任务';
      }
      setSuccess(msg);
      setText('');
      setResult(null);
      await fetchTasks();
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (result?.type === 'schedule') {
        handleConfirm();
      } else {
        handleSubmit();
      }
    }
  };

  const placeholder = '添加日程、查询任务，或直接和我聊天...';

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 bg-white border-2 border-black rounded-2xl p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:border-black transition-all">
        <Sparkles className="ml-3 w-5 h-5 flex-shrink-0" />
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); setError(null); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-black placeholder-gray-400 text-sm py-2.5 focus:outline-none font-bold"
          disabled={isSaving}
        />
        <Button
          size="sm"
          onClick={result?.type === 'schedule' ? handleConfirm : handleSubmit}
          disabled={isProcessing || isSaving || !text.trim()}
        >
          {isProcessing ? '思考中...' : isSaving ? '保存中...' : result?.type === 'schedule' ? '确认添加' : '发送'}
        </Button>
      </div>

      {error && (
        <p className="text-red-500 text-xs mt-2 bg-red-50 border border-red-500 p-2 rounded-xl font-bold">{error}</p>
      )}
      {success && (
        <p className="text-green-600 text-xs mt-2 bg-green-50 border border-green-500 p-2 rounded-xl font-bold flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />{success}
        </p>
      )}

      <AnimatePresence>
        {result?.type === 'schedule' && result.parsed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <p className="text-xs text-gray-500 font-bold mb-2">AI 识别为日程 — 按 Enter 确认添加</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">标题：</span><span className="text-black font-bold">{result.parsed.title}</span></div>
              <div><span className="text-gray-500">类型：</span><span className="text-black font-bold">{result.parsed.category || '通用'}</span></div>
              <div><span className="text-gray-500">日期：</span><span className="text-black font-bold">{result.parsed.dueDate || '待定'}</span></div>
              <div><span className="text-gray-500">时间：</span><span className="text-black font-bold">{result.parsed.dueTime || '全天'}</span></div>
              <div><span className="text-gray-500">地点：</span><span className="text-black font-bold">{result.parsed.location || '未指定'}</span></div>
              <div><span className="text-gray-500">优先级：</span><span className="text-black font-bold">{result.parsed.priority === 'high' ? '高' : result.parsed.priority === 'medium' ? '中' : '低'}</span></div>
            </div>
          </motion.div>
        )}

        {(result?.type === 'query' || result?.type === 'chat') && result.answer && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <p className="text-xs text-gray-500 font-bold mb-2">{result.type === 'query' ? '查询结果' : 'AI 回复'}</p>
            <p className="text-sm text-black font-bold whitespace-pre-wrap">{result.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
