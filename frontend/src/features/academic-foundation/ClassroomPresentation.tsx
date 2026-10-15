import {useEffect,useRef,useState} from 'react';
import {createPortal,flushSync} from 'react-dom';
import {AcademicApiError} from './api.js';
import type {Activity} from './activities.js';
import type {Course} from './courses.js';
import {materialFileUrl,type Material} from './materials.js';
import type {WeekPage,WeekSelection,WeeksClient} from './weeks.js';

type Entry=WeekPage['items'][number];
export function PresentationResource({entry}:{entry:Entry}){
 if(entry.association.kind==='activity'){
  const activity=entry.resource as Activity;
  return <article className="eval-projection-sheet"><span>Actividad · {activity.state==='closed'?'Cerrada':'Publicada'}</span><h2>{activity.title}</h2><p className="eval-projection-instructions">{activity.instructions}</p><p>Fecha límite: {activity.due_on??'Sin fecha límite'}</p></article>;
 }
 const material=entry.resource as Material;
 const inline=materialFileUrl(material.id,'inline');
 return <div className="eval-projection-media">
  {material.mime==='application/pdf'?<iframe key={material.id} src={inline} title={material.title} referrerPolicy="same-origin"/>:
   ['image/jpeg','image/png'].includes(material.mime)?<img key={material.id} alt={material.title} src={inline}/>:
   <div className="eval-projection-sheet"><h2>{material.filename}</h2><p>Este formato se consulta descargando el archivo.</p></div>}
  <a href={materialFileUrl(material.id,'attachment')} download>Descargar {material.filename}</a>
 </div>;
}

export function ClassroomPresentation({course,selection,weekTitle,client,onClose,onExpired,returnFocus}:{course:Course;selection:WeekSelection;weekTitle:string;client:WeeksClient;onClose:()=>void;onExpired:()=>void;returnFocus:HTMLElement|null}){
 const dialog=useRef<HTMLDialogElement>(null),generation=useRef(0),exit=useRef(onClose);
 const [pages,setPages]=useState<[WeekPage,WeekPage]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[index,setIndex]=useState(0),[fullscreenError,setFullscreenError]=useState('');
 const entries=pages?[...pages[0].items,...pages[1].items]:[];
 const selected=entries[index];
 exit.current=onClose;
 useEffect(()=>{
  const element=dialog.current;const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';element?.showModal();
  return()=>{generation.current++;if(document.fullscreenElement===element)void document.exitFullscreen().catch(()=>{});element?.close();document.body.style.overflow=overflow;if(returnFocus?.isConnected)returnFocus.focus();};
 },[]);
 async function load(more=false){
  const request=++generation.current;setBusy(true);setError('');
  try{
   const next=await Promise.all((['material','activity'] as const).map((kind,i)=>{
    const old=pages?.[i];
    if(more&&old&&!old.next_after)return Promise.resolve(old);
    return client.content(course.id,kind,selection,more?old?.next_after??null:null).then(page=>more&&old?{...page,items:[...old.items,...page.items]}:page);
   }));
   if(request!==generation.current)return;
   setPages([next[0]!,next[1]!]);
   if(!more)setIndex(0);
   else if(selected){const position=[...next[0]!.items,...next[1]!.items].findIndex(entry=>entry.association.kind===selected.association.kind&&entry.resource.id===selected.resource.id);setIndex(Math.max(0,position));}
  }catch(problem){
   if(request!==generation.current)return;
   setPages(null);setIndex(0);
   if(problem instanceof AcademicApiError&&[401,419].includes(problem.status??0)){onExpired();exit.current();return;}
   setError(problem instanceof AcademicApiError&&[403,404].includes(problem.status??0)?'Tu acceso al curso cambió. Vuelve al curso para consultar su estado.':'No se pudo cargar la presentación. Comprueba la conexión y vuelve a consultar.');
  }finally{if(request===generation.current)setBusy(false);}
 }
 useEffect(()=>{void load();return()=>{generation.current++;};},[course.id,client,selection.bucket,selection.revision,selection.week]);
 async function fullscreen(){
  setFullscreenError('');try{if(document.fullscreenElement===dialog.current)await document.exitFullscreen();else if(dialog.current?.requestFullscreen)await dialog.current.requestFullscreen();else setFullscreenError('Usa la opción de pantalla completa de tu navegador.');}catch{setFullscreenError('No se pudo activar pantalla completa. Puedes continuar en esta vista.');}
 }
 function navigate(delta:number){
  const apply=()=>setIndex(i=>Math.min(entries.length-1,Math.max(0,i+delta)));
  if(!entries.length)return;
  if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.startViewTransition(()=>flushSync(apply));
  else apply();
 }
 const more=pages?.some(page=>page.next_after!==null);
 return createPortal(<dialog ref={dialog} className="eval-projection" aria-label="Pantalla de Aula" onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='ArrowRight'){event.preventDefault();navigate(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();navigate(-1);}
 }}>
  <header className="eval-projection-nav"><strong>EVAL</strong><span>{course.subject} · {course.grade} {course.section} · {weekTitle}</span><button onClick={()=>void fullscreen()}>Pantalla completa</button><button autoFocus onClick={onClose}>Volver al curso</button></header>
  <main className="eval-projection-stage" aria-busy={busy}>
   {busy&&!pages&&<div role="status" className="eval-projection-loading"><span className="eval-projection-skeleton"/>Preparando el aula…</div>}
   {error&&<div role="alert" className="eval-projection-state"><h1>No se pudo abrir el aula</h1><p>{error}</p><button onClick={()=>void load()}>Volver a consultar</button></div>}
   {!busy&&!error&&pages&&!entries.length&&<div className="eval-projection-state"><h1>Una semana por descubrir</h1><p>Esta semana todavía no tiene materiales ni actividades para presentar.</p></div>}
   {selected&&<><section className="eval-projection-copy" aria-live="polite"><p className="eval-projection-kicker">{weekTitle} · {index+1} / {entries.length}{more?' cargados':''}</p><h1>{selected.resource.title}</h1><p>{selected.association.kind==='material'?(selected.resource as Material).description:'Lee las indicaciones y conversa sobre la actividad.'}</p><small>{course.teacher} · {course.period}</small></section><section key={selected.association.kind+selected.resource.id} className="eval-projection-resource" aria-label="Recurso de la semana"><PresentationResource entry={selected}/></section></>}
  </main>
  <footer className="eval-projection-controls"><button disabled={!selected||index===0||busy} onClick={()=>navigate(-1)}>← Anterior</button><span role="status">{selected?`${index+1} de ${entries.length}`:''}</span><button disabled={!selected||index===entries.length-1||busy} onClick={()=>navigate(1)}>Siguiente →</button>{more&&<button disabled={busy} onClick={()=>void load(true)}>Cargar más recursos</button>}<small>← → para navegar · Escape para salir</small></footer>
  {fullscreenError&&<p role="status">{fullscreenError}</p>}
 </dialog>,document.body);
}
