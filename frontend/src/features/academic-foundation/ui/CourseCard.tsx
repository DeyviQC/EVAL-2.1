import { BookOpen, User, ArrowRight } from 'lucide-react';
import { Card } from './Card.js';
import { Button } from './Button.js';
import { ProgressRing } from './Progress.js';

export type CourseCardProps = {
  id?: string | undefined;
  title: string;
  gradeAndSection?: string | undefined;
  teacherName?: string | undefined;
  subjectColor?: string | undefined; // hex or CSS class
  /** `null` means no progress measurement exists for this course; the ring is then omitted rather than claiming 0. */
  progress?: number | null | undefined;
  onOpen?: (() => void) | undefined;
  className?: string | undefined;
};

export function CourseCard({
  title,
  gradeAndSection,
  teacherName,
  subjectColor = 'var(--subject-blue)',
  progress = 0,
  onOpen,
  className = '',
}: CourseCardProps) {
  return (
    <Card
      hoverable={Boolean(onOpen)}
      onClick={onOpen}
      className={`relative overflow-hidden flex flex-col justify-between group p-5 border border-border rounded-xl transition-all ${className}`}
    >
      {/* Top subject accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: subjectColor }}
      />

      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${subjectColor}15`,
              color: subjectColor,
            }}
          >
            {gradeAndSection ?? 'Curso activo'}
          </span>
          {typeof progress === 'number' && (
            <ProgressRing progress={progress} size={40} strokeWidth={3.5} />
          )}
        </div>

        <h4 className="font-semibold text-base text-text leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h4>

        {teacherName && (
          <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{teacherName}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-primary">
        <span>Acceder al curso</span>
        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </Card>
  );
}
