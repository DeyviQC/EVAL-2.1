import { Home, BookOpen, ClipboardList, Calendar, Library, TrendingUp } from 'lucide-react';
import type { DashboardRole } from '../role-dashboards.js';

type Props = {
  role?: DashboardRole | undefined;
  selected: string | null;
  onSelect: (id: string | null) => void;
  pendingCount?: number | null | undefined;
};

export function MobileNavBar({ role = 'student', selected, onSelect, pendingCount }: Props) {
  // 5 primary items per role
  const items = role === 'student' ? [
    { id: null, label: 'Inicio', icon: Home },
    { id: 'my_enrollments', label: 'Cursos', icon: BookOpen },
    { id: 'activities', label: 'Tareas', icon: ClipboardList, badge: pendingCount },
    { id: 'weeks', label: 'Calendario', icon: Calendar },
    { id: 'library', label: 'Biblioteca', icon: Library },
  ] : role === 'teacher' ? [
    { id: null, label: 'Inicio', icon: Home },
    { id: 'my_assignments', label: 'Cursos', icon: BookOpen },
    { id: 'activities', label: 'Tareas', icon: ClipboardList, badge: pendingCount },
    { id: 'weeks', label: 'Semanas', icon: Calendar },
    { id: 'library', label: 'Biblioteca', icon: Library },
  ] : role === 'director_admin' ? [
    { id: null, label: 'Inicio', icon: Home },
    { id: 'reports', label: 'Reportes', icon: TrendingUp },
    { id: 'institution', label: 'Colegio', icon: BookOpen },
    { id: 'history', label: 'Historial', icon: Library },
    { id: 'account', label: 'Perfil', icon: Calendar },
  ] : [
    { id: null, label: 'Inicio', icon: Home },
    { id: 'periods', label: 'Períodos', icon: Calendar },
    { id: 'catalog', label: 'Catálogo', icon: BookOpen },
    { id: 'enrollments', label: 'Matrículas', icon: ClipboardList },
    { id: 'assignments', label: 'Docentes', icon: Library },
  ];

  return (
    <nav
      aria-label="Navegación móvil"
      className="md:hidden fixed bottom-2 left-2 right-2 z-40 flex items-center justify-around px-2 py-1.5 rounded-full bg-navy-950/95 backdrop-blur-xl border border-white/10 shadow-2xl safe-area-bottom"
    >
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = selected === item.id;
        return (
          <button
            key={item.id ?? 'home'}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-pressed={isActive}
            className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[46px] px-2 py-1 rounded-full transition-all ${
              isActive
                ? 'text-accent font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <IconComponent className="w-5 h-5" />
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 text-[9px] font-bold text-navy-950 bg-accent rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
