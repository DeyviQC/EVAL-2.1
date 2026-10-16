import { exact,text,decimalId } from './contracts.js';
import { AcademicApiError } from './api.js';
export type ReportCounts={received:number;pending:number;graded:number};
export type ReportStudent=ReportCounts&{id:string;name:string;historical:boolean};
export type BimesterState={
  bimester_number: number;
  state: 'open' | 'locked';
  closed_by: string | null;
  closed_by_name: string | null;
  closed_at: string | null;
  reopened_by: string | null;
  reopened_by_name: string | null;
  reopened_at: string | null;
  justification: string | null;
};
export type BimestersResponse={
  period_id: string;
  period_state: string;
  bimesters: BimesterState[];
};
export function bimesterState(value: unknown): BimesterState {
  const row = exact(value, [
    'bimester_number', 'state', 'closed_by', 'closed_by_name',
    'closed_at', 'reopened_by', 'reopened_by_name', 'reopened_at', 'justification'
  ]);
  const num = Number(row.bimester_number);
  if (!Number.isInteger(num) || num < 1 || num > 4) throw new Error('Invalid bimester number');
  const state = String(row.state);
  if (!['open', 'locked'].includes(state)) throw new Error('Invalid bimester state');
  return {
    bimester_number: num,
    state: state as 'open' | 'locked',
    closed_by: row.closed_by === null ? null : decimalId(row.closed_by),
    closed_by_name: row.closed_by_name === null ? null : text(row.closed_by_name),
    closed_at: row.closed_at === null ? null : text(row.closed_at),
    reopened_by: row.reopened_by === null ? null : decimalId(row.reopened_by),
    reopened_by_name: row.reopened_by_name === null ? null : text(row.reopened_by_name),
    reopened_at: row.reopened_at === null ? null : text(row.reopened_at),
    justification: row.justification === null ? null : text(row.justification),
  };
}
export function bimestersResponse(value: unknown): BimestersResponse {
  const row = exact(value, ['period_id', 'period_state', 'bimesters']);
  if (!Array.isArray(row.bimesters)) throw new Error('Invalid bimesters list');
  return {
    period_id: decimalId(row.period_id),
    period_state: text(row.period_state),
    bimesters: row.bimesters.map(bimesterState),
  };
}
export type ClassroomReport={scope:{period_id:string;period_name:string;period_state:'planned'|'active'|'closed';grade_id:string;grade_name:string;section_id:string;section_name:string};totals:ReportCounts&{AD:number;A:number;B:number;C:number};items:ReportStudent[];next_after:string|null;bimesters?:BimesterState[]};
function count(value:unknown):number{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new Error('Invalid report count');return value;}
function counts(row:Record<string,unknown>):ReportCounts{const r={received:count(row.received),pending:count(row.pending),graded:count(row.graded)};if(r.pending+r.graded!==r.received)throw new Error('Inconsistent report counts');return r;}
 export function classroomReport(wire:unknown):ClassroomReport{
  const e=exact(wire,['data']),r=exact(e.data,['scope','totals','items','next_after'],['bimesters']),s=exact(r.scope,['period_id','period_name','period_state','grade_id','grade_name','section_id','section_name']),t=exact(r.totals,['received','pending','graded','AD','A','B','C']);
  if(!['planned','active','closed'].includes(String(s.period_state))||!Array.isArray(r.items)||r.items.length>50)throw new Error('Invalid report');
  const totals={...counts(t),AD:count(t.AD),A:count(t.A),B:count(t.B),C:count(t.C)};if(totals.AD+totals.A+totals.B+totals.C!==totals.graded)throw new Error('Invalid grade distribution');
  let previous=0n;const items=r.items.map(value=>{const row=exact(value,['id','name','historical','received','pending','graded']),id=decimalId(row.id);if(BigInt(id)<=previous||typeof row.historical!=='boolean')throw new Error('Invalid report student');previous=BigInt(id);const c=counts(row);if(c.received>totals.received||c.graded>totals.graded||c.pending>totals.pending)throw new Error('Invalid row totals');return {id,name:text(row.name),historical:row.historical,...c};});
  for(const key of ['received','pending','graded'] as const)if(items.reduce((sum,row)=>sum+row[key],0)>totals[key])throw new Error('Invalid page totals');
  const next_after=r.next_after===null?null:decimalId(r.next_after);if(next_after!==null&&(items.length!==50||items.at(-1)?.id!==next_after))throw new Error('Invalid report cursor');
  const bimesters=Array.isArray(r.bimesters)?r.bimesters.map(bimesterState):undefined;
  return {scope:{period_id:decimalId(s.period_id),period_name:text(s.period_name),period_state:s.period_state as ClassroomReport['scope']['period_state'],grade_id:decimalId(s.grade_id),grade_name:text(s.grade_name),section_id:decimalId(s.section_id),section_name:text(s.section_name)},totals,items,next_after,...(bimesters?{bimesters}:{})};
 }
export function officialClassroomReportUrl(period:string,grade:string,section:string):string{
 const p=decimalId(period);const g=decimalId(grade);const s=decimalId(section);
 return '/reports/classroom?'+new URLSearchParams({period_id:p,grade_id:g,section_id:s,format:'official'}).toString();
}
export function createReportClient(transport:typeof fetch=fetch){
 async function request(path:string,period:string,grade:string,section:string,after:string|null){let response:Response;try{response=await transport(path,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});}catch{throw new AcademicApiError('transport_unavailable',null);}
  let wire:unknown;try{wire=await response.json();}catch{throw new AcademicApiError('invalid_response',response.status);}if(!response.ok){const category=typeof (wire as {error?:unknown})?.error==='string'?(wire as {error:string}).error:'invalid_response';throw new AcademicApiError(category,response.status);}
  try{const report=classroomReport(wire);if(report.scope.period_id!==period||report.scope.grade_id!==grade||report.scope.section_id!==section||after!==null&&report.items.some(row=>BigInt(row.id)<=BigInt(after)))throw new Error();return report;}catch{throw new AcademicApiError('invalid_response',response.status);}
 }
 return {
  classroom:(period:string,grade:string,section:string,after:string|null=null)=>{period=decimalId(period);grade=decimalId(grade);section=decimalId(section);after=after===null?null:decimalId(after);return request('/reports/classroom?'+new URLSearchParams({period_id:period,grade_id:grade,section_id:section,...after?{after}:{}}),period,grade,section,after);},
  officialUrl:(period:string,grade:string,section:string)=>officialClassroomReportUrl(period,grade,section)
 };
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

export function exportClassroomSpreadsheet(report: ClassroomReport, exportedBy: string = 'Dirección / Subdirección'): string {
  const esc = (val: string | number) => String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#10244A"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#475569"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="MetaVal">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#334155"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#10244A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
  </Style>
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
  </Style>
  <Style ss:ID="CellBoldCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Consolidado CNEB">
  <Table>
   <Column ss:Width="30"/>
   <Column ss:Width="130"/>
   <Column ss:Width="260"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Row>
    <Cell ss:MergeAcross="6" ss:StyleID="Title"><Data ss:Type="String">I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO</Data></Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="6" ss:StyleID="Subtitle"><Data ss:Type="String">CONSOLIDADO OFICIAL DE EVALUACIONES Y SEGUIMIENTO DE AULA</Data></Cell>
   </Row>
   <Row ss:Index="4">
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Período Lectivo:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${esc(report.scope.period_name)}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Grado y Sección:</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="MetaVal"><Data ss:Type="String">${esc(report.scope.grade_name)} ${esc(report.scope.section_name)}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Emitido por:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${esc(exportedBy)}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Fecha de Emisión:</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="MetaVal"><Data ss:Type="String">${esc(now)}</Data></Cell>
   </Row>
   <Row ss:Index="7">
    <Cell ss:MergeAcross="6" ss:StyleID="MetaLabel"><Data ss:Type="String">RESUMEN DE ENTREGAS Y CALIFICACIONES DEL AULA</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Recibidas</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Calificadas</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Pendientes</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">AD (Destacado)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">A (Esperado)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">B (Proceso)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">C (Inicio)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBoldCenter"><Data ss:Type="Number">${report.totals.received}</Data></Cell>
    <Cell ss:StyleID="CellBoldCenter"><Data ss:Type="Number">${report.totals.graded}</Data></Cell>
    <Cell ss:StyleID="CellBoldCenter"><Data ss:Type="Number">${report.totals.pending}</Data></Cell>
    <Cell ss:StyleID="CellBoldCenter"><Data ss:Type="Number">${report.totals.AD}</Data></Cell>
    <Cell ss:StyleID="CellBoldCenter"><Data ss:Type="Number">${report.totals.A}</Data></Cell>
    <Cell ss:StyleID="CellBoldCenter"><Data ss:Type="Number">${report.totals.B}</Data></Cell>
    <Cell ss:StyleID="CellBoldCenter"><Data ss:Type="Number">${report.totals.C}</Data></Cell>
   </Row>
   <Row ss:Index="11">
    <Cell ss:MergeAcross="6" ss:StyleID="MetaLabel"><Data ss:Type="String">NÓMINA Y CUMPLIMIENTO INDIVIDUAL DE ESTUDIANTES</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">N°</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">ID Estudiante</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Apellidos y Nombres</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Condición</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Entregas</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Calificadas</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Pendientes</Data></Cell>
   </Row>
${report.items.map((item, idx) => `   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${esc(item.id)}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${esc(item.name)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${item.historical ? 'Histórico' : 'Activo'}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${item.received}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${item.graded}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${item.pending}</Data></Cell>
   </Row>`).join('\n')}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function downloadClassroomExcel(report: ClassroomReport, exportedBy: string = 'Dirección / Subdirección'): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const content = exportClassroomSpreadsheet(report, exportedBy);
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const cleanGrade = report.scope.grade_name.replace(/[^A-Za-z0-9]/g, '');
  const cleanSection = report.scope.section_name.replace(/[^A-Za-z0-9]/g, '');
  const filename = `eval-consolidado-${cleanGrade}-${cleanSection}-${report.scope.period_name}.xls`;
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}


