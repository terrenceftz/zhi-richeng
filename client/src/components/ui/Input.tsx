import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold mb-1">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full bg-white border-2 border-black rounded-xl px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none font-bold placeholder-gray-400 transition-all ${
          error ? 'border-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1 font-bold">{error}</p>
      )}
    </div>
  ),
);

export default Input;
