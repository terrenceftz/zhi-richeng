import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variants: Record<string, string> = {
  primary: 'bg-primary hover:bg-primary-light text-white',
  secondary: 'bg-surface-light hover:bg-surface-dark text-text border border-border-light',
  ghost: 'bg-transparent hover:bg-surface-light text-muted hover:text-text',
  danger: 'bg-danger hover:bg-[#f9859e] text-white',
};

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`font-medium transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
