import {ClassroomSteps,useVicePrincipalTask} from './VicePrincipalWorkspace.js';
import {useEffect,useRef,useState} from 'react';
import {AcademicApiError,type AcademicClient} from './api.js';
import type {ObservationClient,SupervisionMaterial} from './material-observations.js';
import {supervisionFileUrl} from './material-observations.js';
import {FileVersionsPanel} from './FileVersionsPanel.js';
import {ObservationsPanel} from './ObservationsPanel.js';
import {emptySupervisionScope,supervisionCourses,supervisionOptions,type SupervisionScope} from './supervision-navigation.js';

type Course=Awaited<ReturnType<typeof supervisionCourses>>['items'][number];
type Options=Awaited<ReturnType<typeof supervisionOptions>>;
export function SupervisionWorkspace({client,academic,onExpired}:{client:ObservationClient;academic:AcademicClient;onExpired:()=>void}){
 const task=useVicePrincipalTask();
 const [materialId,setMaterialId]=useState<string|null>(null);
 const [options,setOptions]=useState<Options|null>(null);
 const [optionsError,setOptionsError]=useState(false),[reload,setReload]=useState(0);
 const [scope,setScope]=useState(emptySupervisionScope);
 const [courses,setCourses]=useState<Course[]>([]),[courseAfter,setCourseAfter]=useState<string|null>(null);
 const [courseBusy,setCourseBusy]=useState(false),[courseError,setCourseError]=useState('');
 const [selected,setSelected]=useState(''),[rows,setRows]=useState<SupervisionMaterial[]>([]);
 const [after,setAfter]=useState<string|null>(null),[materialBusy,setMaterialBusy]=useState(false);
 const [materialError,setMaterialError]=useState(''),[ready,setReady]=useState(false);
 const courseRequest=useRef(0),materialRequest=useRef(0);
 const expired=useRef(onExpired);expired.current=onExpired;
 function sessionFailure(error:unknown){
  if(error instanceof AcademicApiError&&[401,419].includes(error.status??0)){expired.current();return true;}
  return false;
 }
 useEffect(()=>{
  let active=true;setOptions(null);setOptionsError(false);
  void supervisionOptions(academic).then(value=>{if(active)setOptions(value);}).catch(error=>{
   if(active&&!sessionFailure(error))setOptionsError(true);
  });
  return ()=>{active=false;};
 },[academic,reload]);
 useEffect(()=>()=>{courseRequest.current++;materialRequest.current++;},[client,academic]);
 function changeScope(next:SupervisionScope){
  courseRequest.current++;materialRequest.current++;
  setScope(next);setCourses([]);setCourseAfter(null);setSelected('');
  setRows([]);setAfter(null);setReady(false);setMaterialBusy(false);setMaterialError('');setCourseError('');
 }
 async function loadCourses(value:SupervisionScope,cursor:string|null=null){
  const request=++courseRequest.current;
  setCourseBusy(true);setCourseError('');
  try{
   const result=await supervisionCourses(academic,value,cursor);
   if(request!==courseRequest.current)return;
   setCourses(old=>cursor?[...old,...result.items]:result.items);setCourseAfter(result.next_after);
  }catch(error){
   if(request===courseRequest.current&&!sessionFailure(error))setCourseError('No se pudieron cargar los cursos.');
  }finally{if(request===courseRequest.current)setCourseBusy(false);}
 }
 useEffect(()=>{
  if(scope.period&&scope.grade&&scope.section)void loadCourses(scope);
  else setCourseBusy(false);
  return ()=>{courseRequest.current++;};
 },[scope,academic]);
 async function loadMaterials(id:string,cursor:string|null=null){
  const request=++materialRequest.current;
  if(cursor===null){setRows([]);setAfter(null);setReady(false);}
  setMaterialError('');
  if(!id){setMaterialBusy(false);return;}
  setMaterialBusy(true);
  try{
   const result=await client.materials(id,cursor);
   if(result.items.some(item=>item.assignment_id!==id))throw Error('Wrong material course');
   if(request!==materialRequest.current)return;
   setRows(old=>cursor?[...old,...result.items]:result.items);setAfter(result.next_after);setReady(true);
  }catch(error){
   if(request===materialRequest.current&&!sessionFailure(error))setMaterialError('No se pudieron cargar los materiales.');
  }finally{if(request===materialRequest.current)setMaterialBusy(false);}
 }
 useEffect(()=>setMaterialId(null),[selected,scope]);
 const currentCourse=courses.find(course=>course.id===selected);
 return <section className="vp-supervision" aria-label="Supervisión de materiales">
  <header><h2>Supervisión de materiales</h2><p>Elige el aula y luego el curso.</p></header>
  {!options&&!optionsError&&<p role="status">Cargando aulas…</p>}
  {optionsError&&<div role="alert"><p>No se pudieron cargar las aulas.</p><button onClick={()=>setReload(value=>value+1)}>Reintentar</button></div>}
  {task!==null&&<ClassroomSteps period={scope.period} grade={scope.grade} section={scope.section} periods={options?.periods??[]} grades={options?.grades??[]} sections={options?.sections??[]} disabled={!options} onChange={(period,grade,section)=>changeScope({period,grade,section})}/>}
  {task===null&&<fieldset className="vp-supervision-filters" disabled={!options}>
   <legend className="sr-only">Elegir aula</legend>
   <div className="vp-supervision-field"><label htmlFor="supervision-period">Año académico</label><select id="supervision-period" value={scope.period} onChange={event=>changeScope({period:event.target.value,grade:'',section:''})}>
    <option value="">Selecciona el año</option>{options?.periods.map(period=><option key={period.id} value={period.id}>{period.name}{period.state==='closed'?' · Cerrado':''}</option>)}
   </select></div>
   <div className="vp-supervision-field"><label htmlFor="supervision-grade">Grado</label><select id="supervision-grade" value={scope.grade} disabled={!scope.period} onChange={event=>changeScope({...scope,grade:event.target.value,section:''})}>
    <option value="">Selecciona el grado</option>{options?.grades.map(grade=><option key={grade.id} value={grade.id}>{grade.name}{!grade.is_active?' · Inactivo':''}</option>)}
   </select></div>
   <div className="vp-supervision-field"><label htmlFor="supervision-section">Sección</label><select id="supervision-section" value={scope.section} disabled={!scope.grade} onChange={event=>changeScope({...scope,section:event.target.value})}>
    <option value="">Selecciona la sección</option>{options?.sections.filter(section=>section.grade_id===scope.grade).map(section=><option key={section.id} value={section.id}>{section.name}{!section.is_active?' · Inactiva':''}</option>)}
   </select></div>
  </fieldset>}
  {scope.section&&(!selected||task===null)&&<div className="vp-supervision-course">
   {task!==null&&<div className="vp-choice-grid">{courses.map(course=><button type="button" key={course.id} onClick={()=>{setSelected(course.id);void loadMaterials(course.id);}}><strong>{course.entry_name}</strong><span>{course.teacher_name}</span><span>Ver materiales →</span></button>)}</div>}
   {task===null&&<div className="vp-supervision-field"><label htmlFor="supervision-course">Curso</label><select id="supervision-course" disabled={courseBusy||courses.length===0} value={selected} onChange={event=>{setSelected(event.target.value);void loadMaterials(event.target.value);}}>
    <option value="">{courseBusy?'Cargando cursos…':'Selecciona el curso'}</option>
    {courses.map(course=><option key={course.id} value={course.id}>{course.entry_name} · {course.teacher_name}{course.state!=='active'?' · '+(course.state==='closed'?'Cerrado':'Planificado'):''}</option>)}
   </select></div>}
   {!courseBusy&&!courseError&&courses.length===0&&<p role="status">Esta aula no tiene cursos asignados.</p>}
   {courseBusy&&<p role="status">Cargando cursos…</p>}
   {courseError&&<div role="alert"><p>{courseError}</p><button onClick={()=>void loadCourses(scope,courseAfter)}>Reintentar</button></div>}
   {courseAfter&&!courseError&&<button disabled={courseBusy} onClick={()=>void loadCourses(scope,courseAfter)}>Cargar más cursos</button>}
  </div>}
  {selected&&currentCourse&&<section className="vp-supervision-results" aria-label="Materiales del curso" aria-busy={materialBusy}>
   {task!==null&&<button type="button" onClick={()=>{setMaterialId(null);setSelected('');}}>← Volver a cursos</button>}
   <header><h3>{currentCourse.entry_name}</h3><p>Docente: {currentCourse.teacher_name}</p></header>
   {materialBusy&&<p role="status">Cargando materiales…</p>}
   {materialError&&<div role="alert"><p>{materialError}</p><button onClick={()=>void loadMaterials(selected,after)}>Reintentar</button></div>}
   {ready&&!materialError&&rows.length===0&&<p role="status">Este curso todavía no tiene materiales.</p>}
   {task!==null&&!materialId&&<div className="vp-action-grid">{rows.map(material=><button type="button" key={material.id} onClick={()=>setMaterialId(material.id)}><strong>{material.title}</strong><span>{material.author_name}</span><span>Revisar material →</span></button>)}</div>}
   {task!==null&&materialId&&<button type="button" onClick={()=>setMaterialId(null)}>← Volver a materiales</button>}
   {rows.filter(material=>task===null||material.id===materialId).map(material=><article key={material.id} aria-label={material.title} className="vp-supervision-material">
    <div className="vp-supervision-material-heading"><h4>{material.title}</h4><span className={'vp-material-state '+(material.state==='active'?'is-active':'is-withdrawn')}>{material.state==='active'?'Disponible':'Retirado'}</span></div>
    <p>Publicado por {material.author_name}</p>
    {!material.can_observe&&<p>Solo consulta: la asignación o el período ya no está activo.</p>}
    <div className="vp-supervision-actions"><a className="vp-material-open" href={supervisionFileUrl(material.id,'inline')} target="_blank" rel="noopener noreferrer">Abrir material</a><a href={supervisionFileUrl(material.id,'attachment')} download>Descargar</a></div>
    <details className="vp-supervision-details"><summary>Detalles y versiones</summary>
     <p className="vp-material-filename">Archivo: {material.filename}</p>
     {material.description&&<p className="vp-material-description">{material.description}</p>}
     <FileVersionsPanel id={material.id} read={client.fileVersions} supervision onExpired={onExpired}/>
    </details>
    <ObservationsPanel materialId={material.id} client={client} supervised={material} onExpired={onExpired}/>
   </article>)}
   {after&&!materialError&&<button disabled={materialBusy} onClick={()=>void loadMaterials(selected,after)}>Cargar más materiales</button>}
  </section>}
 </section>;
}
