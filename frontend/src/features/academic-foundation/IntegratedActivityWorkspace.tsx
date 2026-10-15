import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ActivityCard} from './ActivityWorkspace.js';
import {AcademicApiError} from './api.js';
import {type Activity,type ActivityClient,type EducationCourse} from './activities.js';
import {CourseClassroomButtons} from './CourseClassroomButtons.js';
import {emptyClassroom,selectedClassroom,type CourseClassroom,type CourseClassroomSelection} from './course-classrooms.js';
const button='inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const field='mt-1.5 block w-full rounded-xl border border-border bg-surface text-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
export function IntegratedActivityWorkspace({client,onExpired,teacherMode=false,classroom,onClassroomChange}:{client:ActivityClient;mode:'activities'|'deliveries'|'grades';onExpired:()=>void;teacherMode?:boolean;classroom?:CourseClassroomSelection;onClassroomChange?:(value:CourseClassroomSelection)=>void}){
 const [local,setLocal]=useState(emptyClassroom()),[classrooms,setClassrooms]=useState<CourseClassroom[]>([]),[courses,setCourses]=useState<EducationCourse[]>([]),[courseAfter,setCourseAfter]=useState<string|null>(null),[selected,setSelected]=useState(''),[rows,setRows]=useState<Activity[]>([]),[after,setAfter]=useState<string|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[confirmed,setConfirmed]=useState(false),[creating,setCreating]=useState(false),[blocked,setBlocked]=useState(client.isUncertain());
 const scope=classroom??local,generation=useRef(0),writing=useRef(false);
 function fail(e:unknown){if(e instanceof AcademicApiError&&[401,419].includes(e.status??0)){onExpired();return;}setNotice(e instanceof AcademicApiError&&e.outcomeUnknown?'No se pudo confirmar la operación. Consulta el resultado antes de continuar.':'No se pudo completar la operación. Revisa los datos y vuelve a consultar.');setBlocked(client.isUncertain());}
 useEffect(()=>{const token=++generation.current;setCourses([]);setSelected('');setRows([]);setAfter(null);setCourseAfter(null);setConfirmed(false);setCreating(false);setBusy(true);void(async()=>{try{if(teacherMode){const metadata=await client.classrooms();if(token!==generation.current)return;setClassrooms(metadata);if(!selectedClassroom(metadata,scope))return;}const page=await client.courses(null,teacherMode?scope:undefined);if(token===generation.current){setCourses(page.items);setCourseAfter(page.next_after);}}catch(e){if(token===generation.current)fail(e);}finally{if(token===generation.current)setBusy(false);}})();return()=>{generation.current++;};},[client,teacherMode,scope.gradeId,scope.sectionId]);
 async function load(id=selected,append=false){const token=++generation.current;setBusy(true);setConfirmed(false);try{const page=await client.activities(id,append?after:null);if(token!==generation.current)return;setRows(old=>append?[...old,...page.items]:page.items);setAfter(page.next_after);setConfirmed(true);setBlocked(client.isUncertain());}catch(e){if(token===generation.current){setRows([]);setAfter(null);fail(e);}}finally{if(token===generation.current)setBusy(false);}}
 async function moreCourses(){const token=generation.current;setBusy(true);try{const page=await client.courses(courseAfter,teacherMode?scope:undefined);if(token===generation.current){setCourses(old=>[...old,...page.items]);setCourseAfter(page.next_after);}}catch(e){if(token===generation.current)fail(e);}finally{if(token===generation.current)setBusy(false);}}
 async function publish(e:FormEvent<HTMLFormElement>){e.preventDefault();if(writing.current||client.isUncertain())return;const form=e.currentTarget,data=new FormData(form);writing.current=true;setBusy(true);setNotice('');try{await client.publish(selected,String(data.get('title')),String(data.get('instructions')),String(data.get('due_on'))||null);form.reset();setCreating(false);setNotice('Actividad publicada correctamente.');await load();}catch(error){fail(error);}finally{writing.current=false;setBusy(false);}}
 const course=courses.find(c=>c.id===selected);
 return <section aria-label="Actividades" aria-busy={busy} className="space-y-6">
  <header className="border-b border-border/80 pb-5">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
        TAREAS Y SEGUIMIENTO
      </span>
    </div>
    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-text tracking-tight">Actividades</h2>
    <p className="text-xs sm:text-sm text-text-muted mt-1">Elige tu curso y abre una actividad para consultar sus entregas y calificaciones.</p>
  </header>
  {notice&&<div className="p-3.5 rounded-xl bg-surface-2 border border-border text-xs text-text"><p role="status">{notice}</p></div>}
  {teacherMode&&<div className="bg-surface border border-border rounded-xl p-4 shadow-xs"><CourseClassroomButtons rows={classrooms} value={scope} disabled={busy} onChange={value=>{setSelected('');setRows([]);if(onClassroomChange)onClassroomChange(value);else setLocal(value);}}/></div>}
  <div className="bg-surface border border-border rounded-xl p-4 shadow-xs max-w-md">
    <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">Curso
      <select className={field} value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);setRows([]);setAfter(null);setCreating(false);if(e.target.value)void load(e.target.value);else{generation.current++;setConfirmed(false);}}}>
        <option value="">Selecciona tu curso</option>
        {courses.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </label>
    {courseAfter&&<button className={button+' mt-3'} disabled={busy} onClick={()=>void moreCourses()}>Más cursos</button>}
  </div>
  {selected&&<div className="eval-activity-actions flex flex-wrap gap-2.5"><button className={button} disabled={busy} onClick={()=>void load()}>Actualizar actividades</button>{course?.can_publish&&<button className={button} disabled={busy||blocked} aria-expanded={creating} onClick={()=>setCreating(!creating)}>{creating?'Cancelar creación':'Crear actividad'}</button>}</div>}
  {blocked&&<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2"><p>No repitas la operación. Consulta el curso o la entrega antes de revisar el resultado.</p><button className={button} disabled={busy||!client.canReview()} onClick={()=>{client.review();setBlocked(false);}}>He revisado el resultado</button></div>}
  {creating&&course?.can_publish&&<form aria-label="Crear actividad" onSubmit={e=>void publish(e)} className="my-5 rounded-2xl border border-border bg-surface p-6 shadow-sm"><fieldset disabled={busy||blocked} className="space-y-4"><legend className="text-base font-bold text-text">Crear actividad</legend><label className="block text-xs font-semibold text-text uppercase tracking-wider">Título<input name="title" className={field} required maxLength={200}/></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Instrucciones<textarea name="instructions" className={field} required rows={4} maxLength={10000}/></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Fecha límite (opcional)<input name="due_on" className={field} type="date"/></label><p className="text-xs text-text-muted">La fecha límite no cierra automáticamente las entregas.</p><button className={button+' bg-primary text-white hover:bg-primary-hover border-transparent'}>Publicar actividad</button></fieldset></form>}
  {rows.map(row=><ActivityCard key={selected+':'+row.id} activity={row} client={client} mode="deliveries" teacherMode={teacherMode} onExpired={onExpired}/>)}
  {selected&&confirmed&&!busy&&rows.length===0&&<div className="p-8 text-center bg-surface border border-border rounded-xl"><p className="text-sm text-text-muted">No hay actividades para este curso.</p></div>}
  {after&&<button className={button} disabled={busy} onClick={()=>void load(selected,true)}>Más actividades</button>}
 </section>;
}
