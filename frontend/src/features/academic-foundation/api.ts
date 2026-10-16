import { exact, text, decimalId, date, identityResult, period, enrollment, assignment, activityReference, historicalSubmission, confirmedTransition, relationshipInput, type EnrollmentInput, type AssignmentInput } from './contracts.js';
import { filterQuery, type DirectoryFilters } from './directory-filters.js';
import { bimestersResponse } from './reports.js';
export class AcademicApiError extends Error {
  readonly automaticRetry=false;
  constructor(readonly category:string,readonly status:number|null,readonly correlationId:string|null=null,readonly outcomeUnknown=false) { super(category); }
}
/** Same-origin local session transport. No role/actor, caching, optimistic mutation or automatic replay. */
export function createAcademicClient(transport:typeof fetch,csrf:()=>string) {
  async function request<T>(path:string,decode:(value:unknown)=>T,body?:unknown,method?:'PATCH'):Promise<T> {
    const unsafe=body!==undefined; const headers:Record<string,string>={Accept:'application/json'};
    if(unsafe) { headers['Content-Type']='application/json'; headers['X-CSRF-TOKEN']=text(csrf()); }
    let response:Response;
    try { response=await transport('/academic/'+path,{method:method??(unsafe?'POST':'GET'),credentials:'same-origin',cache:'no-store',redirect:'error',headers,...(unsafe?{body:JSON.stringify(body)}:{})}); }
    catch { throw new AcademicApiError('transport_unavailable',null,null,unsafe); }
    let wire:unknown;
    try { wire=await response.json(); } catch { throw new AcademicApiError('invalid_response',response.status,null,unsafe); }
    if(!response.ok) {
      try {
        const failure=exact(wire,['error'],response.status===503?['correlation_id','automatic_retry']:[]);
        const category=text(failure.error); if(!/^[a-z_]+$/.test(category)) throw new Error();
        const correlation=failure.correlation_id===null||failure.correlation_id===undefined?null:text(failure.correlation_id);
        if(response.status===503&&failure.automatic_retry!==false) throw new Error();
        if(correlation!==null&&!/^[a-zA-Z0-9_-]{1,128}$/.test(correlation)) throw new Error();
        throw new AcademicApiError(category,response.status,correlation,['commit_outcome_unknown','rollback_outcome_unknown'].includes(category));
      } catch(error) { if(error instanceof AcademicApiError) throw error; throw new AcademicApiError('invalid_response',response.status,null,unsafe); }
    }
    try { return decode(exact(wire,['data']).data); } catch { throw new AcademicApiError('invalid_response',response.status,null,unsafe); }
  }
  const locator=decimalId;
  return {
    history:<T>(kind:'enrollments'|'assignments',decode:(value:unknown)=>T,after:string|null=null)=>{if(!['enrollments','assignments'].includes(kind))throw new Error('Invalid history');return request('history?kind='+kind+(after?'&after='+locator(after):''),decode);},
    auditLedger:<T>(decode:(value:unknown)=>T,after:string|null=null,entityType?:string,search?:string)=>{
      const params=new URLSearchParams();
      if(after)params.set('after',locator(after));
      if(entityType)params.set('entity_type',text(entityType));
      if(search&&text(search).trim())params.set('search',text(search).trim());
      return request('audit-ledger'+(params.size?'?'+params.toString():''),decode);
    },
    bimesters:(periodId:string)=>request('bimesters?period_id='+locator(periodId),bimestersResponse),
    closeBimester:(periodId:string,bimesterNumber:number)=>request('bimesters/close',identityResult,{period_id:locator(periodId),bimester_number:bimesterNumber}),
    reopenBimester:(periodId:string,bimesterNumber:number,justification:string)=>request('bimesters/reopen',identityResult,{period_id:locator(periodId),bimester_number:bimesterNumber,justification:text(justification)}),
    assignmentDirectory:<T>(kind:'assignments'|'teachers'|'periods'|'entries'|'grades'|'sections',decode:(value:unknown)=>T,after:string|null=null,filters:DirectoryFilters={})=>{
      if(!['assignments','teachers','periods','entries','grades','sections'].includes(kind))throw new Error('Invalid assignment directory');
      const query=filterQuery(filters,true);
      return request('assignment-workspace?kind='+kind+(after?'&after='+locator(after):'')+(query?'&'+query:''),decode);
    },
    replaceTeacher:(id:string,teacherId:string)=>request('assignments/'+locator(id)+'/replace',confirmedTransition,{teacher_id:locator(teacherId)}),
    enrollmentDirectory:<T>(kind:'enrollments'|'enrollment-students',decode:(value:unknown)=>T,after:string|null=null,filters:DirectoryFilters={})=>{if(!['enrollments','enrollment-students'].includes(kind))throw new Error('Invalid directory');const query=[after?'after='+locator(after):'',filterQuery(filters)].filter(Boolean).join('&');return request(kind+(query?'?'+query:''),decode);},
    courseClassrooms:<T>(decode:(value:unknown)=>T)=>request('my-course-classrooms',decode),
    myCourses:<T>(decode:(value:unknown)=>T,after:string|null=null,scope:{grade_id?:string;section_id?:string}={})=>{const row=exact(scope,[],['grade_id','section_id']);const params=new URLSearchParams();if(after)params.set('after',locator(after));for(const key of ['grade_id','section_id'])if(row[key]!==undefined)params.set(key,locator(row[key]));return request('my-courses'+(params.size?'?'+params.toString():''),decode);},
    course:<T>(id:string,decode:(value:unknown)=>T)=>request('my-courses/'+locator(id),decode),
    directory:<T>(path:'periods'|'catalog/entry'|'catalog/grade'|'catalog/section',decode:(value:unknown)=>T,after:string|null=null)=>request(path+(after===null?'':'?after='+locator(after)),decode),
    createPeriod:(input:{name:string;start_on:string;end_on:string})=>{const row=exact(input,['name','start_on','end_on']);return request('periods',identityResult,{name:text(row.name),start_on:date(row.start_on),end_on:date(row.end_on)});},
    transitionPeriod:(id:string,action:'activate'|'close')=>{if(!['activate','close'].includes(action))throw new Error('Invalid action');return request('periods/'+locator(id)+'/'+action,identityResult,{});},
    createCatalog:(kind:'entry'|'grade'|'section',input:Record<string,unknown>)=>{
      if(!['entry','grade','section'].includes(kind))throw new Error('Invalid kind');
      const row=exact(input,['name',...(kind==='entry'?['kind']:kind==='section'?['grade_id']:[])],['is_active']);
      text(row.name);if(kind==='entry'&&!['subject','area'].includes(row.kind as string))throw new Error('Invalid kind');
      if(kind==='section')locator(row.grade_id);if(row.is_active!==undefined&&typeof row.is_active!=='boolean')throw new Error('Invalid active flag');
      return request('catalog/'+kind,identityResult,row);
    },
    updateCatalog:(kind:'entry'|'grade'|'section',id:string,input:{name?:string;is_active?:boolean})=>{
      if(!['entry','grade','section'].includes(kind))throw new Error('Invalid kind');const row=exact(input,[],['name','is_active']);
      if(!Object.keys(row).length)throw new Error('Empty update');if(row.name!==undefined)text(row.name);
      if(row.is_active!==undefined&&typeof row.is_active!=='boolean')throw new Error('Invalid active flag');return request('catalog/'+kind+'/'+locator(id),identityResult,row,'PATCH');
    },
    period:(id:string)=>request('periods/'+locator(id),period),
    enrollment:(id:string)=>request('enrollments/'+locator(id),enrollment),
    assignment:(id:string)=>request('assignments/'+locator(id),assignment),
    activity:(id:string)=>request('activities/'+locator(id),activityReference),
    submissionHistory:(id:string)=>request('submissions/'+locator(id),historicalSubmission),
    createEnrollment:(input:EnrollmentInput)=>request('enrollments',identityResult,relationshipInput(input,'enrollment')),
    planAssignment:(input:AssignmentInput)=>request('assignments',identityResult,relationshipInput(input,'assignment')),
    transfer:(id:string,destination:{grade_id:string;section_id:string})=>{
      const row=exact(destination,['grade_id','section_id']);
      return request('enrollments/'+locator(id)+'/transfer',confirmedTransition,{grade_id:locator(row.grade_id),section_id:locator(row.section_id)});
    },
    activateAssignment:(id:string)=>request('assignments/'+locator(id)+'/activate',identityResult,{}),
    closeEnrollment:(id:string,effectiveUntil:string)=>request('enrollments/'+locator(id)+'/close',identityResult,{effective_until:date(effectiveUntil)}),
    closeAssignment:(id:string,effectiveUntil:string)=>request('assignments/'+locator(id)+'/close',identityResult,{effective_until:date(effectiveUntil)}),
    /** Reserved U9 endpoint: does not currently persist a submission; propagate denial/unavailability. */
    submissionAdmission:(input:{activity_id:string})=>{ const row=exact(input,['activity_id']); return request('submissions',identityResult,{activity_id:locator(row.activity_id)}); }
  };
}
export type AcademicClient = ReturnType<typeof createAcademicClient>;
