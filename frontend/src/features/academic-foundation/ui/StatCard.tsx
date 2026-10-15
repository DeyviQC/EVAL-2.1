import type { ReactNode } from 'react';
import { Card } from './Card.js';

export type StatCardProps = {
  label: string;
  value: number | string | null | undefined;
  icon: ReactNode;
  iconColor?: string | undefined; // semantic color class e.g. text-primary, text-warning
  emptyMessage?: string | undefined; // e.g. "Al día", "Sin pendientes"
  trend?: string | undefined;
  onClick?: (() => void) | undefined;
  className?: string | undefined;
};

export function StatCard({
  label,
  value,
  icon,
  iconColor = 'text-primary',
  emptyMessage = 'Sin registros',
  trend,
  onClick,
  className = '',
}: StatCardProps) {
  const isZero = value === 0 || value === '0' || value === null || value === undefined;

  return (
    <Card
      hoverable={Boolean(onClick)}
      onClick={onClick}
      className={`relative overflow-hidden flex flex-col justify-between min-h-[110px] p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider truncate">
          {label}
        </span>
        <span className={`p-2 rounded-xl bg-surface-2 shrink-0 ${iconColor}`}>
          {icon}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        {isZero ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-text">0</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {emptyMessage}
            </span>
          </div>
        ) : (
          <span className="text-3xl font-bold tracking-tight text-text">
            {value}
          </span>
        )}

        {trend && (
          <span className="text-xs font-medium text-text-muted shrink-0">
            {trend}
          </span>
        )}
      </div>
    </Card>
  );
}
