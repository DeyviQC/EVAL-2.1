import {renderToStaticMarkup} from 'react-dom/server';
import {PresentationResource} from './ClassroomPresentation.js';
import type {WeekPage} from './weeks.js';
const assert={match:(value:string,pattern:RegExp)=>{if(!pattern.test(value))throw Error('Expected '+pattern);},doesNotMatch:(value:string,pattern:RegExp)=>{if(pattern.test(value))throw Error('Unexpected '+pattern);}};

const material:WeekPage['items'][number]={resource:{id:'7',assignment_id:'1',author_id:'2',author_name:'Docente',title:'Fracciones',description:'Una guía',filename:'guia.pdf',mime:'application/pdf',bytes:100,published_at:'2026-10-15 10:00:00'},association:{kind:'material',resource_id:'7',assignment_id:'1',period_id:'1',version:1,calendar_revision_id:'1',week_id:'a'.repeat(32),earlier_calendar:false},progress:null};
export const classroomPresentationCases:readonly (readonly [string,()=>void])[]=[
 ['classroom embeds authorized PDF through the existing same-origin retained-file URL',()=>{
   const html=renderToStaticMarkup(<PresentationResource entry={material}/>);
   assert.match(html,/<iframe/);assert.match(html,/title="Fracciones"/);
   assert.match(html,/src="\/academic\/materials\/7\/file\?disposition=inline"/);
 }],
 ['classroom displays image materials and downloads unsupported office files',()=>{
   const image={...material,resource:{...material.resource,mime:'image/png'}};
   assert.match(renderToStaticMarkup(<PresentationResource entry={image}/>),/<img[^>]*alt="Fracciones"/);
   const office={...material,resource:{...material.resource,mime:'application/msword'}};
   const html=renderToStaticMarkup(<PresentationResource entry={office}/>);
   assert.doesNotMatch(html,/<iframe|<img/);assert.match(html,/disposition=attachment/);
 }],
 ['classroom activity presentation excludes personal feedback and delivery data',()=>{
   const activity:WeekPage['items'][number]={...material,association:{...material.association,kind:'activity'},resource:{id:'8',assignment_id:'1',title:'Práctica',instructions:'Resuelve <script>no ejecutar</script>',due_on:null,state:'open',can_close:false,can_submit:true},progress:null};
   const html=renderToStaticMarkup(<PresentationResource entry={activity}/>);
   assert.match(html,/Resuelve &lt;script&gt;/);assert.doesNotMatch(html,/<script>|Entregar|Calificar/);
 }],
];
