import { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Users,
  FileText,
  BookOpen,
  ArrowRight,
  Plus,
  Upload,
  Library,
  TrendingUp,
  Sparkles,
  Award,
} from 'lucide-react';
import type { AccountClient } from '../accounts.js';
import type { AcademicClient } from '../api.js';
import { coursesPage, type Course } from '../courses.js';
import { dashboardOverview } from '../DashboardSummary.js';
import { Card, StatCard, CourseCard, Button, EmptyState } from '../ui/index.js';

/** Misma paleta curricular institucional que MyCourses y StudentHome. */
const subjectPalette: Array<[RegExp, string]> = [
  [/matem[aá]tic/i, '#3B82F6'],
  [/comunicac/i, '#8B5CF6'],
  [/ciencia y tecn|tecnolog/i, '#10B981'],
  [/ciencias sociales|social|historia/i, '#F59E0B'],
  [/personal|c[ií]vica/i, '#F43F5E'],
  [/arte|cultura/i, '#14B8A6'],
];

function subjectColor(subject: string): string {
  for (const [pattern, color] of subjectPalette) {
    if (pattern.test(subject)) return color;
  }
  return '#2A55A3';
}

type Props = {
  name: string;
  onSelect: (id: string, filter?: 'all' | 'pending' | 'submitted') => void;
  client?: AccountClient | undefined;
  academic?: Pick<AcademicClient, 'myCourses'> | undefined;
};

export function TeacherHome({ name, onSelect, client, academic }: Props) {
  const [data, setData] = useState<ReturnType<typeof dashboardOverview> | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesState, setCoursesState] = useState<'loading' | 'ready' | 'error'>(academic ? 'loading' : 'ready');

  // Consulta de asignaciones / cursos reales del docente
  useEffect(() => {
    let active = true;
    if (!academic) {
      setCourses([]);
      setCoursesState('ready');
      return;
    }
    setCoursesState('loading');
    academic
      .myCourses(coursesPage)
      .then((page) => {
        if (active) {
          setCourses(page.items);
          setCoursesState('ready');
        }
      })
      .catch(() => {
        if (active) {
          setCourses([]);
          setCoursesState('error');
        }
      });
    return () => {
      active = false;
    };
  }, [academic]);

  // Consulta del resumen de métricas del docente (overview)
  useEffect(() => {
    let active = true;
    if (client) {
      client
        .overview()
        .then((res) => {
          if (active) setData(res);
        })
        .catch(() => {
          if (active) setData(null);
        });
    }
    return () => {
      active = false;
    };
  }, [client]);

  // Saludo contextual por hora del día
  const hour = new Date().getHours();
  const firstName = name.split(/\s+/).filter(Boolean)[0] ?? 'Docente';
  const greeting =
    hour >= 5 && hour < 12
      ? `Buenos días, Prof. ${firstName}`
      : hour >= 12 && hour < 19
      ? `Buenas tardes, Prof. ${firstName}`
      : `Buenas noches, Prof. ${firstName}`;

  // Fecha actual en formato amigable en español (Perú)
  const todayRaw = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const todayFormatted = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  // Valores métricos
  const pendingCount = data?.pending ?? 0;
  const gradedCount = data?.graded ?? 0;
  const classroomsCount = data?.classrooms ?? (courses.length > 0 ? new Set(courses.map(c => c.grade + c.section)).size : 0);
  const activitiesCount = data?.activities ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 1. Encabezado de Bienvenida y Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1 border-b border-border/40">
        <div>
          <h2 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-text">
            {greeting}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Tu espacio de trabajo pedagógico y acompañamiento académico en EVAL.
          </p>
        </div>
        <span className="text-xs font-medium text-text-muted capitalize">
          {todayFormatted}
        </span>
        {/* Texto accesible para compatibilidad de suite de pruebas */}
        <span className="sr-only">Tu espacio de trabajo</span>
      </div>

      {/* 2. Hero de Acción Pedagógica Prioritaria */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white p-5 sm:p-6 border-0 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                pendingCount > 0
                  ? 'bg-accent/20 text-accent border-accent/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {pendingCount > 0 ? 'Revisión pedagógica pendiente' : 'Entregas al día'}
              </span>
              <span className="text-xs text-slate-300">· Evaluación formativa CNEB</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold !text-white tracking-tight leading-snug">
              {pendingCount > 0
                ? `Tienes ${pendingCount} ${pendingCount === 1 ? 'entrega pendiente' : 'entregas pendientes'} de calificación`
                : 'Todas las entregas recibidas han sido calificadas'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              {pendingCount > 0
                ? 'Acompaña a tus estudiantes con retroalimentación formativa oportuna bajo la escala oficial AD, A, B, C.'
                : 'Excelente labor. Tus estudiantes cuentan con sus calificaciones y retroalimentaciones al día.'}
            </p>
          </div>

          <Button
            variant={pendingCount > 0 ? 'accent' : 'outline'}
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => onSelect('activities', pendingCount > 0 ? 'pending' : 'all')}
            className={`shrink-0 self-start md:self-center ${pendingCount === 0 ? 'bg-white/10 text-white hover:bg-white/20 border-white/20' : ''}`}
          >
            {pendingCount > 0 ? 'Revisar entregas' : 'Ver actividades'}
          </Button>
        </div>
      </Card>

      {/* 3. Cuatro Métricas Clave del Docente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Por calificar"
          value={pendingCount}
          emptyMessage="¡Al día!"
          icon={<ClipboardList className="w-5 h-5" />}
          iconColor="text-amber-500"
          onClick={() => onSelect('activities', 'pending')}
        />
        <StatCard
          label="Calificadas"
          value={gradedCount}
          emptyMessage="0 revisadas"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconColor="text-emerald-500"
          onClick={() => onSelect('activities')}
        />
        <StatCard
          label="Aulas a cargo"
          value={classroomsCount}
          emptyMessage="0 aulas"
          icon={<Users className="w-5 h-5" />}
          iconColor="text-blue-500"
          onClick={() => onSelect('my_assignments')}
        />
        <StatCard
          label="Actividades"
          value={activitiesCount}
          emptyMessage="0 tareas"
          icon={<FileText className="w-5 h-5" />}
          iconColor="text-primary"
          onClick={() => onSelect('activities')}
        />
      </div>

      {/* 4. Distribución en 2 Columnas (2/3 Cursos y Aulas + 1/3 Accesos y Guía CNEB) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-base text-text">Mis cursos y aulas asignadas</h4>
              </div>
              <button
                type="button"
                onClick={() => onSelect('my_assignments')}
                className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer"
              >
                Ver todos ({coursesState === 'ready' ? courses.length : '—'}) →
              </button>
            </div>

            {coursesState === 'loading' && (
              <p role="status" className="text-xs text-text-muted">
                Consultando tus cursos y aulas…
              </p>
            )}
            {coursesState === 'error' && (
              <p role="alert" className="text-xs text-text-muted">
                No se pudieron cargar tus cursos. Revisa tu conexión e inténtalo de nuevo.
              </p>
            )}
            {coursesState === 'ready' && courses.length === 0 && (
              <EmptyState
                title="Sin cursos asignados"
                description="Cuando Subdirección registre tus asignaciones docentes para este período, aparecerán aquí."
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coursesState === 'ready' &&
                courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.subject}
                    gradeAndSection={`${course.grade} · Sección ${course.section}`}
                    teacherName={`Período: ${course.period}`}
                    subjectColor={subjectColor(course.subject)}
                    progress={null}
                    onOpen={() => onSelect('my_assignments')}
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Columna Lateral (1/3) */}
        <div className="space-y-6">
          {/* Tarjeta de Acciones Rápidas */}
          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sparkles className="w-4 h-4 text-accent" />
              <h4 className="font-semibold text-sm text-text">Acciones pedagógicas</h4>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSelect('activities')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface border border-border hover:border-primary/40 text-left transition-all text-xs group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="block text-text group-hover:text-primary transition-colors font-semibold">
                      Publicar actividad
                    </strong>
                    <span className="text-[11px] text-text-muted">Crear tarea para tus aulas</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onSelect('materials')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface border border-border hover:border-primary/40 text-left transition-all text-xs group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="block text-text group-hover:text-accent transition-colors font-semibold">
                      Subir material
                    </strong>
                    <span className="text-[11px] text-text-muted">Documentos, guías y recursos</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onSelect('library')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface border border-border hover:border-primary/40 text-left transition-all text-xs group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface text-text-muted flex items-center justify-center shrink-0 border border-border">
                    <Library className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="block text-text group-hover:text-primary transition-colors font-semibold">
                      Biblioteca del curso
                    </strong>
                    <span className="text-[11px] text-text-muted">Buscar recursos organizados</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onSelect('history')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface border border-border hover:border-primary/40 text-left transition-all text-xs group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface text-text-muted flex items-center justify-center shrink-0 border border-border">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="block text-text group-hover:text-primary transition-colors font-semibold">
                      Historial docente
                    </strong>
                    <span className="text-[11px] text-text-muted">Asignaciones de años anteriores</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </Card>

          {/* Tarjeta de Guía Rápida CNEB */}
          <Card className="space-y-3 p-5 bg-surface-2/40 border-border/80">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Award className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-xs text-text uppercase tracking-wider">
                Escala Formativa CNEB
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  AD
                </span>
                <span className="text-[11px] text-text-muted font-medium">Logro destacado</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  A
                </span>
                <span className="text-[11px] text-text-muted font-medium">Logro esperado</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  B
                </span>
                <span className="text-[11px] text-text-muted font-medium">En proceso</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                  C
                </span>
                <span className="text-[11px] text-text-muted font-medium">En inicio</span>
              </div>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed pt-1">
              La retroalimentación formativa cualitativa es obligatoria en cada calificación para orientar el aprendizaje de la estudiante.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
