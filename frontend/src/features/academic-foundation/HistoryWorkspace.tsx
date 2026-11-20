import {consultationMatch} from './consultation-search.js';
import {useVicePrincipalTask} from './VicePrincipalWorkspace.js';
import {useEffect,useRef,useState} from 'react';
import {AcademicApiError,type AcademicClient} from './api.js';
import {enrollmentPage,enrollmentRow} from './enrollments.js';
import {assignmentPage,assignmentRow} from './assignments.js';
type Kind='enrollments'|'assignments';
type Row=ReturnType<typeof enrollmentRow>|ReturnType<typeof assignmentRow>;
const labels={active:'Activo',planned:'Planificado',closed:'Cerrado',transferred:'Trasladado'};
export function HistoryWorkspace({client,kinds,onExpired}:{client:AcademicClient;kinds:Kind[];onExpired:()=>void}){
 const task=useVicePrincipalTask();
 const [search,setSearch]=useState(''),[stateFilter,setStateFilter]=useState(''),[periodFilter,setPeriodFilter]=useState('');
 const [kind,setKind]=useState<Kind>(kinds[0]!),[rows,setRows]=useState<Row[]>([]),[after,setAfter]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const generation=useRef(0);
 useEffect(()=>{if(task==='enrollments'||task==='assignments')setKind(task);},[task]);
 async function load(cursor:string|null=null){const current=++generation.current;setBusy(true);setError('');setRows([]);setAfter(null);try{const page=kind==='enrollments'?await client.history(kind,enrollmentPage,cursor):await client.history(kind,assignmentPage,cursor);if(current!==generation.current)return;setRows(page.items);setAfter(page.next_after);}catch(e){if(current!==generation.current)return;if(e instanceof AcademicApiError&&[401,419].includes(e.status??0)){onExpired();return;}setError('No se pudo consultar el historial. Vuelve a consultar.');}finally{if(current===generation.current)setBusy(false);}}
 useEffect(()=>{void load();return ()=>{generation.current++;};},[client,kind]);
 const shown=rows.filter(r=>consultationMatch(search,r.period_name,r.grade_name,r.section_name,'entry_name' in r?r.entry_name:r.student_name,'teacher_name' in r?r.teacher_name:'')&&(!stateFilter||r.state===stateFilter)&&(!periodFilter||r.academic_period_id===periodFilter));
 return <section aria-label="Historial académico" aria-busy={busy} className="space-y-6">
   <header className="border-b border-border/80 pb-5">
     <div className="flex items-center gap-2 mb-1.5">
       <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
         TRAYECTORIA ESCOLAR
       </span>
     </div>
     <h2 className="font-serif text-2xl sm:text-3xl font-normal text-text tracking-tight">Historial académico</h2>
     <p className="text-xs sm:text-sm text-text-muted mt-1">Encuentra cursos, docentes y aulas; conserva el contexto de cada registro.</p>
   </header>

   <div className="bg-surface border border-border rounded-xl p-4 shadow-xs flex flex-wrap items-end gap-3 max-w-lg">
     {task===null&&<div className="flex-1 min-w-[200px]">
       <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1" htmlFor="history-kind">Tipo de historial</label>
       <select id="history-kind" className="w-full rounded-xl border border-border bg-surface text-text p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary" value={kind} disabled={busy} onChange={e=>setKind(e.target.value as Kind)}>
         {kinds.map(k=><option key={k} value={k}>{k==='enrollments'?'Matrículas':'Asignaciones'}</option>)}
       </select>
     </div>}
     <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 hover:bg-surface text-text px-4 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50" disabled={busy} onClick={()=>void load()}>
       Consultar historial
     </button>
   </div>

   <div className="eval-find-panel"><label>Buscar curso, docente, estudiante o aula<input value={search} maxLength={100} onChange={e=>setSearch(e.target.value)} placeholder="Ej.: Matemática o nombre del docente" /></label><label>Período en esta página<select value={periodFilter} onChange={e=>setPeriodFilter(e.target.value)}><option value="">Todos</option>{[...new Map(rows.map(r=>[r.academic_period_id,r.period_name])).entries()].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Estado<select value={stateFilter} onChange={e=>setStateFilter(e.target.value)}><option value="">Todos</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button onClick={()=>{setSearch('');setStateFilter('');setPeriodFilter('');}}>Limpiar filtros</button><p role="status">{shown.length} de {rows.length} registros de esta página. Los filtros se aplican a la página visible.</p></div>
   {!busy&&!error&&rows.length>0&&shown.length===0&&<p>No hay coincidencias en esta página. Limpia los filtros o consulta la siguiente página.</p>}
   {busy&&<div className="p-4 rounded-xl bg-surface border border-border text-xs text-text-muted flex items-center gap-2"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /><p role="status">Consultando historial…</p></div>}
   {error&&<div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs"><p role="alert">{error}</p></div>}
   {!busy&&!error&&rows.length===0&&<div className="p-8 text-center bg-surface border border-border rounded-xl"><p className="text-xs text-text-muted">No hay registros para esta consulta.</p></div>}

   <div className="eval-history-results space-y-4">
     {shown.map(r=>{
       const stateLabel = labels[r.state] ?? r.state;
       const isStateActive = r.state === 'active';
       return (
         <article aria-label={'Registro '+r.id} key={r.id} className="rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 transition-all flex flex-col gap-2">
           <div className="flex flex-wrap items-center justify-between gap-2">
             <h3 className="font-bold text-base text-text">{'student_name'in r?r.student_name:r.entry_name}</h3>
             <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${isStateActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-surface-2 text-text-muted border-border'}`}>
               Estado: {stateLabel}
             </span>
           </div>
           <p className="text-xs text-text font-medium">{r.period_name} · {r.grade_name} · {r.section_name}</p>
           {'teacher_name'in r&&<p className="text-xs text-text-muted">Docente original: {r.teacher_name}</p>}
           <p className="hidden">Estado: {labels[r.state]}</p>
           {'period_state'in r&&<p className="text-xs text-text-muted">Período: {labels[r.period_state]}</p>}
           <p className="text-xs text-text-muted">Desde: {r.effective_from} · Hasta: {r.effective_until??'Sin cierre registrado'}</p>
           {'replaces_assignment_id'in r&&r.replaces_assignment_id&&<p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg inline-block">Reemplaza la asignación {r.replaces_assignment_id}. El contexto anterior se conserva.</p>}
           <p className="text-[11px] text-text-muted font-mono pt-1">Registro {r.id}</p>
         </article>
       );
     })}
   </div>
   {after&&<button className="my-4 inline-flex items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-2 text-text px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer" disabled={busy} onClick={()=>void load(after)}>Página siguiente del historial</button>}
 </section>;
}
