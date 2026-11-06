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

function buildFeedbackSuggestions(studentName: string): Record<GradeKey, { tag: string; text: string }[]> {
  const firstName = studentName.split(/\s+/).filter(Boolean)[0] ?? 'Estudiante';
  return {
    AD: [
      {
        tag: 'Logro destacado + Autonomía',
        text: `${firstName}, evidencias un dominio sobresaliente del propósito de aprendizaje. Sustentas tus ideas con argumentos sólidos, ejemplos propios y gran claridad. ¿Cómo podrías aplicar esta estrategia en un nuevo reto o compartir tu método con el aula?`,
      },
      {
        tag: 'Profundidad + Transferencia',
        text: `¡Excelente trabajo, ${firstName}! Cumples y superas todos los criterios de evaluación establecidos, integrando los conceptos trabajados en clase con pensamiento crítico y originalidad.`,
      },
      {
        tag: 'Criterio de excelencia',
        text: `Fortaleza destacada: organización rigurosa de la evidencia y conclusiones bien fundamentadas. Continúa profundizando con la misma autonomía académica.`,
      },
    ],
    A: [
      {
        tag: 'Logro esperado + Proyección',
        text: `${firstName}, has alcanzado satisfactoriamente el propósito de la actividad cumpliendo los criterios de evaluación previstos. Para dar el siguiente paso hacia el nivel destacado, ¿qué ejemplo o caso concreto podrías añadir en tus conclusiones?`,
      },
      {
        tag: 'Claridad + Mejora puntual',
        text: `Buen desarrollo de la evidencia, ${firstName}. Tus respuestas responden con pertinencia a la consigna. Te sugiero revisar la precisión de algunos términos clave para fortalecer aún más tu argumentación.`,
      },
      {
        tag: 'Criterio cumplido',
        text: `Fortaleza: desarrollo completo y ordenado de los pasos solicitados. Sugerencia formativa: profundizar en la justificación final de tu procedimiento.`,
      },
    ],
    B: [
      {
        tag: 'Avance + Pregunta mediadora',
        text: `${firstName}, muestras un avance importante en la primera parte de la actividad; sin embargo, aún está en proceso sustentar el desarrollo completo según los criterios. ¿Qué información de la guía de clase te ayudaría a completar el segundo paso?`,
      },
      {
        tag: 'Ruta de mejora paso a paso',
        text: `Estás cerca del logro esperado, ${firstName}. Te recomiendo: 1) Releer la consigna principal, 2) Completar los ejemplos pendientes con tus propias palabras y 3) Verificar que tu conclusión responda a la pregunta retadora.`,
      },
      {
        tag: 'Revisión de criterios',
        text: `Logro parcial: identificas las ideas centrales del tema, pero falta relacionarlas con la evidencia solicitada. Apóyate en los recursos publicados en el aula para fortalecer tu análisis.`,
      },
    ],
    C: [
      {
        tag: 'Acompañamiento + Andamiaje',
        text: `${firstName}, valoro tu entrega inicial. Para alcanzar los criterios de la actividad necesitamos reforzar la comprensión del propósito. Empecemos identificando la idea principal del material de clase: ¿cuál consideras que es el dato clave del problema?`,
      },
      {
        tag: 'Orientación prioritaria',
        text: `En inicio, ${firstName}. La evidencia enviada aún no desarrolla los pasos indicados en la consigna. Te sugiero revisar la guía de la semana paso a paso y consultarme tus dudas en clase para acompañarte en su resolución.`,
      },
      {
        tag: 'Plan de apoyo',
        text: `Aspecto por fortalecer: comprensión de la consigna y desarrollo de las actividades propuestas. Revisa los ejemplos trabajados en el aula y realiza las correcciones sugeridas.`,
      },
    ],
  };
}

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
              <p className="text-[11px] text-text-muted mt-0.5" title={`Versión de evidencia #${delivery.assessment.version_id}`}>
                Calificada: <RecordedTime value={delivery.assessment.recorded_at} /> · Evidencia evaluada
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
              {history.map((r, idx) => (
                <section
                  key={r.id}
                  className="rounded-xl border border-border bg-surface p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-text">Nota {r.grade} · Revisión #{history.length - idx}</p>
                    <span className="text-[11px] text-text-muted">
                      <RecordedTime value={r.recorded_at} />
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-text">{r.feedback}</p>
                  <p className="text-[11px] text-text-muted">Evidencia asociada a esta calificación</p>
                  {delivery.version.filename && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {/\.(pdf|jpe?g|png)$/i.test(delivery.version.filename) && (
                        <a
                          href={evidenceUrl(r.version_id, 'inline')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-primary hover:underline font-medium"
                        >
                          👁️ Abrir evidencia calificada
                        </a>
                      )}
                      <a
                        href={evidenceUrl(r.version_id)}
                        download
                        className="inline-block text-primary hover:underline font-medium"
                      >
                        Descargar evidencia calificada
                      </a>
                    </div>
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

      {!delivery.can_assess && (delivery.is_locked || delivery.unmapped_bimester) && (
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <span>🔒</span>
          <span>
            {delivery.unmapped_bimester
              ? 'Calificación bloqueada: existen bimestres cerrados en este período y la actividad aún no está asociada a una semana del calendario escolar vigente.'
              : 'Bimestre cerrado: el registro y la corrección de calificaciones de este período han sido bloqueados por Subdirección.'}
          </span>
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

            {/* Plantillas de sugerencia rápida CNEB según la nota elegida */}
            {grade && isGradeKey(grade) && (
              <div className="space-y-2 p-3 rounded-xl bg-surface-2 border border-border/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    Asistente de retroalimentación CNEB para nota {grade} (clic para agregar):
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {buildFeedbackSuggestions(delivery.student_name)[grade].map((suggestion, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() =>
                        setFeedback((prev) => {
                          const trimmed = prev.trim();
                          if (!trimmed) return suggestion.text;
                          if (trimmed.includes(suggestion.text)) return prev;
                          return `${trimmed}\n\n${suggestion.text}`;
                        })
                      }
                      className="text-left text-[11px] p-2 rounded-lg bg-surface hover:bg-surface-3 text-text border border-border/60 hover:border-primary/40 transition-all cursor-pointer space-y-0.5"
                    >
                      <span className="block font-semibold text-primary text-[10px] uppercase tracking-wider">
                        💡 {suggestion.tag}
                      </span>
                      <span className="block text-text-muted leading-relaxed">{suggestion.text}</span>
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
                <div className="flex items-center gap-2">
                  {feedback.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFeedback('')}
                      className="text-[10px] font-medium text-text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                      Limpiar texto
                    </button>
                  )}
                  <span className="text-[10px] text-text-muted">
                    {Array.from(feedback).length}/5000 · Obligatoria según MINEDU
                  </span>
                </div>
              </div>
              <textarea
                id={`feedback-${delivery.id}`}
                aria-label="Retroalimentación"
                required
                maxLength={5000}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Describe los logros alcanzados, los aspectos por mejorar según los criterios y una recomendación o pregunta reflexiva..."
                className="block w-full rounded-xl border border-border bg-surface text-text p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[100px]"
                rows={4}
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
