import { ArrowUpRight, BookOpen, CalendarDays, ClipboardCheck, GraduationCap, LayoutGrid, TrendingUp, Users } from 'lucide-react';
import type { AccountClient } from '../accounts.js';
import { DashboardSummary } from '../DashboardSummary.js';

const shortcuts = [
  { id: 'users', title: 'Alumnos y docentes', description: 'Cuentas y accesos.', icon: Users, tone: 'blue' },
  { id: 'enrollments', title: 'Matrículas', description: 'Estudiantes organizadas por aula.', icon: GraduationCap, tone: 'violet' },
  { id: 'assignments', title: 'Asignaciones docentes', description: 'Docentes y cursos de cada aula.', icon: BookOpen, tone: 'cyan' },
  { id: 'supervision', title: 'Supervisión', description: 'Materiales y observaciones al docente.', icon: ClipboardCheck, tone: 'green' },
  { id: 'reports', title: 'Reportes académicos', description: 'Resultados y seguimiento académico.', icon: TrendingUp, tone: 'amber' },
  { id: 'calendar', title: 'Calendario institucional', description: 'Bimestres y semanas del colegio.', icon: CalendarDays, tone: 'rose' },
];
const organization = [
  { id: 'periods', title: 'Períodos académicos', description: 'Define fechas de inicio y fin; consulta si el período está planificado, activo o cerrado.' },
  { id: 'catalog', title: 'Grados, secciones y áreas', description: 'Mantén la estructura de aulas y el catálogo de materias y áreas.' },
  { id: 'history', title: 'Historial', description: 'Consulta matrículas y asignaciones anteriores con sus fechas y estados.' },
  { id: 'audit', title: 'Auditoría', description: 'Busca y revisa los eventos que dejaron las operaciones académicas.' },
  { id: 'notifications', title: 'Notificaciones', description: 'Revisa avisos de tu cuenta y marca como leídos los ya atendidos.' },
  { id: 'account', title: 'Mi cuenta', description: 'Consulta tu perfil y las opciones personales de acceso.' },
];

export function VicePrincipalHome({ name, onSelect, client }: { name: string; onSelect: (id: string) => void; client?: AccountClient | undefined }) {
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Buenos días' : hour >= 12 && hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = name.trim().split(/\s+/)[0] || 'Subdirector';
  const today = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return <div className="vp-home">
    <header className="vp-home-heading">
      <div><h2>{greeting}, {firstName}</h2><p>Tu espacio de gestión y acompañamiento académico en EVAL.</p></div>
      <span>{today.charAt(0).toUpperCase() + today.slice(1)}</span>
    </header>
    <section className="vp-home-hero" aria-label="Acceso principal de subdirección">
      <div className="vp-home-welcome"><span className="vp-home-eyebrow">GESTIÓN ACADÉMICA</span><h3>Organiza y acompaña a tu comunidad educativa</h3><p>Consulta alumnos, docentes y matrículas desde tu espacio de trabajo.</p></div>
      <button type="button" className="bg-primary vp-home-main-action" onClick={() => onSelect('users')}>Gestionar alumnos y docentes <ArrowUpRight size={18} aria-hidden="true"/></button>
    </section>
    <section className="vp-overview" aria-label="Panorama académico"><div className="vp-section-heading"><div><span className="vp-section-kicker">UNA MIRADA AL COLEGIO</span><h4>Tu panorama académico</h4></div><span className="vp-section-note">Resumen de los registros actuales</span></div>{client && <DashboardSummary client={client} role="vice_principal" onSelect={onSelect}/>}</section>
    <div className="vp-home-columns">
      <section aria-label="Herramientas de gestión"><div className="vp-section-heading"><div><h4><BookOpen size={18} aria-hidden="true"/> Herramientas de gestión</h4><p>Selecciona el área que deseas consultar.</p></div></div>
        <div className="vp-shortcuts">{shortcuts.map(({ id, title, description, icon: Icon, tone }) => <button type="button" className={'vp-shortcut vp-tone-' + tone} key={id} onClick={() => onSelect(id)}><span className="vp-shortcut-top"><span className="vp-shortcut-icon"><Icon size={20} strokeWidth={1.7} aria-hidden="true"/></span></span><strong>{title}</strong><span className="vp-shortcut-description">{description}</span><span className="vp-shortcut-footer">Abrir módulo <ArrowUpRight size={17} aria-hidden="true"/></span></button>)}</div>
      </section>
      <section className="vp-organization" aria-label="Organización institucional"><div className="vp-section-heading"><div><h4><LayoutGrid size={18} aria-hidden="true"/> Organización y consulta</h4></div></div><div className="vp-organization-links">{organization.map(item => <button type="button" key={item.id} onClick={() => onSelect(item.id)}><span><strong>{item.title}</strong><small>{item.description}</small></span><ArrowUpRight size={16} aria-hidden="true"/></button>)}</div></section>
    </div>
  </div>;
}
