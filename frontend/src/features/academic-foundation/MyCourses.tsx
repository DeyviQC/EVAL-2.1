import { useEffect, useRef, useState } from 'react';
import { AcademicApiError, type createAcademicClient } from './api.js';
import { course, coursesPage, type Course } from './courses.js';


import type { createMaterialClient } from './materials.js';
import { CourseClassroom } from './CourseClassroom.js';
import type { WeeksClient } from './weeks.js';
import type { ActivityClient } from './activities.js';
import {CourseClassroomButtons} from './CourseClassroomButtons.js';
import {courseClassrooms,emptyClassroom,selectedClassroom,type CourseClassroom as AuthorizedClassroom,type CourseClassroomSelection} from './course-classrooms.js';
export function MyCourses({client,materials,weeks,activities,onExpired,materialsOnly=false,libraryOnly=false,teacherMode=false,classroom,onClassroomChange}:{client:ReturnType<typeof createAcademicClient>;materials:ReturnType<typeof createMaterialClient>;weeks?:WeeksClient;activities?:ActivityClient;onExpired:()=>void;materialsOnly?:boolean;libraryOnly?:boolean;teacherMode?:boolean;classroom?:CourseClassroomSelection;onClassroomChange?:(value:CourseClassroomSelection)=>void}){
  const [localClassroom,setLocalClassroom]=useState(emptyClassroom);
  const scope=classroom??localClassroom;
  const changeClassroom=onClassroomChange??setLocalClassroom;
  const [classrooms,setClassrooms]=useState<AuthorizedClassroom[]>([]);
  const activeClassroom=selectedClassroom(classrooms,scope);


  const [rows,setRows]=useState<Course[]>([]),[selected,setSelected]=useState<Course|null>(null),[cursor,setCursor]=useState<string|null>(null);
  const [phase,setPhase]=useState<'loading'|'ready'|'error'>('loading');const [message,setMessage]=useState('');const generation=useRef(0);
  function fail(error:unknown){setRows([]);setSelected(null);setCursor(null);setPhase('error');
    if(error instanceof AcademicApiError&&(error.status===401||error.status===419)){onExpired();return;}
    setMessage(error instanceof AcademicApiError&&error.status===403?'No tienes permiso para consultar estos cursos.':'No se pudo confirmar el contexto de tus cursos. Consulta nuevamente.');}
  async function load(after:string|null=null){const current=++generation.current;setPhase('loading');setMessage('');setSelected(null);
    try{
      if(teacherMode){const available=after?classrooms:await client.courseClassrooms(courseClassrooms);if(current!==generation.current)return;setClassrooms(available);if(!selectedClassroom(available,scope)){setRows([]);setCursor(null);setPhase('ready');return;}}
      const page=await client.myCourses(coursesPage,after,teacherMode?{grade_id:scope.gradeId,section_id:scope.sectionId}:{});if(current!==generation.current)return;setRows(old=>after?[...old,...page.items]:page.items);setCursor(page.next_after);setPhase('ready');}
    catch(error){if(current===generation.current)fail(error);}}
  async function open(id:string){const current=++generation.current;setPhase('loading');
    try{const result=await client.course(id,course);if(current!==generation.current)return;setSelected(result);setPhase('ready');}
    catch(error){if(current===generation.current)fail(error);}}
  useEffect(()=>{
    const current=++generation.current;setRows([]);setSelected(null);setCursor(null);setPhase('loading');setMessage('');
    void (async()=>{try{
      if(teacherMode){const available=await client.courseClassrooms(courseClassrooms);if(current!==generation.current)return;setClassrooms(available);
        if(!selectedClassroom(available,scope)){if(scope.sectionId||scope.gradeId&&!available.some(row=>row.grade_id===scope.gradeId))changeClassroom(emptyClassroom());setPhase('ready');return;}}
      const page=await client.myCourses(coursesPage,null,teacherMode?{grade_id:scope.gradeId,section_id:scope.sectionId}:{});
      if(current!==generation.current)return;setRows(page.items);setCursor(page.next_after);setPhase('ready');
    }catch(error){if(current===generation.current)fail(error);}})();
    return ()=>{generation.current++;};
  },[client,teacherMode,scope.gradeId,scope.sectionId]);
  return <section aria-label={libraryOnly?'Biblioteca':materialsOnly?'Materiales':'Mis cursos'} aria-busy={phase==='loading'}><h3 hidden={!!selected} className="text-2xl font-semibold">{selected?selected.subject:libraryOnly?'Biblioteca':materialsOnly?'Materiales':'Mis cursos'}</h3>
    {teacherMode&&!selected&&<CourseClassroomButtons rows={classrooms} value={scope} onChange={value=>{generation.current++;setRows([]);setSelected(null);setCursor(null);changeClassroom(value);}} disabled={phase==='loading'}/>}
    {(materialsOnly||libraryOnly)&&!selected&&(!teacherMode||activeClassroom)&&<p className="my-4">Selecciona un curso para consultar sus materiales.</p>}
    {teacherMode&&!selected&&activeClassroom&&<p className="eval-scope-hint">Aula seleccionada: {activeClassroom.grade} · {activeClassroom.section}</p>}
    {phase==='loading'&&<p role="status">Consultando tus cursos…</p>}{phase==='error'&&<p role="alert">{message}</p>}
    <button hidden={!!selected} className="my-4 rounded-lg border px-4 py-2" disabled={phase==='loading'} onClick={()=>void load()}>{selected?'Volver a mis cursos':'Consultar cursos'}</button>
    {phase==='ready'&&selected?<CourseClassroom key={selected.id} course={selected} materials={materials} {...weeks?{weeks}:{}} {...activities?{activities}:{}} teacherMode={teacherMode} onExpired={onExpired} onBack={()=>void load()} initial={libraryOnly?'library':materialsOnly?'materials':'weeks'}/>:
      phase==='ready'&&<><div className="grid gap-4 md:grid-cols-2">{rows.map(row=><article key={row.id} className="eval-course-card rounded-xl border bg-white p-5" aria-label={row.subject+' · '+row.grade+' '+row.section}>
        <h4 className="text-lg font-semibold whitespace-pre-wrap">{row.subject}</h4><p>Aula {row.grade} · {row.section}</p><p className="whitespace-pre-wrap">{row.teacher}</p><p>{row.period} · {row.state==='planned'?'Planificado':row.state==='closed'||row.period_state==='closed'?'Contexto histórico':'Activo'}</p>
        <button className="mt-3 rounded-lg border px-4 py-2" onClick={()=>void open(row.id)}>{libraryOnly?'Consultar biblioteca del curso':materialsOnly?'Consultar materiales del curso':'Entrar al curso'}</button></article>)}</div>
        {rows.length===0&&(!teacherMode||activeClassroom)&&<p>No tienes cursos disponibles para esta consulta.</p>}{teacherMode&&classrooms.length===0&&<p>No tienes aulas asignadas para esta consulta.</p>}{cursor&&<button onClick={()=>void load(cursor)}>Cargar más cursos</button>}</>}
  </section>;
}
