import { useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, FileText, MessageCircle, X } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import type { ParsedTask } from '../types';
import Button from './ui/Button';
import client from '../api/client';

export default function SmartBar() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'chat' | 'extract'>('chat');
  const [result, setResult] = useState<{
    type: 'schedule' | 'query' | 'chat';
    parsed?: ParsedTask;
    answer?: string;
  } | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ParsedTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirmNLP, fetchTasks } = useTaskStore();

  const handleChatSubmit = async () => {
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

  const handleExtract = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);
    setExtractedTasks([]);
    try {
      const { data } = await client.post('/tasks/nlp/extract', { text: text.trim() });
      if (!data.tasks || data.tasks.length === 0) {
        setError('未提取到关键时间节点，试试用聊天空输入单条日程');
      } else {
        setExtractedTasks(data.tasks);
        setSelectedTasks(new Set(data.tasks.map((_: any, i: number) => i)));
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '提取失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSingle = async () => {
    if (!result?.parsed) return;
    setIsSaving(true);
    setError(null);
    try {
      await confirmNLP([result.parsed]);
      showSuccess(result.parsed.dueDate);
      setText('');
      setResult(null);
      await fetchTasks();
    } catch (e: any) {
      setError(e?.response?.data?.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmBatch = async () => {
    const tasks = extractedTasks.filter((_, i) => selectedTasks.has(i));
    if (tasks.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await confirmNLP(tasks);
      const dates = tasks.map((t) => t.dueDate).filter(Boolean);
      const today = new Date().toISOString().slice(0, 10);
      const nonToday = dates.filter((d) => d !== today);
      let msg = `已添加 ${tasks.length} 个任务`;
      if (nonToday.length > 0) {
        const d = new Date(nonToday[0]);
        msg += `，最近截止：${d.getMonth() + 1}月${d.getDate()}日`;
      }
      setSuccess(msg);
      setText('');
      setExtractedTasks([]);
      setSelectedTasks(new Set());
      await fetchTasks();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e?.response?.data?.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const showSuccess = (dueDate?: string | null) => {
    const today = new Date().toISOString().slice(0, 10);
    let msg = '已添加到待安排任务';
    if (dueDate && dueDate !== today) {
      const dt = new Date(dueDate);
      msg = `已添加到 ${dt.getMonth() + 1}月${dt.getDate()}日 的日程中`;
    } else if (dueDate === today) {
      msg = '已添加到今日任务';
    }
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (mode === 'extract') {
        e.preventDefault();
        if (extractedTasks.length > 0) handleConfirmBatch();
        else handleExtract();
      } else {
        e.preventDefault();
        if (result?.type === 'schedule') handleConfirmSingle();
        else handleChatSubmit();
      }
    }
  };

  const toggleTask = (i: number) => {
    const next = new Set(selectedTasks);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelectedTasks(next);
  };

  return (
    <div className="mb-6 overflow-hidden">
      {/* Mode toggle */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => { setMode('chat'); setResult(null); setExtractedTasks([]); }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
            mode === 'chat' ? 'bg-blue border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border-black/30 text-gray-500'
          }`}
        >
          <MessageCircle className="w-3 h-3" /> 聊天输入
        </button>
        <button
          onClick={() => { setMode('extract'); setResult(null); }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
            mode === 'extract' ? 'bg-cream border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border-black/30 text-gray-500'
          }`}
        >
          <FileText className="w-3 h-3" /> 文本提取
        </button>
      </div>

      {/* Input area */}
      {mode === 'chat' ? (
        <div className="flex items-center gap-3 bg-white border-2 border-black rounded-2xl p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:border-black transition-all">
          <Sparkles className="ml-3 w-5 h-5 flex-shrink-0" />
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="添加日程、查询任务，或直接和我聊天..."
            className="flex-1 bg-transparent text-black placeholder-gray-400 text-sm py-2.5 focus:outline-none font-bold"
            disabled={isSaving}
          />
          <Button
            size="sm"
            onClick={result?.type === 'schedule' ? handleConfirmSingle : handleChatSubmit}
            disabled={isProcessing || isSaving || !text.trim()}
          >
            {isProcessing ? '思考中...' : isSaving ? '保存中...' : result?.type === 'schedule' ? '确认添加' : '发送'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setExtractedTasks([]); setError(null); }}
            placeholder="粘贴通知、公文等长文本，AI 自动提取所有关键时间节点..."
            className="w-full bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none font-bold text-sm resize-none h-40 placeholder-gray-400"
            disabled={isSaving}
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={extractedTasks.length > 0 ? handleConfirmBatch : handleExtract}
              disabled={isProcessing || isSaving || !text.trim()}
            >
              {isProcessing ? '提取中...' : isSaving ? '保存中...' : extractedTasks.length > 0 ? `确认添加 (${selectedTasks.size}项)` : '提取日程'}
            </Button>
            {extractedTasks.length > 0 && (
              <button
                onClick={() => { setSelectedTasks(new Set(extractedTasks.map((_, i) => i))); }}
                className="text-xs font-bold underline"
              >全选</button>
            )}
          </div>
        </div>
      )}

      {/* Errors and success */}
      {error && (
        <p className="text-red-500 text-xs mt-2 bg-red-50 border border-red-500 p-2 rounded-xl font-bold">{error}</p>
      )}
      {success && (
        <p className="text-green-600 text-xs mt-2 bg-green-50 border border-green-500 p-2 rounded-xl font-bold flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />{success}
        </p>
      )}

      <AnimatePresence>
        {/* Chat mode: schedule result */}
        {mode === 'chat' && result?.type === 'schedule' && result.parsed && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mt-3 bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs text-gray-500 font-bold mb-2">AI 识别为日程 — 按 Enter 确认添加</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="truncate"><span className="text-gray-500">标题：</span><span className="text-black font-bold">{result.parsed.title}</span></div>
              <div><span className="text-gray-500">类型：</span><span className="text-black font-bold">{result.parsed.category || '通用'}</span></div>
              <div><span className="text-gray-500">日期：</span><span className="text-black font-bold">{result.parsed.dueDate || '待定'}</span></div>
              <div><span className="text-gray-500">时间：</span><span className="text-black font-bold">{result.parsed.dueTime || '全天'}</span></div>
              <div className="truncate"><span className="text-gray-500">地点：</span><span className="text-black font-bold">{result.parsed.location || '未指定'}</span></div>
              <div><span className="text-gray-500">优先级：</span><span className="text-black font-bold">{result.parsed.priority === 'high' ? '高' : result.parsed.priority === 'medium' ? '中' : '低'}</span></div>
            </div>
          </motion.div>
        )}

        {/* Chat mode: query/chat result */}
        {mode === 'chat' && (result?.type === 'query' || result?.type === 'chat') && result.answer && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mt-3 bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs text-gray-500 font-bold mb-2">{result.type === 'query' ? '查询结果' : 'AI 回复'}</p>
            <p className="text-sm text-black font-bold whitespace-pre-wrap break-words overflow-hidden">{result.answer}</p>
          </motion.div>
        )}

        {/* Extract mode: task list */}
        {mode === 'extract' && extractedTasks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] divide-y-2 divide-black/20">
            <div className="p-4">
              <p className="text-xs text-gray-500 font-bold">提取到 {extractedTasks.length} 个关键节点 — 点击取消不需要的，然后确认添加</p>
            </div>
            {extractedTasks.map((task, i) => (
              <div
                key={i}
                onClick={() => toggleTask(i)}
                className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                  selectedTasks.has(i) ? 'bg-blue/30' : 'bg-gray-50 opacity-50'
                }`}
              >
                <input type="checkbox" checked={selectedTasks.has(i)} onChange={() => toggleTask(i)}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-black accent-black" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-bold text-black break-words">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.dueDate && (
                      <span className="text-xs font-bold bg-white border border-black rounded-full px-2 py-0.5">
                        {new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {task.dueTime && <span className="text-xs opacity-50 font-bold">{task.dueTime}</span>}
                    {task.category && (
                      <span className="text-xs bg-lavender border border-black rounded-full px-2 py-0.5 font-bold">{task.category}</span>
                    )}
                    {task.priority === 'high' && <span className="text-xs text-red-500 font-bold">高优</span>}
                  </div>
                </div>
                {!selectedTasks.has(i) && (
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-30" />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
