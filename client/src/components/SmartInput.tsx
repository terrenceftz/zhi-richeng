import { useState, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../stores/taskStore';
import type { ParsedTask } from '../types';
import Button from './ui/Button';

interface SmartInputProps {
  mode?: 'single' | 'extract';
}

export default function SmartInput({ mode = 'single' }: SmartInputProps) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [parsedList, setParsedList] = useState<ParsedTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { parseNLP, extractNLP, confirmNLP, fetchTasks } = useTaskStore();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      if (mode === 'extract') {
        const result = await extractNLP(text);
        if (!result.tasks || result.tasks.length === 0) {
          setError('未提取到关键时间节点');
        }
        setParsedList(result.tasks || []);
      } else {
        const result = await parseNLP(text);
        setParsed(result);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'AI 解析失败，请重试';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const getSuccessMsg = (dates: (string | null)[]): string => {
    const validDates = dates.filter((d): d is string => !!d);
    const today = new Date().toISOString().slice(0, 10);
    const nonToday = validDates.filter((d) => d !== today);

    if (nonToday.length > 0) {
      const d = new Date(nonToday[0]);
      const weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      return `已添加到 ${d.getMonth() + 1}月${d.getDate()}日（周${weekDay}）的日程中`;
    }
    if (validDates.length > 0) return '已添加到今日任务';
    return '已添加到待安排任务';
  };

  const handleConfirm = async () => {
    const tasks = parsed ? [parsed] : parsedList;
    if (tasks.length === 0) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await confirmNLP(tasks);
      const dates = tasks.map((t) => t.dueDate);
      setSuccess(getSuccessMsg(dates));
      setText('');
      setParsed(null);
      setParsedList([]);
      await fetchTasks();
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || '保存失败，请重试';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (parsed || parsedList.length > 0) {
        handleConfirm();
      } else {
        handleSubmit();
      }
    }
  };

  const toggleTaskInList = (index: number) => {
    setParsedList((prev) => prev.filter((_, i) => i !== index));
  };

  const buttonLabel = isProcessing
    ? '解析中...'
    : isSaving
    ? '保存中...'
    : parsed || parsedList.length > 0
    ? '确认添加'
    : '解析';

  return (
    <div className="mb-6">
      <div className="relative">
        <div className="flex items-center gap-3 bg-surface-light border border-border-light rounded-2xl p-1.5 focus-within:border-primary transition-colors">
          <div className="pl-3 text-lg flex-shrink-0">✨</div>
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setParsed(null); setParsedList([]); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'extract' ? '粘贴通知/公文内容，AI 自动提取关键节点...' : '试试输入 "明天下午3点产品评审会 高优先级"...'}
            className="flex-1 bg-transparent text-text placeholder-muted text-sm py-2.5 focus:outline-none"
            disabled={isSaving}
          />
          <Button
            size="sm"
            onClick={parsed || parsedList.length > 0 ? handleConfirm : handleSubmit}
            disabled={isProcessing || isSaving || !text.trim()}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>

      {error && <p className="text-danger text-xs mt-2 bg-danger/10 p-2 rounded-lg">{error}</p>}
      {success && <p className="text-green-400 text-xs mt-2 bg-green-400/10 p-2 rounded-lg">✅ {success}</p>}

      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 bg-surface-light border border-primary/30 rounded-xl p-4"
          >
            <p className="text-xs text-muted mb-2">AI 解析结果 — 按 Enter 确认，或修改后确认</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted">标题：</span><span className="text-text">{parsed.title}</span></div>
              <div><span className="text-muted">类型：</span><span className="text-text">{parsed.category || '通用'}</span></div>
              <div><span className="text-muted">日期：</span><span className="text-text">{parsed.dueDate || '待定'}</span></div>
              <div><span className="text-muted">时间：</span><span className="text-text">{parsed.dueTime || '全天'}</span></div>
              <div><span className="text-muted">地点：</span><span className="text-text">{parsed.location || '未指定'}</span></div>
              {parsed.emailTo && <div><span className="text-muted">📧 发送至：</span><span className="text-text">{parsed.emailTo}</span></div>}
              {parsed.emailSubject && <div><span className="text-muted">📋 主题：</span><span className="text-text">{parsed.emailSubject}</span></div>}
              {parsed.description && <div className="col-span-2"><span className="text-muted">📎 {parsed.description}</span></div>}
              <div><span className="text-muted">优先级：</span><span className="text-text">{parsed.priority}</span></div>
            </div>
          </motion.div>
        )}

        {parsedList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 bg-surface-light border border-primary/30 rounded-xl p-4 space-y-2"
          >
            <p className="text-xs text-muted mb-2">提取到 {parsedList.length} 个关键节点 — 点击移除不需要的，然后按 Enter 确认</p>
            {parsedList.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm hover:bg-surface p-2 rounded-lg group">
                <button onClick={() => toggleTaskInList(i)} className="text-danger/50 hover:text-danger text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                <span className="flex-1 text-text">{item.title}</span>
                <span className="text-muted text-xs">{item.dueDate}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{item.category}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
