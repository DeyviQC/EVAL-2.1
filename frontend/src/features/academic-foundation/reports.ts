import { exact,text,decimalId } from './contracts.js';
import { AcademicApiError } from './api.js';
export type ReportCounts={received:number;pending:number;graded:number};
export type ReportStudent=ReportCounts&{id:string;name:string;historical:boolean};
export type ClassroomReport={scope:{period_id:string;period_name:string;period_state:'planned'|'active'|'closed';grade_id:string;grade_name:string;section_id:string;section_name:string};totals:ReportCounts&{AD:number;A:number;B:number;C:number};items:ReportStudent[];next_after:string|null};
function count(value:unknown):number{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new Error('Invalid report count');return value;}
function counts(row:Record<string,unknown>):ReportCounts{const r={received:count(row.received),pending:count(row.pending),graded:count(row.graded)};if(r.pending+r.graded!==r.received)throw new Error('Inconsistent report counts');return r;}
export function classroomReport(wire:unknown):ClassroomReport{
 const e=exact(wire,['data']),r=exact(e.data,['scope','totals','items','next_after']),s=exact(r.scope,['period_id','period_name','period_state','grade_id','grade_name','section_id','section_name']),t=exact(r.totals,['received','pending','graded','AD','A','B','C']);
 if(!['planned','active','closed'].includes(String(s.period_state))||!Array.isArray(r.items)||r.items.length>50)throw new Error('Invalid report');
 const totals={...counts(t),AD:count(t.AD),A:count(t.A),B:count(t.B),C:count(t.C)};if(totals.AD+totals.A+totals.B+totals.C!==totals.graded)throw new Error('Invalid grade distribution');
 let previous=0n;const items=r.items.map(value=>{const row=exact(value,['id','name','historical','received','pending','graded']),id=decimalId(row.id);if(BigInt(id)<=previous||typeof row.historical!=='boolean')throw new Error('Invalid report student');previous=BigInt(id);const c=counts(row);if(c.received>totals.received||c.graded>totals.graded||c.pending>totals.pending)throw new Error('Invalid row totals');return {id,name:text(row.name),historical:row.historical,...c};});
 for(const key of ['received','pending','graded'] as const)if(items.reduce((sum,row)=>sum+row[key],0)>totals[key])throw new Error('Invalid page totals');
 const next_after=r.next_after===null?null:decimalId(r.next_after);if(next_after!==null&&(items.length!==50||items.at(-1)?.id!==next_after))throw new Error('Invalid report cursor');
 return {scope:{period_id:decimalId(s.period_id),period_name:text(s.period_name),period_state:s.period_state as ClassroomReport['scope']['period_state'],grade_id:decimalId(s.grade_id),grade_name:text(s.grade_name),section_id:decimalId(s.section_id),section_name:text(s.section_name)},totals,items,next_after};
}
export function createReportClient(transport:typeof fetch=fetch){
 async function request(path:string,period:string,grade:string,section:string,after:string|null){let response:Response;try{response=await transport(path,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});}catch{throw new AcademicApiError('transport_unavailable',null);}
  let wire:unknown;try{wire=await response.json();}catch{throw new AcademicApiError('invalid_response',response.status);}if(!response.ok){const category=typeof (wire as {error?:unknown})?.error==='string'?(wire as {error:string}).error:'invalid_response';throw new AcademicApiError(category,response.status);}
  try{const report=classroomReport(wire);if(report.scope.period_id!==period||report.scope.grade_id!==grade||report.scope.section_id!==section||after!==null&&report.items.some(row=>BigInt(row.id)<=BigInt(after)))throw new Error();return report;}catch{throw new AcademicApiError('invalid_response',response.status);}
 }
 return {classroom:(period:string,grade:string,section:string,after:string|null=null)=>{period=decimalId(period);grade=decimalId(grade);section=decimalId(section);after=after===null?null:decimalId(after);return request('/reports/classroom?'+new URLSearchParams({period_id:period,grade_id:grade,section_id:section,...after?{after}:{}}),period,grade,section,after);}};
}
export type ReportClient=ReturnType<typeof createReportClient>;

export function exportClassroomCsv(report: ClassroomReport, exportedBy: string = 'Dirección / Subdirección'): string {
 const sanitize = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
 const lines: string[] = [];
 lines.push(`\uFEFF${sanitize('I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO')}`);
 lines.push(sanitize('SISTEMA EVAL v2.1 - CONSOLIDADO INSTITUCIONAL DE AULA'));
 lines.push(`${sanitize('Período:')},${sanitize(report.scope.period_name)}`);
 lines.push(`${sanitize('Grado y Sección:')},${sanitize(`${report.scope.grade_name} ${report.scope.section_name}`)}`);
 lines.push(`${sanitize('Estado del Período:')},${sanitize(report.scope.period_state === 'closed' ? 'Cerrado (Histórico)' : report.scope.period_state === 'planned' ? 'Planificado' : 'Activo')}`);
 lines.push(`${sanitize('Emitido por:')},${sanitize(exportedBy)}`);
 lines.push('');
 lines.push(sanitize('RESUMEN DE ENTREGAS Y CALIFICACIONES'));
 lines.push(`${sanitize('Total Entregas Recibidas')},${sanitize(report.totals.received)}`);
 lines.push(`${sanitize('Total Calificadas')},${sanitize(report.totals.graded)}`);
 lines.push(`${sanitize('Total Pendientes de Calificar')},${sanitize(report.totals.pending)}`);
 lines.push(`${sanitize('Calificación AD (Logro Destacado)')},${sanitize(report.totals.AD)}`);
 lines.push(`${sanitize('Calificación A (Logro Esperado)')},${sanitize(report.totals.A)}`);
 lines.push(`${sanitize('Calificación B (En Proceso)')},${sanitize(report.totals.B)}`);
 lines.push(`${sanitize('Calificación C (En Inicio)')},${sanitize(report.totals.C)}`);
 lines.push('');
 lines.push(`${sanitize('N°')},${sanitize('ID Estudiante')},${sanitize('Apellidos y Nombres')},${sanitize('Condición')},${sanitize('Entregas Recibidas')},${sanitize('Calificadas')},${sanitize('Pendientes')}`);

 report.items.forEach((item, index) => {
  lines.push([
   sanitize(index + 1),
   sanitize(item.id),
   sanitize(item.name),
   sanitize(item.historical ? 'Histórico' : 'Activo'),
   sanitize(item.received),
   sanitize(item.graded),
   sanitize(item.pending),
  ].join(','));
 });

 return lines.join('\r\n');
}

export function downloadClassroomCsv(report: ClassroomReport, exportedBy: string = 'Dirección / Subdirección'): void {
 if (typeof document === 'undefined' || typeof window === 'undefined') return;
 const csvContent = exportClassroomCsv(report, exportedBy);
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement('a');
 const cleanGrade = report.scope.grade_name.replace(/[^A-Za-z0-9]/g, '');
 const cleanSection = report.scope.section_name.replace(/[^A-Za-z0-9]/g, '');
 const filename = `eval-consolidado-${cleanGrade}-${cleanSection}-${report.scope.period_name}.csv`;
 anchor.href = url;
 anchor.download = filename;
 document.body.appendChild(anchor);
 anchor.click();
 document.body.removeChild(anchor);
 URL.revokeObjectURL(url);
}

