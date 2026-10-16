import { useEffect, useRef, useState, useMemo } from 'react';
import { AcademicApiError, createAcademicClient } from './api.js';
import { periodPage, catalogPage, type CatalogRow } from './directory.js';
import { type period } from './contracts.js';
import { type ClassroomReport, type ReportClient, type BimesterState, downloadClassroomCsv, downloadClassroomExcel, officialClassroomReportUrl } from './reports.js';

const button = 'rounded-lg border border-eval-teal px-4 py-2 font-medium transition hover:bg-eval-teal/10 disabled:opacity-50';
const primaryButton = 'rounded-lg bg-eval-teal text-white px-4 py-2 font-medium shadow-sm transition hover:bg-eval-teal/90 disabled:opacity-50';
const exportButton = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50';
const field = 'mt-2 block w-full rounded-lg border border-eval-ink/30 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100 shadow-sm focus:border-eval-teal focus:ring-1 focus:ring-eval-teal';

type AcademicClient = ReturnType<typeof createAcademicClient>;
type Period = ReturnType<typeof period>;

export function ReportWorkspace({ client, academic, onExpired }: { client: ReportClient; academic: AcademicClient; onExpired: () => void }) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [grades, setGrades] = useState<CatalogRow[]>([]);
  const [sections, setSections] = useState<CatalogRow[]>([]);
  const [cursors, setCursors] = useState<{ period: string | null; grade: string | null; section: string | null }>({ period: null, grade: null, section: null });

  const [period, setPeriod] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [report, setReport] = useState<ClassroomReport | null>(null);
  const [bimesters, setBimesters] = useState<BimesterState[]>([]);
  const [closeConfirm, setCloseConfirm] = useState<number | null>(null);
  const [reopenDialog, setReopenDialog] = useState<{ bimester: number; justification: string } | null>(null);
  const [reopenError, setReopenError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'consolidado' | 'nomina'>('consolidado');

  // Filtros interactivos del reporte
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'historical'>('all');
  const [pendingFilter, setPendingFilter] = useState<'all' | 'pending'>('all');

  const generation = useRef(0);

  function fail(error: unknown) {
    if (error instanceof AcademicApiError) {
      if ([401, 419].includes(error.status ?? 0)) {
        onExpired();
        return;
      }
      if (error.status === 403) {
        setNotice('Tu cuenta no tiene acceso a reportes.');
        return;
      }
      if ([404, 422].includes(error.status ?? 0)) {
        setNotice('Revisa el período, grado y sección seleccionados.');
        return;
      }
    }
    setNotice('No se pudo consultar el reporte. Vuelve a consultar.');
  }

  async function directories(kind?: 'period' | 'grade' | 'section') {
    setBusy(true);
    try {
      if (!kind) {
        const [p, g, s] = await Promise.all([
          academic.directory('periods', periodPage),
          academic.directory('catalog/grade', catalogPage('grade')),
          academic.directory('catalog/section', catalogPage('section'))
        ]);
        setPeriods(p.items);
        setGrades(g.items);
        setSections(s.items);
        setCursors({ period: p.next_after, grade: g.next_after, section: s.next_after });
      } else if (kind === 'period') {
        const page = await academic.directory('periods', periodPage, cursors.period);
        setPeriods(old => [...old, ...page.items]);
        setCursors(old => ({ ...old, period: page.next_after }));
      } else {
        const page = await academic.directory(kind === 'grade' ? 'catalog/grade' : 'catalog/section', catalogPage(kind), cursors[kind]);
        (kind === 'grade' ? setGrades : setSections)(old => [...old, ...page.items]);
        setCursors(old => ({ ...old, [kind]: page.next_after }));
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void directories();
    return () => { generation.current++; };
  }, [academic]);

  function reset() {
    generation.current++;
    setReport(null);
    setNotice('');
    setSearchQuery('');
    setStatusFilter('all');
    setPendingFilter('all');
  }

  async function load(after: string | null = null) {
    const current = ++generation.current;
    setBusy(true);
    setNotice('');
    try {
      const data = await client.classroom(period, grade, section, after);
      if (generation.current === current) setReport(data);
    } catch (e) {
      if (generation.current === current) {
        setReport(null);
        fail(e);
      }
    } finally {
      if (generation.current === current) setBusy(false);
    }
  }

  async function loadBimesters(periodId: string) {
    if (!periodId) {
      setBimesters([]);
      return;
    }
    try {
      const res = await academic.bimesters(periodId);
      setBimesters(res.bimesters);
    } catch {
      setBimesters([]);
    }
  }

  useEffect(() => {
    if (period) void loadBimesters(period);
    else setBimesters([]);
  }, [period, academic]);

  async function handleCloseBimester(bNum: number) {
    if (!period) return;
    setBusy(true);
    setNotice('');
    try {
      await academic.closeBimester(period, bNum);
      await loadBimesters(period);
      setCloseConfirm(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleReopenBimester() {
    if (!period || !reopenDialog) return;
    const just = reopenDialog.justification.trim();
    if (just.length < 10) {
      setReopenError('La justificación debe tener al menos 10 caracteres.');
      return;
    }
    setBusy(true);
    setReopenError('');
    try {
      await academic.reopenBimester(period, reopenDialog.bimester, just);
      await loadBimesters(period);
      setReopenDialog(null);
    } catch (e) {
      if (e instanceof AcademicApiError && e.category === 'invalid_justification') {
        setReopenError('Justificación no válida (mínimo 10 caracteres).');
        return;
      }
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  // Filtrado de estudiantes en memoria
  const filteredItems = useMemo(() => {
    if (!report) return [];
    return report.items.filter(item => {
      const matchesSearch = searchQuery.trim() === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && !item.historical) || (statusFilter === 'historical' && item.historical);
      const matchesPending = pendingFilter === 'all' || (pendingFilter === 'pending' && item.pending > 0);
      return matchesSearch && matchesStatus && matchesPending;
    });
  }, [report, searchQuery, statusFilter, pendingFilter]);

  const nowLima = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

  return (
    <section aria-label="Reportes" aria-busy={busy}>
      <div className="eval-screen-only">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Reportes Institucionales</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Consulta el avance del aula y descarga consolidados oficiales para la I.E. Nuestra Señora de las Mercedes.
            </p>
          </div>
          {report && (
            <div className="flex items-center gap-2">
              <a
                href={client.officialUrl ? client.officialUrl(period, grade, section) : officialClassroomReportUrl(period, grade, section)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800 dark:text-teal-200 shadow-sm transition hover:bg-teal-100 dark:hover:bg-teal-900/60"
                title="Abrir Acta Oficial generada por el Servidor con Sello Digital Criptográfico SHA-256"
              >
                <span>🛡️</span>
                <span>Acta Oficial Servidor</span>
              </a>
              <button
                type="button"
                className={exportButton}
                onClick={() => window.print()}
                title="Imprimir o guardar como PDF oficial"
              >
                <span>🖨️</span>
                <span>Imprimir / PDF</span>
              </button>
              <button
                type="button"
                className={exportButton}
                onClick={() => downloadClassroomExcel(report)}
                title="Descargar libro Excel formateado (.xls)"
              >
                <span>📗</span>
                <span>Exportar Excel (.xls)</span>
              </button>
              <button
                type="button"
                className={exportButton}
                onClick={() => downloadClassroomCsv(report)}
                title="Descargar en formato plano CSV"
              >
                <span>📊</span>
                <span>Exportar CSV</span>
              </button>
            </div>
          )}
        </div>

        <p role="status" className="my-3 text-sm font-medium">{notice}</p>

        <div className="grid gap-4 md:grid-cols-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <label>
            <span className="font-semibold text-sm">Período</span>
            <select
              aria-label="Período del reporte"
              className={field}
              disabled={busy}
              value={period}
              onChange={e => { setPeriod(e.target.value); reset(); }}
            >
              <option value="">Selecciona un período</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            <span className="font-semibold text-sm">Grado</span>
            <select
              aria-label="Grado del reporte"
              className={field}
              disabled={busy}
              value={grade}
              onChange={e => { setGrade(e.target.value); setSection(''); reset(); }}
            >
              <option value="">Selecciona un grado</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label>
            <span className="font-semibold text-sm">Sección</span>
            <select
              aria-label="Sección del reporte"
              className={field}
              disabled={busy || !grade}
              value={section}
              onChange={e => { setSection(e.target.value); reset(); }}
            >
              <option value="">Selecciona una sección</option>
              {sections.filter(s => s.grade_id === grade).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>

        <div className="my-4 flex flex-wrap items-center gap-3">
          {(['period', 'grade', 'section'] as const).map(kind =>
            cursors[kind] && (
              <button
                key={kind}
                className={button}
                disabled={busy}
                onClick={() => void directories(kind)}
              >
                {kind === 'period' ? 'Más períodos' : kind === 'grade' ? 'Más grados' : 'Más secciones'}
              </button>
            )
          )}
          <button
            className={primaryButton}
            disabled={busy || !period || !grade || !section}
            onClick={() => void load()}
          >
            Consultar reporte
          </button>
        </div>

        {report && (
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {report.scope.period_name} · {report.scope.grade_name} {report.scope.section_name}
                </h3>
                <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {report.scope.period_state === 'closed' ? 'Período cerrado · consulta histórica' : report.scope.period_state === 'planned' ? 'Período planificado' : 'Período activo'}
                </span>
              </div>
            </div>

            {/* Control Institucional de Bimestres y Bloqueo de Calificaciones */}
            {bimesters.length > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>Cierre de Bimestres y Bloqueo de Calificaciones</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      El cierre bloquea la mutabilidad de notas docentes para el bimestre correspondiente. Solo Dirección puede autorizar reaperturas excepcionales con justificación registrada en la bitácora inmutable.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {bimesters.map(bim => {
                    const isLocked = bim.state === 'locked';
                    return (
                      <div
                        key={bim.bimester_number}
                        className={`p-3 rounded-lg border transition-all ${
                          isLocked
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {bim.bimester_number}.° Bimestre
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isLocked
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {isLocked ? '🔒 Bloqueado' : '📝 En Proceso'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          {isLocked
                            ? `Cerrado por: ${bim.closed_by_name ?? 'Dirección'}`
                            : 'Calificaciones abiertas para registro docente'}
                        </p>
                        {isLocked && bim.closed_at && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                            {bim.closed_at.slice(0, 16)}
                          </p>
                        )}
                        {bim.reopened_by_name && (
                          <div className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500">
                            <span>Reabierto por: <strong>{bim.reopened_by_name}</strong></span>
                            {bim.justification && (
                              <p className="italic text-slate-600 dark:text-slate-400 mt-0.5 truncate" title={bim.justification}>"{bim.justification}"</p>
                            )}
                          </div>
                        )}

                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex justify-end">
                          {isLocked ? (
                            <button
                              type="button"
                              className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
                              disabled={busy}
                              onClick={() => {
                                setReopenError('');
                                setReopenDialog({ bimester: bim.bimester_number, justification: '' });
                              }}
                            >
                              🔓 Reapertura Excepcional
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-xs text-rose-700 dark:text-rose-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
                              disabled={busy}
                              onClick={() => setCloseConfirm(bim.bimester_number)}
                            >
                              🔒 Cerrar Bimestre
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Switcher de Vistas */}
            <div className="flex items-center gap-2 mt-4 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'consolidado'
                    ? 'border-eval-teal text-eval-teal dark:text-teal-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('consolidado')}
              >
                📊 Consolidado de Calificaciones (CNEB)
              </button>
              <button
                type="button"
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'nomina'
                    ? 'border-eval-teal text-eval-teal dark:text-teal-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('nomina')}
              >
                📋 Nómina y Seguimiento de Aula
              </button>
            </div>

            {/* Tarjetas de Resumen (Métricas Base CNEB) */}
            <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <article aria-label="Entregas recibidas" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-3.5 shadow-sm">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Recibidas</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{report.totals.received}</p>
              </article>
              <article aria-label="Pendientes de calificar" className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 shadow-sm">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Pendientes</span>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{report.totals.pending}</p>
              </article>
              <article aria-label="Calificadas" className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 shadow-sm">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Calificadas</span>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{report.totals.graded}</p>
              </article>
              <article aria-label="AD" className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 shadow-sm">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Nota AD</span>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{report.totals.AD}</p>
              </article>
              <article aria-label="A" className="rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 p-3.5 shadow-sm">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">Nota A</span>
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-1">{report.totals.A}</p>
              </article>
              <article aria-label="B" className="rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 p-3.5 shadow-sm">
                <span className="text-xs font-bold text-sky-700 dark:text-sky-400">Nota B</span>
                <p className="text-2xl font-bold text-sky-700 dark:text-sky-400 mt-1">{report.totals.B}</p>
              </article>
              <article aria-label="C" className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 shadow-sm">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Nota C</span>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">{report.totals.C}</p>
              </article>
            </div>

            {/* VISTA 1: CONSOLIDADO DE CALIFICACIONES (CNEB) */}
            {activeTab === 'consolidado' && (
              <div className="space-y-5">
                {/* Panel de Rendimiento y Distribución Pedagógica */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Distribución de Logro del Aprendizaje (Norma CNEB)</span>
                    </h4>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Total Evaluaciones: {report.totals.graded}
                    </span>
                  </div>

                  {/* Barra Visual Segmentada de Notas */}
                  {report.totals.graded > 0 ? (
                    <div>
                      <div className="w-full h-5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden flex shadow-inner">
                        <div
                          style={{ width: `${Math.round((report.totals.AD / report.totals.graded) * 100)}%` }}
                          className="bg-emerald-500 h-full transition-all"
                          title={`AD (Logro Destacado): ${report.totals.AD} (${Math.round((report.totals.AD / report.totals.graded) * 100)}%)`}
                        />
                        <div
                          style={{ width: `${Math.round((report.totals.A / report.totals.graded) * 100)}%` }}
                          className="bg-teal-500 h-full transition-all"
                          title={`A (Logro Esperado): ${report.totals.A} (${Math.round((report.totals.A / report.totals.graded) * 100)}%)`}
                        />
                        <div
                          style={{ width: `${Math.round((report.totals.B / report.totals.graded) * 100)}%` }}
                          className="bg-sky-500 h-full transition-all"
                          title={`B (En Proceso): ${report.totals.B} (${Math.round((report.totals.B / report.totals.graded) * 100)}%)`}
                        />
                        <div
                          style={{ width: `${Math.round((report.totals.C / report.totals.graded) * 100)}%` }}
                          className="bg-rose-500 h-full transition-all"
                          title={`C (En Inicio): ${report.totals.C} (${Math.round((report.totals.C / report.totals.graded) * 100)}%)`}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                          <div>
                            <strong className="block text-emerald-800 dark:text-emerald-300 font-bold">AD · Destacado</strong>
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {report.totals.AD} ({Math.round((report.totals.AD / report.totals.graded) * 100)}%)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40">
                          <span className="w-3 h-3 rounded-full bg-teal-500 shrink-0"></span>
                          <div>
                            <strong className="block text-teal-800 dark:text-teal-300 font-bold">A · Esperado</strong>
                            <span className="text-teal-700 dark:text-teal-400">
                              {report.totals.A} ({Math.round((report.totals.A / report.totals.graded) * 100)}%)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40">
                          <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0"></span>
                          <div>
                            <strong className="block text-sky-800 dark:text-sky-300 font-bold">B · En Proceso</strong>
                            <span className="text-sky-700 dark:text-sky-400">
                              {report.totals.B} ({Math.round((report.totals.B / report.totals.graded) * 100)}%)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
                          <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></span>
                          <div>
                            <strong className="block text-rose-800 dark:text-rose-300 font-bold">C · En Inicio</strong>
                            <span className="text-rose-700 dark:text-rose-400">
                              {report.totals.C} ({Math.round((report.totals.C / report.totals.graded) * 100)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Métricas de Diagnóstico Institucional */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                          <strong className="text-slate-800 dark:text-slate-200 font-semibold block">
                            🎯 Nivel Satisfactorio (AD + A): {Math.round(((report.totals.AD + report.totals.A) / report.totals.graded) * 100)}%
                          </strong>
                          <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                            {report.totals.AD + report.totals.A} de {report.totals.graded} calificaciones alcanzaron o superaron el estándar del nivel.
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                          <strong className="text-slate-800 dark:text-slate-200 font-semibold block">
                            💡 Refuerzo Pedagógico (B + C): {Math.round(((report.totals.B + report.totals.C) / report.totals.graded) * 100)}%
                          </strong>
                          <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                            {report.totals.B + report.totals.C} calificaciones requieren acompañamiento pedagógico específico.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 py-3 text-center">
                      No hay calificaciones registradas aún en este período y aula.
                    </p>
                  )}
                </div>

                {/* Tabla de Registro Consolidado */}
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Registro Auxiliar Consolidado de Estudiantes ({filteredItems.length} evaluados)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300 w-12 text-center">N°</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Estudiante</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-28">Condición</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-36">Avance</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-28">Calificadas</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-28">Pendientes</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-32">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredItems.map((row, idx) => {
                        const completion = row.received > 0 ? Math.round((row.graded / row.received) * 100) : 0;
                        const isUpToDate = row.received > 0 && row.pending === 0;
                        const hasPending = row.pending > 0;

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                            <td className="p-3 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-3">
                              <span className="font-medium text-slate-900 dark:text-slate-100">{row.name}</span>
                              <span className="block text-[11px] font-mono text-slate-400 mt-0.5">DNI/ID: {row.id}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                                row.historical
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                              }`}>
                                {row.historical ? 'Histórico' : 'Activo'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="w-24 mx-auto">
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                  <span>{row.graded}/{row.received}</span>
                                  <span>{completion}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    style={{ width: `${completion}%` }}
                                    className={`h-full rounded-full ${isUpToDate ? 'bg-emerald-500' : hasPending ? 'bg-amber-500' : 'bg-slate-300'}`}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">{row.graded}</td>
                            <td className="p-3 text-center">
                              {row.pending > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400">
                                  {row.pending}
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {isUpToDate ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                  ✓ Al día
                                </span>
                              ) : hasPending ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                                  ⏳ Pendiente
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  Sin entregas
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VISTA 2: NÓMINA Y SEGUIMIENTO DETALLADO DE AULA */}
            {activeTab === 'nomina' && (
              <div>
                {/* Barra de Filtros en Vivo */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between my-4 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
                  <div className="w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Buscar estudiante..."
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <select
                      className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium"
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                    >
                      <option value="all">Condición: Todos</option>
                      <option value="active">Solo Activos</option>
                      <option value="historical">Solo Históricos</option>
                    </select>
                    <select
                      className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium"
                      value={pendingFilter}
                      onChange={e => setPendingFilter(e.target.value as typeof pendingFilter)}
                    >
                      <option value="all">Entregas: Todas</option>
                      <option value="pending">Con pendientes</option>
                    </select>
                  </div>
                </div>

                {/* Tabla de Estudiantes */}
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Estudiantes del aula</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Estudiante</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-center">Entregas</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-center">Calificadas</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-center">Pendientes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredItems.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                          <td className="p-3">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{row.name}</span>
                            {row.historical && (
                              <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                                Histórico
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">{row.received}</td>
                          <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">{row.graded}</td>
                          <td className="p-3 text-center">
                            {row.pending > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400">
                                {row.pending}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredItems.length === 0 && (
              <p className="my-4 text-center text-sm text-slate-500 py-6">
                No hay estudiantes que coincidan con la búsqueda o filtros aplicados.
              </p>
            )}

            <p className="my-3 text-xs text-slate-500 dark:text-slate-400">
              Los totales corresponden a toda el aula; la tabla muestra hasta 50 estudiantes por página.
            </p>

            <div className="flex gap-3 mt-4">
              <button className={button} disabled={busy} onClick={() => void load()}>
                Volver al inicio
              </button>
              {report.next_after && (
                <button className={button} disabled={busy} onClick={() => void load(report.next_after)}>
                  Siguiente página
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* VISTA OFICIAL DE IMPRESIÓN Y GUARDADO EN PDF (Solo visible al imprimir) */}
      {report && (
        <div className="eval-print-only eval-print-sheet">
          <div className="eval-print-header">
            <h1>I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO</h1>
            <h2>CONSOLIDADO OFICIAL DE EVALUACIONES Y SEGUIMIENTO DE AULA</h2>
            <p style={{ margin: 0, fontSize: '8.5pt', color: '#475569' }}>
              Plataforma Educativa EVAL v2.1 · Registro Institucional Seguro
            </p>
          </div>

          <div className="eval-print-meta">
            <div><strong>Período Lectivo:</strong> {report.scope.period_name}</div>
            <div><strong>Grado y Sección:</strong> {report.scope.grade_name} {report.scope.section_name}</div>
            <div><strong>Estado Período:</strong> {report.scope.period_state === 'closed' ? 'Cerrado' : report.scope.period_state === 'planned' ? 'Planificado' : 'Activo'}</div>
            <div><strong>Fecha de Emisión:</strong> {nowLima}</div>
            <div><strong>Condición de Calificaciones:</strong> {
              bimesters.length > 0 && bimesters.every(b => b.state === 'locked')
                ? 'CONSOLIDADO DEFINITIVO (TODOS LOS BIMESTRES CERRADOS)'
                : bimesters.some(b => b.state === 'locked')
                  ? `CONSOLIDADO MIXTO (${bimesters.filter(b => b.state === 'locked').map(b => `${b.bimester_number}°B`).join(', ')} CERRADOS)`
                  : 'VISTA PROVISIONAL EN PROCESO'
            }</div>
            <div><strong>Autorizado por:</strong> Dirección / Subdirección</div>
            <div><strong>Total Matriculados:</strong> {report.items.length} evaluados</div>
          </div>

          {bimesters.length > 0 && (
            <div style={{ margin: '8px 0', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '8pt', backgroundColor: '#f8fafc' }}>
              <strong>Estado por Bimestres: </strong>
              {bimesters.map(b => (
                <span key={b.bimester_number} style={{ marginRight: '14px' }}>
                  <strong>{b.bimester_number}.° Bimestre:</strong> {b.state === 'locked' ? `🔒 Cerrado (${b.closed_by_name ?? 'Dirección'})` : '📝 En Proceso'}
                  {b.reopened_by_name ? ` [Reabierto previamente por ${b.reopened_by_name}]` : ''}
                </span>
              ))}
            </div>
          )}

          <h3 style={{ fontSize: '10.5pt', fontWeight: 'bold', margin: '10px 0 6px 0' }}>
            RESUMEN DE CALIFICACIONES Y ENTREGAS DEL AULA
          </h3>
          <table className="eval-print-summary-table">
            <thead>
              <tr>
                <th>Entregas Recibidas</th>
                <th>Calificadas</th>
                <th>Pendientes</th>
                <th>AD (Destacado)</th>
                <th>A (Esperado)</th>
                <th>B (Proceso)</th>
                <th>C (Inicio)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>{report.totals.received}</strong></td>
                <td>{report.totals.graded}</td>
                <td>{report.totals.pending}</td>
                <td><strong>{report.totals.AD}</strong></td>
                <td><strong>{report.totals.A}</strong></td>
                <td>{report.totals.B}</td>
                <td>{report.totals.C}</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: '10.5pt', fontWeight: 'bold', margin: '14px 0 6px 0' }}>
            NÓMINA DE ESTUDIANTES Y REGISTRO DE CUMPLIMIENTO
          </h3>
          <table className="eval-print-roster-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}>N°</th>
                <th>Apellidos y Nombres</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Condición</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Entregas</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Calificadas</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Pendientes</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Firma/Conformidad</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((row, idx) => (
                <tr key={row.id}>
                  <td>{idx + 1}</td>
                  <td><strong>{row.name}</strong></td>
                  <td style={{ textAlign: 'center' }}>{row.historical ? 'Histórico' : 'Activo'}</td>
                  <td style={{ textAlign: 'center' }}>{row.received}</td>
                  <td style={{ textAlign: 'center' }}>{row.graded}</td>
                  <td style={{ textAlign: 'center' }}>{row.pending}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="eval-print-signatures">
            <div className="eval-print-sig-box">
              <div className="eval-print-sig-line"></div>
              <span>Docente de Área / Aula</span>
            </div>
            <div className="eval-print-sig-box">
              <div className="eval-print-sig-line"></div>
              <span>V.° B.° Subdirección Formación General</span>
            </div>
            <div className="eval-print-sig-box">
              <div className="eval-print-sig-line"></div>
              <span>V.° B.° Dirección General</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cierre de Bimestre */}
      {closeConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🔒 Confirmar Cierre de Bimestre</span>
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              ¿Está seguro de cerrar formalmente el <strong>{closeConfirm}.° Bimestre</strong>?
            </p>
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold">⚠️ Efectos del Cierre Institucional:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Se bloqueará el registro y modificación de calificaciones para los docentes en este bimestre.</li>
                <li>Las calificaciones pasarán a condición de <strong>CONSOLIDADO DEFINITIVO</strong>.</li>
                <li>Cualquier modificación posterior requerirá reapertura autorizada por Dirección con justificación grabada en la bitácora inmutable.</li>
              </ul>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setCloseConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCloseBimester(closeConfirm)}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
              >
                {busy ? 'Cerrando...' : 'Confirmar y Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitud de Reapertura Excepcional */}
      {reopenDialog !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🔓 Solicitud de Reapertura Excepcional</span>
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              Reapertura de calificaciones para el <strong>{reopenDialog.bimester}.° Bimestre</strong>.
            </p>
            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-lg text-xs text-rose-800 dark:text-rose-300">
              <p className="font-semibold">Auditoría Estricta Institucional:</p>
              <p className="mt-0.5">
                La reapertura desbloquea temporalmente el registro de notas. Este acto quedará permanentemente registrado en el Audit Trail institucional con su identidad de usuario, fecha y la justificación pedagógica/administrativa que proporcione.
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Motivo o Justificación Obligatoria (mínimo 10 caracteres):
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={reopenDialog.justification}
                onChange={e => {
                  setReopenDialog({ ...reopenDialog, justification: e.target.value });
                  if (reopenError) setReopenError('');
                }}
                placeholder="Ej: Corrección autorizada por Dirección según Memorando N° 045-2026 por error involuntario en rúbrica..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-eval-teal"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>{reopenDialog.justification.trim().length} / 500 caracteres</span>
                <span>Mínimo 10 caracteres</span>
              </div>
              {reopenError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
                  {reopenError}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setReopenDialog(null);
                  setReopenError('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy || reopenDialog.justification.trim().length < 10}
                onClick={() => void handleReopenBimester()}
                className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
              >
                {busy ? 'Autorizando...' : 'Autorizar Reapertura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
