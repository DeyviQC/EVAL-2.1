import { Search, Bell, Sun, Moon } from 'lucide-react';
import type { OwnAccount } from '../accounts.js';

type Props = {
  activeLabel?: string | undefined;
  account?: OwnAccount | null | undefined;
  profileLabel?: string | undefined;
  unread?: number | null | undefined;
  onNotifications?: (() => void) | undefined;
  onOpenCommand: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenProfile?: (() => void) | undefined;
};

export function AppHeader({
  activeLabel = 'Inicio',
  account,
  profileLabel,
  unread,
  onNotifications,
  onOpenCommand,
  isDark,
  onToggleTheme,
  onOpenProfile,
}: Props) {
  const initials = account?.name
    ? account.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : 'E';

  return (
    <header className="sticky top-4 z-20 mx-auto w-full max-w-6xl px-4 md:px-6 mb-6">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-surface/85 backdrop-blur-xl border border-border/80 shadow-sm transition-all">
        {/* Left: Section indicator & Semantic heading */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-soft text-primary shrink-0">
            {activeLabel}
          </span>
          <span className="text-border text-xs hidden sm:inline" aria-hidden="true">/</span>
          <h2 className="text-xs font-medium text-text-muted truncate">Tu espacio académico</h2>
        </div>

        {/* Center: Global Search trigger with Ctrl+K */}
        <button
          type="button"
          onClick={onOpenCommand}
          className="flex items-center justify-between gap-3 px-3.5 py-1.5 text-xs text-text-muted bg-surface-2/80 hover:bg-surface-2 border border-border/70 rounded-full w-48 sm:w-64 transition-colors text-left"
          aria-label="Buscar o abrir comandos (Ctrl+K)"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="truncate">Buscar en EVAL...</span>
          </span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-text-muted bg-surface rounded border border-border shrink-0">
            Ctrl K
          </kbd>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications button */}
          {onNotifications && (
            <button
              type="button"
              onClick={onNotifications}
              className="relative p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              title="Notificaciones"
              aria-label={unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
            >
              <Bell className="w-4 h-4" />
              {typeof unread === 'number' && unread > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-accent rounded-full animate-pulse">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          )}

          {/* User Avatar pill */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-surface-2 border border-transparent hover:border-border transition-colors"
            title={account?.name ? `${account.name} (${profileLabel})` : 'Mi perfil'}
          >
            <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </span>
            <span className="hidden lg:inline text-xs font-medium text-text max-w-[120px] truncate text-left">
              {account?.name?.split(' ')[0] ?? 'Usuario'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
