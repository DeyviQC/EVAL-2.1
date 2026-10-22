import { useState, useEffect, type ChangeEvent } from 'react';
import { Download, FileSpreadsheet, GraduationCap, Printer, Users } from 'lucide-react';
import type { AccountClient } from './accounts.js';
import type { AcademicClient } from './api.js';
import {
  parseCsv,
  validateStudentImport,
  validateTeacherImport,
  generateStudentCsvTemplate,
  generateTeacherCsvTemplate,
  exportCredentialsCsv,
  downloadFile,
  type ValidStudentRow,
  type ValidTeacherRow,
  type ImportError,
  type ImportedCredential,
} from './bulk-import.js';
import { catalogPage, periodPage, type CatalogRow } from './directory.js';
import type { period } from './contracts.js';

const button =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

type Props = {
  client: AccountClient;
  academic?: AcademicClient | undefined;
  onExpired: () => void;
  onComplete?: () => void;
};

export function BulkImportWorkspace({ client, academic, onExpired }: Props) {
  const [importType, setImportType] = useState<'student' | 'teacher'>('student');
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [grades, setGrades] = useState<CatalogRow[]>([]);
  const [sections, setSections] = useState<CatalogRow[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);

  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [validStudents, setValidStudents] = useState<ValidStudentRow[]>([]);
  const [validTeachers, setValidTeachers] = useState<ValidTeacherRow[]>([]);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<ImportedCredential[] | null>(null);
  const [generalNotice, setGeneralNotice] = useState('');

  // Cargar catálogo de grados, secciones y periodo activo para validar y matricular
  useEffect(() => {
    let active = true;
    if (!academic) return;

    void Promise.all([
      academic.directory('catalog/grade', catalogPage('grade')),
      academic.directory('catalog/section', catalogPage('section')),
      academic.directory('periods', periodPage),
    ])
      .then(([gRes, sRes, pRes]) => {
        if (!active) return;
        setGrades(gRes.items);
        setSections(sRes.items);
        const actPeriod = pRes.items.find((p: ReturnType<typeof period>) => p.state === 'active');
        if (actPeriod) setActivePeriodId(actPeriod.id);
      })
      .catch(() => {
        // En caso de que falle la consulta del catálogo, se continúa con validación básica
      });

    return () => {
      active = false;
    };
  }, [academic]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResults(null);
    setGeneralNotice('');

    const reader = new FileReader();
    reader.onload = e => {
      const text = String(e.target?.result ?? '');
      setRawText(text);
      runValidation(text, importType);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function runValidation(text: string, type: 'student' | 'teacher') {
    const { headers, rows } = parseCsv(text);
    if (rows.length === 0) {
      setGeneralNotice('El archivo seleccionado está vacío o no contiene filas con datos.');
      setValidationErrors([]);
      setValidStudents([]);
      setValidTeachers([]);
      return;
    }

    if (type === 'student') {
      const res = validateStudentImport(headers, rows, grades, sections);
      setValidationErrors(res.errors);
      setValidStudents(res.valid);
      setValidTeachers([]);
    } else {
      const res = validateTeacherImport(headers, rows);
      setValidationErrors(res.errors);
      setValidTeachers(res.valid);
      setValidStudents([]);
    }
  }

  function switchType(next: 'student' | 'teacher') {
    setImportType(next);
    setResults(null);
    setGeneralNotice('');
    if (rawText) {
      runValidation(rawText, next);
    }
  }

  async function executeImport() {
    const isStudent = importType === 'student';
    const total = isStudent ? validStudents.length : validTeachers.length;
    if (total === 0) return;

    setProcessing(true);
    setProgress({ current: 0, total });
    setGeneralNotice('');

    const createdCredentials: ImportedCredential[] = [];
    const today = new Date().toISOString().slice(0, 10);

    try {
      if (isStudent) {
        for (let i = 0; i < validStudents.length; i++) {
          const row = validStudents[i];
          if (!row) continue;
          setProgress({ current: i + 1, total });

          try {
            // 1. Crear cuenta institucional de estudiante
            const res = await client.create(row.name, row.username, 'student');
            const password = res.password ?? row.dni;

            let enrollmentStatus: 'enrolled' | 'skipped' | 'failed' = 'skipped';

            // 2. Si cuenta con grado y sección válidos y hay periodo activo, matricular automáticamente
            if (academic && activePeriodId && row.gradeId && row.sectionId) {
              try {
                await academic.createEnrollment({
                  student_id: res.id,
                  academic_period_id: activePeriodId,
                  grade_id: row.gradeId,
                  section_id: row.sectionId,
                  effective_from: today,
                  effective_until: null,
                });
                enrollmentStatus = 'enrolled';
              } catch {
                enrollmentStatus = 'failed';
              }
            }

            createdCredentials.push({
              name: row.name,
              username: row.username,
              password,
              role: 'student',
              gradeName: row.gradeName,
              sectionName: row.sectionName,
              enrollmentStatus,
            });
          } catch (error: unknown) {
            // Continuar con los siguientes estudiantes si uno falla (ej. usuario ya existente)
            createdCredentials.push({
              name: row.name,
              username: row.username,
              password: 'ERROR: No se pudo crear',
              role: 'student',
              gradeName: row.gradeName,
              sectionName: row.sectionName,
              enrollmentStatus: 'failed',
            });
          }
        }
      } else {
        for (let i = 0; i < validTeachers.length; i++) {
          const row = validTeachers[i];
          if (!row) continue;
          setProgress({ current: i + 1, total });

          try {
            const res = await client.create(row.name, row.username, 'teacher');
            createdCredentials.push({
              name: row.name,
              username: row.username,
              password: res.password ?? 'Generada',
              role: 'teacher',
            });
          } catch {
            createdCredentials.push({
              name: row.name,
              username: row.username,
              password: 'ERROR: No se pudo crear',
              role: 'teacher',
            });
          }
        }
      }

      setResults(createdCredentials);
    } catch {
      setGeneralNotice('Ocurrió un error inesperado durante el procesamiento masivo.');
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  }

  const validCount = importType === 'student' ? validStudents.length : validTeachers.length;

  return (
    <section className="space-y-6" aria-label="Carga masiva institucional">
      {/* Vista de pantalla regular */}
      <div className="eval-screen-only space-y-6">
        <header className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
                ADMINISTRACIÓN MASIVA
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-text mt-1">
                Importación masiva de {importType === 'student' ? 'Estudiantes' : 'Docentes'}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Carga múltiples cuentas institucionales y matrículas escolares desde archivos CSV o Excel.
              </p>
            </div>

            {/* Selector de rol */}
            <div className="flex gap-1.5 p-1 bg-surface-2 border border-border rounded-xl self-start sm:self-auto">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  importType === 'student' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
                }`}
                onClick={() => switchType('student')}
                disabled={processing}
              >
                <GraduationCap size={18} aria-hidden="true" className="inline-block align-middle mr-1.5"/> Estudiantes
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  importType === 'teacher' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
                }`}
                onClick={() => switchType('teacher')}
                disabled={processing}
              >
                <Users size={18} aria-hidden="true" className="inline-block align-middle mr-1.5"/> Docentes
              </button>
            </div>
          </div>
        </header>

        {/* Sección de Descarga de Plantillas Oficiales */}
        <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider">Plantilla oficial para Excel / CSV</h4>
            <p className="text-xs text-text-muted">
              Descarga la estructura requerida con ejemplos de datos de la I.E. Nuestra Señora de las Mercedes.
            </p>
          </div>
          <button
            type="button"
            className={button + ' bg-surface hover:bg-surface-2 text-text shrink-0'}
            onClick={() => {
              if (importType === 'student') {
                downloadFile('plantilla-estudiantes-mercedes.csv', generateStudentCsvTemplate());
              } else {
                downloadFile('plantilla-docentes-mercedes.csv', generateTeacherCsvTemplate());
              }
            }}
          >
            <Download size={18} aria-hidden="true"/> Descargar plantilla ({importType === 'student' ? 'Estudiantes' : 'Docentes'})
          </button>
        </div>

        {/* Zona de Subida de Archivo */}
        {!results && (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 sm:p-8 bg-surface text-center space-y-3 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
              <FileSpreadsheet size={26} strokeWidth={1.6} aria-hidden="true"/>
            </div>
            <div>
              <label
                htmlFor="csv-upload"
                className="inline-flex items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-white py-2.5 px-5 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                Seleccionar archivo CSV
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFile}
                  disabled={processing}
                />
              </label>
              <p className="text-xs text-text-muted mt-2">
                {fileName ? `Archivo seleccionado: ${fileName}` : 'Formatos soportados: CSV delimitado por comas o punto y coma (UTF-8)'}
              </p>
            </div>
          </div>
        )}

        {generalNotice && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
            {generalNotice}
          </div>
        )}

        {/* Resumen de Validación Previa (Dry-run) */}
        {!results && rawText && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ✓ {validCount} {validCount === 1 ? 'fila válida' : 'filas válidas'}
                </span>
                {validationErrors.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    ✕ {validationErrors.length} {validationErrors.length === 1 ? 'observación' : 'observaciones'}
                  </span>
                )}
              </div>

              {validCount > 0 && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => void executeImport()}
                  className={
                    button +
                    ' bg-accent text-navy-950 hover:bg-accent-hover font-bold px-5 py-2 text-xs border-transparent'
                  }
                >
                  {processing
                    ? `Procesando (${progress?.current}/${progress?.total})…`
                    : `🚀 Iniciar importación masiva (${validCount} registros)`}
                </button>
              )}
            </div>

            {/* Tabla de Errores por Fila */}
            {validationErrors.length > 0 && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  Observaciones detectadas en el archivo ({validationErrors.length})
                </h4>
                <div className="overflow-x-auto max-h-60 rounded-lg border border-border bg-surface">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2 text-text-muted uppercase text-[10px] font-bold border-b border-border">
                      <tr>
                        <th className="p-2.5">Fila</th>
                        <th className="p-2.5">Campo</th>
                        <th className="p-2.5">Valor detectado</th>
                        <th className="p-2.5">Descripción del error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {validationErrors.map((err, i) => (
                        <tr key={i} className="hover:bg-rose-500/5">
                          <td className="p-2.5 font-bold font-mono">Fila {err.row}</td>
                          <td className="p-2.5 font-semibold text-text">{err.field}</td>
                          <td className="p-2.5 font-mono text-text-muted">{err.value || '—'}</td>
                          <td className="p-2.5 text-rose-600 dark:text-rose-400">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vista Previa de Filas Válidas */}
            {validCount > 0 && (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                  Previsualización de registros a importar ({validCount})
                </h4>
                <div className="overflow-x-auto max-h-72 rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2 text-text-muted uppercase text-[10px] font-bold border-b border-border">
                      <tr>
                        <th className="p-2.5">DNI</th>
                        <th className="p-2.5">Nombre Completo</th>
                        <th className="p-2.5">Usuario Asignado</th>
                        {importType === 'student' && (
                          <>
                            <th className="p-2.5">Grado</th>
                            <th className="p-2.5">Sección</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {importType === 'student'
                        ? validStudents.map((s, idx) => (
                            <tr key={idx} className="hover:bg-surface-2/60">
                              <td className="p-2.5 font-mono text-text-muted">{s.dni}</td>
                              <td className="p-2.5 font-semibold text-text">{s.name}</td>
                              <td className="p-2.5 font-mono text-primary text-[11px]">{s.username}</td>
                              <td className="p-2.5 text-text-muted">{s.gradeName ?? '—'}</td>
                              <td className="p-2.5 text-text-muted">{s.sectionName ?? '—'}</td>
                            </tr>
                          ))
                        : validTeachers.map((t, idx) => (
                            <tr key={idx} className="hover:bg-surface-2/60">
                              <td className="p-2.5 font-mono text-text-muted">{t.dni}</td>
                              <td className="p-2.5 font-semibold text-text">{t.name}</td>
                              <td className="p-2.5 font-mono text-primary text-[11px]">{t.username}</td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Centro de Distribución de Credenciales Generadas (Resultados) */}
        {results && (
          <div className="rounded-2xl border border-emerald-500/40 bg-surface p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ✓ CARGA FINALIZADA CON ÉXITO
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-normal text-text">
                  Credenciales iniciales generadas ({results.length})
                </h3>
                <p className="text-xs text-text-muted">
                  Imprime las fichas para entregarlas a cada estudiante o descarga el reporte en Excel.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={button + ' bg-primary text-white hover:bg-primary-hover border-transparent py-2 px-3.5'}
                >
                  <Printer size={18} aria-hidden="true"/> Imprimir fichas recortables
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadFile(
                      `credenciales-${importType}-${new Date().toISOString().slice(0, 10)}.csv`,
                      exportCredentialsCsv(results)
                    )
                  }
                  className={button + ' bg-surface hover:bg-surface-2 text-text py-2 px-3.5'}
                >
                  <FileSpreadsheet size={18} aria-hidden="true"/> Exportar a Excel (CSV)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResults(null);
                    setRawText('');
                    setFileName('');
                  }}
                  className={button}
                >
                  Realizar otra carga
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
              <strong>Importante:</strong> Por seguridad institucional, las contraseñas generadas solo se muestran en esta pantalla. Imprime o descarga el reporte ahora; no podrás volver a consultar las contraseñas sin restablecerlas.
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-text-muted uppercase text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="p-2.5">Nombre Completo</th>
                    <th className="p-2.5">Usuario</th>
                    <th className="p-2.5">Contraseña Provisional</th>
                    {importType === 'student' && (
                      <>
                        <th className="p-2.5">Aula</th>
                        <th className="p-2.5">Matrícula</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, i) => (
                    <tr key={i} className="hover:bg-surface-2/60">
                      <td className="p-2.5 font-semibold text-text">{r.name}</td>
                      <td className="p-2.5 font-mono text-primary font-bold text-[11px]">{r.username}</td>
                      <td className="p-2.5 font-mono bg-surface-2/40 text-text font-bold text-xs tracking-wider">
                        {r.password}
                      </td>
                      {importType === 'student' && (
                        <>
                          <td className="p-2.5 text-text-muted">
                            {r.gradeName ? `${r.gradeName} - ${r.sectionName}` : '—'}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                r.enrollmentStatus === 'enrolled'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-surface-2 text-text-muted border-border'
                              }`}
                            >
                              {r.enrollmentStatus === 'enrolled'
                                ? 'Matriculada'
                                : r.enrollmentStatus === 'failed'
                                ? 'Error'
                                : 'Sin aula'}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Vista de Impresión Oficial (Solo se activa al imprimir con window.print()) */}
      {results && (
        <div className="eval-print-only" aria-hidden="true">
          <header className="eval-print-header">
            <h1 className="eval-print-school">I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO</h1>
            <h2 className="eval-print-title">CREDENCIALES OFICIALES DE ACCESO INSTITUCIONAL (EVAL v2.1)</h2>
            <p className="eval-print-meta">
              Fichas recortables individuales para estudiantes/docentes · Cambio obligatorio en el primer inicio de sesión.
            </p>
          </header>

          <div className="eval-credential-grid grid grid-cols-2 gap-4 mt-6">
            {results.map((cred, idx) => (
              <div
                key={idx}
                className="eval-credential-card border-2 border-dashed border-gray-400 p-4 rounded-xl space-y-2 bg-white text-black break-inside-avoid"
              >
                <div className="border-b border-gray-300 pb-1.5 flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      I.E. Nuestra Señora de las Mercedes
                    </p>
                    <h4 className="text-sm font-bold text-black">{cred.name}</h4>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-gray-300">
                    {cred.role === 'student' ? 'Estudiante' : 'Docente'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Usuario:</span>
                    <span className="font-mono font-bold text-sm">{cred.username}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Contraseña inicial:</span>
                    <span className="font-mono font-bold text-sm bg-gray-100 px-1 py-0.5 rounded border border-gray-200">
                      {cred.password}
                    </span>
                  </div>
                </div>

                {cred.gradeName && (
                  <div className="text-[11px] text-gray-700">
                    <strong>Aula:</strong> {cred.gradeName} · {cred.sectionName}
                  </div>
                )}

                <div className="pt-1.5 border-t border-gray-200 text-[9px] text-gray-500 flex justify-between items-center">
                  <span>Plataforma EVAL: Acceso LAN / WLAN</span>
                  <span className="italic">✂ Recortar por la línea punteada</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
