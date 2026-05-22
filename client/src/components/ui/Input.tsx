import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm text-muted mb-1">{label}</label>}
    <input
      ref={ref}
      className={`w-full bg-surface-light border border-[#353560] rounded-lg px-4 py-2.5 text-white placeholder-muted focus:outline-none focus:border-primary transition-colors ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    />
    {error && <p className="text-danger text-xs mt-1">{error}</p>}
  </div>
));

export default Input;
