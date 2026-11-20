import {renderToStaticMarkup} from 'react-dom/server';
import {CatalogWorkspace,sectionsForGrade} from './CatalogWorkspace.js';
import {compareGrades} from './catalog-order.js';
import {confirmationLabel} from './ActionFeedback.js';
import {EnrollmentWorkspace} from './EnrollmentWorkspace.js';
import {VicePrincipalWorkspace} from './VicePrincipalWorkspace.js';
import type {AcademicClient} from './api.js';
import {UsersWorkspace} from './AccountWorkspace.js';
import type {AccountClient} from './accounts.js';
const assert=(value:unknown)=>{if(!value)throw Error('Catalog presentation assertion failed');};
export const catalogWorkspaceCases:readonly (readonly [string,()=>void])[]=[
 ['new account task renders its form immediately without waiting for an effect',()=>{
  const html=renderToStaticMarkup(<VicePrincipalWorkspace section="users" initialTask="create"><UsersWorkspace client={{} as AccountClient} onExpired={()=>{}}/></VicePrincipalWorkspace>);
  assert(html.includes('aria-label="Crear cuenta"'));
  assert(html.includes('Completa el nombre, el usuario y el tipo de cuenta'));
 }],
 ['vice-principal options do not retain a hidden previous task',()=>{
  const html=renderToStaticMarkup(<VicePrincipalWorkspace section="users"><div>Previous task state</div></VicePrincipalWorkspace>);
  assert(!html.includes('Previous task state'));
  assert(html.includes('Crear una cuenta'));
 }],
 ['student shortcut opens enrollment creation with the created identity selected',()=>{
  const html=renderToStaticMarkup(<VicePrincipalWorkspace section="enrollments" initialTask="create"><EnrollmentWorkspace client={{} as AcademicClient} onExpired={()=>{}} initialStudent={{id:'91',name:'Estudiante de prueba'}}/></VicePrincipalWorkspace>);
  assert(html.includes('Nueva matrícula'));
  assert(html.includes('name="student_id"')&&html.includes('value="91"'));
  assert(html.includes('Estudiante de prueba'));
  assert(html.includes('Selecciona un período activo'));
  assert(html.includes('disabled=""'));
 }],
 ['grades use academic order for Spanish names and numeric labels',()=>{
  const names=['Quinto','Tercero','Primero','Cuarto','Segundo'];
  assert(names.map(name=>({name})).sort(compareGrades).map(row=>row.name).join(',')==='Primero,Segundo,Tercero,Cuarto,Quinto');
  const mixed=['Quinto de secundaria','2.º','Primero','4°','Tercero'];
  assert(mixed.map(name=>({name})).sort(compareGrades).map(row=>row.name).join(',')==='Primero,2.º,Tercero,4°,Quinto de secundaria');
  assert(names[0]==='Quinto');
 }],
 ['section names use natural order within the selected grade',()=>{
  const rows=['B','A10','A2','A'].map((name,index)=>({id:String(index+1),name,grade_id:'1',is_active:index!==0}));
  assert(sectionsForGrade(rows,'1').map(row=>row.name).join(',')==='A,A2,A10,B');
  assert(rows[0]?.name==='B');
 }],
 ['confirmation buttons identify the pending action and target',()=>{
  assert(confirmationLabel('¿Publicar esta actividad?')==='Confirmar: publicar esta actividad');
  assert(confirmationLabel('¿Cerrar esta matrícula?')==='Confirmar: cerrar esta matrícula');
  assert(confirmationLabel('¿Desactivar Segundo · Sección A?')==='Confirmar: desactivar Segundo · Sección A');
 }],
 ['section filtering keeps inactive classrooms and never mixes grades',()=>{
  const rows=Array.from({length:65},(_,index)=>({id:String(index+1),name:String(index%5+1),is_active:index!==64,grade_id:index<60?'1':'2'}));
  const selected=sectionsForGrade(rows,'2');assert(selected.length===5);assert(selected.every(row=>row.grade_id==='2'));assert(selected.some(row=>!row.is_active));assert(sectionsForGrade(rows,'3').length===0);
 }],
 ['catalog starts with compact rows instead of one editor per record',()=>{
  const html=renderToStaticMarkup(<CatalogWorkspace kind="entry" rows={[{id:'1',name:'Matemática',kind:'area',is_active:true},{id:'2',name:'Comunicación',kind:'area',is_active:false}]} grades={[]} loading={false} busy={false} uncertain={false} message="" error={false} more={false} gradeBusy={false} moreGrades={false} onKind={()=>{}} onRefresh={()=>{}} onMore={()=>{}} onMoreGrades={()=>{}} onCreate={async()=>false} onRename={async()=>false} onState={async()=>false}/>);
  assert(!html.includes('<form')&&!html.includes('<input'));assert(!html.includes('Editar Matemática')&&!html.includes('Añadir área o materia'));assert(html.includes('Gestionar los grados del colegio')&&html.includes('Entrar por grado y ver sus aulas'));assert(html.includes('Tipo de catálogo'));
 }],
 ['catalog uncertain results disable new operations without hiding recovery',()=>{
  const html=renderToStaticMarkup(<CatalogWorkspace kind="grade" rows={[]} grades={[]} loading={false} busy={false} uncertain message="Resultado no confirmado" error={false} more={false} gradeBusy={false} moreGrades={false} onKind={()=>{}} onRefresh={()=>{}} onMore={()=>{}} onMoreGrades={()=>{}} onCreate={async()=>false} onRename={async()=>false} onState={async()=>false}/>);
  assert(html.includes('No repitas el cambio'));assert(html.includes('disabled=""'));assert(html.includes('Actualizar'));
 }],
];
