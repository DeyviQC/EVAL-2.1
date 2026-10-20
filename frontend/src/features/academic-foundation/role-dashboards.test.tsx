import {renderToStaticMarkup} from 'react-dom/server';
import {allowedSection,dashboardRole,roleMenus,StudentDashboard,TeacherDashboard,DirectorDashboard,VicePrincipalDashboard} from './role-dashboards.js';
import type {StudentDashboard as StudentDashboardData} from './student-dashboard.js';
const assert=(value:unknown)=>{if(!value)throw Error('Role dashboard assertion failed');};
const mockStudentDashboard:StudentDashboardData={
 overview:{courses:1,pending:0,deliveries:0,graded:0,unread:0},
 average:{grade:null,label:'En progreso'},
 resume:null,
 upcoming:[],
 courses:[{id:'1',subject:'Matemática',grade:'2.º',section:'A',teacher:'Prof. Prueba',progress:0,subject_color:'#3B82F6'}],
 notices:[],
 agenda:{current_week:null,slots:[]},
};
import type {AccountClient} from './accounts.js';
const mockStudentClient={studentDashboard:()=>Promise.resolve(mockStudentDashboard)} as unknown as AccountClient;
export const roleDashboardCases:[string,()=>void][]=[
 ['dashboard role accepts only one server projection without injected authority',()=>{assert(dashboardRole({data:{role:'student'}})==='student');for(const wire of [{data:{role:'admin'}},{data:{role:'teacher',can_manage:true}},{data:{role:['student','teacher']}}]){let rejected=false;try{dashboardRole(wire);}catch{rejected=true;}assert(rejected);}}],
 ['each role workspace allowlist rejects sections belonging to other profiles',()=>{assert(!allowedSection('student','users')&&!allowedSection('student','assignments')&&!allowedSection('student','audit')&&!allowedSection('teacher','periods')&&!allowedSection('teacher','audit'));assert(!allowedSection('director_admin','users')&&!allowedSection('director_admin','catalog')&&!allowedSection('director_admin','activities'));assert(allowedSection('vice_principal','users')&&allowedSection('vice_principal','enrollments')&&allowedSection('vice_principal','audit'));assert(!allowedSection('vice_principal','my_enrollments'));}],
 ['four independent home views have role-specific content and no role switching',()=>{const html=[renderToStaticMarkup(<StudentDashboard name="Mercedes" onSelect={()=>{}} client={mockStudentClient}/>),renderToStaticMarkup(<TeacherDashboard name="Mercedes" onSelect={()=>{}}/>),renderToStaticMarkup(<DirectorDashboard name="Mercedes" onSelect={()=>{}}/>),renderToStaticMarkup(<VicePrincipalDashboard name="Mercedes" onSelect={()=>{}}/>)];assert(html[0]!.includes('¿Qué quieres hacer hoy?')&&html[1]!.includes('Tu espacio de trabajo')&&html[2]!.includes('Consulta y supervisión')&&html[3]!.includes('Herramientas de gestión'));assert(html[2]!.includes('Solo lectura')&&!html[2]!.includes('Crea cuentas'));for(const page of html)assert(!page.includes('Cambiar rol'));}],
 ['director menu contains consultation only while vice principal owns institutional management',()=>{assert(roleMenus.director_admin.every(e=>['reports','institution','history','audit','account'].includes(e.id)));assert(['periods','catalog','enrollments','assignments','calendar','users','audit'].every(id=>roleMenus.vice_principal.some(e=>e.id===id)));}],
];
