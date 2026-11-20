import {useState} from 'react';
import type {Course} from './courses.js';
import type {WeeksClient} from './weeks.js';
import type {ActivityClient} from './activities.js';
import type {createMaterialClient} from './materials.js';
import {WeeksPanel} from './WeeksPanel.js';
import {MaterialsPanel} from './MaterialsPanel.js';
import {LibraryPanel} from './LibraryPanel.js';
import {Icon} from './InstitutionalUI.js';

export function CourseClassroom({course,materials,weeks,activities,teacherMode,onExpired,onBack,initial='weeks',backLabel,libraryPosition,onLibraryPosition}:{course:Course;materials:ReturnType<typeof createMaterialClient>;weeks?:WeeksClient;activities?:ActivityClient;teacherMode:boolean;onExpired:()=>void;onBack:()=>void;initial?:'weeks'|'materials'|'library';backLabel?:string|undefined;libraryPosition?:{query:string;cursor:string|null}|undefined;onLibraryPosition?:((position:{query:string;cursor:string|null})=>void)|undefined}){
 const [view,setView]=useState(initial);
 return (
  <div className="eval-classroom space-y-5" data-course={course.id}>
    <button
      className="eval-back-button inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer"
      onClick={onBack}
    >
       ← {backLabel??'Volver a mis cursos'}
    </button>

    <header className="eval-classroom-header relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 to-navy-900 border border-white/10 p-6 sm:p-7 text-white shadow-md border-l-4 border-l-accent flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-2">
        <p className="eval-eyebrow text-[11px] font-bold uppercase tracking-wider text-accent">
          {teacherMode ? 'MI AULA DOCENTE' : 'MI AULA VIRTUAL'}
        </p>
        <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white tracking-tight">
          {course.subject}
        </h3>
        <div className="eval-classroom-context flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15">
            <Icon name="grid" /> {course.grade} · Sección {course.section}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15">
            <Icon name="calendar" /> {course.period}
          </span>
        </div>
      </div>

      <div className="eval-classroom-teacher flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs shrink-0">
        <span className="eval-avatar w-10 h-10 rounded-full bg-accent text-navy-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-sm" aria-hidden="true">
          {course.teacher.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()}
        </span>
        <div className="min-w-0">
          <small className="block text-[10px] text-slate-400 uppercase tracking-wider">Docente asignado</small>
          <strong className="block text-xs font-semibold text-white truncate">{course.teacher}</strong>
        </div>
      </div>
    </header>

    <nav className="eval-course-view-tabs flex flex-wrap gap-2 p-1 bg-surface-2 border border-border rounded-xl" aria-label="Contenido del aula">
      {weeks&&activities&&(
        <button
          aria-pressed={view==='weeks'}
          aria-label="Semanas"
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${view==='weeks' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text hover:bg-surface'}`}
          onClick={()=>setView('weeks')}
        >
          Aula semanal
        </button>
      )}
      <button
        aria-pressed={view==='materials'}
        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${view==='materials' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text hover:bg-surface'}`}
        onClick={()=>setView('materials')}
      >
        {teacherMode&&course.can_publish?'Materiales y publicación':'Todos los materiales'}
      </button>
      <button
        aria-pressed={view==='library'}
        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${view==='library' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text hover:bg-surface'}`}
        onClick={()=>setView('library')}
      >
        Biblioteca del curso
      </button>
    </nav>

    {view==='weeks'&&weeks&&activities?(
      <WeeksPanel key={course.id} teacherMode={teacherMode} course={course} client={weeks} activities={activities} materialClient={materials} onExpired={onExpired}/>
    ):view==='library'?(
       <LibraryPanel key={course.id} course={course} client={materials} teacherMode={teacherMode} onExpired={onExpired} initialPosition={libraryPosition} onPosition={onLibraryPosition}/>
    ):(
      <MaterialsPanel key={course.id} course={course} client={materials} teacherMode={teacherMode} onExpired={onExpired} onBack={()=>setView(weeks&&activities?'weeks':'library')}/>
    )}
  </div>
 );
}
