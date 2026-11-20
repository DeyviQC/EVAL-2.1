import {todayInLima} from './form-gates.js';
import {useActionFeedback} from './ActionFeedback.js';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AcademicWeekNavigation } from './AcademicWeekNavigation.js';
import { AcademicDialog } from './AcademicDialog.js';
import { ClassroomPresentation } from './ClassroomPresentation.js';
import { progressLabels } from './learning-progress.js';
import { AcademicApiError } from './api.js';
import { materialFileUrl, isVideoMime, isInlineMime, type Material } from './materials.js';
import { type Activity, type ActivityClient } from './activities.js';
import { ActivityCard } from './ActivityWorkspace.js';
import { type Course } from './courses.js';
import { initialWeek } from './weekly-navigation.js';
import { type CourseCalendar, type WeeksClient, type WeekPage, type WeekSelection, type WeekAssociation } from './weeks.js';

export function WeeksPanel({
  course,
  client,
  activities,
  onExpired,
  teacherMode = false,
}: {
  course: Course;
  client: WeeksClient;
  activities: ActivityClient;
  onExpired: () => void;
  teacherMode?: boolean;
}) {
  const actionFeedback = useActionFeedback();
  const [calendar, setCalendar] = useState<CourseCalendar | null>(null);
  const [selection, setSelection] = useState<WeekSelection>({ bucket: 'unassigned' });
  const [materials, setMaterials] = useState<WeekPage | null>(null);
  const [tasks, setTasks] = useState<WeekPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<WeekAssociation | null>(null);
  const [chosen, setChosen] = useState('');
  const [opened, setOpened] = useState<Activity | null>(null);
  const [reviewed, setReviewed] = useState<WeekAssociation | null>(null);
  const [contentView, setContentView] = useState<'all' | 'material' | 'activity'>('all');
  const [creating, setCreating] = useState(false);
  const activityTrigger = useRef<HTMLElement | null>(null);
  const projectionTrigger = useRef<HTMLElement | null>(null);
  const [projecting, setProjecting] = useState(false);
  const generation = useRef(0);
  const alive = useRef(true);
  const writing = useRef(false);
  const summary = useRef<HTMLHeadingElement>(null);

  function fail(error: unknown) {
    setMessage(
      error instanceof AcademicApiError && error.outcomeUnknown
        ? 'El recurso sigue publicado; no se pudo confirmar su semana. Consulta el resultado antes de continuar.'
        : 'No se pudo consultar o guardar la organización. Consulta nuevamente.'
    );
    if (error instanceof AcademicApiError && [401, 419].includes(error.status ?? 0)) {
      onExpired();
      return;
    }
    if (error instanceof AcademicApiError && [403, 404].includes(error.status ?? 0)) {
      setCalendar(null);
      setMaterials(null);
      setTasks(null);
      setEditing(null);
      setOpened(null);
      setReviewed(null);
    }
  }

  async function load(next: WeekSelection = selection, search = filter, refreshCalendar = false, automatic = false) {
    const current = ++generation.current;
    setBusy(true);
    setMaterials(null);
    setTasks(null);
    setOpened(null);
    setEditing(null);
    try {
      if (refreshCalendar) {
        const result = await client.calendar(course.id);
        if (!alive.current || current !== generation.current) return;
        setCalendar(result);
        if (automatic) next = initialWeek(result);
      }
      const [m, a] = await Promise.all([
        client.content(course.id, 'material', next, null, search),
        client.content(course.id, 'activity', next, null, search),
      ]);
      if (!alive.current || current !== generation.current) return;
      setMaterials(m);
      setTasks(a);
      setSelection(next);
      setFilter(search);
    } catch (error) {
      if (alive.current && current === generation.current) fail(error);
    } finally {
      if (alive.current && current === generation.current) setBusy(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    void load({ bucket: 'unassigned' }, '', true, true);
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, [course.id, client]);

  async function more(kind: 'material' | 'activity') {
    const page = kind === 'material' ? materials : tasks;
    if (!page?.next_after) return;
    const current = generation.current;
    setBusy(true);
    try {
      const next = await client.content(course.id, kind, selection, page.next_after, filter);
      if (!alive.current || current !== generation.current) return;
      const merged = { ...next, items: [...page.items, ...next.items] };
      if (kind === 'material') setMaterials(merged);
      else setTasks(merged);
    } catch (error) {
      if (alive.current && current === generation.current) fail(error);
    } finally {
      if (alive.current && current === generation.current) setBusy(false);
    }
  }

  async function edit(association: WeekAssociation) {
    setBusy(true);
    setMessage('');
    try {
      const fresh = await client.consult(association.kind, association.resource_id);
      if (!alive.current) return;
      setEditing(fresh);
      setChosen(fresh.calendar_revision_id === calendar?.current?.id ? fresh.week_id ?? '' : '');
    } catch (error) {
      if (alive.current) fail(error);
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function save() {
    if (!editing || busy || writing.current || !course.can_publish || client.isUncertain()) return;
    if (chosen && !calendar?.current?.blocks.some(block=>block.weeks.some(week=>week.id===chosen))) return;
    const token=generation.current;
    writing.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (!await actionFeedback.confirm({title:'¿Cambiar la semana?',message:'Se actualizará la ubicación del recurso. Su contenido y entregas se conservarán.'}) || !alive.current || token!==generation.current) return;
      await client.set(editing, chosen ? calendar?.current?.id ?? null : null, chosen || null);
      if (!alive.current) return;
      setEditing(null);
      actionFeedback.success('Semana actualizada correctamente.');
      setMessage('Semana guardada. El contenido y las entregas se conservan.');
      await load(selection, filter, true);
    } catch (error) {
      if (alive.current) fail(error);
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function review() {
    const target = client.uncertainTarget();
    if (!target) return;
    setBusy(true);
    setReviewed(null);
    try {
      const [kind, id] = target.split('/');
      const result = await client.consult(kind as 'material' | 'activity', id!);
      if (alive.current) setReviewed(result);
    } catch (error) {
      if (alive.current) fail(error);
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function openActivity(id: string) {
    activityTrigger.current = document.activeElement as HTMLElement;
    setBusy(true);
    try {
      const activity = await activities.detail(id);
      if (alive.current) setOpened(activity);
    } catch (error) {
      if (alive.current) fail(error);
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const currentWeeks = calendar?.current?.blocks.flatMap(b => b.weeks) ?? [];
  const currentWeek = [...currentWeeks, ...(calendar?.retained.flatMap(r => r.blocks.flatMap(b => b.weeks)) ?? [])].find(
    w => w.id === selection.week
  );
  const heading =
    selection.bucket === 'unassigned'
      ? 'Sin semana'
      : selection.bucket === 'earlier'
      ? 'Calendarios anteriores'
      : 'Semana ' + (currentWeek?.number ?? calendar?.retained.flatMap(r => r.blocks.flatMap(b => b.weeks)).find(w => w.id === selection.week)?.number ?? '');

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current || activities.isUncertain() || client.isUncertain() || !course.can_publish || selection.bucket !== 'week') return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!form.checkValidity() || !String(data.get('title')??'').trim() || !String(data.get('instructions')??'').trim() || !selection.revision || !selection.week) return;
    const token=generation.current;
    writing.current = true;
    setBusy(true);
    setMessage('');
    let published = false;
    try {
      if (!await actionFeedback.confirm({title:'¿Publicar esta actividad?',message:String(data.get('title'))+' · '+course.subject+' · '+heading}) || !alive.current || token!==generation.current) return;
      const result = await activities.publish(
        course.id,
        String(data.get('title')),
        String(data.get('instructions')),
        String(data.get('due_on')) || null
      );
      published = true;
      form.reset();
      setCreating(false);
      const association = await client.consult('activity', result.id);
      await client.set(association, selection.revision!, selection.week!);
      actionFeedback.success('Actividad publicada en esta semana.');
      if (!alive.current) return;
      setMessage('Actividad publicada en esta semana.');
      await load(selection, filter, true);
    } catch (error) {
      if (published) {
        setCreating(false);
        setMessage('La actividad ya está publicada. Revisa Otros recursos → Sin semana antes de confirmar su organización; no vuelvas a publicarla.');
      } else {
        fail(error);
      }
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  const title = selection.bucket === 'pending' ? (teacherMode ? 'Entregas por revisar' : 'Pendientes del curso') : heading;
  const entries = [...(contentView === 'activity' ? [] : materials?.items ?? []), ...(contentView === 'material' ? [] : tasks?.items ?? [])];

  return (
    <section aria-label="Semanas del curso" className="eval-weekly-content space-y-5" aria-busy={busy}>
      {/* Week Calendar Navigation */}
      {calendar?.current && (
        <AcademicWeekNavigation
          calendar={calendar}
          selection={selection}
          busy={busy}
          onSelect={next => {
            setTerm('');
            setCreating(false);
            void load(next, '', true);
          }}
        />
      )}

      {/* Classroom Projection Button */}
      {selection.bucket === 'week' && calendar && (
        <div className="flex justify-end pt-1">
          <button
            className="eval-primary-action inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-950 dark:bg-navy-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer border border-white/10"
            disabled={busy}
            onClick={event => {
              projectionTrigger.current = event.currentTarget;
              setProjecting(true);
            }}
          >
            📺 Proyectar semana
          </button>
        </div>
      )}

      {projecting && (
        <ClassroomPresentation
          course={course}
          selection={selection}
          weekTitle={heading}
          client={client}
          onClose={() => setProjecting(false)}
          onExpired={onExpired}
          returnFocus={projectionTrigger.current}
        />
      )}

      {calendar && !calendar.current && (
        <div className="eval-empty-state rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-center text-xs text-amber-900">
          <strong className="block font-semibold text-sm mb-1">El calendario está por configurar</strong>
          <p className="text-amber-800">Subdirección debe publicar los bimestres y semanas. Los recursos existentes siguen disponibles.</p>
        </div>
      )}

      {/* Content Toolbar */}
      <div className="eval-content-toolbar flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
        <div>
          <h4 ref={summary} tabIndex={-1} className="font-serif text-lg font-bold text-text">
            {title}
          </h4>
          {selection.bucket === 'week' && (
            <p className="text-xs text-text-muted mt-0.5">
              {currentWeek?.start_on} a {currentWeek?.end_on}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={busy}
            aria-pressed={selection.bucket === 'pending'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selection.bucket === 'pending'
                ? 'bg-primary text-white font-semibold shadow-xs'
                : 'border border-border bg-surface text-text hover:bg-surface-2'
            }`}
            onClick={() => void load({ bucket: 'pending' }, '', true)}
          >
            {teacherMode ? '🔥 Por revisar' : 'Ver pendientes'}
          </button>

          <button
            aria-label="Actualizar contenido semanal"
            disabled={busy}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all cursor-pointer"
            onClick={() => void load(selection, filter, true)}
          >
            ↻ Actualizar
          </button>

          {teacherMode && course.can_publish && selection.bucket === 'week' && (
            <button
              className="eval-primary-action inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold shadow-xs hover:bg-primary-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              disabled={busy || activities.isUncertain() || client.isUncertain()}
              aria-expanded={creating}
              onClick={() => setCreating(!creating)}
            >
              {creating ? '✕ Cancelar' : '＋ Crear actividad'}
            </button>
          )}
        </div>
      </div>

      {/* Content Types Filter Pills */}
      <nav className="eval-content-types flex flex-wrap gap-1.5" aria-label="Tipo de contenido semanal">
        {(['all', 'material', 'activity'] as const).map(type => (
          <button
            key={type}
            aria-pressed={contentView === type}
            onClick={() => setContentView(type)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              contentView === type
                ? 'bg-primary text-white shadow-xs font-semibold'
                : 'bg-surface-2 text-text-muted hover:text-text hover:bg-surface-3 border border-border'
            }`}
          >
            {type === 'all' ? 'Todo' : type === 'material' ? 'Materiales' : 'Actividades'}
            {type === 'material' && materials ? ` (${materials.total})` : type === 'activity' && tasks ? ` (${tasks.total})` : ''}
          </button>
        ))}
      </nav>

      {/* Alerts and Status */}
      {message && (
        <p role="alert" className="eval-inline-notice flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <span>⚠️</span>
          <span>{message}</span>
        </p>
      )}

      {busy && (
        <div role="status" className="flex items-center gap-2 text-xs text-text-muted py-2">
          <div className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
          <span>Cargando contenido del aula…</span>
        </div>
      )}

      {/* Activity Publishing Form */}
      {creating && course.can_publish && (
        <form
          className="eval-compact-form my-4 rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4 animate-in fade-in duration-200"
          aria-label="Publicar actividad en esta semana"
          onSubmit={event => void publish(event)}
        >
          <fieldset disabled={busy || activities.isUncertain() || client.isUncertain()} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <legend className="text-sm font-semibold text-text">Actividad · {title}</legend>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="text-xs text-text-muted hover:text-text cursor-pointer p-1"
                aria-label="Cerrar formulario"
              >
                ✕
              </button>
            </div>

            <div>
              <label htmlFor={"weekly-title-"+course.id} className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Título de la actividad
              </label>
              <input
                id={"weekly-title-"+course.id}
                name="title"
                required
                maxLength={200}
                placeholder="Ej: Análisis del tema o Resolución de ejercicios"
                className="block w-full rounded-lg border border-border bg-surface text-text px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label htmlFor={"weekly-instructions-"+course.id} className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Instrucciones
              </label>
              <textarea
                id={"weekly-instructions-"+course.id}
                name="instructions"
                required
                maxLength={10000}
                rows={3}
                placeholder="Detalla las instrucciones para los estudiantes…"
                className="block w-full rounded-lg border border-border bg-surface text-text px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label htmlFor={"weekly-due_on-"+course.id} className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Fecha límite opcional
              </label>
              <input
                id={"weekly-due_on-"+course.id}
                name="due_on" min={todayInLima()}
                type="date"
                className="block w-full sm:w-auto rounded-lg border border-border bg-surface text-text px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                className="eval-primary-action inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold shadow-xs hover:bg-primary-hover transition-all cursor-pointer disabled:opacity-50"
                type="submit"
              >
                Publicar en esta semana
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {/* Uncertainty Notice for Activities */}
      {activities.isUncertain() && (
        <div className="eval-inline-notice flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-900">
          <p>No se pudo confirmar la publicación. Consulta el curso antes de realizar otra operación.</p>
          <button
            disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-amber-200 text-amber-900 font-semibold hover:bg-amber-300 transition-all cursor-pointer"
            onClick={async () => {
              setBusy(true);
              try {
                await activities.activities(course.id);
                if (activities.canReview()) {
                  activities.review();
                  setMessage('Resultado consultado. Revisa la actividad antes de publicar otra.');
                  await load({ bucket: 'unassigned' }, '', true);
                }
              } catch (error) {
                fail(error);
              } finally {
                setBusy(false);
              }
            }}
          >
            Consultar publicación
          </button>
        </div>
      )}

      {/* Uncertainty Notice for Weeks Client */}
      {client.isUncertain() && (
        <div className="eval-inline-notice rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2">
          <p>Revisa el resultado de la organización antes de guardar otra semana.</p>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-amber-200 text-amber-900 font-semibold hover:bg-amber-300 transition-all cursor-pointer"
              onClick={() => void review()}
            >
              Consultar resultado
            </button>
            {reviewed && (
              <span className="self-center">
                Versión {reviewed.version} · {reviewed.week_id ? 'Con semana' : 'Sin semana'}.
              </span>
            )}
            {reviewed && client.canResumeWrites() && (
              <button
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover shadow-xs transition-all cursor-pointer"
                onClick={() => {
                  client.resumeWrites();
                  setReviewed(null);
                  void load(selection, filter, true);
                }}
              >
                He revisado el resultado; continuar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Week Reassignment Form */}
      {editing && (
        <form
          className="eval-compact-form my-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
          onSubmit={event => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Semana para este recurso
            <select
              aria-label="Semana para este recurso"
              value={chosen}
              disabled={busy || client.isUncertain()}
              onChange={event => setChosen(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-surface text-text p-2.5 text-xs font-normal"
            >
              <option value="">Sin semana</option>
              {currentWeeks.map(week => (
                <option key={week.id} value={week.id}>
                  Semana {week.number} · {week.start_on}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="submit"
              disabled={busy || client.isUncertain()}
              className="px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Guardar semana
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(null)}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Empty State */}
      {!busy && materials && tasks && entries.length === 0 && (
        <div className="eval-empty-state rounded-2xl border border-dashed border-border p-10 text-center bg-surface-2/40 my-4">
          <span aria-hidden="true" className="text-2xl block mb-2">✦</span>
          <h5 className="font-semibold text-text text-sm sm:text-base">
            {selection.bucket === 'pending' ? 'Todo al día en este curso' : 'Esta semana todavía no tiene contenido'}
          </h5>
          <p className="mt-1 text-xs text-text-muted max-w-sm mx-auto">
            {selection.bucket === 'pending'
              ? 'No hay actividades pendientes para esta consulta.'
              : 'Elige otra semana o revisa los materiales del curso.'}
          </p>
        </div>
      )}

      {/* Learning Grid */}
      <div className="eval-learning-grid grid gap-4 md:grid-cols-2">
        {entries.map(({ resource, association, progress }) => (
          <article
            key={association.kind + resource.id}
            className="eval-learning-card group rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="eval-learning-card-top flex items-center justify-between gap-2 mb-2">
                <span className="eval-resource-type inline-flex items-center gap-1 text-[11px] font-semibold text-text-muted bg-surface-2 px-2 py-0.5 rounded border border-border">
                  <span>{association.kind === 'material' ? '📄 Material educativo' : '📝 Actividad'}</span>
                </span>
                {progress && (
                  <span className={'eval-progress-pill eval-progress-' + progress.state + ' inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold'}>
                    {teacherMode && progress.state === 'graded' ? 'Revisadas' : progressLabels[progress.state]}
                    {progress.grade ? ' · ' + progress.grade : ''}
                  </span>
                )}
              </div>

              <h5 className="text-base font-semibold text-text whitespace-pre-wrap leading-snug group-hover:text-primary transition-colors">
                {resource.title}
              </h5>

              {association.kind === 'material' ? (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-text-muted break-all">
                    {(resource as Material).filename}
                  </p>
                  {isVideoMime((resource as Material).mime) && (
                    <video
                      controls
                      preload="metadata"
                      src={materialFileUrl(resource.id, 'inline')}
                      className="w-full max-h-56 rounded-xl bg-black border border-border"
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {isInlineMime((resource as Material).mime) && (
                      <a
                        className="eval-resource-link inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        href={materialFileUrl(resource.id, 'inline')}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {isVideoMime((resource as Material).mime) ? '🎬 Abrir video' : '👁️ Abrir material'}
                      </a>
                    )}
                    <a
                      className="eval-resource-link inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      href={materialFileUrl(resource.id, 'attachment')}
                      download
                    >
                      ↓ Descargar material
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-text-muted">
                    Fecha límite: <strong className="font-medium text-text">{(resource as Activity).due_on ?? 'Sin fecha límite'}</strong>
                  </p>
                  {progress?.late && (
                    <span className="eval-late-badge inline-block text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      Entrega tardía
                    </span>
                  )}
                  {teacherMode && progress && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-text-muted">
                          {progress.delivered} entregas · {progress.graded} calificadas
                        </span>
                        {progress.delivered - progress.graded > 0 ? (
                          <span className="font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                            🔥 {progress.delivered - progress.graded} por revisar
                          </span>
                        ) : progress.delivered > 0 ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                            ✓ Al día
                          </span>
                        ) : null}
                      </div>
                      {progress.delivered > 0 && (
                        <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden border border-border">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((progress.graded / progress.delivered) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {!teacherMode && progress?.feedback && (
                    <div className="eval-feedback-preview rounded-lg border-l-4 border-l-accent bg-surface-2 p-3 text-xs">
                      <strong className="block text-accent font-semibold mb-1">Retroalimentación formativa</strong>
                      <p className="text-text whitespace-pre-wrap">{progress.feedback}</p>
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      className="eval-resource-link inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs transition-all cursor-pointer"
                      disabled={busy}
                      onClick={() => void openActivity(resource.id)}
                    >
                      {teacherMode ? 'Revisar actividad y entregas' : progress?.state === 'pending' ? 'Abrir y entregar' : 'Ver entrega y calificación'} →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              {association.earlier_calendar ? (
                <small className="text-text-muted font-medium bg-surface-2 px-2 py-0.5 rounded border border-border">
                  Calendario anterior
                </small>
              ) : <span />}
              {course.can_publish && association.assignment_id === course.id && (
                <button
                  className="eval-secondary-link text-xs font-medium text-text-muted hover:text-primary transition-colors cursor-pointer"
                  disabled={busy || client.isUncertain()}
                  onClick={() => void edit(association)}
                >
                  ⚙️ Cambiar semana
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Pagination buttons */}
      {materials?.next_after && contentView !== 'activity' && (
        <button
          disabled={busy}
          onClick={() => void more('material')}
          className="px-3.5 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all cursor-pointer"
        >
          Más materiales
        </button>
      )}
      {tasks?.next_after && contentView !== 'material' && (
        <button
          disabled={busy}
          onClick={() => void more('activity')}
          className="px-3.5 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all cursor-pointer"
        >
          Más actividades
        </button>
      )}

      {/* Secondary Tools: Search & Previous Calendars */}
      <details className="eval-secondary-tools group rounded-xl border border-border bg-surface-2/60 p-4 transition-all">
        <summary className="text-xs font-semibold text-text cursor-pointer hover:text-primary transition-colors select-none flex items-center justify-between">
          <span>🔍 Buscar y consultar otros recursos</span>
          <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-4 pt-3 border-t border-border space-y-4">
          <form
            className="eval-course-search flex flex-wrap gap-2"
            onSubmit={event => {
              event.preventDefault();
              void load(selection, term);
            }}
          >
            <label className="flex-1 min-w-[200px]">
              <span className="sr-only">Buscar en esta vista</span>
              <input
                value={term}
                maxLength={100}
                placeholder="Buscar recurso por título…"
                onChange={event => setTerm(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface text-text px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <button
              disabled={busy}
              className="px-3.5 py-1.5 rounded-lg bg-surface text-text border border-border hover:bg-surface-2 text-xs font-medium cursor-pointer"
            >
              Buscar
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium cursor-pointer"
              onClick={() => void load({ bucket: 'unassigned' }, '', true)}
            >
              Sin semana
            </button>
            <button
              disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium cursor-pointer"
              onClick={() => void load({ bucket: 'earlier' }, '', true)}
            >
              Calendarios anteriores
            </button>
          </div>

          {calendar?.retained.map(revision => (
            <details key={revision.id} className="rounded-lg border border-border/70 bg-surface p-3 text-xs">
              <summary className="cursor-pointer font-medium text-text">
                Calendario anterior · {revision.recorded_at}
              </summary>
              <div className="eval-week-buttons flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
                {revision.blocks
                  .flatMap(block => block.weeks)
                  .map(week => (
                    <button
                      key={week.id}
                      disabled={busy}
                      onClick={() => void load({ bucket: 'week', revision: revision.id, week: week.id! }, '')}
                      className="px-2.5 py-1 rounded border border-border bg-surface-2 hover:bg-surface-3 text-xs font-medium cursor-pointer"
                    >
                      Semana {week.number}
                    </button>
                  ))}
              </div>
            </details>
          ))}
        </div>
      </details>

      {/* Activity Details Dialog */}
      {opened && (
        <AcademicDialog returnFocus={activityTrigger.current} label="Actividad y seguimiento" onClose={() => setOpened(null)}>
          <ActivityCard
            key={opened.id}
            activity={opened}
            client={activities}
            mode="activities"
            teacherMode={teacherMode}
            initialPanel="deliveries"
            onExpired={onExpired}
            onDenied={() => {
              setOpened(null);
              setMaterials(null);
              setTasks(null);
              setCalendar(null);
              setMessage('Tu acceso cambió. Consulta nuevamente el curso.');
            }}
          />
        </AcademicDialog>
      )}
    </section>
  );
}
