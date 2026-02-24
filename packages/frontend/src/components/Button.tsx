import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  size = 'md',
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${fullWidth ? 'btn-full-width' : ''} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
