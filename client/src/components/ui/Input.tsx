import { forwardRef, Children, isValidElement, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDropdown, DropdownPanel, type DropdownOption } from './Dropdown';

const fieldBase =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** 显示在输入框右侧的元素（如密码可见性切换按钮） */
  rightElement?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, rightElement, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={cn(fieldBase, rightElement && 'pr-10', error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20', className)}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">{rightElement}</div>
          )}
        </div>
        {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(fieldBase, 'min-h-[80px] resize-y', error && 'border-red-400', className)}
          {...props}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectProps {
  label?: string;
  error?: string;
  /** 紧凑尺寸（用于表格/行内场景） */
  compact?: boolean;
  /** 无选中时的占位文案 */
  placeholder?: string;
  id?: string;
  value?: string | number;
  disabled?: boolean;
  className?: string;
  title?: string;
  onChange?: (e: { target: { value: string } }) => void;
  children?: ReactNode;
}

/** 自定义下拉：项目风格圆角弹层（替代原生 option 弹层） */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ label, error, className, id, children, value, onChange, disabled, placeholder, compact, title }, ref) => {
    const { open, setOpen, ref: rootRef } = useDropdown();

    // 解析 <option> children 为选项列表
    const options: DropdownOption[] = Children.toArray(children)
      .filter((c): c is React.ReactElement => isValidElement(c))
      .map((el) => ({
        value: String((el.props as any).value ?? ''),
        label: (el.props as any).children as ReactNode,
        disabled: !!(el.props as any).disabled,
      }));
    const current = options.find((o) => o.value === String(value ?? ''));

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div ref={rootRef} className="relative">
          <button
            ref={ref}
            type="button"
            id={id}
            disabled={disabled}
            title={title}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white text-left text-slate-900 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
              compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
              open && 'border-brand-500 ring-2 ring-brand-500/20',
              error && 'border-red-400',
              className
            )}
          >
            <span className={cn('truncate', !current && 'text-slate-400')}>{current ? current.label : (placeholder || '请选择')}</span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <DropdownPanel
              options={options}
              value={String(value ?? '')}
              onSelect={(v) => { onChange?.({ target: { value: v } }); }}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export default Input;
