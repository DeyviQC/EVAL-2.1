import {AcademicDialog} from './AcademicDialog.js';
import { useMemo, useState } from 'react';
import {
  Calculator,
  FlaskConical,
  Languages,
  Palette,
  History,
  BookOpen,
  AlertCircle,
  Clock,
  CheckCircle2,
  Star,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  GraduationCap,
  Send,
  Eye,
} from 'lucide-react';
import type { StudentTask, StudentTasks } from './student-tasks.js';
import type { Activity } from './activities.js';
import { ActivityAttachmentsList } from './ActivityAttachments.js';

const control =
  'min-h-11 md:min-h-12 rounded-xl px-3.5 md:px-4 text-xs md:text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function subjectIdentity(subject: string) {
  const name = subject.toLocaleLowerCase('es-PE');
  if (name.includes('matem'))
    return { Icon: Calculator, color: 'text-blue-700 dark:text-blue-300', ground: 'from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900/40' };
  if (name.includes('ciencia') || name.includes('tecnolog'))
    return { Icon: FlaskConical, color: 'text-emerald-700 dark:text-emerald-300', ground: 'from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900/40' };
  if (name.includes('comunica') || name.includes('ingl'))
    return { Icon: Languages, color: 'text-violet-700 dark:text-violet-300', ground: 'from-violet-100 to-violet-50 dark:from-violet-950 dark:to-violet-900/40' };
  if (name.includes('arte') || name.includes('cultura'))
    return { Icon: Palette, color: 'text-rose-700 dark:text-rose-300', ground: 'from-rose-100 to-rose-50 dark:from-rose-950 dark:to-rose-900/40' };
  if (name.includes('historia') || name.includes('social'))
    return { Icon: History, color: 'text-amber-800 dark:text-amber-300', ground: 'from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900/40' };
  return { Icon: BookOpen, color: 'text-primary', ground: 'from-primary-soft to-surface-2' };
}

function taskStatus(task: StudentTask): 'pending' | 'delivered' | 'graded' {
  if (task.delivery.is_graded) return 'graded';
  if (task.delivery.has_delivery) return 'delivered';
  return 'pending';
}

function relativeDate(task: StudentTask) {
  const due = task.due_on;
  if (!due) return { text: 'Sin fecha límite', tone: 'muted' as const };
  const today = new Date().toISOString().slice(0, 10);
  if (due < today) return { text: `Venció ${formatDay(due)}`, tone: 'danger' as const };
  if (due === today) return { text: 'Vence hoy', tone: 'warning' as const };
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (due === tomorrow.toISOString().slice(0, 10)) return { text: 'Vence mañana', tone: 'warning' as const };
  const days = daysUntil(due);
  return { text: `Vence en ${days} días · ${formatDay(due)}`, tone: days <= 3 ? ('warning' as const) : ('muted' as const) };
}

function formatDay(due: string) {
  return new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${due}T00:00:00Z`));
}

function daysUntil(due: string) {
  const start = new Date().setHours(0, 0, 0, 0);
  const end = new Date(`${due}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

const groups: { key: StudentTask['category'] | 'closed'; label: string; order: number }[] = [
  { key: 'overdue', label: 'Vencidas', order: 0 },
  { key: 'today', label: 'Hoy', order: 1 },
  { key: 'tomorrow', label: 'Mañana', order: 2 },
  { key: 'this_week', label: 'Esta semana', order: 3 },
  { key: 'later', label: 'Más adelante', order: 4 },
  { key: 'closed', label: 'Cerradas', order: 5 },
];

export function StudentTaskList({
  data,
  loading,
  error,
  onRetry,
  onOpen,
}: {
  data: StudentTasks | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onOpen: (task: StudentTask) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered' | 'graded' | 'overdue'>('all');
  const [course, setCourse] = useState<string>('all');
  const [order, setOrder] = useState<'urgency' | 'course' | 'recent'>('urgency');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(groups.map((g) => g.key)));

  const allTasks = data?.items ?? [];
  const courses = useMemo(
    () => Array.from(new Map(allTasks.map((t) => [t.course.id, t.course])).values()).sort((a, b) => a.subject.localeCompare(b.subject, 'es-PE')),
    [allTasks]
  );

  const filtered = useMemo(() => {
    let rows = allTasks;
    if (filter === 'pending') rows = rows.filter((t) => !t.delivery.has_delivery);
    if (filter === 'delivered') rows = rows.filter((t) => t.delivery.has_delivery && !t.delivery.is_graded);
    if (filter === 'graded') rows = rows.filter((t) => t.delivery.is_graded);
    if (filter === 'overdue') rows = rows.filter((t) => t.category === 'overdue');
    if (course !== 'all') rows = rows.filter((t) => t.course.id === course);
    if (order === 'course') rows = [...rows].sort((a, b) => a.course.subject.localeCompare(b.course.subject, 'es-PE') || a.title.localeCompare(b.title, 'es-PE'));
    if (order === 'recent') rows = [...rows].sort((a, b) => (b.delivery.delivered_at ?? '').localeCompare(a.delivery.delivered_at ?? '') || a.title.localeCompare(b.title, 'es-PE'));
    return rows;
  }, [allTasks, filter, course, order]);

  const grouped = useMemo(() => {
    const map = new Map<string, StudentTask[]>();
    for (const task of filtered) {
      const key = task.state === 'closed' ? 'closed' : task.category;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return groups
      .filter((g) => map.has(g.key))
      .map((g) => ({ ...g, items: map.get(g.key)! }))
      .sort((a, b) => a.order - b.order);
  }, [filtered]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface-2 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-surface p-6 text-center">
        <p className="text-sm text-text">No se pudieron cargar tus tareas.</p>
        <button className={`${control} mt-3 border border-border bg-surface-2 text-text`} onClick={onRetry}>
          <RotateCcw className="mr-1.5 inline h-4 w-4" aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Tareas</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Tus tareas</h2>
        <p className="mt-1 text-sm text-text-muted">
          {data?.overview.pending === 0 ? 'Estás al día.' : `${data?.overview.pending} pendientes · ${data?.overview.overdue} vencidas · ${data?.overview.graded} calificadas`}
        </p>
      </header>

      <div className="sticky top-[72px] z-10 -mx-4 bg-bg/95 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:border-border sm:bg-surface/95 sm:px-4 md:-mx-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 md:overflow-visible md:flex-wrap" role="group" aria-label="Filtrar tareas">
            {(
              [
                ['all', 'Todas'],
                ['pending', 'Pendientes'],
                ['delivered', 'Entregadas'],
                ['graded', 'Calificadas'],
                ['overdue', 'Vencidas'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`${control} whitespace-nowrap border ${filter === value ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text hover:bg-surface-2'}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="task-course-filter" className="sr-only">
              Curso
            </label>
            <select
              id="task-course-filter"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className={`${control} border border-border bg-surface text-text`}
            >
              <option value="all">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject}
                </option>
              ))}
            </select>
            <label htmlFor="task-order" className="sr-only">
              Ordenar
            </label>
            <select
              id="task-order"
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
              className={`${control} border border-border bg-surface text-text`}
            >
              <option value="urgency">Por urgencia</option>
              <option value="course">Por curso</option>
              <option value="recent">Más recientes</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-10 text-center">
          <GraduationCap className="text-primary" size={40} aria-hidden="true" />
          <p className="font-semibold">{filter === 'all' ? '¡Estás al día! No tienes tareas pendientes.' : 'No hay tareas en este filtro.'}</p>
          {filter !== 'all' && (
            <button className={`${control} border border-border bg-surface-2 text-text`} onClick={() => setFilter('all')}>
              Ver todas
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => {
            const isOpen = expanded.has(group.key);
            return (
              <section key={group.key} aria-label={group.label}>
                <button
                  type="button"
                  className="mb-2 flex w-full items-center justify-between rounded-xl px-1 py-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.key)) next.delete(group.key);
                      else next.add(group.key);
                      return next;
                    })
                  }
                  aria-expanded={isOpen}
                >
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
                    {group.label} <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{group.items.length}</span>
                  </h3>
                  {isOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
                </button>
                {isOpen && (
                  <div className="space-y-2">
                    {group.items.map((task, index) => (
                      <StudentTaskCard key={task.id} task={task} index={index} onOpen={() => onOpen(task)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentTaskCard({ task, index, onOpen }: { task: StudentTask; index: number; onOpen: () => void }) {
  const { Icon, color, ground } = subjectIdentity(task.course.subject);
  const status = taskStatus(task);
  const due = relativeDate(task);
  const toneClass =
    due.tone === 'danger'
      ? 'text-red-700 dark:text-red-300'
      : due.tone === 'warning'
        ? 'text-amber-800 dark:text-amber-300'
        : 'text-text-muted';
  const statusLabel = status === 'graded' ? 'Calificada' : status === 'delivered' ? 'Entregada' : 'Sin entregar';

  return (
    <article
      className="group relative flex min-h-[88px] items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-xs transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.005] hover:shadow-sm motion-reduce:transform-none"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[72px] flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary"
        aria-label={`Abrir tarea ${task.title} de ${task.course.subject}`}
      >
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ground} ${color}`}>
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block line-clamp-2 pr-7 text-sm font-bold leading-snug text-text">{task.title}</span>
          <span className="block truncate text-xs text-text-muted">
            {task.course.subject} · {task.course.teacher}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 font-semibold ${toneClass}`}>
              {due.tone !== 'muted' && <AlertCircle size={13} aria-hidden="true" />}
              {due.text}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-text-muted">
              {status === 'graded' ? <Star size={13} aria-hidden="true" /> : status === 'delivered' ? <CheckCircle2 size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}
              {statusLabel}
            </span>
            {status === 'graded' && task.delivery.grade && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 font-bold text-primary">
                {task.delivery.grade}
              </span>
            )}
          </span>
        </span>
        <ArrowUpRight aria-hidden="true" className="hidden shrink-0 text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block" size={18} />
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary sm:hidden"
        aria-label={`Abrir ${task.title}`}
      >
        {status === 'pending' ? <Send size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </article>
  );
}

export function StudentTaskDrawer({
  task,
  activity,
  onClose,
  onAction,
  error=false,
  onRetry,
}: {
  task: StudentTask | null;
  activity: Activity | null;
  onClose: () => void;
  onAction?: () => void;
  error?: boolean;
  onRetry?: () => void;
}) {
  if (!task) return null;
  const status = taskStatus(task);
  return (
    <AcademicDialog label="Detalle de tarea" onClose={onClose}>
      <div
        className="flex w-full flex-col gap-2 bg-surface p-5 text-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{task.course.subject}</p>
            <h3 className="mt-1 text-xl font-bold">{task.title}</h3>
          </div>
        </div>
        <div className="mt-4 flex-1 space-y-5 overflow-y-auto">
          <div className="rounded-xl border border-border bg-surface-2/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">{activity?.instructions ?? (error ? 'No se pudo consultar esta tarea.' : 'Consultando tarea…')}</div>
          <ActivityAttachmentsList attachments={activity?.attachments} />
          {status === 'graded' && task.delivery.grade && (
            <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Calificación</p>
              <p className="mt-1 text-2xl font-bold text-text">{task.delivery.grade}</p>
              {task.delivery.feedback && <p className="mt-2 text-sm text-text-muted">{task.delivery.feedback}</p>}
            </div>
          )}
        </div>
        {error && <button type="button" className="eval-role-back" onClick={onRetry}>Volver a consultar</button>}
        <div className="mt-4 border-t border-border pt-4">
          <button
            type="button"
            disabled={!activity || !onAction}
            onClick={onAction}
            className="w-full min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            {task.can_submit ? (task.delivery.has_delivery ? 'Actualizar entrega' : 'Entregar ahora') : 'Ver entrega'}
          </button>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-text-muted">
            <AlertCircle size={12} aria-hidden="true" /> La fecha límite no cierra automáticamente la actividad.
          </p>
        </div>
      </div>
    </AcademicDialog>
  );
}
