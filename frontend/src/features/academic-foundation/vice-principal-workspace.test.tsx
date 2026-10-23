import {renderToStaticMarkup} from 'react-dom/server';
import {ClassroomSteps,VicePrincipalWorkspace,vicePrincipalTasks} from './VicePrincipalWorkspace.js';
import {roleMenus} from './role-dashboards.js';
const assert=(value:unknown,message:string)=>{if(!value)throw Error(message);};
export const vicePrincipalFlowCases:readonly (readonly [string,()=>void])[]=[
 ['vice-principal navigation covers every authorized module with native task buttons',()=>{
  for(const module of roleMenus.vice_principal){if(module.id==='catalog')continue;assert(vicePrincipalTasks[module.id],module.id+' missing');const html=renderToStaticMarkup(<VicePrincipalWorkspace section={module.id}><form data-private="must-not-mount"/></VicePrincipalWorkspace>);assert(html.includes('¿Qué deseas hacer?'),'missing prompt');assert(!html.includes('must-not-mount'),'workspace mounts before action');assert(html.includes('<button type="button"'),'keyboard button missing');}
 }],
 ['classroom steps expose only the next academic level and restrict section choices',()=>{
  const options={periods:[{id:'1',name:'2026'}],grades:[{id:'1',name:'Primero'},{id:'2',name:'Segundo'}],sections:[{id:'10',name:'A',grade_id:'1'},{id:'20',name:'B',grade_id:'2'}],onChange:()=>{}};
  let html=renderToStaticMarkup(<ClassroomSteps {...options} period="" grade="" section=""/>);assert(html.includes('Selecciona el año académico'),'year step');assert(!html.includes('Primero')&&!html.includes('Sección A'),'future levels leak');
  html=renderToStaticMarkup(<ClassroomSteps {...options} period="1" grade="1" section=""/>);assert(html.includes('Sección A')&&!html.includes('Sección B'),'wrong classroom scope');assert(html.includes('Cambiar'),'return path missing');
  html=renderToStaticMarkup(<ClassroomSteps {...options} period="1" grade="1" section="10"/>);assert(!html.includes('vp-choice-grid'),'completed scope still shows choices');
 }],
 ['unsupported modules preserve children instead of hiding another role workspace',()=>{
  const html=renderToStaticMarkup(<VicePrincipalWorkspace section="my_enrollments"><p>Student content</p></VicePrincipalWorkspace>);assert(html==='<p>Student content</p>','unsupported content lost');
 }],
];
