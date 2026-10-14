import {renderToStaticMarkup} from 'react-dom/server';
import {CourseClassroomButtons} from './CourseClassroomButtons.js';
import {courseClassrooms,selectedClassroom} from './course-classrooms.js';
import {createAcademicClient} from './api.js';
const scopes=[{grade_id:'1',grade:'1.º',section_id:'11',section:'A'},{grade_id:'1',grade:'1.º',section_id:'12',section:'B'},{grade_id:'2',grade:'2.º',section_id:'21',section:'A'}];
function assert(value:unknown):asserts value{if(!value)throw Error('Teacher classroom assertion failed');}
function rejects(fn:()=>unknown){let failed=false;try{fn();}catch{failed=true;}assert(failed);}
export const courseClassroomCases:readonly (readonly [string,()=>void|Promise<void>])[]=[
 ['teacher section buttons belong only to their selected grade',()=>{const html=renderToStaticMarkup(<CourseClassroomButtons rows={scopes} value={{gradeId:'2',sectionId:'21'}} onChange={()=>{}}/>);assert(html.includes('Sección A')&&!html.includes('Sección B')&&html.includes('aria-pressed="true"'));}],
 ['teacher cannot browse every section before selecting a grade',()=>{const html=renderToStaticMarkup(<CourseClassroomButtons rows={scopes} value={{gradeId:'',sectionId:''}} onChange={()=>{}}/>);assert(!html.includes('Sección A')&&!html.includes('Sección B')&&html.includes('Selecciona primero'));}],
 ['classroom identity distinguishes equally named sections in different grades',()=>{assert(selectedClassroom(scopes,{gradeId:'1',sectionId:'21'})===undefined);assert(selectedClassroom(scopes,{gradeId:'2',sectionId:'21'})?.grade==='2.º');}],
 ['classroom metadata rejects duplicates and leaked authority',()=>{rejects(()=>courseClassrooms({items:[scopes[0],scopes[0]]}));rejects(()=>courseClassrooms({items:[{...scopes[0],actor:'1'}]}));}],
 ['teacher filtered course paging preserves IDs without adding client authority',async()=>{let url='';const client=createAcademicClient(async(input)=>{url=String(input);return new Response(JSON.stringify({data:{items:[],next_after:null}}));},()=> 'csrf');await client.myCourses(v=>v,'51',{grade_id:'2',section_id:'21'});const params=new URL(url,'https://eval.test').searchParams;assert(params.get('after')==='51'&&params.get('grade_id')==='2'&&params.get('section_id')==='21');rejects(()=>client.myCourses(v=>v,null,{grade_id:'1',...{actor:'1'}}));}],
];
