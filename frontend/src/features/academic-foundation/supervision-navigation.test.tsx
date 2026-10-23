import {renderToStaticMarkup} from 'react-dom/server';
import type {AcademicClient} from './api.js';
import {createAcademicClient} from './api.js';
import {supervisionCourses,supervisionOptions} from './supervision-navigation.js';
import {VicePrincipalModuleGuide} from './VicePrincipalModuleGuide.js';
const assert=(value:unknown)=>{if(!value)throw Error('Supervision navigation assertion failed');};
const course={id:'9007199254740993',teacher_id:'2',teacher_name:'Docente',academic_period_id:'3',period_name:'2026',period_state:'active',instructional_entry_id:'4',entry_name:'Área',grade_id:'5',grade_name:'2.º',section_id:'6',section_name:'B',state:'active',effective_from:'2026-01-01',effective_until:null,replaces_assignment_id:null};
export const supervisionNavigationCases:readonly (readonly [string,()=>void|Promise<void>])[]=[
 ['supervision requests exact classroom filters before pagination',async()=>{
  let path='';const client=createAcademicClient((async url=>{path=String(url);return new Response(JSON.stringify({data:{items:[course],next_after:null}}));}) as typeof fetch,()=> 'csrf');
  const page=await supervisionCourses(client,{period:'3',grade:'5',section:'6'},'8');
  const url=new URL(path,'https://eval.test');assert(url.searchParams.get('academic_period_id')==='3'&&url.searchParams.get('grade_id')==='5'&&url.searchParams.get('section_id')==='6'&&url.searchParams.get('after')==='8');assert(page.items[0]!.id===course.id);
 }],
 ['supervision refuses incomplete selections without sending a request',async()=>{
  let calls=0;const client={assignmentDirectory:async()=>{calls++;throw Error();}} as unknown as AcademicClient;
  let denied=false;try{await supervisionCourses(client,{period:'3',grade:'',section:'6'});}catch{denied=true;}assert(denied&&calls===0);
 }],
 ['supervision rejects a response from another classroom',async()=>{
  const client={assignmentDirectory:async()=>({items:[{...course,section_id:'7'}],next_after:null})} as unknown as AcademicClient;
  let denied=false;try{await supervisionCourses(client,{period:'3',grade:'5',section:'6'});}catch{denied=true;}assert(denied);
 }],
 ['supervision metadata includes later pages and rejects repeated cursors',async()=>{
  const calls:string[]=[];
  const client={directory:async(kind:string,_decode:unknown,after:string|null)=>{calls.push(kind+':'+after);return kind==='catalog/section'?after?{items:[{id:'51',name:'B',grade_id:'5',is_active:true}],next_after:null}:{items:[{id:'50',name:'A',grade_id:'5',is_active:true}],next_after:'50'}:{items:[],next_after:null};}} as unknown as AcademicClient;
  const options=await supervisionOptions(client);assert(options.sections.length===2&&calls.includes('catalog/section:50'));
  const bad={directory:async()=>({items:[{id:'1'}],next_after:'1'})} as unknown as AcademicClient;
  let denied=false;try{await supervisionOptions(bad);}catch{denied=true;}assert(denied);
 }],
 ['vice-principal help is optional and initially collapsed',()=>{
  const html=renderToStaticMarkup(<VicePrincipalModuleGuide section="supervision"/>);assert(html.includes('<details')&&html.includes('<summary')&&!html.includes('<details open')&&!html.includes('GUÍA RÁPIDA'));
 }],
];
