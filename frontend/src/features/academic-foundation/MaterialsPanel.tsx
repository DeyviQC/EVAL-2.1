import {useActionFeedback} from './ActionFeedback.js';
import { ObservationsPanel } from './ObservationsPanel.js';
import { MaterialOptions } from './MaterialOptions.js';
import { RecordedTime } from './RecordedTime.js';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AcademicApiError } from './api.js';
import { publicationForm, materialFileUrl, materialAccept, isVideoMime, isInlineMime, type createMaterialClient, type Material } from './materials.js';
import type { Course } from './courses.js';

type View = { phase: 'loading' | 'ready' | 'error'; items: Material[]; cursor: string | null };

function getFileTypeInfo(filename: string, mime: string) {
  const ext = filename.split('.').pop()?.toUpperCase() ?? 'DOC';
  if (ext === 'PDF' || mime === 'application/pdf') {
    return { ext: 'PDF', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' };
  }
  if (['DOC', 'DOCX'].includes(ext) || mime.includes('word')) {
    return { ext, bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
  }
  if (['PPT', 'PPTX'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    return { ext, bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' };
  }
  if (['XLS', 'XLSX'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) {
    return { ext, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' };
  }
  if (['JPG', 'JPEG', 'PNG'].includes(ext) || mime.startsWith('image/')) {
    return { ext, bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' };
  }
  if (['MP4', 'WEBM', 'MOV', 'OGV'].includes(ext) || mime.startsWith('video/')) {
    return { ext, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800' };
  }
  return { ext, bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return Math.max(1, Math.ceil(bytes / 1024)) + ' KiB';
  }
  return (bytes / 1024 / 1024).toFixed(2) + ' MiB';
}

function message(error: unknown) {
  if (!(error instanceof AcademicApiError)) return error instanceof Error ? error.message : 'No se pudo completar la operación.';
  if (error.outcomeUnknown) return 'No se pudo confirmar la publicación. No la repitas: consulta los materiales y verifica el resultado.' + (error.correlationId ? ' Referencia: ' + error.correlationId : '');
  if (error.status === 401 || error.status === 419) return 'Tu sesión debe verificarse nuevamente.';
  if (error.status === 403 || error.status === 404) return 'No tienes acceso a estos materiales o el curso ya no está disponible.';
  if (error.status === 422) return 'Revisa el archivo y los campos. El servidor no admite ese contenido; no se permiten macros.';
  if (error.status === 409) return 'El curso cambió. Vuelve a abrirlo antes de publicar.';
  return 'No se pudo completar la operación. Verifica la conexión y consulta nuevamente.';
}

export function MaterialsPanel({
  course,
  client,
  onExpired,
  onBack,
  teacherMode = false,
}: {
  course: Course;
  client: ReturnType<typeof createMaterialClient>;
  onExpired: () => void;
  onBack: () => void;
  teacherMode?: boolean;
}) {
  const actionFeedback = useActionFeedback();
  const [view, setView] = useState<View>({ phase: 'loading', items: [], cursor: null });
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(() => client.isUncertain(course.id));
  const generation = useRef(0);
  const writing = useRef(false);
  const alive = useRef(true);
  const titleRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  function fail(problem: unknown) {
    setError(message(problem));
    if (problem instanceof AcademicApiError) {
      if (problem.status === 401 || problem.status === 419) onExpired();
      if (problem.outcomeUnknown || problem.status === 409) setBlocked(true);
    }
  }

  async function load(after: string | null = null, focusId: string | null = null) {
    const current = ++generation.current;
    setView(old => ({ ...old, phase: 'loading' }));
    try {
      const page = await client.list(course.id, after);
      if (!alive.current || current !== generation.current) return;
      if (focusId && !page.items.some(item => item.id === focusId)) {
        const item = await client.detail(focusId);
        if (!alive.current || current !== generation.current) return;
        setView({ phase: 'ready', items: [item, ...page.items], cursor: page.next_after });
      } else {
        setView(old => ({
          phase: 'ready',
          items: after ? [...old.items, ...page.items.filter(item => !old.items.some(existing => existing.id === item.id))] : page.items,
          cursor: page.next_after,
        }));
      }
    } catch (problem) {
      if (alive.current && current === generation.current) {
        setView({ phase: 'error', items: [], cursor: null });
        fail(problem);
      }
    }
  }

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, [course.id, client]);

  useEffect(() => {
    if (formOpen) titleRef.current?.focus();
  }, [formOpen]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current || busy || blocked || !course.can_publish) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');

    setError('');
    setNotice('');
    if (!(file instanceof File)) {
      setError('Selecciona un archivo.');
      return;
    }
    let payload: FormData;
    try {
      payload = publicationForm(String(data.get('title') ?? ''), String(data.get('description') ?? ''), file);
    } catch (problem) {
      fail(problem);
      return;
    }
    writing.current = true;
    setBusy(true);
    try {
      if (!await actionFeedback.confirm({title:'¿Publicar este material?',message:String(data.get('title'))+' · Estará disponible para las estudiantes de este curso.'}) || !alive.current) return;
      const result = await client.publish(course.id, payload);
      if (!alive.current) return;
      form.reset();
      setFormOpen(false);
      actionFeedback.success('Material publicado correctamente.');
      setNotice('Material publicado correctamente.');
      await load(null, result.id);
    } catch (problem) {
      if (alive.current) fail(problem);
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <section aria-label="Materiales del curso" aria-busy={busy || view.phase === 'loading'} className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h4 className="font-serif text-xl font-semibold text-text tracking-tight">Materiales del curso</h4>
          <p className="text-xs text-text-muted mt-0.5">Recursos educativos, lecturas y guías didácticas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {course.can_publish && (
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold shadow-xs hover:bg-primary-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={busy || blocked}
              onClick={() => setFormOpen(true)}
            >
              Publicar material
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy || view.phase === 'loading'}
            onClick={() => {
              setError('');
              void load();
            }}
          >
            ↻ Consultar materiales
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy}
            onClick={onBack}
          >
            ← Volver al curso
          </button>
        </div>
      </div>

      {/* Notifications and Alerts */}
      {notice && (
        <div role="status" className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-xs font-medium text-emerald-900 dark:text-emerald-200 animate-in fade-in">
          <span className="text-base">✓</span>
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div role="alert" tabIndex={-1} ref={errorRef} className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 focus:outline-hidden">
          <span className="text-base leading-none">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {blocked && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 text-xs text-amber-900">
          <span>⚠️</span>
          <span>No repitas la publicación. Consulta los materiales y verifica el resultado antes de continuar.</span>
        </div>
      )}

      {/* Publication Form */}
      {formOpen && (
        <form onSubmit={event => void submit(event)} aria-label="Publicar material" className="my-5 rounded-2xl border border-border bg-surface p-6 shadow-sm animate-in fade-in duration-200">
          <fieldset disabled={busy || blocked} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <legend className="text-base font-semibold text-text">Nuevo material educativo</legend>
              <button
                type="button"
                className="text-xs text-text-muted hover:text-text cursor-pointer p-1"
                onClick={() => setFormOpen(false)}
                aria-label="Cerrar formulario"
              >
                ✕
              </button>
            </div>
            <div>
              <label htmlFor={"material-title-"+course.id} className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Título del recurso
              </label>
              <input
                ref={titleRef}
                id={"material-title-"+course.id}
                name="title"
                required
                maxLength={255}
                placeholder="Ej: Guía de aprendizaje · Ecuaciones lineales"
                className="block w-full rounded-lg border border-border bg-surface text-text px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label htmlFor={"material-description-"+course.id} className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Descripción o indicaciones (opcional)
              </label>
              <textarea
                id={"material-description-"+course.id}
                name="description"
                maxLength={10000}
                rows={3}
                placeholder="Breve explicación de las actividades a realizar con este material…"
                className="block w-full rounded-lg border border-border bg-surface text-text px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label htmlFor={"material-upload-"+course.id} className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Archivo adjunto
              </label>
              <input
                id={"material-upload-"+course.id}
                name="file"
                type="file"
                required
                accept={materialAccept}
                aria-describedby="material-file-help"
                className="block w-full text-xs text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer cursor-pointer border border-border rounded-lg bg-surface-2 p-2"
              />
              <p id="material-file-help" className="mt-1.5 text-xs text-text-muted flex flex-wrap items-center gap-1.5">
                <span>Formatos permitidos:</span>
                <span className="font-medium text-text">PDF, Word, PowerPoint, Excel, JPG/PNG o Video (MP4/WebM/MOV/OGV)</span>
                <span>· Hasta 150 MiB · Sin macros</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold shadow-xs hover:bg-primary-hover transition-all cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Publicando…' : 'Publicar'}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all cursor-pointer"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {/* Loading state */}
      {view.phase === 'loading' && (
        <div role="status" className="flex items-center justify-center p-12 text-xs text-text-muted">
          <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          <span>Consultando materiales…</span>
        </div>
      )}

      {/* Empty state */}
      {view.phase === 'ready' && view.items.length === 0 && view.cursor === null && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-surface-2/40">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-2 border border-border flex items-center justify-center text-xl mb-3">
            📚
          </div>
          <h5 className="font-semibold text-text text-sm sm:text-base">Todavía no hay materiales</h5>
          <p className="mt-1 text-xs text-text-muted max-w-sm mx-auto">
            {course.can_publish
              ? 'Publica el primer recurso educativo para que los estudiantes puedan acceder a él.'
              : 'Aquí encontrarás los recursos que corresponden a tu curso.'}
          </p>
        </div>
      )}

      {/* Materials Grid */}
      {view.phase === 'ready' && view.items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {view.items.map(item => {
            const badge = getFileTypeInfo(item.filename, item.mime);
            return (
              <article
                key={item.id}
                aria-label={item.title}
                className="group rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${badge.bg}`}>
                      {badge.ext}
                    </span>
                    <span className="text-[11px] font-medium text-text-muted">
                      {formatFileSize(item.bytes)}
                    </span>
                  </div>

                  <h5 className="text-base font-semibold text-text whitespace-pre-wrap leading-snug group-hover:text-primary transition-colors">
                    {item.title}
                  </h5>

                  <p className="mt-1.5 text-xs text-text-muted break-all flex items-center gap-1.5">
                    <span>📄</span>
                    <span>{item.filename}</span>
                  </p>

                  {item.description && (
                    <p className="mt-3 text-xs text-text bg-surface-2/70 border border-border/50 rounded-lg p-2.5 whitespace-pre-wrap">
                      {item.description}
                    </p>
                  )}

                  {isVideoMime(item.mime) && (
                    <video
                      controls
                      preload="metadata"
                      src={materialFileUrl(item.id, 'inline')}
                      className="mt-3 w-full max-h-64 rounded-xl bg-black border border-border"
                    />
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted mb-3">
                    <span>Publicado por <strong className="font-medium text-text">{item.author_name}</strong></span>
                    <span><RecordedTime value={item.published_at} /></span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isInlineMime(item.mime) && (
                      <a
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-semibold transition-all cursor-pointer"
                        href={materialFileUrl(item.id, 'inline')}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {isVideoMime(item.mime) ? '🎬 Abrir video' : '👁️ Abrir'}
                      </a>
                    )}
                    <a
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs transition-all cursor-pointer"
                      href={materialFileUrl(item.id, 'attachment')}
                      download
                    >
                      ↓ Descargar
                    </a>
                  </div>

                  {teacherMode && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                      <MaterialOptions
                        id={item.id}
                        client={client.maintenance}
                        onChanged={async () => {
                          setNotice('Material actualizado correctamente.');
                          await load(null, item.id);
                        }}
                        onExpired={onExpired}
                      />
                      <ObservationsPanel
                        materialId={item.id}
                        client={client.observations}
                        onExpired={onExpired}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {view.phase === 'ready' && view.cursor && (
        <div className="text-center pt-2">
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all cursor-pointer"
            disabled={busy}
            onClick={() => void load(view.cursor)}
          >
            Cargar más materiales
          </button>
        </div>
      )}
    </section>
  );
}