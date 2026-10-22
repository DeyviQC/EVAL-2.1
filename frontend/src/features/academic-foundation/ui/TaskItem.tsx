import { Calendar, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Badge } from './Badge.js';

export type TaskItemProps = {
  id: string;
  title: string;
  courseTitle?: string | undefined;
  dueDate: string; // YYYY-MM-DD or formatted string
  dueCategory?: 'today' | 'tomorrow' | 'later' | 'submitted' | 'graded' | undefined;
  statusLabel?: string | undefined;
  onClick?: (() => void) | undefined;
  className?: string | undefined;
};

export function TaskItem({
  title,
  courseTitle,
  dueDate,
  dueCategory = 'later',
  statusLabel,
  onClick,
  className = '',
}: TaskItemProps) {
  const badgeVariant =
    dueCategory === 'today'
      ? 'danger'
      : dueCategory === 'tomorrow'
      ? 'warning'
      : dueCategory === 'graded' || dueCategory === 'submitted'
      ? 'success'
      : 'neutral';

  const dateText =
    dueCategory === 'today'
      ? 'Vence hoy'
      : dueCategory === 'tomorrow'
      ? 'Vence mañana'
      : dueDate;

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex items-center justify-between gap-3 p-3.5 md:p-4 rounded-xl bg-surface hover:bg-surface-2 border border-border transition-all text-left w-full ${
        onClick ? 'cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2' : ''
      } ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
          dueCategory === 'today'
            ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
            : dueCategory === 'tomorrow'
            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
            : 'bg-primary-soft text-primary'
        }`}>
          {dueCategory === 'graded' || dueCategory === 'submitted' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0">
          <h5 className="text-sm font-semibold text-text group-hover:text-primary transition-colors truncate">
            {title}
          </h5>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {courseTitle && (
              <span className="text-xs text-text-muted truncate max-w-[160px]">
                {courseTitle}
              </span>
            )}
            <Badge variant={badgeVariant} size="sm">
              {statusLabel ?? dateText}
            </Badge>
          </div>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </Wrapper>
  );
}
