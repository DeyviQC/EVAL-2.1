import { useEffect, useRef, useState } from 'react';
import { AcademicApiError, type createAcademicClient } from './api.js';
import { course, coursesPage, type Course } from './courses.js';


import type { createMaterialClient } from './materials.js';
import { CourseClassroom } from './CourseClassroom.js';
import type { WeeksClient } from './weeks.js';
import type { ActivityClient } from './activities.js';
import {CourseClassroomButtons} from './CourseClassroomButtons.js';
import {courseClassrooms,emptyClassroom,selectedClassroom,type CourseClassroom as AuthorizedClassroom,type CourseClassroomSelection} from './course-classrooms.js';
function getSubjectAccent(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes('matemática') || s.includes('matematica')) return { bar: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
  if (s.includes('comunicación') || s.includes('comunicacion')) return { bar: 'bg-purple-500', chip: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
  if (s.includes('ciencia') || s.includes('tecnología') || s.includes('tecnologia')) return { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
  if (s.includes('sociales') || s.includes('historia')) return { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
  if (s.includes('personal') || s.includes('cívica') || s.includes('civica')) return { bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
  if (s.includes('arte') || s.includes('cultura')) return { bar: 'bg-teal-500', chip: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
  return { bar: 'bg-primary', chip: 'bg-primary-soft text-primary border-primary/20' };
}

export function MyCourses({client,materials,weeks,activities,onExpired,materialsOnly=false,libraryOnly=false,teacherMode=false,classroom,onClassroomChange,initialCourseId=null,onCourseOpened}:{client:ReturnType<typeof createAcademicClient>;materials:ReturnType<typeof createMaterialClient>;weeks?:WeeksClient;activities?:ActivityClient;onExpired:()=>void;materialsOnly?:boolean;libraryOnly?:boolean;teacherMode?:boolean;classroom?:CourseClassroomSelection;onClassroomChange?:(value:CourseClassroomSelection)=>void;initialCourseId?:string|null;onCourseOpened?:()=>void}){
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
        if(initialCourseId){const opened=await client.course(initialCourseId,course);if(current!==generation.current)return;const matched=available.find(row=>row.grade===opened.grade&&row.section===opened.section);if(matched&&(scope.gradeId!==matched.grade_id||scope.sectionId!==matched.section_id)){changeClassroom({gradeId:matched.grade_id,sectionId:matched.section_id});return;}const page=matched?await client.myCourses(coursesPage,null,{grade_id:matched.grade_id,section_id:matched.section_id}):{items:[],next_after:null};if(current!==generation.current)return;setRows(page.items);setCursor(page.next_after);setSelected(opened);setPhase('ready');return;}if(!selectedClassroom(available,scope)){if(scope.sectionId||scope.gradeId&&!available.some(row=>row.grade_id===scope.gradeId))changeClassroom(emptyClassroom());setPhase('ready');return;}}
      const page=await client.myCourses(coursesPage,null,teacherMode?{grade_id:scope.gradeId,section_id:scope.sectionId}:{});
      if(current!==generation.current)return;setRows(page.items);setCursor(page.next_after);setPhase('ready');
    }catch(error){if(current===generation.current)fail(error);}})();
    return ()=>{generation.current++;};
  },[client,teacherMode,scope.gradeId,scope.sectionId]);

  const sectionTitle = selected ? selected.subject : libraryOnly ? 'Biblioteca' : materialsOnly ? 'Materiales' : 'Mis cursos';

  return (
    <section aria-label={libraryOnly?'Biblioteca':materialsOnly?'Materiales':'Mis cursos'} aria-busy={phase==='loading'} className="space-y-6">
      {!selected && (
        <header className="border-b border-border/80 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
              {libraryOnly ? 'RECURSOS Y BIBLIOTECA' : materialsOnly ? 'MATERIALES DE APRENDIZAJE' : 'AULAS VIRTUALES'}
            </span>
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl font-normal text-text tracking-tight">
            {sectionTitle}
          </h3>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            {libraryOnly ? 'Consulta y descarga libros, guías y recursos de consulta para tus áreas.' : materialsOnly ? (teacherMode ? 'Publica, actualiza y organiza guías, lecturas y recursos para tus estudiantes.' : 'Revisa los materiales y documentos de clase compartidos por tus docentes.') : (teacherMode ? 'Gestiona tus áreas curriculares, sesiones semanales, tareas y recursos por aula.' : 'Espacio de aprendizaje de tus áreas curriculares, tareas y seguimiento.')}
          </p>
        </header>
      )}

      {selected && (
        <h3 hidden className="text-2xl font-semibold">{sectionTitle}</h3>
      )}

      {teacherMode && !selected && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <CourseClassroomButtons rows={classrooms} value={scope} onChange={value=>{generation.current++;onCourseOpened?.();setRows([]);setSelected(null);setCursor(null);changeClassroom(value);}} disabled={phase==='loading'}/>
        </div>
      )}

      {(materialsOnly||libraryOnly)&&!selected&&(!teacherMode||activeClassroom)&&(
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-soft/50 border border-primary/20 text-xs text-primary">
          <span>💡</span>
          <p>{teacherMode && materialsOnly ? 'Selecciona un curso para publicar o gestionar sus materiales.' : 'Selecciona un curso para consultar sus materiales.'}</p>
        </div>
      )}

      {teacherMode&&!selected&&activeClassroom&&(
        <p className="eval-scope-hint text-xs font-medium text-text-muted bg-surface-2 border border-border px-3 py-1.5 rounded-lg inline-block">
          Aula seleccionada: <strong>{activeClassroom.grade} · {activeClassroom.section}</strong>
        </p>
      )}

      {phase==='loading'&& (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-surface border border-border text-sm text-text-muted">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p role="status">Consultando tus cursos…</p>
        </div>
      )}

      {phase==='error'&& (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          <p role="alert">{message}</p>
        </div>
      )}

      <button
        hidden={!!selected}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface hover:bg-surface-2 px-4 py-2 text-xs font-medium text-text transition-colors cursor-pointer"
        disabled={phase==='loading'}
        onClick={()=>void load()}
      >
        <span>{selected?'Volver a mis cursos':'Consultar cursos'}</span>
      </button>

      {phase==='ready'&&selected?(
        <CourseClassroom
          key={selected.id}
          course={selected}
          materials={materials}
          {...weeks?{weeks}:{}}
          {...activities?{activities}:{}}
          teacherMode={teacherMode}
          onExpired={onExpired}
          onBack={()=>{onCourseOpened?.();void load();}}
          initial={libraryOnly?'library':materialsOnly?'materials':'weeks'}
        />
      ):(
        phase==='ready'&&(
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map(row=>{
                const accent = getSubjectAccent(row.subject);
                return (
                  <article
                    key={row.id}
                    className="eval-course-card relative group bg-surface border border-border hover:border-primary/50 rounded-xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    aria-label={row.subject+' · '+row.grade+' '+row.section}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${accent.bar}`} aria-hidden="true" />
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 pt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${accent.chip}`}>
                          {row.grade} · {row.section}
                        </span>
                        <span className="text-[10px] font-medium text-text-muted px-2 py-0.5 rounded-md bg-surface-2 border border-border">
                          {row.state==='planned'?'Planificado':row.state==='closed'||row.period_state==='closed'?'Contexto histórico':'Activo'}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-text group-hover:text-primary transition-colors whitespace-pre-wrap leading-snug">
                        {row.subject}
                      </h4>
                      <p className="text-xs text-text-muted mt-1">Aula {row.grade} · {row.section}</p>
                      <div className="mt-4 pt-3 border-t border-border/60">
                        <p className="text-xs font-medium text-text truncate whitespace-pre-wrap">👤 {row.teacher}</p>
                        <p className="text-[11px] text-text-muted truncate mt-0.5">📅 {row.period} · {row.state==='planned'?'Planificado':row.state==='closed'||row.period_state==='closed'?'Contexto histórico':'Activo'}</p>
                      </div>
                    </div>
                    <button
                      className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 hover:bg-primary hover:text-white hover:border-primary px-3 py-2 text-xs font-semibold text-text transition-all cursor-pointer"
                      onClick={()=>void open(row.id)}
                    >
                      {libraryOnly?'Consultar biblioteca del curso':materialsOnly?'Consultar materiales del curso':'Entrar al curso'}
                    </button>
                  </article>
                );
              })}
            </div>
            {rows.length===0&&(!teacherMode||activeClassroom)&&(
              <div className="p-8 text-center bg-surface border border-border rounded-xl">
                <p className="text-sm text-text-muted">No tienes cursos disponibles para esta consulta.</p>
              </div>
            )}
            {teacherMode&&classrooms.length>0&&!activeClassroom&&(
              <div className="p-8 text-center bg-surface border border-border rounded-xl">
                <p className="text-sm text-text-muted">Selecciona primero un grado y una sección arriba para mostrar los cursos de esa aula.</p>
              </div>
            )}
            {teacherMode&&classrooms.length===0&&(
              <div className="p-8 text-center bg-surface border border-border rounded-xl">
                <p className="text-sm text-text-muted">No tienes aulas asignadas para esta consulta.</p>
              </div>
            )}
            {cursor&&(
              <button
                className="mt-4 px-5 py-2.5 rounded-full border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-text transition-colors cursor-pointer"
                onClick={()=>void load(cursor)}
              >
                Cargar más cursos
              </button>
            )}
          </>
        )
      )}
    </section>
  );
}
