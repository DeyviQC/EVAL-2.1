import {DashboardSummary} from './DashboardSummary.js';
import type {AccountClient} from './accounts.js';
import type {CourseClassroomSelection} from './course-classrooms.js';
import type {AcademicClient} from './api.js';
import {exact} from './contracts.js';
import {Icon} from './InstitutionalUI.js';
export type DashboardRole='director_admin'|'vice_principal'|'teacher'|'student';
type Entry={id:string;label:string;description:string;icon:string};
export const roleLabels:Record<DashboardRole,string>={student:'Estudiante',teacher:'Docente',director_admin:'Director',vice_principal:'Subdirector'};
export const roleMenus:Record<DashboardRole,Entry[]>={
 student:[{id:'my_enrollments',label:'Mis cursos',description:'Tus áreas y recursos de aprendizaje.',icon:'grid'},{id:'activities',label:'Tareas',description:'Envía tus trabajos y consulta tus calificaciones.',icon:'file'},{id:'materials',label:'Materiales',description:'Recursos compartidos por tus docentes.',icon:'file'},{id:'library',label:'Biblioteca',description:'Encuentra los recursos de tus cursos.',icon:'grid'},{id:'history',label:'Mi historial',description:'Consulta tu recorrido académico.',icon:'chart'},{id:'notifications',label:'Notificaciones',description:'Novedades sobre tus actividades.',icon:'bell'},{id:'account',label:'Mi cuenta',description:'Tus datos y acceso personal.',icon:'user'}],
 teacher:[{id:'my_assignments',label:'Cursos y aulas',description:'Trabaja por grado, sección y curso.',icon:'grid'},{id:'activities',label:'Actividades y entregas',description:'Crea tareas, revisa trabajos y califica.',icon:'file'},{id:'materials',label:'Publicar materiales',description:'Comparte recursos con tus estudiantes.',icon:'file'},{id:'library',label:'Biblioteca',description:'Consulta tus recursos organizados por aula.',icon:'grid'},{id:'history',label:'Mi historial',description:'Consulta tus asignaciones anteriores.',icon:'chart'},{id:'notifications',label:'Notificaciones',description:'Entregas y novedades académicas.',icon:'bell'},{id:'account',label:'Mi cuenta',description:'Tu perfil y credenciales.',icon:'user'}],
 director_admin:[{id:'reports',label:'Seguimiento académico',description:'Consulta reportes por grado y sección.',icon:'chart'},{id:'institution',label:'Información institucional',description:'Períodos, áreas y organización del colegio.',icon:'grid'},{id:'history',label:'Historial institucional',description:'Consulta matrículas y asignaciones conservadas.',icon:'file'},{id:'audit',label:'Bitácora de auditoría',description:'Audita eventos inmutables del ledger y transacciones.',icon:'chart'},{id:'account',label:'Mi perfil',description:'Datos de tu cuenta de consulta.',icon:'user'}],
 vice_principal:[{id:'periods',label:'Períodos académicos',description:'Configura y administra el año académico.',icon:'calendar'},{id:'catalog',label:'Grados, secciones y áreas',description:'Organiza la estructura del colegio.',icon:'grid'},{id:'enrollments',label:'Matrículas',description:'Gestiona las estudiantes por aula.',icon:'user'},{id:'assignments',label:'Asignaciones docentes',description:'Organiza los cursos y docentes.',icon:'grid'},{id:'users',label:'Usuarios',description:'Crea cuentas y administra sus accesos.',icon:'user'},{id:'calendar',label:'Calendario institucional',description:'Gestiona semanas y fechas académicas.',icon:'calendar'},{id:'supervision',label:'Supervisión de materiales',description:'Acompaña la publicación de recursos.',icon:'file'},{id:'reports',label:'Reportes',description:'Consulta el seguimiento de las aulas.',icon:'chart'},{id:'history',label:'Historial',description:'Revisa matrículas y asignaciones anteriores.',icon:'file'},{id:'audit',label:'Bitácora de auditoría',description:'Audita eventos inmutables del ciclo académico.',icon:'chart'},{id:'notifications',label:'Notificaciones',description:'Avisos de materiales y observaciones.',icon:'bell'},{id:'account',label:'Mi cuenta',description:'Perfil y seguridad de subdirección.',icon:'user'}],
};
export function dashboardRole(wire:unknown):DashboardRole{
 const envelope=exact(wire,['data']),row=exact(envelope.data,['role']);
 if(!['director_admin','vice_principal','teacher','student'].includes(String(row.role)))throw new Error('Invalid dashboard role');
 return row.role as DashboardRole;
}
export function allowedSection(role:DashboardRole,id:string|null){return id===null||roleMenus[role].some(e=>e.id===id);}
function DirectorHome({name,onSelect,client}:{client:AccountClient|undefined;name:string;onSelect:(id:string)=>void}){
 const currentDate=new Date(),hour=currentDate.getHours(),firstName=name.trim().split(/\s+/).filter(Boolean)[0]??'Dirección';
 const greeting=hour>=5&&hour<12?'Buenos días':hour>=12&&hour<19?'Buenas tardes':'Buenas noches';
 const todayRaw=new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long'}).format(currentDate),today=todayRaw.charAt(0).toUpperCase()+todayRaw.slice(1);
 const dateTime=[currentDate.getFullYear(),String(currentDate.getMonth()+1).padStart(2,'0'),String(currentDate.getDate()).padStart(2,'0')].join('-');
 const shortcuts=roleMenus.director_admin.filter(entry=>entry.id!=='account');
 return <div className="eval-director-home">
  <header className="eval-director-heading">
   <div><p className="eval-director-eyebrow">EVAL <span aria-hidden="true">/</span> DIRECCIÓN</p><h2>{greeting}, {firstName}</h2><p>Una vista clara para consultar el estado académico de la institución.</p></div>
   <time dateTime={dateTime}>{today}</time>
  </header>
  <section className="eval-director-hero" aria-labelledby="eval-director-hero-title">
   <div className="eval-director-hero-copy">
    <p className="eval-director-hero-kicker">VISIÓN INSTITUCIONAL</p>
    <h3 id="eval-director-hero-title">Acompaña el avance de la comunidad educativa.</h3>
    <p>Consulta reportes e información académica autorizada desde un solo lugar.</p>
    <span className="eval-director-readonly"><Icon name="lock"/> {roleLabels.director_admin} · Solo lectura</span>
   </div>
   <div className="eval-director-hero-art" aria-hidden="true"><span/><Icon name="home"/><small>EVAL · INSTITUCIÓN</small></div>
  </section>
  {client&&<DashboardSummary client={client} role="director_admin" onSelect={onSelect}/>}
  <section className="eval-director-consultations" aria-labelledby="eval-director-consultations-title">
   <div className="eval-director-section-heading"><div><p>ACCESOS DIRECTOS</p><h3 id="eval-director-consultations-title">¿Qué deseas consultar?</h3></div><span>Información disponible en modo consulta</span></div>
   <div className="eval-director-consultation-layout">
    <nav className="eval-director-shortcut-grid" aria-label="Consultas de dirección">
     {shortcuts.map(entry=><button type="button" key={entry.id} className="eval-director-shortcut" onClick={()=>onSelect(entry.id)}>
      <span className="eval-director-shortcut-icon"><Icon name={entry.icon}/></span>
      <span className="eval-director-shortcut-copy"><strong>{entry.label}</strong><small>{entry.description}</small></span>
      <span className="eval-director-shortcut-action">Solo consulta <span aria-hidden="true">→</span></span>
     </button>)}
    </nav>
    <aside className="eval-director-boundary" aria-labelledby="eval-director-boundary-title">
     <span className="eval-director-boundary-icon" aria-hidden="true"><Icon name="lock"/></span>
     <p className="eval-director-boundary-kicker">TU ACCESO</p>
     <h4 id="eval-director-boundary-title">Consulta con confianza.</h4>
     <p>El panel presenta información para revisión. No incluye acciones para crear, editar o eliminar registros.</p>
     <div className="eval-director-boundary-rule"/>
     <strong><span aria-hidden="true"/>Perfil de Dirección</strong>
     <small>Permisos de consulta</small>
    </aside>
   </div>
  </section>
 </div>;
}
type HomeProps={client?:AccountClient;academic?:Pick<AcademicClient,'myCourses'>;name:string;onSelect:(id:string)=>void;onCourseSelect?:(assignmentId:string,selection:CourseClassroomSelection)=>void;onActivitySelect?:(activityId:string)=>void};
import {StudentHome} from './dashboard/StudentHome.js';
import {TeacherHome} from './dashboard/TeacherHome.js';
import {VicePrincipalHome} from './dashboard/VicePrincipalHome.js';
export const StudentDashboard=(props:HomeProps)=><StudentHome {...props}/>;
export const TeacherDashboard=(props:HomeProps)=><TeacherHome name={props.name} onSelect={props.onSelect} client={props.client} academic={props.academic}/>;
export const DirectorDashboard=(props:HomeProps)=><DirectorHome name={props.name} onSelect={props.onSelect} client={props.client}/>;
export const VicePrincipalDashboard=(props:HomeProps)=><VicePrincipalHome {...props}/>;
