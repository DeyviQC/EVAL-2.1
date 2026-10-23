import type {AcademicClient} from './api.js';
import {assignmentPage} from './assignments.js';
import {catalogPage,periodPage} from './directory.js';
import {decimalId} from './contracts.js';

export type SupervisionScope={period:string;grade:string;section:string};
export const emptySupervisionScope=():SupervisionScope=>({period:'',grade:'',section:''});

/** All metadata pages are needed; an incomplete first page must not hide classrooms. */
async function collect<T extends {id:string}>(read:(after:string|null)=>Promise<{items:T[];next_after:string|null}>){
 const items:T[]=[];let after:string|null=null;
 do{
  const page=await read(after);
  for(const item of page.items){if(items.length&&BigInt(item.id)<=BigInt(items[items.length-1]!.id))throw Error('Unordered directory');items.push(item);}
  if(page.next_after!==null&&(page.items.length===0||page.next_after!==page.items[page.items.length-1]!.id||after!==null&&BigInt(page.next_after)<=BigInt(after)))throw Error('Invalid directory cursor');
  after=page.next_after;
 }while(after!==null);
 return items;
}
export async function supervisionOptions(client:AcademicClient){
 const [periods,grades,sections]=await Promise.all([
  collect(after=>client.directory('periods',periodPage,after)),
  collect(after=>client.directory('catalog/grade',catalogPage('grade'),after)),
  collect(after=>client.directory('catalog/section',catalogPage('section'),after)),
 ]);
 return {periods,grades,sections};
}
export async function supervisionCourses(client:AcademicClient,scope:SupervisionScope,after:string|null=null){
 const academic_period_id=decimalId(scope.period),grade_id=decimalId(scope.grade),section_id=decimalId(scope.section);
 const page=await client.assignmentDirectory('assignments',assignmentPage,after,{academic_period_id,grade_id,section_id});
 if(page.items.some(row=>row.academic_period_id!==academic_period_id||row.grade_id!==grade_id||row.section_id!==section_id))throw Error('Wrong supervision classroom');
 return page;
}
