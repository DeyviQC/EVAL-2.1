import { useEffect, useRef, useState, useMemo } from 'react';
import { AcademicApiError, type AcademicClient } from './api.js';
import { auditLedgerPage, type AuditLedgerEntry } from './audit.js';

type EntityFilter = 'all' | 'period' | 'enrollment' | 'assignment' | 'grade' | 'section';

const entityLabels: Record<string, string> = {
  all: 'Todas las entidades',
  period: 'Períodos Académicos',
  enrollment: 'Matrículas de Estudiantes',
  assignment: 'Asignaciones Docentes',
  grade: 'Grados',
  section: 'Secciones',
  entry: 'Áreas / Asignaturas'
};

const eventBadgeStyles: Record<string, string> = {
  created: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  activated: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  transferred: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  replaced: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  closed: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  updated: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
};

export function AuditWorkspace({ client, onExpired }: { client: AcademicClient; onExpired: () => void }) {
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rows, setRows] = useState<AuditLedgerEntry[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function load(cursor: string | null = null, append = false, currentSearch = debouncedSearch) {
    const current = ++generation.current;
    setBusy(true);
    setError('');
    if (!append) {
      setRows([]);
      setAfter(null);
    }

    try {
      const filterParam = entityFilter === 'all' ? undefined : entityFilter;
      const searchParam = currentSearch || undefined;
      const page = await client.auditLedger(auditLedgerPage, cursor, filterParam, searchParam);
      if (current !== generation.current) return;

      setRows(prev => (append ? [...prev, ...page.items] : page.items));
      setAfter(page.next_after);
    } catch (e) {
      if (current !== generation.current) return;
      if (e instanceof AcademicApiError && [401, 419].includes(e.status ?? 0)) {
        onExpired();
        return;
      }
      if (e instanceof AcademicApiError && e.status === 403) {
        setError('Acceso denegado: solo la Dirección y Subdirección pueden auditar la bitácora institucional.');
        return;
      }
      setError('No se pudo consultar la bitácora de auditoría. Intenta nuevamente.');
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }

  useEffect(() => {
    void load(null, false, debouncedSearch);
    return () => { generation.current++; };
  }, [client, entityFilter, debouncedSearch]);

  return (
    <section aria-label="Bitácora de auditoría institucional" aria-busy={busy} className="space-y-6">
      <header className="border-b border-border/80 pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
            SEGURIDAD Y CONTROL INSTITUCIONAL
          </span>
          <span className="text-[11px] font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded-md border border-border">
            Append-Only Ledger
          </span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-normal text-text tracking-tight">
          Bitácora de Auditoría Académica
        </h2>
        <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl">
          Registro inmutable y cronológico de todas las mutaciones del ciclo de vida académico (matrículas, traslados, asignaciones docentes y cambios de estado). Evidencia protegida contra modificación y eliminación.
        </p>
      </header>

      {/* Controles de Filtro y Búsqueda */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-xs flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1" htmlFor="audit-entity-filter">
            Filtrar por Entidad
          </label>
          <select
            id="audit-entity-filter"
            aria-label="Filtrar por tipo de entidad"
            className="w-full rounded-xl border border-border bg-surface text-text p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            value={entityFilter}
            disabled={busy}
            onChange={e => setEntityFilter(e.target.value as EntityFilter)}
          >
            {(['all', 'enrollment', 'assignment', 'period', 'grade', 'section'] as const).map(k => (
              <option key={k} value={k}>{entityLabels[k]}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[240px] relative">
          <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1" htmlFor="audit-search">
            Buscar en Bitácora (Global)
          </label>
          <div className="relative">
            <input
              id="audit-search"
              type="text"
              placeholder="Buscar por actor, correlación, clave..."
              className="w-full rounded-xl border border-border bg-surface text-text p-2.5 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchQuery}
              disabled={busy}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-sm font-bold p-0.5"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 hover:bg-surface text-text px-4 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          disabled={busy}
          onClick={() => void load(null, false, debouncedSearch)}
        >
          <span>🔄</span>
          <span>Actualizar</span>
        </button>
      </div>

      {debouncedSearch && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-surface-2/80 border border-border text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span>🔍</span>
            <span>Búsqueda global activa en todo el ledger: <strong className="text-text">"{debouncedSearch}"</strong></span>
          </span>
          <button
            type="button"
            className="text-xs text-primary hover:underline font-medium"
            onClick={() => setSearchQuery('')}
          >
            Quitar filtro
          </button>
        </div>
      )}

      {busy && rows.length === 0 && (
        <div className="p-4 rounded-xl bg-surface border border-border text-xs text-text-muted flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p role="status">Consultando registros del ledger inmutable…</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs">
          <p role="alert">{error}</p>
        </div>
      )}

      {!busy && !error && rows.length === 0 && (
        <div className="p-8 text-center bg-surface border border-border rounded-xl">
          <p className="text-xs text-text-muted">No se encontraron eventos en la bitácora para los criterios seleccionados.</p>
        </div>
      )}

      {/* Lista de Eventos de la Bitácora */}
      <div className="space-y-3">
        {rows.map(event => {
          const badgeClass = eventBadgeStyles[event.event_type] ?? 'bg-surface-2 text-text-muted border-border';
          const entityDisplayName = entityLabels[event.entity_type] ?? event.entity_type;

          return (
            <article
              key={event.id}
              aria-label={`Evento de auditoría ${event.id}`}
              className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-primary/40 transition-all flex flex-col gap-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                    {event.event_type}
                  </span>
                  <span className="text-xs font-semibold text-text">
                    {entityDisplayName} #{event.target_id}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span>📅 {event.effective_on}</span>
                  <span>·</span>
                  <span className="font-mono text-[11px]">{event.recorded_at.slice(0, 19)}</span>
                </div>
              </div>

              {/* Transición de Estado y Actor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                <div>
                  <span className="text-text-muted">Actor Responsable: </span>
                  <strong className="text-text">{event.actor_name}</strong>
                  <span className="text-[11px] text-text-muted ml-1">(ID: {event.actor_id})</span>
                </div>
                <div>
                  <span className="text-text-muted">Transición: </span>
                  {event.previous_state ? (
                    <span className="font-medium text-text">
                      <span className="text-text-muted line-through mr-1">{event.previous_state}</span>
                      ➔ <strong className="text-primary">{event.new_state ?? 'null'}</strong>
                    </span>
                  ) : (
                    <span>Estado inicial: <strong className="text-primary">{event.new_state ?? 'creado'}</strong></span>
                  )}
                </div>
              </div>

              {/* Trazabilidad Técnica */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-text-muted bg-surface-2/60 px-3 py-1.5 rounded-lg border border-border/50">
                <div>
                  <span>Clave Operación: </span>
                  <strong>{event.operation_key}</strong>
                </div>
                <div className="truncate max-w-[280px]" title={`Correlation ID: ${event.correlation_id}`}>
                  <span>Correlación: </span>
                  <span>{event.correlation_id}</span>
                </div>
                <div>
                  <span>Registro #{event.id}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {after && (
        <div className="text-center pt-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-2 text-text px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            disabled={busy}
            onClick={() => void load(after, true)}
          >
            {busy ? 'Cargando más eventos…' : 'Cargar más eventos de la bitácora'}
          </button>
        </div>
      )}
    </section>
  );
}
