import {renderToStaticMarkup} from 'react-dom/server';
import {allowedSection,dashboardRole,roleMenus,StudentDashboard,TeacherDashboard,DirectorDashboard,VicePrincipalDashboard} from './role-dashboards.js';
import type {StudentDashboard as StudentDashboardData} from './student-dashboard.js';
const assert=(value:unknown)=>{if(!value)throw Error('Role dashboard assertion failed');};
const mockStudentDashboard:StudentDashboardData={
 overview:{courses:1,pending:0,deliveries:0,graded:0,unread:0},
 average:{grade:null,label:'En progreso'},
 resume:{kind:'activity',id:'1',assignment_id:'10',course:'Matemática · 2.º A',classroom:{grade_id:'5',grade:'2.º',section_id:'6',section:'A'},title:'Ecuaciones lineales',due_on:'2026-10-20',progress:50,cta:'Continuar actividad'},
 upcoming:[],
 courses:[{id:'1',subject:'Matemática',grade:'2.º',section:'A',teacher:'Prof. Prueba',progress:50,subject_color:'#3B82F6'}],
 notices:[],
 agenda:{current_week:null,slots:[]},
};
import type {AccountClient} from './accounts.js';
const mockStudentClient={studentDashboard:()=>Promise.resolve(mockStudentDashboard)} as unknown as AccountClient;
export const roleDashboardCases:[string,()=>void][]=[
 ['dashboard role accepts only one server projection without injected authority',()=>{assert(dashboardRole({data:{role:'student'}})==='student');for(const wire of [{data:{role:'admin'}},{data:{role:'teacher',can_manage:true}},{data:{role:['student','teacher']}}]){let rejected=false;try{dashboardRole(wire);}catch{rejected=true;}assert(rejected);}}],
 ['each role workspace allowlist rejects sections belonging to other profiles',()=>{assert(!allowedSection('student','users')&&!allowedSection('student','assignments')&&!allowedSection('student','audit')&&!allowedSection('teacher','periods')&&!allowedSection('teacher','audit'));assert(!allowedSection('director_admin','users')&&!allowedSection('director_admin','catalog')&&!allowedSection('director_admin','activities'));assert(allowedSection('vice_principal','users')&&allowedSection('vice_principal','enrollments')&&allowedSection('vice_principal','audit'));assert(!allowedSection('vice_principal','my_enrollments'));}],
 ['four independent home views have role-specific content and no role switching',()=>{const html=[renderToStaticMarkup(<StudentDashboard name="Mercedes" onSelect={()=>{}} client={mockStudentClient}/>),renderToStaticMarkup(<TeacherDashboard name="Mercedes" onSelect={()=>{}}/>),renderToStaticMarkup(<DirectorDashboard name="Mercedes" onSelect={()=>{}}/>),renderToStaticMarkup(<VicePrincipalDashboard name="Mercedes" onSelect={()=>{}}/>)];assert(html[0]!.includes('¿Qué quieres hacer hoy?')&&html[1]!.includes('Tu espacio de trabajo')&&html[2]!.includes('¿Qué deseas consultar?')&&html[3]!.includes('Herramientas de gestión'));assert(html[2]!.includes('Solo lectura')&&!html[2]!.includes('Crea cuentas'));for(const page of html)assert(!page.includes('Cambiar rol'));}],
 ['director home presents the four consultation shortcuts without duplicating Mi perfil',()=>{const html=renderToStaticMarkup(<DirectorDashboard name="Mercedes" onSelect={()=>{}}/>);assert(html.includes('eval-director-home'));assert(['Seguimiento académico','Información institucional','Historial institucional','Bitácora de auditoría'].every(label=>html.includes(label)));assert(html.split('class="eval-director-shortcut"').length-1===4);assert(!html.includes('Mi perfil'));assert(roleMenus.director_admin.some(entry=>entry.id==='account'&&entry.label==='Mi perfil'));}],
 ['student home never presents course data the server did not return',()=>{const html=renderToStaticMarkup(<StudentDashboard name="Mercedes" onSelect={()=>{}}/>);assert(!html.includes('Ver todos (10)'));assert(!html.includes('Matemática</'));assert(!html.includes('Ciencias Sociales</'));for(const invented of ['75%','80%','60%','85%'])assert(!html.includes(invented));assert(html.includes('Sin cursos registrados'));assert(html.includes('Mis cursos'));}],
 ['teacher home never presents course data the server did not return',()=>{const html=renderToStaticMarkup(<TeacherDashboard name="Carmen" onSelect={()=>{}}/>);assert(!html.includes('Matemática</'));assert(html.includes('Sin cursos asignados'));assert(html.includes('Mis cursos y aulas'));assert(html.includes('Tu espacio de trabajo'));}],
 ['director menu contains consultation only while vice principal owns institutional management',()=>{assert(roleMenus.director_admin.every(e=>['reports','institution','history','audit','account'].includes(e.id)));assert(['periods','catalog','enrollments','assignments','calendar','users','audit'].every(id=>roleMenus.vice_principal.some(e=>e.id===id)));}],
];
