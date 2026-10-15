import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './Button.js';

export type EmptyStateProps = {
  icon?: ReactNode | undefined;
  title: string;
  description: string;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  className?: string | undefined;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-surface-2/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-accent shadow-sm border border-border mb-3">
        {icon ?? <Sparkles className="w-6 h-6" />}
      </div>
      <h5 className="font-semibold text-base text-text leading-snug">
        {title}
      </h5>
      <p className="text-xs text-text-muted mt-1 max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
