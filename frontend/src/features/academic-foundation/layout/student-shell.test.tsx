import { renderToStaticMarkup } from 'react-dom/server';
import type { SessionView } from '../session.js';
import {
  SessionPanel,
  resolveInitialDarkMode,
  persistThemeChoice,
} from '../InstitutionalShell.js';
import { AppSidebar } from './AppSidebar.js';
import { AppHeader } from './AppHeader.js';

type Case = readonly [string, () => void | Promise<void>];
function assert(value: unknown): asserts value {
  if (!value) throw new Error('Student shell assertion failed');
}

const noAction = async () => {};
const authenticatedView: SessionView = { phase: 'authenticated', message: 'OK' };

export const studentShellCases: readonly Case[] = [
  [
    'theme initializer respects explicit light storage over dark OS preference',
    () => {
      assert(
        !resolveInitialDarkMode({ getItem: () => 'light' }, { matches: true }),
      );
    },
  ],
  [
    'theme initializer respects explicit dark storage over light OS preference',
    () => {
      assert(
        resolveInitialDarkMode({ getItem: () => 'dark' }, { matches: false }),
      );
    },
  ],
  [
    'theme initializer falls back to dark color scheme when storage is unset',
    () => {
      assert(resolveInitialDarkMode({ getItem: () => null }, { matches: true }));
    },
  ],
  [
    'theme initializer falls back to light color scheme when storage is unset',
    () => {
      assert(
        !resolveInitialDarkMode({ getItem: () => null }, { matches: false }),
      );
    },
  ],
  [
    'theme initializer treats invalid storage value as unset',
    () => {
      assert(resolveInitialDarkMode({ getItem: () => 'auto' }, { matches: true }));
    },
  ],
  [
    'theme persistence stores explicit light and dark choices',
    () => {
      const calls: string[] = [];
      const storage = { setItem: (_key: string, value: string) => calls.push(value) };
      persistThemeChoice(true, storage);
      persistThemeChoice(false, storage);
      assert(calls.length === 2 && calls[0] === 'dark' && calls[1] === 'light');
    },
  ],
  [
    'authenticated shell exposes role and theme attributes',
    () => {
      const html = renderToStaticMarkup(
        <SessionPanel
          view={authenticatedView}
          role="student"
          onLogin={noAction}
          onLogout={noAction}
          onRefresh={noAction}
        />,
      );
      assert(html.includes('data-role="student"'));
      assert(html.includes('data-theme="light"'));
    },
  ],
  [
    'workspace main reserves scroll margin to avoid sticky topbar overlap',
    () => {
      const html = renderToStaticMarkup(
        <SessionPanel
          view={authenticatedView}
          role="student"
          onLogin={noAction}
          onLogout={noAction}
          onRefresh={noAction}
        >
          <p>Contenido del estudiante</p>
        </SessionPanel>,
      );
      assert(html.includes('id="eval-main"'));
      assert(html.includes('scroll-mt-24'));
    },
  ],
  [
    'topbar stays sticky at top edge for persistent access and scroll margin prevents overlap',
    () => {
      const html = renderToStaticMarkup(
        <AppHeader
          activeLabel="Inicio"
          onOpenCommand={() => {}}
          isDark={false}
          onToggleTheme={() => {}}
        />,
      );
      assert(html.includes('sticky'));
      assert(html.includes('top-0'));
    },
  ],
  [
    'student sidebar shows real pending tasks badge without leaking notification count',
    () => {
      const html = renderToStaticMarkup(
        <AppSidebar
          role="student"
          selected="activities"
          onSelect={() => {}}
          pendingTasks={5}
          unread={9}
          onLogout={noAction}
          isDark={false}
          onToggleTheme={() => {}}
          collapsed={false}
          onToggleCollapsed={() => {}}
        />,
      );
      assert(html.includes('Tareas'));
      assert(html.includes('>5<'));
      assert(!html.includes('>9<'));
    },
  ],
  [
    'student sidebar communicates active section with aria-current',
    () => {
      const html = renderToStaticMarkup(
        <AppSidebar
          role="student"
          selected="activities"
          onSelect={() => {}}
          pendingTasks={0}
          onLogout={noAction}
          isDark={false}
          onToggleTheme={() => {}}
          collapsed={false}
          onToggleCollapsed={() => {}}
        />,
      );
      assert(html.includes('aria-current="page"'));
    },
  ],
  [
    'teacher sidebar preserves notification badge and aria-pressed active state',
    () => {
      const html = renderToStaticMarkup(
        <AppSidebar
          role="teacher"
          selected="activities"
          onSelect={() => {}}
          unread={4}
          onLogout={noAction}
          isDark={false}
          onToggleTheme={() => {}}
          collapsed={false}
          onToggleCollapsed={() => {}}
        />,
      );
      assert(html.includes('aria-pressed="true"'));
      assert(html.includes('4'));
      assert(html.includes('Tareas y entregas'));
    },
  ],
  [
    'director sidebar omits notification entry and numeric badge',
    () => {
      const html = renderToStaticMarkup(
        <AppSidebar
          role="director_admin"
          selected="reports"
          onSelect={() => {}}
          unread={7}
          onLogout={noAction}
          isDark={false}
          onToggleTheme={() => {}}
          collapsed={false}
          onToggleCollapsed={() => {}}
        />,
      );
      assert(!html.includes('Notificaciones'));
      assert(!html.includes('>7<'));
    },
  ],
  [
    'sidebar exposes accessible collapse control with expanded state',
    () => {
      const html = renderToStaticMarkup(
        <AppSidebar
          role="student"
          selected={null}
          onSelect={() => {}}
          onLogout={noAction}
          isDark={false}
          onToggleTheme={() => {}}
          collapsed={false}
          onToggleCollapsed={() => {}}
        />,
      );
      assert(html.includes('aria-expanded="true"'));
      assert(html.includes('Contraer navegación'));
    },
  ],
  [
    'collapsed sidebar keeps brand crest and expand control visible',
    () => {
      const html = renderToStaticMarkup(
        <AppSidebar
          role="student"
          selected={null}
          onSelect={() => {}}
          onLogout={noAction}
          isDark={false}
          onToggleTheme={() => {}}
          collapsed={true}
          onToggleCollapsed={() => {}}
        />,
      );
      assert(html.includes('aria-expanded="false"'));
      assert(html.includes('Expandir navegación'));
      assert(html.includes('Escudo de I.E. Nuestra Señora de las Mercedes'));
    },
  ],
  [
    'student shell wires pending tasks to mobile navigation instead of unread notifications',
    () => {
      const html = renderToStaticMarkup(
        <SessionPanel
          view={authenticatedView}
          role="student"
          pendingTasks={3}
          unread={8}
          onLogin={noAction}
          onLogout={noAction}
          onRefresh={noAction}
        />,
      );
      assert(html.includes('3 tareas pendientes'));
      assert(!html.includes('8 tareas pendientes'));
    },
  ],
  [
    'teacher shell keeps unread notification badge in mobile navigation',
    () => {
      const html = renderToStaticMarkup(
        <SessionPanel
          view={authenticatedView}
          role="teacher"
          unread={2}
          onLogin={noAction}
          onLogout={noAction}
          onRefresh={noAction}
        />,
      );
      assert(html.includes('>2<'));
    },
  ],
];
