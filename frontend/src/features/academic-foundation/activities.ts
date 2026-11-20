import { exact,text,decimalId,date,historicalSubmission } from './contracts.js';
import { AcademicApiError } from './api.js';
import {courseClassrooms,type CourseClassroomSelection} from './course-classrooms.js';
import {materialLimit,videoMimes} from './materials.js';
export type EducationCourse={id:string;label:string;can_publish:boolean};
export type ActivityAttachment={id:string;activity_id:string;filename:string;mime:string;bytes:number;created_at:string};
export type Activity={id:string;assignment_id:string;title:string;instructions:string;due_on:string|null;state:'open'|'closed';can_close:boolean;can_submit:boolean;attachments?:ActivityAttachment[]};
export type DeliveryVersion={id:string;answer:string;filename:string|null;bytes:number|null;recorded_at:string};
export type Assessment={id:string;version_id:string;grade:'AD'|'A'|'B'|'C';feedback:string;recorded_at:string};
export type Delivery={id:string;student_name:string;accepted_at:string;version:DeliveryVersion;assessment:Assessment|null;can_assess:boolean;is_locked?:boolean;unmapped_bimester?:boolean};
const allowedAttachmentMimes=['application/pdf','application/msword','application/vnd.ms-powerpoint','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png',...videoMimes];
export function activityAttachment(value:unknown):ActivityAttachment{
  const r=exact(value,['id','activity_id','filename','mime','bytes','created_at']);
  const filename=text(r.filename);if(/[\x00-\x1f\x7f\\/]/.test(filename))throw new Error('Invalid attachment filename');
  const mime=text(r.mime);if(!allowedAttachmentMimes.includes(mime))throw new Error('Invalid attachment type');
  if(typeof r.bytes!=='number'||!Number.isSafeInteger(r.bytes)||r.bytes<1||r.bytes>materialLimit)throw new Error('Invalid attachment size');
  return {id:decimalId(r.id),activity_id:decimalId(r.activity_id),filename,mime,bytes:r.bytes,created_at:text(r.created_at)};
}
export function assessment(value:unknown):Assessment{const r=exact(value,['id','version_id','grade','feedback','recorded_at']);if(!['AD','A','B','C'].includes(String(r.grade))||typeof r.grade!=='string'||typeof r.feedback!=='string'||!r.feedback.trim()||Array.from(r.feedback).length>5000)throw new Error('Invalid assessment');return {id:decimalId(r.id),version_id:decimalId(r.version_id),grade:r.grade as Assessment['grade'],feedback:r.feedback,recorded_at:text(r.recorded_at)};}
const boolean=(value:unknown)=>{if(typeof value!=='boolean')throw new Error('Invalid education flag');return value;};
export function educationCourse(value:unknown):EducationCourse{const r=exact(value,['id','label','can_publish']);return {id:decimalId(r.id),label:text(r.label),can_publish:boolean(r.can_publish)};}
export function activity(value:unknown):Activity{const r=exact(value,['id','assignment_id','title','instructions','due_on','state','can_close','can_submit'],['attachments']);if(r.state!=='open'&&r.state!=='closed')throw new Error('Invalid activity');const base:Activity={id:decimalId(r.id),assignment_id:decimalId(r.assignment_id),title:text(r.title),instructions:text(r.instructions),due_on:r.due_on===null?null:date(r.due_on),state:r.state,can_close:boolean(r.can_close),can_submit:boolean(r.can_submit)};if(r.attachments!==undefined){if(!Array.isArray(r.attachments)||r.attachments.length>10)throw new Error('Invalid attachments');base.attachments=r.attachments.map(activityAttachment);}return base;}
export function deliveryVersion(value:unknown):DeliveryVersion{const r=exact(value,['id','answer','filename','bytes','recorded_at']);if(typeof r.answer!=='string'||(r.bytes!==null&&(!Number.isSafeInteger(r.bytes)||(r.bytes as number)<1||(r.bytes as number)>10485760))||(r.filename===null)!==(r.bytes===null))throw new Error('Invalid version');return {id:decimalId(r.id),answer:r.answer,filename:r.filename===null?null:text(r.filename),bytes:r.bytes as number|null,recorded_at:text(r.recorded_at)};}
export function delivery(value:unknown):Delivery{const r=exact(value,['id','student_name','accepted_at','version','assessment','can_assess'],['is_locked','unmapped_bimester']);const base={id:decimalId(r.id),student_name:text(r.student_name),accepted_at:text(r.accepted_at),version:deliveryVersion(r.version),assessment:r.assessment===null?null:assessment(r.assessment),can_assess:boolean(r.can_assess)};if(r.is_locked!==undefined)(base as Delivery).is_locked=boolean(r.is_locked);if(r.unmapped_bimester!==undefined)(base as Delivery).unmapped_bimester=boolean(r.unmapped_bimester);return base;}
function page<T>(wire:unknown,decode:(value:unknown)=>T){const e=exact(wire,['data']),r=exact(e.data,['items','next_after']);if(!Array.isArray(r.items)||r.items.length>50)throw new Error('Invalid education page');return {items:r.items.map(decode),next_after:r.next_after===null?null:decimalId(r.next_after)};}
export function createActivityClient(csrf:()=>string,transport:typeof fetch=fetch){
 let unknown=false,reviewed=false,revision=0,pending='',writing=false;
 const uncertain=()=>{unknown=true;reviewed=false;};
 function target(path:string){const base=path.split('?')[0]!;if(pending.endsWith('/close'))return base===pending.slice(0,-6);if(pending.endsWith('/assessments'))return base===pending||/^\/education\/activities\/[0-9]+\/deliveries$/.test(base);return base===pending;}
 async function read<T>(path:string,decode:(wire:unknown)=>T){const candidate=unknown&&target(path)?revision:null;if(candidate!==null)reviewed=false;const result=decode(await request(path));if(candidate!==null&&candidate===revision&&unknown){const match=pending.match(/^\/education\/deliveries\/([0-9]+)\/assessments$/);reviewed=!match||path.split('?')[0]===pending||((result as {items?:{id:string}[]}).items??[]).some(r=>r.id===match[1]);}return result;}
 async function request(path:string,input?:Record<string,unknown>|FormData){const unsafe=input!==undefined;if(unsafe&&unknown)throw new AcademicApiError('outcome_unknown',null,null,true);if(unsafe&&!csrf())throw new AcademicApiError('csrf_missing',419);if(unsafe){pending=path;revision++;reviewed=false;}let response:Response;
  try{response=await transport(path,{method:unsafe?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json',...(unsafe?{'X-CSRF-TOKEN':csrf(),...(input instanceof FormData?{}:{'Content-Type':'application/json'})}:{})},...(unsafe?{body:input instanceof FormData?input:JSON.stringify(input)}:{})});}catch{if(unsafe)uncertain();throw new AcademicApiError('transport_unavailable',null,null,unsafe);}
  let wire:unknown;try{wire=await response.json();}catch{if(unsafe)uncertain();throw new AcademicApiError('invalid_response',response.status,null,unsafe);}
  if(!response.ok){const r=wire as {error?:string};if(unsafe&&response.status>=500)uncertain();throw new AcademicApiError(r.error??'invalid_response',response.status,null,unsafe&&response.status>=500);}return wire;
 }
 async function mutate<T>(path:string,input:Record<string,unknown>|FormData,decode:(wire:unknown)=>T){if(writing)throw new AcademicApiError('operation_pending',409);writing=true;try{const wire=await request(path,input);try{return decode(wire);}catch{uncertain();throw new AcademicApiError('invalid_response',200,null,true);}}finally{writing=false;}}
 async function write(path:string,input:Record<string,unknown>|FormData,version=false){return mutate(path,input,wire=>{const e=exact(wire,['data']),r=exact(e.data,version?['id','version_id']:['id']);return {id:decimalId(r.id),...(version?{version_id:decimalId(r.version_id)}:{})};});}
 async function assess(id:string,version:string,prior:string|null,grade:string,feedback:string){return mutate('/education/deliveries/'+decimalId(id)+'/assessments',{grade,feedback,expected_version_id:decimalId(version),expected_assessment_id:prior===null?null:decimalId(prior)},wire=>{const e=exact(wire,['data']),r=exact(e.data,['id','assessment_id']);return {id:decimalId(r.id),assessment_id:decimalId(r.assessment_id)};});}
 const suffix=(after:string|null)=>after?'?after='+decimalId(after):'';
 async function classrooms(){return courseClassrooms(exact(await request('/education/classrooms'),['data']).data);}
 async function pendingStudents(id:string,after:string|null=null){return page(await request('/education/activities/'+decimalId(id)+'/pending-students'+suffix(after)),value=>{const r=exact(value,['id','student_name']);return {id:decimalId(r.id),student_name:text(r.student_name)};});}
 async function scopedCourses(after:string|null=null,scope?:CourseClassroomSelection){const q=new URLSearchParams();if(after)q.set('after',decimalId(after));if(scope){q.set('grade_id',decimalId(scope.gradeId));q.set('section_id',decimalId(scope.sectionId));}return page(await request('/education/courses'+(q.size?'?'+q.toString():'')),educationCourse);}
 async function detail(id:string){return read('/education/activities/'+decimalId(id),wire=>{const result=activity(exact(wire,['data']).data);if(result.id!==id)throw new AcademicApiError('invalid_response',200);return result;});}
 async function history(id:string){const e=exact(await request('/academic/submissions/'+decimalId(id)),['data']);try{const result=historicalSubmission(e.data);if(result.submission.id!==id)throw new Error();return result;}catch{throw new AcademicApiError('invalid_response',200);}}
 async function uploadAttachment(activityId:string,file:File,onProgress?:(percent:number)=>void):Promise<ActivityAttachment>{
  const id=decimalId(activityId);
  const token=csrf();if(!token)throw new AcademicApiError('csrf_missing',419);
  const form=new FormData();form.set('file',file);
  const url='/education/activities/'+id+'/attachments';
  if(transport===fetch&&typeof XMLHttpRequest!=='undefined'&&onProgress){
   return await new Promise<ActivityAttachment>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('POST',url,true);xhr.withCredentials=true;
    xhr.setRequestHeader('Accept','application/json');xhr.setRequestHeader('X-CSRF-TOKEN',token);
    xhr.upload.onprogress=event=>{if(event.lengthComputable&&event.total>0)onProgress(Math.min(99,Math.round((event.loaded/event.total)*100)));};
    xhr.onerror=()=>reject(new AcademicApiError('transport_unavailable',null,null,true));
    xhr.onabort=()=>reject(new AcademicApiError('transport_unavailable',null,null,true));
    xhr.onload=()=>{
     let wire:unknown;try{wire=JSON.parse(xhr.responseText);}catch{reject(new AcademicApiError('invalid_response',xhr.status,null,true));return;}
     if(xhr.status<200||xhr.status>=300){const r=wire as {error?:string};reject(new AcademicApiError(r.error??'invalid_response',xhr.status,null,xhr.status>=500));return;}
     try{onProgress(100);resolve(activityAttachment(exact(wire,['data']).data));}catch{reject(new AcademicApiError('invalid_response',xhr.status,null,true));}
    };
    xhr.send(form);
   });
  }
  const wire=await request(url,form);
  onProgress?.(100);
  try{return activityAttachment(exact(wire,['data']).data);}catch{throw new AcademicApiError('invalid_response',200,null,true);}
 }
 async function attachments(activityId:string):Promise<ActivityAttachment[]>{
  const wire=await request('/education/activities/'+decimalId(activityId)+'/attachments');
  const data=exact(exact(wire,['data']).data,['items']);
  if(!Array.isArray(data.items)||data.items.length>10)throw new AcademicApiError('invalid_response',200);
  return data.items.map(activityAttachment);
 }
 return {classrooms,pendingStudents,history,detail,assess,attachments,uploadAttachment,assessments:async(id:string,after:string|null=null)=>read('/education/deliveries/'+decimalId(id)+'/assessments'+suffix(after),wire=>page(wire,assessment)),courses:scopedCourses,activities:async(id:string,after:string|null=null)=>read('/education/courses/'+decimalId(id)+'/activities'+suffix(after),wire=>page(wire,activity)),deliveries:async(id:string,after:string|null=null)=>read('/education/activities/'+decimalId(id)+'/deliveries'+suffix(after),wire=>page(wire,delivery)),versions:async(id:string,after:string|null=null)=>page(await request('/education/deliveries/'+decimalId(id)+'/versions'+suffix(after)),deliveryVersion),publish:(id:string,title:string,instructions:string,due_on:string|null)=>write('/education/courses/'+decimalId(id)+'/activities',{title,instructions,due_on}),close:(id:string)=>write('/education/activities/'+decimalId(id)+'/close',{}),submit:(id:string,data:FormData)=>write('/education/activities/'+decimalId(id)+'/deliveries',data,true),isUncertain:()=>unknown,canReview:()=>unknown&&reviewed,review:()=>{if(unknown&&!reviewed)throw new AcademicApiError('consultation_required',null);unknown=false;reviewed=false;pending='';}};
}
export type ActivityClient=ReturnType<typeof createActivityClient>;
export function evidenceUrl(id:string,disposition:'attachment'|'inline'='attachment'){return '/education/versions/'+decimalId(id)+'/file'+(disposition==='inline'?'?disposition=inline':'');}
export function activityAttachmentUrl(id:string,disposition:'attachment'|'inline'='attachment'){if(!['inline','attachment'].includes(disposition))throw new Error('Invalid disposition');return '/education/activity-attachments/'+decimalId(id)+'/file?disposition='+disposition;}
