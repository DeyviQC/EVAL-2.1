import { BookOpen, ChevronRight } from 'lucide-react';
import type { Course } from './courses.js';

export function LibraryCourseList({ rows, onOpen }: { rows: Course[]; onOpen: (id: string) => void }) {
  return (
    <div aria-label="Bibliotecas por curso" className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-text">
        <BookOpen aria-hidden="true" className="h-5 w-5 text-primary" />
        <h4>Bibliotecas por curso</h4>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {rows.map(row => (
          <li key={row.id}>
            <button type="button" onClick={() => onOpen(row.id)}
              className="group flex min-h-16 w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:px-5">
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <BookOpen className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text group-hover:text-primary">{row.subject}</span>
                <span className="block text-xs text-text-muted">{row.grade} · {row.section} · {row.teacher}</span>
                <span className="block text-xs text-text-muted">{row.period} · {row.state === 'planned' ? 'Planificado' : row.state === 'closed' || row.period_state === 'closed' ? 'Contexto histórico' : 'Activo'}</span>
              </span>
              <span className="hidden text-xs font-semibold text-primary sm:inline">Consultar recursos</span>
              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              <span className="sr-only">Consultar recursos de {row.subject}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
