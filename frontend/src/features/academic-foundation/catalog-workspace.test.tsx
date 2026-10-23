import {renderToStaticMarkup} from 'react-dom/server';
import {CatalogWorkspace,sectionsForGrade} from './CatalogWorkspace.js';
const assert=(value:unknown)=>{if(!value)throw Error('Catalog presentation assertion failed');};
export const catalogWorkspaceCases:readonly (readonly [string,()=>void])[]=[
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
