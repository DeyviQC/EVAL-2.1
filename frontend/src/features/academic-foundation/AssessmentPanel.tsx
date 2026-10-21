import { RecordedTime } from './RecordedTime.js';
import { useState, useRef, type FormEvent } from 'react';
import { evidenceUrl, type ActivityClient, type Assessment, type Delivery } from './activities.js';
import { Sparkles, CheckCircle2, Clock } from 'lucide-react';

type GradeKey = 'AD' | 'A' | 'B' | 'C';

const gradeDefinitions: Record<GradeKey, { label: string; desc: string; color: string; activeColor: string }> = {
  AD: {
    label: 'AD',
    desc: 'Logro destacado',
    color: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30 font-bold',
  },
  A: {
    label: 'A',
    desc: 'Logro esperado',
    color: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    activeColor: 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/30 font-bold',
  },
  B: {
    label: 'B',
    desc: 'En proceso',
    color: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    activeColor: 'bg-amber-500 text-navy-950 border-amber-500 shadow-sm ring-2 ring-amber-500/30 font-bold',
  },
  C: {
    label: 'C',
    desc: 'En inicio',
    color: 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    activeColor: 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/30 font-bold',
  },
};

const feedbackSuggestions: Record<string, string[]> = {
  AD: [
    'Demuestra un dominio sobresaliente y autonomía en el logro del propósito de aprendizaje.',
    'Cumple y supera los criterios con argumentos fundamentados y propuestas pertinentes.',
  ],
  A: [
    'Cumple satisfactoriamente con los criterios de evaluación establecidos en la actividad.',
    'Logro esperado alcanzado. Se recomienda seguir profundizando en las conclusiones.',
  ],
  B: [
    'En proceso. Se sugiere revisar nuevamente la consigna y profundizar en la argumentación.',
    'Avance significativo. Es necesario completar todos los pasos solicitados en las instrucciones.',
  ],
  C: [
    'En inicio. Requiere acompañamiento para alcanzar el nivel esperado. Se sugiere coordinar asesoría.',
    'Revisa los materiales de clase compartidos y consulta tus dudas para la siguiente entrega.',
  ],
};

function isGradeKey(value: string): value is GradeKey {
  return value === 'AD' || value === 'A' || value === 'B' || value === 'C';
}

export function AssessmentPanel({
  client,
  delivery,
  blocked,
  onSaved,
  onError,
}: {
  client: ActivityClient;
  delivery: Delivery;
  blocked: boolean;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const writing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Assessment[]>([]);
  const [open, setOpen] = useState(false);
  const [after, setAfter] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [grade, setGrade] = useState(delivery.assessment?.grade ?? '');
  const [feedback, setFeedback] = useState(delivery.assessment?.feedback ?? '');

  async function load(append = false) {
    setBusy(true);
    try {
      const page = await client.assessments(delivery.id, append ? after : null);
      setHistory((old) => (append ? [...old, ...page.items] : page.items));
      setAfter(page.next_after);
      setOpen(true);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (writing.current || busy || blocked || client.isUncertain()) return;
    writing.current = true;
    setBusy(true);
    setNotice('');
    try {
      await client.assess(
        delivery.id,
        delivery.version.id,
        delivery.assessment?.id ?? null,
        grade,
        feedback
      );
      setNotice('Calificación guardada correctamente.');
      await onSaved();
    } catch (e) {
      onError(e);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      className="mt-4 border-t border-border/80 pt-4 space-y-4"
      aria-label="Calificación de la entrega"
    >
      {/* Estado Actual de la Calificación */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-border">
        <div className="flex items-center gap-2.5">
          {delivery.assessment ? (
            <span
              className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg text-sm font-bold border ${
                isGradeKey(delivery.assessment.grade)
                  ? gradeDefinitions[delivery.assessment.grade].color
                  : 'bg-surface-2 text-text'
              }`}
            >
              {delivery.assessment.grade}
            </span>
          ) : (
            <span className="w-8 h-8 rounded-lg bg-surface-2 text-text-muted flex items-center justify-center text-xs">
              <Clock className="w-4 h-4" />
            </span>
          )}
          <div>
            <p className="font-semibold text-sm text-text leading-tight">
              {delivery.assessment ? `Nota ${delivery.assessment.grade}` : 'Sin calificar'}
            </p>
            {delivery.assessment && (
              <p className="text-[11px] text-text-muted mt-0.5">
                Calificada: <RecordedTime value={delivery.assessment.recorded_at} /> · Evidencia versión{' '}
                {delivery.assessment.version_id}
              </p>
            )}
          </div>
        </div>

        {delivery.assessment && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            ✓ Evaluada
          </span>
        )}
      </div>

      {delivery.assessment && (
        <div className="p-3.5 rounded-xl bg-surface-2/60 border border-border/60 space-y-2">
          <p className="whitespace-pre-wrap text-xs text-text leading-relaxed">
            <strong className="text-text font-semibold block mb-1">Comentarios del docente:</strong>
            {delivery.assessment.feedback}
          </p>
          <p className="text-[11px] text-text-muted">
            La entrega calificada no admite nuevas versiones.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-xs font-medium text-text transition-all cursor-pointer shadow-2xs"
            disabled={busy}
            onClick={() => (open ? setOpen(false) : void load())}
          >
            {open ? 'Ocultar calificaciones anteriores' : 'Ver historial de calificaciones'}
          </button>
          {open && (
            <div className="space-y-3 mt-3 pt-3 border-t border-border">
              {history.map((r) => (
                <section
                  key={r.id}
                  className="rounded-xl border border-border bg-surface p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-text">Nota {r.grade}</p>
                    <span className="text-[11px] text-text-muted">
                      <RecordedTime value={r.recorded_at} />
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-text">{r.feedback}</p>
                  <p className="text-[11px] text-text-muted">Evidencia versión {r.version_id}</p>
                  {delivery.version.filename && (
                    <a
                      href={evidenceUrl(r.version_id)}
                      download
                      className="inline-block mt-1 text-primary hover:underline font-medium"
                    >
                      Descargar evidencia calificada
                    </a>
                  )}
                </section>
              ))}
              {after && (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-xs text-text transition-all cursor-pointer"
                  disabled={busy}
                  onClick={() => void load(true)}
                >
                  Más calificaciones
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Formulario de Calificación / Corrección */}
      {delivery.can_assess && (
        <form
          aria-label={delivery.assessment ? 'Corregir calificación' : 'Calificar entrega'}
          onSubmit={(event) => void save(event)}
          className="mt-3 p-4 rounded-xl bg-surface border border-border shadow-xs"
        >
          <fieldset disabled={busy || blocked} className="space-y-4">
            <legend className="font-bold text-sm text-text">
              {delivery.assessment ? 'Corregir calificación' : 'Calificar entrega'}
            </legend>

            {/* Selector Visual de Píldoras AD / A / B / C */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Escala oficial CNEB
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['AD', 'A', 'B', 'C'] as const).map((g) => {
                  const meta = gradeDefinitions[g];
                  const isSelected = grade === g;
                  return (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGrade(g)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected ? meta.activeColor : meta.color + ' hover:opacity-90'
                      }`}
                    >
                      <strong className="text-base font-bold leading-tight">{meta.label}</strong>
                      <span className="text-[10px] opacity-90 truncate max-w-full">
                        {meta.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Select nativo accesible sincronizado para contratos y lectores de pantalla */}
              <label className="sr-only">
                Calificación
                <select
                  aria-label="Calificación"
                  required
                  value={grade}
                  onChange={(event) => setGrade(event.target.value as typeof grade)}
                >
                  <option value="">Selecciona una nota</option>
                  {['AD', 'A', 'B', 'C'].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Plantillas de sugerencia rápida según la nota elegida */}
            {grade && feedbackSuggestions[grade] && (
              <div className="space-y-1.5 p-2.5 rounded-xl bg-surface-2 border border-border/80">
                <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-accent" />
                  Sugerencias para nota {grade} (clic para insertar):
                </span>
                <div className="flex flex-col gap-1">
                  {feedbackSuggestions[grade].map((suggestion, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setFeedback(suggestion)}
                      className="text-left text-[11px] p-1.5 rounded-lg bg-surface hover:bg-surface-3 text-text border border-border/60 transition-colors cursor-pointer"
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Campo de Retroalimentación Obligatoria */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={`feedback-${delivery.id}`}
                  className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
                >
                  Retroalimentación formativa *
                </label>
                <span className="text-[10px] text-text-muted">Obligatoria según MINEDU</span>
              </div>
              <textarea
                id={`feedback-${delivery.id}`}
                aria-label="Retroalimentación"
                required
                maxLength={5000}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Escribe comentarios formativos que orienten el aprendizaje de la estudiante..."
                className="block w-full rounded-xl border border-border bg-surface text-text p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[90px]"
                rows={3}
              />
            </div>

            {/* Botón de Guardado */}
            <button
              type="submit"
              disabled={busy || blocked || !grade || !feedback.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold px-5 py-2.5 text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Guardando calificación…' : 'Guardar calificación'}
            </button>
          </fieldset>
        </form>
      )}

      {notice && (
        <div className="p-3 rounded-xl bg-surface-2 border border-border text-xs text-text flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p role="status">{notice}</p>
        </div>
      )}
    </div>
  );
}
