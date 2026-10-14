import {useState} from 'react';
import type {Course} from './courses.js';
import type {WeeksClient} from './weeks.js';
import type {ActivityClient} from './activities.js';
import type {createMaterialClient} from './materials.js';
import {WeeksPanel} from './WeeksPanel.js';
import {MaterialsPanel} from './MaterialsPanel.js';
import {LibraryPanel} from './LibraryPanel.js';
import {Icon} from './InstitutionalUI.js';

export function CourseClassroom({course,materials,weeks,activities,teacherMode,onExpired,onBack,initial='weeks'}:{course:Course;materials:ReturnType<typeof createMaterialClient>;weeks?:WeeksClient;activities?:ActivityClient;teacherMode:boolean;onExpired:()=>void;onBack:()=>void;initial?:'weeks'|'materials'|'library'}){
 const [view,setView]=useState(initial);
 return <div className="eval-classroom" data-course={course.id}>
  <button className="eval-back-button" onClick={onBack}>← Volver a mis cursos</button>
  <header className="eval-classroom-header"><div><p className="eval-eyebrow">{teacherMode?'MI AULA DOCENTE':'MI AULA VIRTUAL'}</p><h3>{course.subject}</h3><div className="eval-classroom-context"><span><Icon name="grid"/>{course.grade} · Sección {course.section}</span><span><Icon name="calendar"/>{course.period}</span></div></div><div className="eval-classroom-teacher"><span className="eval-avatar" aria-hidden="true">{course.teacher.split(/\s+/).slice(0,2).map(w=>w[0]).join('')}</span><div><small>Docente asignado</small><strong>{course.teacher}</strong></div></div></header>
  <nav className="eval-course-view-tabs" aria-label="Contenido del aula">{weeks&&activities&&<button aria-pressed={view==='weeks'} onClick={()=>setView('weeks')}>Aula semanal</button>}<button aria-pressed={view==='materials'} onClick={()=>setView('materials')}>{teacherMode&&course.can_publish?'Materiales y publicación':'Todos los materiales'}</button><button aria-pressed={view==='library'} onClick={()=>setView('library')}>Biblioteca del curso</button></nav>
  {view==='weeks'&&weeks&&activities?<WeeksPanel key={course.id} teacherMode={teacherMode} course={course} client={weeks} activities={activities} onExpired={onExpired}/>:view==='library'?<LibraryPanel key={course.id} course={course} client={materials} teacherMode={teacherMode} onExpired={onExpired}/>:<MaterialsPanel key={course.id} course={course} client={materials} teacherMode={teacherMode} onExpired={onExpired} onBack={()=>setView(weeks&&activities?'weeks':'library')}/>}
 </div>;
}
