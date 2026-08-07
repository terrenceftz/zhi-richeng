import { useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, FileText, MessageCircle, X } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { useToastStore } from '../stores/toastStore';
import type { ParsedTask } from '../types';
import Button from './ui/Button';
import Badge, { PriorityBadge } from './ui/Badge';
import client from '../api/client';

type ApiErr = { response?: { data?: { message?: string } }; message?: string };
const errMsg = (e: unknown, fallback: string) => {
  const err = e as ApiErr;
  return err?.response?.data?.message || err?.message || fallback;
};

type Mode = 'chat' | 'extract';

export default function SmartBar() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('chat');
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
  const { confirmNLP, fetchTasks } = useTaskStore();
  const toast = useToastStore();

  const handleChatSubmit = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await client.post('/tasks/smart', { text: text.trim() });
      setResult(data);
    } catch (e) {
      setError(errMsg(e, '处理失败'));
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
        setError('未提取到关键时间节点，试试用聊天输入单条日程');
      } else {
        setExtractedTasks(data.tasks);
        setSelectedTasks(new Set(data.tasks.map((_: unknown, i: number) => i)));
      }
    } catch (e) {
      setError(errMsg(e, '提取失败'));
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
      toast.success('已添加任务');
      setText('');
      setResult(null);
      await fetchTasks();
    } catch (e) {
      setError(errMsg(e, '保存失败'));
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
      toast.success(`已添加 ${tasks.length} 个任务`);
      setText('');
      setExtractedTasks([]);
      setSelectedTasks(new Set());
      await fetchTasks();
    } catch (e) {
      setError(errMsg(e, '保存失败'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'extract') {
        if (extractedTasks.length > 0) handleConfirmBatch();
        else handleExtract();
      } else {
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
    <div className="mb-6">
      {/* 模式切换 */}
      <div className="mb-2 inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => { setMode('chat'); setResult(null); setExtractedTasks([]); setError(null); }}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'chat' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" /> 聊天输入
        </button>
        <button
          onClick={() => { setMode('extract'); setResult(null); setError(null); }}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'extract' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> 文本提取
        </button>
      </div>

      {/* 输入区 */}
      {mode === 'chat' ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900">
          <Sparkles className="ml-2 h-5 w-5 shrink-0 text-brand-500" />
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="添加日程、查询任务，或直接和我聊天..."
            className="flex-1 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
            disabled={isSaving}
          />
          <Button size="sm" onClick={result?.type === 'schedule' ? handleConfirmSingle : handleChatSubmit} disabled={isProcessing || isSaving || !text.trim()}>
            {isProcessing ? '思考中...' : isSaving ? '保存中...' : result?.type === 'schedule' ? '确认添加' : '发送'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setExtractedTasks([]); setError(null); }}
            placeholder="粘贴通知、公文等长文本，AI 自动提取所有关键时间节点..."
            className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            disabled={isSaving}
          />
          <div className="flex items-center gap-2">
            <Button onClick={extractedTasks.length > 0 ? handleConfirmBatch : handleExtract} disabled={isProcessing || isSaving || !text.trim()}>
              {isProcessing ? '提取中...' : isSaving ? '保存中...' : extractedTasks.length > 0 ? `确认添加 (${selectedTasks.size}项)` : '提取日程'}
            </Button>
            {extractedTasks.length > 0 && (
              <button onClick={() => setSelectedTasks(new Set(extractedTasks.map((_, i) => i)))} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                全选
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      )}

      <AnimatePresence>
        {/* 聊天模式：日程结果 */}
        {mode === 'chat' && result?.type === 'schedule' && result.parsed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mt-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/5"
          >
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">AI 识别为日程 — 按 Enter 确认添加</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="truncate"><span className="text-slate-500 dark:text-slate-400">标题：</span><span className="font-medium text-slate-900 dark:text-slate-100">{result.parsed.title}</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">类型：</span><span className="font-medium text-slate-900 dark:text-slate-100">{result.parsed.category || '通用'}</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">日期：</span><span className="font-medium text-slate-900 dark:text-slate-100">{result.parsed.dueDate || '待定'}</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">时间：</span><span className="font-medium text-slate-900 dark:text-slate-100">{result.parsed.dueTime || '全天'}</span></div>
              <div className="truncate"><span className="text-slate-500 dark:text-slate-400">地点：</span><span className="font-medium text-slate-900 dark:text-slate-100">{result.parsed.location || '未指定'}</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">优先级：</span><PriorityBadge priority={result.parsed.priority} /></div>
            </div>
          </motion.div>
        )}

        {/* 聊天模式：查询/回复 */}
        {mode === 'chat' && (result?.type === 'query' || result?.type === 'chat') && result.answer && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="mb-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5" /> {result.type === 'query' ? '查询结果' : 'AI 回复'}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">{result.answer}</p>
          </motion.div>
        )}

        {/* 提取模式：任务列表 */}
        {mode === 'extract' && extractedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">提取到 {extractedTasks.length} 个关键节点 — 点击取消不需要的，然后确认添加</p>
            </div>
            {extractedTasks.map((task, i) => (
              <div
                key={i}
                onClick={() => toggleTask(i)}
                className={`flex cursor-pointer items-start gap-3 p-3 transition-colors ${
                  selectedTasks.has(i) ? 'bg-brand-50/40 dark:bg-brand-500/5' : 'opacity-50'
                }`}
              >
                <input type="checkbox" checked={selectedTasks.has(i)} onChange={() => toggleTask(i)} className="mt-0.5 h-4 w-4 rounded accent-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {task.dueDate && (
                      <Badge tone="blue">{new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</Badge>
                    )}
                    {task.dueTime && <span className="text-xs text-slate-500 dark:text-slate-400">{task.dueTime}</span>}
                    {task.category && <Badge tone="gray">{task.category}</Badge>}
                    {task.priority === 'high' && <Badge tone="red">高优</Badge>}
                  </div>
                </div>
                {!selectedTasks.has(i) && <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
