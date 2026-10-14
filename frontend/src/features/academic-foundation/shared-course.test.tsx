import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {learningProgress} from './learning-progress.js';
import {dashboardOverview} from './DashboardSummary.js';
import {AcademicWeekNavigation} from './AcademicWeekNavigation.js';
import {CourseClassroom} from './CourseClassroom.js';
import {createMaterialClient} from './materials.js';
import {createWeeksClient,type CourseCalendar} from './weeks.js';
import {createActivityClient} from './activities.js';
function assert(value:unknown):asserts value{if(!value)throw Error('Shared course acceptance failed');}
function rejects(run:()=>unknown){try{run();return false;}catch{return true;}}
const dates=['2026-03-16','2026-05-25','2026-08-10','2026-10-19'];
const calendar:CourseCalendar={course_id:'1',period_id:'1',current:{id:'1',period_id:'1',source:'Stored dates',recorded_at:'2026-01-01',blocks:dates.map((date,index)=>({kind:'teaching',start_on:date,end_on:date,weeks:[{number:index+1,start_on:date,end_on:date,id:String(index+1).repeat(32)}]}))},retained:[]};
export const sharedCourseCases:readonly (readonly [string,()=>void])[]=[
 ['shared classroom renders different subjects and assignments with one template',()=>{for(const [id,subject,grade,section,teacher] of [['1','Matemática','Primero','A','Luis Alberto Paredes Salazar'],['2','Comunicación','Segundo','D','Rosa Elena Cárdenas Huamán'],['3','Arte y Cultura','Quinto','B','Pedro Miguel Huamán Quispe']]){const html=renderToStaticMarkup(createElement(CourseClassroom,{course:{id:id!,subject:subject!,grade:grade!,section:section!,teacher:teacher!,kind:'area',period:'Año 2026',period_state:'active',state:'active',can_publish:false},materials:createMaterialClient(fetch,()=>''),weeks:createWeeksClient(()=>''),activities:createActivityClient(()=>''),teacherMode:false,onExpired:()=>{},onBack:()=>{}}));assert(html.includes(subject!)&&html.includes(teacher!)&&html.includes('data-course="'+id+'"'));assert(!html.includes('＋ Crear actividad'));}}],
 ['weekly tabs derive four bimesters and week identities from stored calendar',()=>{const html=renderToStaticMarkup(createElement(AcademicWeekNavigation,{calendar,selection:{bucket:'week',revision:'1',week:'4'.repeat(32)},busy:false,onSelect:()=>{}}));assert((html.match(/role="tab"/g)??[]).length===4);assert(html.includes('Bimestre IV')&&html.includes('Semana 4')&&html.includes('2026-10-19'));assert(!html.includes('<select'));}],
 ['progress distinguishes own feedback from teacher review aggregates',()=>{assert(learningProgress({state:'graded',late:false,grade:'AD',feedback:'Comentario propio',delivered:1,graded:1}).grade==='AD');assert(learningProgress({state:'review',late:true,grade:null,feedback:null,delivered:3,graded:2}).graded===2);}],
 ['progress rejects contradictory grades, counts and student authority injection',()=>{const row={state:'pending',late:false,grade:null,feedback:null,delivered:0,graded:0};assert(rejects(()=>learningProgress({...row,delivered:1})));assert(rejects(()=>learningProgress({...row,grade:'AD'})));assert(rejects(()=>learningProgress({...row,student_id:'5'})));assert(rejects(()=>learningProgress({...row,graded:1})));}],
 ['role overview accepts real zero states but rejects fabricated counters and fields',()=>{const row={courses:0,classrooms:0,students:0,activities:0,deliveries:0,graded:0,pending:0,unread:0};assert(dashboardOverview(row).pending===0);assert(rejects(()=>dashboardOverview({...row,courses:-1})));assert(rejects(()=>dashboardOverview({...row,actor_id:'1'})));}],
];
