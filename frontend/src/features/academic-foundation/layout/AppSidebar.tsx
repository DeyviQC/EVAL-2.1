import { useState, useRef, useEffect } from 'react';
import {
  Home,
  BookOpen,
  ClipboardList,
  Calendar,
  Library,
  TrendingUp,
  User,
  Bell,
  Sun,
  Moon,
  LogOut,
  ChevronUp,
  ChevronDown,
  Layers,
  Users,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import type { DashboardRole } from '../role-dashboards.js';
import type { OwnAccount } from '../accounts.js';

type Props = {
  role?: DashboardRole | undefined;
  selected: string | null;
  onSelect: (id: string | null) => void;
  account?: OwnAccount | null | undefined;
  profileLabel?: string | undefined;
  unread?: number | null | undefined;
  onLogout: () => Promise<void>;
  isDark: boolean;
  onToggleTheme: () => void;
};

const crest = '/assets/nsm.png';

export function AppSidebar({
  role = 'student',
  selected,
  onSelect,
  account,
  profileLabel = 'Estudiante',
  unread,
  onLogout,
  isDark,
  onToggleTheme,
}: Props) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 6 standard items for Student; customized clean list for other roles
  const navItems = role === 'student' ? [
    { id: null, label: 'Inicio', icon: Home },
    { id: 'my_enrollments', label: 'Cursos', icon: BookOpen },
    { id: 'activities', label: 'Tareas', icon: ClipboardList, badge: unread },
    { id: 'weeks', label: 'Calendario', icon: Calendar },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'history', label: 'Progreso', icon: TrendingUp },
  ] : role === 'teacher' ? [
    { id: null, label: 'Inicio', icon: Home },
    { id: 'my_assignments', label: 'Cursos', icon: BookOpen },
    { id: 'activities', label: 'Tareas', icon: ClipboardList, badge: unread },
    { id: 'weeks', label: 'Calendario', icon: Calendar },
    { id: 'materials', label: 'Biblioteca', icon: Library },
    { id: 'history', label: 'Progreso', icon: TrendingUp },
  ] : role === 'director_admin' ? [
    { id: null, label: 'Inicio', icon: Home },
    { id: 'reports', label: 'Reportes', icon: TrendingUp },
    { id: 'institution', label: 'Información institucional', icon: BookOpen },
    { id: 'history', label: 'Historial', icon: Library },
    { id: 'account', label: 'Mi perfil', icon: User },
  ] : [
    { id: null, label: 'Inicio', icon: Home },
    { id: 'periods', label: 'Períodos', icon: Calendar },
    { id: 'calendar', label: 'Calendario institucional', icon: Calendar },
    { id: 'catalog', label: 'Catálogo', icon: Layers },
    { id: 'enrollments', label: 'Matrículas', icon: Users },
    { id: 'assignments', label: 'Docentes', icon: BookOpen },
    { id: 'users', label: 'Usuarios', icon: Settings },
    { id: 'supervision', label: 'Supervisión', icon: ShieldAlert },
    { id: 'reports', label: 'Reportes', icon: TrendingUp },
  ];

  const initials = account?.name
    ? account.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : 'E';

  const roleNavLabel = role === 'director_admin' ? 'Menú de Director' : role === 'vice_principal' ? 'Menú de Subdirector' : role === 'teacher' ? 'Menú de Docente' : 'Menú de Estudiante';

  return (
    <aside
      className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-navy-950 text-white p-4 border-r border-navy-900/50 select-none z-30"
      aria-label="Barra lateral de navegación"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-3 mb-5 border-b border-white/[0.08]">
        <img
          src={crest}
          alt="Escudo de I.E. Nuestra Señora de las Mercedes"
          className="w-10 h-14 object-contain shrink-0 filter drop-shadow"
        />
        <div className="min-w-0">
          <h1 className="font-editorial text-2xl font-bold tracking-tight text-white leading-none">
            EVAL
          </h1>
          <p className="text-[11px] text-slate-300 font-medium leading-tight mt-1 truncate">
            I.E. Nuestra Señora de las Mercedes
          </p>
          <span className="text-[9px] uppercase tracking-wider text-accent font-semibold block mt-0.5">
            Ayacucho
          </span>
        </div>
      </div>

      {/* Main Navigation with 6 items */}
      <nav
        className="eval-navigation flex-1 space-y-1.5 overflow-y-auto pr-1"
        aria-label={role ? roleNavLabel : 'Secciones académicas'}
      >
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = selected === item.id;
          return (
            <button
              key={item.id ?? 'home'}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={isActive}
              className={`w-full flex items-center gap-3 min-h-[44px] pr-3 text-sm rounded-r-xl transition-all duration-150 ${
                isActive
                  ? 'bg-white/[0.08] text-white font-semibold border-l-[3px] border-accent pl-3 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border-l-[3px] border-transparent pl-3'
              }`}
            >
              <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-navy-950 bg-accent rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Block with Dropdown */}
      <div className="relative mt-auto pt-3 border-t border-white/[0.08]" ref={menuRef}>
        {profileMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-navy-900 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
            <button
              type="button"
              onClick={() => {
                onSelect('account');
                setProfileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <User className="w-4 h-4 text-accent" />
              <span>Mi cuenta</span>
            </button>

            {role !== 'director_admin' && (
              <button
                type="button"
                onClick={() => {
                  onSelect('notifications');
                  setProfileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <span>Notificaciones</span>
                </span>
                {typeof unread === 'number' && unread > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-accent rounded-full">
                    {unread}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onToggleTheme();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4 text-slate-300" />}
              <span>{isDark ? 'Tema claro' : 'Tema oscuro'}</span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />

            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                void onLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}

        {/* Profile Card Trigger */}
        <button
          type="button"
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all text-left group"
          aria-expanded={profileMenuOpen}
          aria-haspopup="true"
        >
          <span className="w-9 h-9 rounded-full bg-accent text-navy-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-xs font-semibold text-white truncate">
              {account?.name ?? 'Cuenta institucional'}
            </strong>
            <span className="inline-block text-[10px] font-medium text-accent bg-accent/15 px-2 py-0.5 rounded-full mt-0.5 truncate">
              {profileLabel}
            </span>
          </div>
          {profileMenuOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>

        {/* Quick logout button */}
        <button
          type="button"
          onClick={() => void onLogout()}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors border border-transparent hover:border-danger/20 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
