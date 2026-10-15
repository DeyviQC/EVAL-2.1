import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({
  isDark,
  onToggle,
  className = '',
}: {
  isDark: boolean;
  onToggle: () => void;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer ${className}`}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      {isDark ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
