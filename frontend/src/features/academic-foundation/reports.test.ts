import { classroomReport,createReportClient,exportClassroomCsv,exportClassroomSpreadsheet } from './reports.js';
import { AcademicApiError } from './api.js';
const assert=(v:unknown)=>{if(!v)throw new Error('Report assertion failed');};
function rejects(fn:()=>unknown){try{fn();}catch{return;}throw new Error('Expected report rejection');}
const sample={scope:{period_id:'1',period_name:'2026',period_state:'active',grade_id:'2',grade_name:'2.º',section_id:'3',section_name:'B'},totals:{received:3,pending:1,graded:2,AD:1,A:1,B:0,C:0},items:[{id:'9007199254740993',name:'Student',historical:false,received:3,pending:1,graded:2}],next_after:null};
export const reportCases:[string,()=>void|Promise<void>][]=[
 ['classroom report preserves decimal identities and complete totals',()=>{const r=classroomReport({data:sample});assert(r.items[0]?.id==='9007199254740993'&&r.totals.AD===1);}],
 ['report rejects private content, invalid counts and inconsistent totals',()=>{for(const r of [{...sample,answers:[]},{...sample,totals:{...sample.totals,graded:3}},{...sample,totals:{...sample.totals,AD:-1}},{...sample,items:[{...sample.items[0],feedback:'Private'}]},{...sample,items:[{...sample.items[0],id:3}]}])rejects(()=>classroomReport({data:r}));}],
 ['report cursor and student order are bounded and validated',()=>{rejects(()=>classroomReport({data:{...sample,next_after:'7'}}));rejects(()=>classroomReport({data:{...sample,items:Array(51).fill(sample.items[0])}}));rejects(()=>classroomReport({data:{...sample,items:[{...sample.items[0],id:'2'},{...sample.items[0],id:'1'}]}}));}],
 ['report transport is read-only, uncached and scope-bound',async()=>{let calls=0;const client=createReportClient((async(path,options)=>{calls++;assert(path==='/reports/classroom?period_id=1&grade_id=2&section_id=3');assert(options?.method==='GET'&&options.cache==='no-store'&&options.credentials==='same-origin'&&options.body===undefined);return new Response(JSON.stringify({data:sample}));}) as typeof fetch);await client.classroom('1','2','3');assert(calls===1);rejects(()=>client.classroom('1/../../private','2','3'));}],
 ['report access rejection never produces a fabricated zero report',async()=>{const client=createReportClient((async()=>new Response(JSON.stringify({error:'forbidden'}),{status:403})) as typeof fetch);try{await client.classroom('1','2','3');throw new Error('Expected denial');}catch(e){assert(e instanceof AcademicApiError&&e.status===403);}}],
 ['report transport rejects another scope and a repeated cursor page',async()=>{const client=createReportClient((async()=>new Response(JSON.stringify({data:sample}))) as typeof fetch);for(const run of [()=>client.classroom('1','2','4'),()=>client.classroom('1','2','3','9007199254740993')]){try{await run();throw new Error('Expected response rejection');}catch(e){assert(e instanceof AcademicApiError&&e.category==='invalid_response');}}}],
 ['classroom report exports valid institutional CSV with UTF-8 BOM, school header and correct records',()=>{
  const r=classroomReport({data:sample});
  const csv=exportClassroomCsv(r,'Subdirección de Formación General');
  assert(csv.startsWith('\uFEFF"I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO"'));
  assert(csv.includes('"SISTEMA EVAL v2.1 - CONSOLIDADO INSTITUCIONAL DE AULA"'));
  assert(csv.includes('"Período:","2026"'));
  assert(csv.includes('"Grado y Sección:","2.º B"'));
  assert(csv.includes('"Emitido por:","Subdirección de Formación General"'));
  assert(csv.includes('"Total Entregas Recibidas","3"'));
  assert(csv.includes('"Calificación AD (Logro Destacado)","1"'));
  assert(csv.includes('"1","9007199254740993","Student","Activo","3","2","1"'));
 }],
 ['classroom report exports valid SpreadsheetML Excel workbook with styles, headers and student data',()=>{
  const r=classroomReport({data:sample});
  const xml=exportClassroomSpreadsheet(r,'Subdirección de Formación General');
  assert(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert(xml.includes('progid="Excel.Sheet"'));
  assert(xml.includes('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'));
  assert(xml.includes('I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO'));
  assert(xml.includes('CONSOLIDADO OFICIAL DE EVALUACIONES Y SEGUIMIENTO DE AULA'));
  assert(xml.includes('2.º B'));
  assert(xml.includes('Subdirección de Formación General'));
  assert(xml.includes('<Data ss:Type="Number">3</Data>'));
  assert(xml.includes('<Data ss:Type="Number">1</Data>'));
  assert(xml.includes('9007199254740993'));
  assert(xml.includes('Student'));
  assert(xml.includes('</Workbook>'));
 }],
 ['bimestersResponse decodes 4 bimesters with closure states and audit attribution',()=>{
  const raw={
   period_id:'1',
   period_state:'active',
   bimesters:[
    {bimester_number:1,state:'locked',closed_by:'2',closed_by_name:'Subdirectora',closed_at:'2026-05-15 18:00:00',reopened_by:null,reopened_by_name:null,reopened_at:null,justification:null},
    {bimester_number:2,state:'open',closed_by:null,closed_by_name:null,closed_at:null,reopened_by:null,reopened_by_name:null,reopened_at:null,justification:null},
    {bimester_number:3,state:'open',closed_by:null,closed_by_name:null,closed_at:null,reopened_by:null,reopened_by_name:null,reopened_at:null,justification:null},
    {bimester_number:4,state:'open',closed_by:null,closed_by_name:null,closed_at:null,reopened_by:null,reopened_by_name:null,reopened_at:null,justification:null}
   ]
  };
  const decoded=import('./reports.js').then(m=>{
   const res=m.bimestersResponse(raw);
   assert(res.period_id==='1');
   assert(res.bimesters.length===4);
   assert(res.bimesters[0]!.state==='locked');
   assert(res.bimesters[0]!.closed_by_name==='Subdirectora');
   assert(res.bimesters[1]!.state==='open');
  });
 }],
 ['bimesterState rejects invalid bimester number or state',async()=>{
  const {bimesterState}=await import('./reports.js');
  rejects(()=>bimesterState({bimester_number:5,state:'open',closed_by:null,closed_by_name:null,closed_at:null,reopened_by:null,reopened_by_name:null,reopened_at:null,justification:null}));
  rejects(()=>bimesterState({bimester_number:1,state:'invalid',closed_by:null,closed_by_name:null,closed_at:null,reopened_by:null,reopened_by_name:null,reopened_at:null,justification:null}));
 }],
 ['closeBimester and reopenBimester enforce CSRF and payloads',async()=>{
  const {createAcademicClient}=await import('./api.js');
  let calledUrl='';let calledBody='';let hasCsrf=false;
  const client=createAcademicClient((async(url,init)=>{
   calledUrl=String(url);calledBody=String(init?.body);hasCsrf=Boolean(init?.headers && (init.headers as Record<string,string>)['X-CSRF-TOKEN']);
   return new Response(JSON.stringify({data:{id:'1'}}));
  }) as typeof fetch,()=>'csrf-test-token');

  await client.closeBimester('1',1);
  assert(calledUrl==='/academic/bimesters/close');
  assert(hasCsrf);
  assert(JSON.parse(calledBody).bimester_number===1);

  await client.reopenBimester('1',1,'Justificación formal requerida');
  assert(calledUrl==='/academic/bimesters/reopen');
  assert(hasCsrf);
  assert(JSON.parse(calledBody).justification==='Justificación formal requerida');
 }],
 ['officialClassroomReportUrl builds tamper-proof query and validates decimal ids',async()=>{
  const {officialClassroomReportUrl,createReportClient}=await import('./reports.js');
  const url=officialClassroomReportUrl('1','2','3');
  assert(url==='/reports/classroom?period_id=1&grade_id=2&section_id=3&format=official');
  const client=createReportClient();
  assert(client.officialUrl('10','20','30')==='/reports/classroom?period_id=10&grade_id=20&section_id=30&format=official');
  rejects(()=>officialClassroomReportUrl('invalid','2','3'));
  rejects(()=>officialClassroomReportUrl('1','../evil','3'));
 }]
];

