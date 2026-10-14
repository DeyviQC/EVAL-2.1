import {decimalId,exact,text} from './contracts.js';
export type CourseClassroom={grade_id:string;grade:string;section_id:string;section:string};
export type CourseClassroomSelection={gradeId:string;sectionId:string};
export const emptyClassroom=():CourseClassroomSelection=>({gradeId:'',sectionId:''});
export function courseClassrooms(value:unknown):CourseClassroom[]{
 const data=exact(value,['items']);if(!Array.isArray(data.items))throw Error('Invalid course classrooms');
 const sections=new Set<string>();return data.items.map(value=>{const row=exact(value,['grade_id','grade','section_id','section']);const result={grade_id:decimalId(row.grade_id),grade:text(row.grade),section_id:decimalId(row.section_id),section:text(row.section)};if(sections.has(result.section_id))throw Error('Duplicate course classroom');sections.add(result.section_id);return result;});
}
export function selectedClassroom(rows:CourseClassroom[],selection:CourseClassroomSelection){return rows.find(row=>row.grade_id===selection.gradeId&&row.section_id===selection.sectionId);}
