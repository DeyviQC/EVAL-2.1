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
} from 'lucide-react';
import type { AccountClient } from '../accounts.js';
import { dashboardOverview } from '../DashboardSummary.js';
import { Card, StatCard, CourseCard, TaskItem, ProgressBar, Button, EmptyState } from '../ui/index.js';

type Props = {
  name: string;
  onSelect: (id: string) => void;
  client?: AccountClient | undefined;
};

export function StudentHome({ name, onSelect, client }: Props) {
  const [data, setData] = useState<ReturnType<typeof dashboardOverview> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (client) {
      setLoading(true);
      client
        .overview()
        .then((res) => {
          if (active) {
            setData(res);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) setLoading(false);
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

  // Dynamic values or defaults
  const pendingCount = data?.pending ?? 0;
  const deliveriesCount = (data?.deliveries ?? 0) > 0 ? data!.deliveries : (data?.graded ?? 0);
  const coursesCount = data?.courses ?? 1;

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

      {/* 2. Tarjeta: "Continúa donde lo dejaste" */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white p-5 sm:p-6 border-0 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                Continúa donde lo dejaste
              </span>
              <span className="text-xs text-slate-300">· Matemática 2.º B</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold !text-white tracking-tight leading-snug">
              Actividad: Fracciones y operaciones en la vida cotidiana
            </h3>
            <div className="pt-1 w-full max-w-md">
              <ProgressBar progress={65} color="bg-accent" />
              <div className="flex justify-between text-[11px] text-slate-300 mt-1">
                <span>Progreso de la sesión</span>
                <span className="font-semibold text-white">65% completado</span>
              </div>
            </div>
          </div>

          <Button
            variant="accent"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => onSelect('activities')}
            className="shrink-0 self-start md:self-center"
          >
            Continuar actividad
          </Button>
        </div>
      </Card>

      {/* 3. 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Pendientes"
          value={pendingCount}
          emptyMessage="¡Al día!"
          icon={<ClipboardList className="w-5 h-5" />}
          iconColor="text-amber-500"
          onClick={() => onSelect('activities')}
        />
        <StatCard
          label="Entregadas"
          value={deliveriesCount}
          emptyMessage="Sin entregas"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconColor="text-emerald-500"
          trend="+2 esta semana"
          onClick={() => onSelect('activities')}
        />
        <StatCard
          label="Promedio"
          value="AD"
          emptyMessage="En progreso"
          icon={<TrendingUp className="w-5 h-5" />}
          iconColor="text-primary"
          trend="Destacado"
          onClick={() => onSelect('history')}
        />
        <StatCard
          label="Mis cursos"
          value={coursesCount}
          emptyMessage="1 curso"
          icon={<BookOpen className="w-5 h-5" />}
          iconColor="text-blue-500"
          onClick={() => onSelect('my_enrollments')}
        />
      </div>

      {/* 4. Grid 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Izquierda (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Próximas entregas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-base text-text">Próximas entregas</h4>
              </div>
              <button
                type="button"
                onClick={() => onSelect('activities')}
                className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                Ver todas →
              </button>
            </div>

            <div className="space-y-2.5">
              <TaskItem
                id="task-1"
                title="Resolución de problemas con fracciones"
                courseTitle="Matemática · 2.º B"
                dueDate="Hoy a las 6:00 pm"
                dueCategory="today"
                onClick={() => onSelect('activities')}
              />
              <TaskItem
                id="task-2"
                title="Redacción de texto argumentativo sobre identidad"
                courseTitle="Comunicación · 2.º B"
                dueDate="Mañana a las 11:59 pm"
                dueCategory="tomorrow"
                onClick={() => onSelect('activities')}
              />
              <TaskItem
                id="task-3"
                title="Informe de indagación científica sobre el agua"
                courseTitle="Ciencia y Tecnología · 2.º B"
                dueDate="Viernes 24 de octubre"
                dueCategory="later"
                onClick={() => onSelect('activities')}
              />
            </div>
          </div>

          {/* Mis cursos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-base text-text">Mis cursos</h4>
              </div>
              <button
                type="button"
                onClick={() => onSelect('my_enrollments')}
                className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                Ver catálogo →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CourseCard
                title="Matemática"
                gradeAndSection="2.º Grado · B"
                teacherName="Prof. Lucía Torres"
                subjectColor="#3B82F6"
                progress={65}
                onOpen={() => onSelect('my_enrollments')}
              />
              <CourseCard
                title="Comunicación"
                gradeAndSection="2.º Grado · B"
                teacherName="Prof. Carlos Mendoza"
                subjectColor="#8B5CF6"
                progress={80}
                onOpen={() => onSelect('my_enrollments')}
              />
              <CourseCard
                title="Ciencia y Tecnología"
                gradeAndSection="2.º Grado · B"
                teacherName="Prof. Elena Quispe"
                subjectColor="#10B981"
                progress={50}
                onOpen={() => onSelect('my_enrollments')}
              />
              <CourseCard
                title="Ciencias Sociales"
                gradeAndSection="2.º Grado · B"
                teacherName="Prof. Miguel Huamán"
                subjectColor="#F59E0B"
                progress={70}
                onOpen={() => onSelect('my_enrollments')}
              />
            </div>
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
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-2/60 border border-border/60 space-y-1">
                <div className="flex justify-between items-center text-text-muted text-[11px]">
                  <strong className="text-text font-semibold">Prof. Lucía Torres</strong>
                  <span>Hace 2 h</span>
                </div>
                <p className="text-text leading-relaxed">
                  Recuerden repasar la ficha 3 de fracciones antes de la entrega de hoy.
                </p>
                <span className="inline-block text-[10px] text-primary font-medium">
                  Matemática · 2.º B
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-2/60 border border-border/60 space-y-1">
                <div className="flex justify-between items-center text-text-muted text-[11px]">
                  <strong className="text-text font-semibold">Prof. Carlos Mendoza</strong>
                  <span>Ayer</span>
                </div>
                <p className="text-text leading-relaxed">
                  Ya están publicadas las retroalimentaciones del borrador de ensayo.
                </p>
                <span className="inline-block text-[10px] text-primary font-medium">
                  Comunicación · 2.º B
                </span>
              </div>
            </div>
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

            <div className="space-y-2">
              {[
                { day: 'Lun', date: '19', label: 'Inicio de semana 32', active: false },
                { day: 'Mar', date: '20', label: 'Clase presencial y laboratorio', active: false },
                { day: 'Mié', date: '21', label: 'Entrega: Fracciones en contexto', active: true, badge: 'Hoy' },
                { day: 'Jue', date: '22', label: 'Entrega: Ensayo argumentativo', active: false },
                { day: 'Vie', date: '23', label: 'Cierre de actividades y tutoría', active: false },
              ].map((slot) => (
                <div
                  key={slot.day}
                  className={`flex items-center gap-3 p-2 rounded-xl text-xs transition-colors ${
                    slot.active
                      ? 'bg-primary-soft text-primary font-medium border border-primary/20'
                      : 'hover:bg-surface-2 text-text'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 text-center ${
                    slot.active ? 'bg-primary text-white font-bold' : 'bg-surface-2 text-text-muted'
                  }`}>
                    <span className="text-[9px] uppercase leading-none">{slot.day}</span>
                    <span className="text-xs font-bold leading-none mt-0.5">{slot.date}</span>
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
          </Card>
        </div>
      </div>
    </div>
  );
}
