import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant | undefined;
  size?: BadgeSize | undefined;
  icon?: ReactNode | undefined;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-2 text-text-muted border-border',
  primary: 'bg-primary-soft text-primary border-primary/20',
  accent: 'bg-accent-soft text-accent-hover border-accent/30',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  danger: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border leading-tight ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
