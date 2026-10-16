import { useEffect, useRef, useState, useMemo } from 'react';
import { AcademicApiError, createAcademicClient } from './api.js';
import { periodPage, catalogPage, type CatalogRow } from './directory.js';
import { type period } from './contracts.js';
import { type ClassroomReport, type ReportClient, downloadClassroomCsv } from './reports.js';

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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

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
              <button
                type="button"
                className={exportButton}
                onClick={() => window.print()}
                title="Imprimir o guardar como PDF oficial"
              >
                <span>🖨️</span>
                <span>Imprimir / Guardar PDF</span>
              </button>
              <button
                type="button"
                className={exportButton}
                onClick={() => downloadClassroomCsv(report)}
                title="Descargar en formato Excel / CSV"
              >
                <span>📊</span>
                <span>Exportar Excel (CSV)</span>
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
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 sm:mt-0">
                Totales vigentes del aula completa
              </div>
            </div>

            {/* Tarjetas de Resumen */}
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
            <div><strong>Estado:</strong> {report.scope.period_state === 'closed' ? 'Cerrado' : report.scope.period_state === 'planned' ? 'Planificado' : 'Activo'}</div>
            <div><strong>Fecha de Emisión:</strong> {nowLima}</div>
            <div><strong>Autorizado por:</strong> Dirección / Subdirección</div>
            <div><strong>Total Matriculados:</strong> {report.items.length} evaluados</div>
          </div>

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
    </section>
  );
}
