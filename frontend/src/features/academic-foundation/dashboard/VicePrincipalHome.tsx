import { ArrowUpRight, BookOpen, CalendarDays, ClipboardCheck, GraduationCap, LayoutGrid, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react';
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
  return <div className="vp-home">
    <section className="vp-home-hero" aria-label="Bienvenida del subdirector">
      <div className="vp-home-welcome">
        <span className="vp-home-eyebrow"><Sparkles size={15} aria-hidden="true"/> TU ESPACIO DE GESTIÓN</span>
        <h3>Hola, {name.trim().split(/\s+/)[0] || 'Subdirector'}.</h3>
        <p className="vp-home-tagline">Un colegio conectado.<br/>Una gestión más cercana.</p>
        <p>Elige una herramienta para comenzar.</p>
        <button className="bg-primary vp-home-main-action" onClick={() => onSelect('users')}>Gestionar alumnos y docentes <ArrowUpRight size={18} aria-hidden="true"/></button>
      </div>
      <div className="vp-school-scene" aria-label="Fachada de la institución educativa Nuestra Señora de las Mercedes">
        <span className="vp-scene-dot vp-scene-dot-one"/><span className="vp-scene-dot vp-scene-dot-two"/>
        <figure className="vp-school-picture"><img className="vp-school-photo" src="/assets/vice-principal-school.png" alt="Fachada de la institución educativa Nuestra Señora de las Mercedes"/><figcaption className="vp-picture-caption"><span className="vp-picture-label">NUESTRA COMUNIDAD</span><span className="vp-picture-name">I.E. Nuestra Señora de las Mercedes</span><span className="vp-picture-rule"/></figcaption></figure>
        <span className="vp-scene-chip vp-scene-chip-one"><GraduationCap size={21}/> Aprendizaje</span>
        <span className="vp-scene-chip vp-scene-chip-two"><ShieldCheck size={21}/> Acompañamiento</span>
        <span className="vp-scene-orbit"/>
      </div>
    </section>
    <section className="vp-overview" aria-label="Panorama académico"><div className="vp-section-heading"><div><span className="vp-section-kicker">UNA MIRADA AL COLEGIO</span><h4>Tu panorama académico</h4></div><span className="vp-section-note">Resumen de los registros actuales</span></div>{client && <DashboardSummary client={client} role="vice_principal" onSelect={onSelect}/>}</section>
    <section aria-label="Herramientas de gestión"><div className="vp-section-heading"><div><span className="vp-section-kicker">TODO A TU ALCANCE</span><h4>Herramientas de gestión</h4><p>Elige por dónde quieres empezar.</p></div></div>
      <div className="vp-shortcuts">{shortcuts.map(({ id, title, description, icon: Icon, tone }) => <button className={'vp-shortcut vp-tone-' + tone} key={id} onClick={() => onSelect(id)}><span className="vp-shortcut-top"><span className="vp-shortcut-icon"><Icon size={25} strokeWidth={1.7} aria-hidden="true"/></span><ArrowUpRight size={18} className="vp-shortcut-arrow" aria-hidden="true"/></span><strong>{title}</strong><span className="vp-shortcut-description">{description}</span></button>)}</div>
    </section>
    <section className="vp-organization" aria-label="Organización institucional"><div className="vp-section-heading"><div><span className="vp-section-kicker">ORGANIZACIÓN INSTITUCIONAL</span><h4>Organización y consulta</h4><p>Configuración, historial y acceso personal.</p></div><LayoutGrid size={22} aria-hidden="true"/></div><div className="vp-organization-links">{organization.map(item => <button key={item.id} onClick={() => onSelect(item.id)}><span><strong>{item.title}</strong><small>{item.description}</small></span><ArrowUpRight size={16} aria-hidden="true"/></button>)}</div></section>
  </div>;
}
