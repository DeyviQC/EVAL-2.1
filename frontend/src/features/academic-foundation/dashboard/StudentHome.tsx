import { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Sparkles,
  Calendar,
  MessageSquare,
  Clock,
  AlertCircle,
  RefreshCw,
  User,
} from 'lucide-react';
import type { AccountClient } from '../accounts.js';
import type { StudentDashboard } from '../student-dashboard.js';
import type { CourseClassroomSelection } from '../course-classrooms.js';
import type { AcademicClient } from '../api.js';
import {
  Card,
  StatCard,
  CourseCard,
  TaskItem,
  ProgressBar,
  Button,
  EmptyState,
  Skeleton,
  StatCardSkeleton,
  CourseCardSkeleton,
} from '../ui/index.js';
import type { TaskItemProps } from '../ui/TaskItem.js';

/** Misma paleta que MyCourses: el color lo determina la asignatura, no la posición en la lista. */
const subjectPalette: Array<[RegExp, string]> = [
  [/matem[aá]tic/i, '#3B82F6'],
  [/comunicac/i, '#8B5CF6'],
  [/ciencia y tecn|tecnolog/i, '#10B981'],
  [/ciencias sociales|social|historia/i, '#F59E0B'],
  [/personal|c[ií]vica/i, '#F43F5E'],
  [/arte|cultura/i, '#14B8A6'],
];
function subjectColor(subject: string): string {
  for (const [pattern, color] of subjectPalette) if (pattern.test(subject)) return color;
  return '#3B82F6';
}

type Props = {
  name: string;
  onSelect: (id: string, filter?: 'all' | 'pending' | 'submitted') => void;
  onCourseSelect?: (assignmentId: string, selection: CourseClassroomSelection) => void;
  onActivitySelect?: (activityId: string) => void;
  client?: AccountClient | undefined;
  academic?: Pick<AcademicClient, 'myCourses'> | undefined;
};

const emptyStudentDashboard: StudentDashboard = {
  overview: { courses: 0, pending: 0, deliveries: 0, graded: 0, unread: 0 },
  average: { grade: null, label: 'En progreso' },
  resume: null,
  upcoming: [],
  courses: [],
  notices: [],
  agenda: { current_week: null, slots: [] },
};

export function StudentHome({ name, onSelect, onCourseSelect, onActivitySelect, client, academic }: Props) {
  const [data, setData] = useState<StudentDashboard | null>(() => (client ? null : emptyStudentDashboard));
  const [loading, setLoading] = useState(Boolean(client));
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    if (client) {
      setLoading(true);
      setError(false);
      client
        .studentDashboard()
        .then((res) => {
          if (active) {
            setData(res);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setError(true);
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [client]);

  // Greeting by hour
  const hour = new Date().getHours();
  const firstName = name.split(/\s+/).filter(Boolean)[0] ?? 'Estudiante';
  const greeting =
    hour >= 5 && hour < 12
      ? `Buenos días, ${firstName}`
      : hour >= 12 && hour < 19
      ? `Buenas tardes, ${firstName}`
      : `Buenas noches, ${firstName}`;

  // Formatted date in Spanish
  const todayRaw = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const todayFormatted = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  const formatDueDate = (dueOn: string | null): string => {
    if (!dueOn) return 'Sin fecha límite';
    const date = new Date(`${dueOn}T12:00:00`);
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'long',
    }).format(date);
  };

  const dueStatusLabel = (
    category: 'today' | 'tomorrow' | 'later' | 'overdue',
    dueOn: string | null
  ): string | undefined => {
    if (category === 'overdue') return 'Vencida';
    if (category === 'today') return 'Vence hoy';
    if (category === 'tomorrow') return 'Vence mañana';
    return formatDueDate(dueOn);
  };

  const dueCategoryForTask = (
    category: 'today' | 'tomorrow' | 'later' | 'overdue'
  ): TaskItemProps['dueCategory'] => {
    if (category === 'overdue') return 'today';
    return category;
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1 border-b border-border/40">
          <div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-text">
              {greeting}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Bienvenida a tu espacio de aprendizaje en EVAL.
            </p>
          </div>
          <span className="text-xs font-medium text-text-muted capitalize">
            {todayFormatted}
          </span>
          <span className="sr-only">¿Qué quieres hacer hoy?</span>
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-base text-text">Próximas entregas</h4>
                </div>
              </div>
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-base text-text">Mis cursos</h4>
                </div>
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <MessageSquare className="w-4 h-4 text-accent" />
                <h4 className="font-semibold text-sm text-text">Avisos de tus docentes</h4>
              </div>
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-info" />
                  <h4 className="font-semibold text-sm text-text">Agenda semanal</h4>
                </div>
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <EmptyState
          icon={<AlertCircle className="w-6 h-6" />}
          title="No se pudo cargar tu panel"
          description="Hubo un problema al consultar tu información académica. Volvé a intentarlo en unos segundos."
          actionLabel="Reintentar"
          onAction={() => {
            setLoading(true);
            setError(false);
            client?.studentDashboard().then((res) => {
              setData(res);
              setLoading(false);
            }).catch(() => {
              setError(true);
              setLoading(false);
            });
          }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto">
        <EmptyState
          title="Panel no disponible"
          description="Tu información académica no está disponible en este momento."
        />
      </div>
    );
  }

  const { overview, average, resume, upcoming, courses, notices, agenda } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 1. Greeting & Date */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1 border-b border-border/40">
        <div>
          <h2 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-text">
            {greeting}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Bienvenida a tu espacio de aprendizaje en EVAL.
          </p>
        </div>
        <span className="text-xs font-medium text-text-muted capitalize">
          {todayFormatted}
        </span>
        <span className="sr-only">¿Qué quieres hacer hoy?</span>
      </div>

      {/* 2. Resume card */}
      {resume ? (
        <Card className="relative overflow-hidden bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white p-5 sm:p-6 border-0 shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                  Continúa donde lo dejaste
                </span>
                <span className="text-xs text-slate-300">· {resume.course}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold !text-white tracking-tight leading-snug">
                Actividad: {resume.title}
              </h3>
              <div className="pt-1 w-full max-w-md">
                <ProgressBar progress={resume.progress} color="bg-accent" />
                <div className="flex justify-between text-[11px] text-slate-300 mt-1">
                  <span>Progreso del curso</span>
                  <span className="font-semibold text-white">{resume.progress}% completado</span>
                </div>
              </div>
            </div>

            <Button
              variant="accent"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => {
                onCourseSelect?.(resume.assignment_id, {
                  gradeId: resume.classroom.grade_id,
                  sectionId: resume.classroom.section_id,
                });
                if (!onCourseSelect) onSelect('my_enrollments');
              }}
              className="shrink-0 self-start md:self-center"
            >
              {resume.cta}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="relative overflow-hidden bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white p-5 sm:p-6 border-0 shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                  ¡Estás al día!
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold !text-white tracking-tight leading-snug">
                No tenés actividades pendientes
              </h3>
              <p className="text-sm text-slate-200 max-w-xl">
                Revisá tus cursos o consultá el calendario para ver las próximas semanas.
              </p>
            </div>

            <Button
              variant="accent"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => onSelect('my_enrollments')}
              className="shrink-0 self-start md:self-center"
            >
              Ver mis cursos
            </Button>
          </div>
        </Card>
      )}

      {/* 3. KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Pendientes"
          value={overview.pending}
          emptyMessage="¡Al día!"
          icon={<ClipboardList className="w-5 h-5" />}
          iconColor="text-amber-500"
          onClick={() => onSelect('activities', 'pending')}
        />
        <StatCard
          label="Entregadas"
          value={overview.deliveries}
          emptyMessage="Sin entregas"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconColor="text-emerald-500"
          onClick={() => onSelect('activities', 'submitted')}
        />
        <StatCard
          label="Promedio"
          value={average.grade ?? average.label}
          emptyMessage="En progreso"
          icon={<TrendingUp className="w-5 h-5" />}
          iconColor="text-primary"
          trend={average.grade ? average.label : undefined}
          onClick={() => onSelect('history')}
        />
        <StatCard
          label="Mis cursos"
          value={overview.courses}
          emptyMessage="1 curso"
          icon={<BookOpen className="w-5 h-5" />}
          iconColor="text-blue-500"
          onClick={() => onSelect('my_enrollments')}
        />
      </div>

      {/* 4. Grid 2/3 + 1/3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Izquierda (2/3) */}
        <div className="md:col-span-2 space-y-6">
          {/* Próximas entregas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-base text-text">Próximas entregas</h4>
              </div>
              {upcoming.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelect('activities', 'pending')}
                  className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  Ver todas →
                </button>
              )}
            </div>

            {upcoming.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-6 h-6" />}
                title="No hay entregas próximas"
                description="Todas tus actividades están al día."
              />
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((task) => (
                  <TaskItem
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    courseTitle={task.course}
                    dueDate={formatDueDate(task.due_on)}
                    dueCategory={dueCategoryForTask(task.category)}
                    statusLabel={dueStatusLabel(task.category, task.due_on)}
                    onClick={() => onActivitySelect ? onActivitySelect(task.id) : onSelect('activities', 'pending')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mis cursos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-base text-text">Mis cursos</h4>
              </div>
              {courses.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelect('my_enrollments')}
                  className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  Ver todos ({courses.length}) →
                </button>
              )}
            </div>

            {courses.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-6 h-6" />}
                title="Sin cursos registrados"
                description="Cuando tus docentes asignen tus cursos, aparecerán aquí."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    title={course.subject}
                    gradeAndSection={`${course.grade} · ${course.section}`}
                    teacherName={course.teacher}
                    subjectColor={course.subject_color}
                    progress={course.progress}
                    onOpen={() => onSelect('my_enrollments')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Derecha (1/3) */}
        <div className="space-y-6">
          {/* Avisos de tus docentes */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                <h4 className="font-semibold text-sm text-text">Avisos de tus docentes</h4>
              </div>
              {notices.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelect('notifications')}
                  className="text-[11px] font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  Ver todos
                </button>
              )}
            </div>

            {notices.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="w-6 h-6" />}
                title="No hay avisos"
                description="Tus docentes aún no publicaron novedades."
              />
            ) : (
              <div className="space-y-3 text-xs">
                {notices.map((notice) => (
                  <div
                    key={notice.id}
                    className="p-3 rounded-xl bg-surface-2/60 border border-border/60 space-y-1"
                  >
                    <div className="flex justify-between items-center text-text-muted text-[11px]">
                      <strong className="text-text font-semibold">
                        {notice.event === 'activity_published'
                          ? 'Nueva actividad'
                          : notice.event === 'delivery_assessed'
                          ? 'Calificación'
                          : 'Aviso'}
                      </strong>
                      <span>{new Date(notice.created_at).toLocaleDateString('es-PE')}</span>
                    </div>
                    <p className="text-text leading-relaxed">{notice.message}</p>
                    {notice.course && (
                      <span className="inline-block text-[10px] text-primary font-medium">
                        {notice.course}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Mini-agenda de la semana */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-info" />
                <h4 className="font-semibold text-sm text-text">Agenda semanal</h4>
              </div>
              <button
                type="button"
                onClick={() => onSelect('weeks')}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Calendario
              </button>
            </div>

            {agenda.slots.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-6 h-6" />}
                title="Calendario no disponible"
                description="El calendario académico aún no fue publicado."
              />
            ) : (
              <div className="space-y-2">
                {agenda.slots.map((slot, index) => (
                  <div
                    key={`${slot.date}-${index}`}
                    className={`flex items-center gap-3 p-2 rounded-xl text-xs transition-colors ${
                      slot.active
                        ? 'bg-primary-soft text-primary font-medium border border-primary/20'
                        : 'hover:bg-surface-2 text-text'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 text-center ${
                        slot.active ? 'bg-primary text-white font-bold' : 'bg-surface-2 text-text-muted'
                      }`}
                    >
                      <span className="text-[9px] uppercase leading-none">{slot.day}</span>
                      <span className="text-xs font-bold leading-none mt-0.5">{slot.date.slice(8)}</span>
                    </div>
                    <span className="truncate flex-1">{slot.label}</span>
                    {slot.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-navy-950 shrink-0">
                        {slot.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
