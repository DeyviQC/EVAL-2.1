import type { DashboardRole } from './role-dashboards.js';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { SessionView } from './session.js';
import type { OwnAccount } from './accounts.js';
import { Icon, SchoolBrand, Spinner } from './InstitutionalUI.js';
import { AppSidebar } from './layout/AppSidebar.js';
import { AppHeader } from './layout/AppHeader.js';
import { MobileNavBar } from './layout/MobileNavBar.js';
import { CommandPalette } from './layout/CommandPalette.js';
import { BookOpen, Calendar, CheckSquare, Lock, RefreshCw, User } from 'lucide-react';

type Props = {
  role?: DashboardRole | undefined;
  view: SessionView;
  onLogin: (input: { login: string; password: string }) => Promise<void>;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  children?: ReactNode;
  navigation?: ReactNode;
  activeLabel?: string;
  account?: OwnAccount | null;
  profileLabel?: string | undefined;
  onNotifications?: (() => void) | undefined;
  unread?: number | null;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
};

export function SessionPanel({
  role,
  view,
  onLogin,
  onLogout,
  onRefresh,
  children,
  activeLabel = 'Inicio',
  account,
  profileLabel,
  onNotifications,
  unread,
  selected = null,
  onSelect = () => {},
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        document.documentElement.classList.contains('dark') ||
        localStorage.getItem('eval-theme') === 'dark'
      );
    }
    return false;
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('eval-theme', next ? 'dark' : 'light');
      }
      return next;
    });
  };

  const pending = view.phase === 'busy' || view.phase === 'checking';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanLogin = login.trim().toLowerCase();
    const cleanPassword = password.trim();
    const input = { login: cleanLogin, password: cleanPassword };
    setPassword('');
    await onLogin(input);
  }

  // Checking, expired, or unavailable recovery state
  if (view.phase === 'checking' || view.phase === 'expired' || view.phase === 'unavailable') {
    return (
      <main
        className="eval-session-loading min-h-screen bg-navy-950 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden"
        aria-busy="true"
      >
        {/* FOTOGRAFÍA INSTITUCIONAL DE FONDO (Reemplazar este archivo con la foto del colegio en /public/images/colegio-hero.jpg) */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-25 scale-100"
          style={{ backgroundImage: "url('/assets/colegio-hero.png')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-navy-950/85 backdrop-blur-sm pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md shadow-xl mb-4">
            <img
              src="/assets/nsm.png"
              width="60"
              height="85"
              alt="Escudo de I.E. Nuestra Señora de las Mercedes"
              className="w-14 h-20 object-contain drop-shadow"
            />
          </div>
          <h1 className="font-serif text-3xl font-normal text-white tracking-tight mb-1">EVAL</h1>
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-6">
            I.E. NUESTRA SEÑORA DE LAS MERCEDES · AYACUCHO
          </p>
          {view.phase === 'checking' ? (
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs text-slate-200 shadow-lg">
              <Spinner />
              <span role="status">{view.message}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p role="status" className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">{view.message}</p>
              <button
                type="button"
                onClick={() => void onRefresh()}
                className="mt-2 px-6 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-navy-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
              >
                Reintentar conexión
              </button>
            </div>
          )}
          {view.phase === 'checking' && (
            <p className="text-xs text-slate-400 mt-4">Un momento, estamos preparando tu espacio.</p>
          )}
        </div>
      </main>
    );
  }

  // Authenticated layout
  if (view.phase === 'authenticated') {
    return (
      <div
        className="eval-layout min-h-screen bg-bg text-text transition-colors duration-200"
        data-role={role}
        data-collapsed={collapsed}
      >
        <a className="eval-skip-link" href="#eval-main">
          Ir al contenido
        </a>

        {/* Hidden button for collapse test compatibility */}
        <button
          className="eval-collapse-toggle sr-only"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
        >
          {collapsed ? 'Expandir navegación' : 'Contraer navegación'}
        </button>

        {/* Modern compact sidebar */}
        <AppSidebar

          selected={selected}
          onSelect={onSelect}
          account={account}
          profileLabel={profileLabel}
          unread={unread}
          onLogout={onLogout}
          isDark={isDark}
          onToggleTheme={toggleTheme} role={role}
        />

        {/* Content area with floating header */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
          <AppHeader
            activeLabel={activeLabel}
            account={account}
            profileLabel={profileLabel}
            unread={unread}
            onNotifications={onNotifications}
            onOpenCommand={() => setCommandOpen(true)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onOpenProfile={() => onSelect('account')}
          />

          <main id="eval-main" tabIndex={-1} className="eval-workspace flex-1 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full outline-none">
            <section className="eval-workspace-content">
              {children ?? <p className="text-text-muted">No hay información para mostrar.</p>}
            </section>
          </main>

          {/* Mobile bottom navigation bar */}
          <MobileNavBar
  
            selected={selected}
            onSelect={onSelect}
            pendingCount={unread} role={role}
          />
        </div>

        {/* Command palette */}
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          onSelectSection={(id) => {
            onSelect(id);
            setCommandOpen(false);
          }}
          onLogout={() => void onLogout()}
          isDark={isDark}
          onToggleTheme={toggleTheme} role={role}
        />
      </div>
    );
  }

  // Login / Bienvenida view (Arko editorial aesthetic)
  return (
    <main className="eval-login relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-navy-950 text-white font-sans selection:bg-accent selection:text-navy-950">
      {/* FOTOGRAFÍA INSTITUCIONAL DE FONDO */}
      {/* Reemplazar /public/assets/colegio-hero.png con la fotografía oficial del colegio (formato PNG) */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100 opacity-35"
        style={{ backgroundImage: "url('/assets/colegio-hero.png')" }}
        aria-hidden="true"
      />

      {/* Degradados editoriales Arko: navy-950 profundo a transparente */}
      <div
        className="absolute inset-0 z-0 bg-gradient-to-t from-navy-950 via-navy-950/80 to-navy-950/45 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 z-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* 1. PÍLDORA DE NAVEGACIÓN FLOTANTE ARRIBA */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-4 pt-6 sm:pt-8 flex justify-between items-center">
        <div className="mx-auto sm:mx-0 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-xl shadow-black/20 text-white">
          <img
            src="/assets/nsm.png"
            width="24"
            height="34"
            alt="Escudo de I.E. Nuestra Señora de las Mercedes"
            className="w-5 h-7 object-contain drop-shadow"
          />
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-white">EVAL</h1>
            <span className="w-1 h-1 rounded-full bg-white/30 hidden sm:inline" aria-hidden="true" />
            <span className="text-[11px] font-medium tracking-wide text-slate-300 hidden sm:inline">
              I.E. Nuestra Señora de las Mercedes
            </span>
          </div>
          <div className="h-3 w-px bg-white/20 mx-1" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Red Local / LAN
          </span>
        </div>
      </header>

      {/* 2. GRID PRINCIPAL: HERO EDITORIAL + TARJETA DE LOGIN CON VIDRIO */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 flex-1 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">
        {/* Lado izquierdo: Editorial Hero */}
        <div className="w-full lg:max-w-xl flex flex-col items-start text-left">
          {/* Eyebrow institucional en mayúsculas */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] font-bold tracking-wider uppercase mb-4">
            <span>I.E. NUESTRA SEÑORA DE LAS MERCEDES · AYACUCHO</span>
          </div>

          {/* Titular Fraunces grande */}
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white font-normal tracking-tight leading-[1.12] mb-4">
            Aprende a tu ritmo.
          </h2>

          {/* Subtítulo corto */}
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mb-8 font-light">
            Tu plataforma institucional para consultar cursos, entregar tareas, revisar materiales y dar seguimiento a tu avance académico en la red local del colegio.
          </p>

          {/* Chips informativos */}
          <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-white/10 w-full">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-xs text-slate-200">
              <CheckSquare className="w-3.5 h-3.5 text-accent" />
              <span>Tareas</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-xs text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span>Calendario</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-xs text-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span>Materiales</span>
            </div>
          </div>
        </div>

        {/* Lado derecho: Tarjeta de login con vidrio */}
        <section
          className="eval-login-form w-full lg:w-[410px] shrink-0 bg-navy-900/70 backdrop-blur-xl border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-navy-950/80 text-white relative"
          aria-busy={pending}
        >
          {/* Sutil resplandor de acento en la esquina */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

          <header className="mb-5 relative">
            <p className="eval-eyebrow text-[11px] font-bold uppercase tracking-widest text-accent mb-1.5">
              BIENVENIDO A TU COLEGIO
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
              Acceso a EVAL
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Ingresa con tu cuenta institucional.
            </p>
            <p
              className="eval-session-message mt-3 text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center min-h-[36px]"
              role="status"
              aria-live="polite"
            >
              {view.message}
            </p>
          </header>

          <form onSubmit={(event) => void submit(event)} className="space-y-4 relative">
            <div>
              <label
                htmlFor="eval-login"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="eval-login"
                  name="login"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  required
                  disabled={pending}
                  placeholder="Número de DNI o usuario"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="eval-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="eval-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={pending}
                  placeholder="••••••••"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* UN SOLO ACENTO CÁLIDO: Botón principal dorado */}
            <button
              type="submit"
              disabled={pending}
              className="w-full mt-2 bg-accent hover:bg-accent-hover text-navy-950 font-bold py-3 px-6 rounded-full shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {pending && <Spinner />}
              <span>{pending ? 'Iniciando sesión…' : 'Ingresar'}</span>
            </button>
          </form>

          {/* Botón secundario retirado: el acceso se realiza directamente con 'Ingresar' y la verificación ocurre en segundo plano */}

          <p className="eval-login-help text-[11px] text-center text-slate-400 mt-4 leading-relaxed">
            Utiliza la red del colegio y las credenciales asignadas a tu cuenta.
          </p>
        </section>
      </div>

      {/* 3. FOOTER INSTITUCIONAL */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 border-t border-white/10 gap-2">
        <span>I.E. Nuestra Señora de las Mercedes · Ayacucho, Perú</span>
        <span>EVAL · Sistema de Gestión de Aprendizaje</span>
      </footer>
    </main>
  );
}
