import { useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, BookOpen, ClipboardList, Calendar, Library, TrendingUp, LogOut, Sun, Moon, Home, FileText } from 'lucide-react';
import type { DashboardRole } from '../role-dashboards.js';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSection: (id: string | null) => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void; role?: DashboardRole | undefined;
};

export function CommandPalette({ open, onOpenChange, onSelectSection, onLogout, isDark, onToggleTheme, role = 'student' }: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
      if (event.key === 'Escape' && open) {
        onOpenChange(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-navy-950/60 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-surface border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-text-muted shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Escribe un comando o busca una sección..."
              className="w-full bg-transparent border-0 text-text placeholder:text-text-muted text-sm outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-text-muted bg-surface-2 rounded border border-border">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 text-sm text-text">
            <Command.Empty className="p-4 text-center text-text-muted text-sm">
              No se encontraron resultados.
            </Command.Empty>

            <Command.Group heading="Navegación principal" className="px-2 py-1 text-xs font-semibold text-text-muted">
              <Command.Item
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition-colors"
                onSelect={() => { onSelectSection(null); onOpenChange(false); }}
              >
                <Home className="w-4 h-4 text-primary" />
                <span>Inicio</span>
              </Command.Item>
              <Command.Item
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition-colors"
                onSelect={() => { onSelectSection(role === 'teacher' ? 'my_assignments' : 'my_enrollments'); onOpenChange(false); }}
              >
                <BookOpen className="w-4 h-4 text-primary" />
                <span>{role === 'teacher' ? 'Cursos y aulas' : 'Mis cursos'}</span>
              </Command.Item>
              <Command.Item
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition-colors"
                onSelect={() => { onSelectSection('activities'); onOpenChange(false); }}
              >
                <ClipboardList className="w-4 h-4 text-warning" />
                <span>Tareas y entregas</span>
              </Command.Item>
              <Command.Item
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition-colors"
                onSelect={() => { onSelectSection('materials'); onOpenChange(false); }}
              >
                <FileText className="w-4 h-4 text-info" />
                <span>{role === 'teacher' ? 'Publicar materiales' : 'Materiales educativos'}</span>
              </Command.Item>
              <Command.Item
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition-colors"
                onSelect={() => { onSelectSection('library'); onOpenChange(false); }}
              >
                <Library className="w-4 h-4 text-success" />
                <span>Biblioteca de recursos</span>
              </Command.Item>
              <Command.Item
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition-colors"
                onSelect={() => { onSelectSection('history'); onOpenChange(false); }}
              >
                <TrendingUp className="w-4 h-4 text-accent" />
                <span>{role === 'teacher' ? 'Historial docente' : 'Mi progreso académico'}</span>
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-1.5 h-px bg-border" />

            <Command.Group heading="Preferencias y cuenta" className="px-2 py-1 text-xs font-semibold text-text-muted">
              <Command.Item
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition-colors"
                onSelect={() => { onToggleTheme(); onOpenChange(false); }}
              >
                {isDark ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4 text-primary" />}
                <span>{isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}</span>
              </Command.Item>
              <Command.Item
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-danger hover:bg-danger/10 transition-colors"
                onSelect={() => { onLogout(); onOpenChange(false); }}
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
