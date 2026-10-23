import {renderToStaticMarkup} from 'react-dom/server';
import {StudentTaskList,StudentTaskDrawer} from './StudentTaskList.js';
import type {StudentTask} from './student-tasks.js';
import type {Activity} from './activities.js';

const task:StudentTask={id:'1',assignment_id:'10',title:'Trabajo conservado',due_on:null,category:'later',course:{id:'10',subject:'Comunicación',teacher:'Docente',color:'#28599B'},state:'closed',can_submit:false,delivery:{has_delivery:true,is_graded:true,delivered_at:'2026-10-20',filename:null,grade:'A',feedback:'Trabajo revisado.',graded_at:'2026-10-21'}};
const activity:Activity={id:'1',assignment_id:'10',title:task.title,instructions:'Consigna conservada.',due_on:null,state:'closed',can_close:false,can_submit:false};
function assert(value:unknown){if(!value)throw Error('Student task flow assertion failed');}
export const studentTaskFlowCases:readonly (readonly [string,()=>void])[]=[
 ['closed tasks remain visible with their course and assessment',()=>{
  const html=renderToStaticMarkup(<StudentTaskList data={{items:[task],overview:{pending:0,delivered:0,graded:1,overdue:0}}} loading={false} error={false} onRetry={()=>{}} onOpen={()=>{}}/>);
  assert(html.includes('Cerradas')&&html.includes(task.title)&&html.includes('Comunicación')&&html.includes('Calificada'));
 }],
 ['graded task permits opening the preserved delivery without permitting submission',()=>{
  const html=renderToStaticMarkup(<StudentTaskDrawer task={task} activity={activity} onClose={()=>{}} onAction={()=>{}}/>);
  assert(html.includes('Ver entrega')&&!html.includes('disabled=""')&&!html.includes('Actualizar entrega')&&!html.includes('Entregar ahora'));
 }],
 ['task action stays disabled until its authorized activity has loaded',()=>{
  const html=renderToStaticMarkup(<StudentTaskDrawer task={{...task,can_submit:true}} activity={null} onClose={()=>{}} onAction={()=>{}}/>);
  assert(html.includes('Consultando tarea')&&html.includes('disabled=""'));
 }],
];
