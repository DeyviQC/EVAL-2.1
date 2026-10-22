import {useEffect,useState} from 'react';
import {BookOpen, Calculator, FlaskConical, Languages, Palette, History, Star, ArrowUpRight, LayoutGrid, List, CalendarDays, GraduationCap} from 'lucide-react';
import type {Course} from './courses.js';
import type {StudentDashboard, StudentDashboardCourse, UpcomingActivity} from './student-dashboard.js';

type Filter='all'|'pending'|'favorites';
type Order='recent'|'az'|'due';
const surface='rounded-2xl border border-border bg-surface shadow-xs';
const control='min-h-11 md:min-h-12 rounded-xl px-4 md:px-5 text-sm md:text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function subjectIdentity(subject:string){
  const name=subject.toLocaleLowerCase('es-PE');
  if(name.includes('matem'))return {Icon:Calculator,color:'text-blue-700 dark:text-blue-300',ground:'from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900/40'};
  if(name.includes('ciencia')||name.includes('tecnolog'))return {Icon:FlaskConical,color:'text-emerald-700 dark:text-emerald-300',ground:'from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900/40'};
  if(name.includes('comunica')||name.includes('ingl'))return {Icon:Languages,color:'text-violet-700 dark:text-violet-300',ground:'from-violet-100 to-violet-50 dark:from-violet-950 dark:to-violet-900/40'};
  if(name.includes('arte')||name.includes('cultura'))return {Icon:Palette,color:'text-rose-700 dark:text-rose-300',ground:'from-rose-100 to-rose-50 dark:from-rose-950 dark:to-rose-900/40'};
  if(name.includes('historia')||name.includes('social'))return {Icon:History,color:'text-amber-800 dark:text-amber-300',ground:'from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900/40'};
  return {Icon:BookOpen,color:'text-primary',ground:'from-primary-soft to-surface-2'};
}

function dueText(due:string|null,category:UpcomingActivity['category']){
  if(!due)return null;
  if(category==='today')return 'Hoy';
  if(category==='tomorrow')return 'Mañana';
  const label=new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${due}T00:00:00Z`));
  return category==='overdue'?`Venció el ${label}`:label;
}

function favoritesKey(accountId:string){return `eval-favorite-courses:${accountId}`;}
function readFavorites(accountId:string):string[]{
  try{const stored=JSON.parse(localStorage.getItem(favoritesKey(accountId))??'[]') as unknown;return Array.isArray(stored)?stored.filter((id):id is string=>typeof id==='string'&&/^\d+$/.test(id)):[];}catch{return [];}
}

export function StudentCourseCatalog({accountId,name,courses,snapshot,onOpen,onActivity}: {accountId:string;name:string;courses:Course[];snapshot:StudentDashboard;onOpen:(id:string)=>void;onActivity:(id:string)=>void}){
  const [filter,setFilter]=useState<Filter>('all'),[order,setOrder]=useState<Order>('recent'),[layout,setLayout]=useState<'grid'|'list'>('grid');
  const [favorites,setFavorites]=useState<string[]>(()=>readFavorites(accountId)),[notice,setNotice]=useState('');
  useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(''),3500);return()=>window.clearTimeout(timer);},[notice]);
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima'}).format(new Date());
  const tomorrow=new Date(`${today}T12:00:00Z`);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  const resumeCategory=snapshot.resume?.due_on?(snapshot.resume.due_on<today?'overdue':snapshot.resume.due_on===today?'today':snapshot.resume.due_on===tomorrow.toISOString().slice(0,10)?'tomorrow':'later'):'later';
  const featured=[...(snapshot.resume?[{id:snapshot.resume.id,assignment_id:snapshot.resume.assignment_id,title:snapshot.resume.title,course:snapshot.resume.course,due_on:snapshot.resume.due_on,category:resumeCategory as UpcomingActivity['category']}]:[]),...snapshot.upcoming].slice(0,3);
  const allUpcoming=[...(snapshot.resume?[snapshot.resume]:[]),...snapshot.upcoming];
  const completeUpcoming=snapshot.overview.pending===allUpcoming.length;
  const dueToday=completeUpcoming?allUpcoming.filter(item=>item.due_on===today).length:null;
  const weekEnd=new Date(`${today}T12:00:00Z`);weekEnd.setUTCDate(weekEnd.getUTCDate()+(7-weekEnd.getUTCDay())%7);
  const dueWeek=completeUpcoming?allUpcoming.filter(item=>item.due_on!==null&&item.due_on>=today&&item.due_on<=weekEnd.toISOString().slice(0,10)).length:null;
  const courseLookup=new Map(courses.map(row=>[row.id,row]));
  const visible=snapshot.courses.filter(row=>filter==='all'||filter==='favorites'&&favorites.includes(row.id)||filter==='pending'&&typeof row.pending_count==='number'&&row.pending_count>0).sort((a,b)=>{
    if(order==='az')return a.subject.localeCompare(b.subject,'es-PE');
    if(order==='due')return (a.next_due?.due_on??'9999-12-31').localeCompare(b.next_due?.due_on??'9999-12-31')||a.subject.localeCompare(b.subject,'es-PE');
    return (b.latest_published_at??'').localeCompare(a.latest_published_at??'')||a.subject.localeCompare(b.subject,'es-PE');
  });
  const context=snapshot.courses[0];
  const period=courses.length&&courses.every(row=>row.period===courses[0]?.period)?courses[0]?.period:null;
  const sharedClassroom=context&&snapshot.courses.every(row=>row.grade===context.grade&&row.section===context.section)?`${context.grade} · ${context.section}`:null;
  function toggleFavorite(id:string){
    const selected=!favorites.includes(id);const next=selected?[...favorites,id]:favorites.filter(value=>value!==id);
    setFavorites(next);setNotice(selected?'Curso añadido a favoritos.':'Curso retirado de favoritos.');
    try{localStorage.setItem(favoritesKey(accountId),JSON.stringify(next));}catch{setNotice('Favorito actualizado en esta sesión; no se pudo guardarlo en este dispositivo.');}
  }
  return <div className="eval-student-courses space-y-7 text-text">
    <header className={`${surface} overflow-hidden p-5 sm:p-7`}>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Tus cursos · EVAL</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Hola, {name.trim().split(/\s+/)[0]}</h2>
      <p className="mt-2 text-sm text-text-muted">{dueWeek!==null&&dueWeek>0?`${dueWeek} ${dueWeek===1?'tarea vence':'tareas vencen'} esta semana.`:snapshot.overview.pending===0?'Estás al día con tus entregas.':`${snapshot.overview.pending} ${snapshot.overview.pending===1?'tarea pendiente':'tareas pendientes'} en tus cursos.`}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {sharedClassroom&&<span className="rounded-full bg-surface-2 px-3 py-2">{sharedClassroom}</span>}
        {period&&<span className="rounded-full bg-surface-2 px-3 py-2">{period}</span>}
        <span className="rounded-full bg-primary-soft px-3 py-2 text-primary">Pendientes: {snapshot.overview.pending}</span>
        {dueToday!==null&&<span className="rounded-full bg-surface-2 px-3 py-2">Vencen hoy: {dueToday}</span>}
      </div>
    </header>

    {featured.length>0&&<section aria-label="Próximas entregas" className="space-y-3">
      <div><h3 className="text-lg font-bold">Continúa donde te quedaste</h3><p className="text-sm text-text-muted">Próximas entregas</p></div>
      <div className="grid gap-3 lg:grid-cols-3">{featured.map(item=><button key={item.id} type="button" onClick={()=>onActivity(item.id)} className={`${surface} flex min-h-24 items-center gap-3 p-4 text-left transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><CalendarDays aria-hidden="true" size={21}/></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-text-muted">{item.course}</span><span className="block line-clamp-2 font-semibold">{item.title}</span>{item.due_on&&<span className="block text-xs text-text-muted">{dueText(item.due_on,item.category)}</span>}</span><ArrowUpRight size={18} aria-hidden="true" className="shrink-0 text-primary"/>
      </button>)}</div>
    </section>}

    <section aria-label="Explorar cursos" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Mis cursos <span className="text-sm font-normal text-text-muted">({snapshot.courses.length})</span></h3>
        <div className="flex items-center gap-2"><label htmlFor="student-course-order" className="sr-only">Ordenar cursos</label><select id="student-course-order" value={order} onChange={event=>setOrder(event.target.value as Order)} className={`eval-course-order ${control} border border-border bg-surface text-text`}><option value="recent">Actividad reciente</option><option value="az">A–Z</option><option value="due">Próxima entrega</option></select>
          <div className="flex rounded-xl border border-border bg-surface p-1" aria-label="Vista de cursos"><button className="min-h-11 min-w-11 rounded-lg focus-visible:outline-2 focus-visible:outline-primary" aria-label="Vista en grilla" aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')}><LayoutGrid size={18} className="mx-auto" aria-hidden="true"/></button><button className="min-h-11 min-w-11 rounded-lg focus-visible:outline-2 focus-visible:outline-primary" aria-label="Vista en lista" aria-pressed={layout==='list'} onClick={()=>setLayout('list')}><List size={18} className="mx-auto" aria-hidden="true"/></button></div>
        </div></div>
      <div role="group" aria-label="Filtrar cursos" className="flex flex-wrap gap-2">{([['all','Todos'],['pending','Con pendientes'],['favorites','Favoritos']] as const).map(([value,label])=><button key={value} className={`eval-course-filter ${control} border ${filter===value?'border-primary bg-primary text-white':'border-border bg-surface text-text hover:bg-surface-2'}`} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
      {visible.length===0?<div className={`${surface} flex flex-col items-center gap-3 p-9 text-center`}><GraduationCap className="text-primary" size={38} aria-hidden="true"/><p className="font-semibold">{snapshot.courses.length?'No hay cursos en este filtro.':'Aún no tienes cursos asignados'}</p><button className={`${control} border border-border bg-surface-2`} onClick={()=>setFilter('all')}>Ver todos los cursos</button></div>:
      <div className={layout==='grid'?'student-course-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3':'student-course-list grid gap-3'}>{visible.map((item,index)=><StudentCourseTile key={item.id} item={item} state={courseLookup.get(item.id)?.state} periodState={courseLookup.get(item.id)?.period_state} favorite={favorites.includes(item.id)} onOpen={()=>onOpen(item.id)} onFavorite={()=>toggleFavorite(item.id)} index={index} list={layout==='list'}/>)}</div>}
    </section>
    <p role="status" aria-live="polite" className={`eval-course-toast fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-navy-950 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg md:bottom-6 ${notice?'':'sr-only'}`}>{notice}</p>
  </div>;
}

function StudentCourseTile({item,state,periodState,favorite,onOpen,onFavorite,index,list}:{item:StudentDashboardCourse;state?:Course['state']|undefined;periodState?:Course['period_state']|undefined;favorite:boolean;onOpen:()=>void;onFavorite:()=>void;index:number;list:boolean}){
  const {Icon,color,ground}=subjectIdentity(item.subject);
  const urgent=item.next_due?.category==='overdue'?'Vencida':item.next_due?.category==='today'||item.next_due?.category==='tomorrow'?'Vence pronto':null;
  return <article className={`${surface} group relative min-w-0 overflow-hidden transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.01] hover:shadow-md motion-reduce:transform-none ${list?'sm:flex sm:items-center':''}`} style={{animationDelay:`${Math.min(index,6)*35}ms`}}>
    <button type="button" onClick={onOpen} aria-label={`Abrir curso de ${item.subject}`} className={`flex min-h-52 w-full flex-col gap-3 p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary ${list?'sm:min-h-28 sm:flex-row sm:items-center sm:pr-20':''}`}>
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ground} ${color}`}><Icon size={28} strokeWidth={1.8} aria-hidden="true"/></span>
      <span className="min-w-0 flex-1 space-y-2"><span className="block line-clamp-2 pr-8 text-lg font-bold leading-tight text-text">{item.subject}</span>
        {item.teacher&&item.teacher!=='Docente'&&<span className="flex items-center gap-2 text-xs text-text-muted"><span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 font-bold text-primary">{item.teacher.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()}</span>{item.teacher}</span>}
        {state&&state!=='active'&&<span className="block text-xs font-semibold text-text-muted">{state==='closed'||periodState==='closed'?'Finalizado':'Planificado'}</span>}
        {typeof item.pending_count==='number'&&item.pending_count>0&&<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${urgent==='Vencida'?'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200':urgent?'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200':'bg-surface-2 text-text'}`}>{item.pending_count} {item.pending_count===1?'tarea pendiente':'tareas pendientes'}{urgent?` · ${urgent}`:''}</span>}
        {item.next_due?.due_on&&<span className="block truncate text-xs text-text-muted">Próxima: {item.next_due.title} · {dueText(item.next_due.due_on,item.next_due.category)}</span>}
      </span>
      <span className={`w-full border-t border-border pt-3 text-xs text-text-muted ${list?'sm:w-32 sm:shrink-0 sm:border-t-0 sm:pt-0':''}`}><span className="flex justify-between"><span>Progreso</span><strong className="text-text">{item.progress}%</strong></span><span role="progressbar" aria-label={`Progreso en ${item.subject}`} aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} className="mt-2 block h-2 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-primary" style={{width:`${item.progress}%`}}/></span></span>
      <ArrowUpRight aria-hidden="true" className="absolute bottom-5 right-5 hidden text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block" size={18}/>
    </button>
    <button type="button" onClick={onFavorite} aria-label={favorite?`Quitar ${item.subject} de favoritos`:`Añadir ${item.subject} a favoritos`} aria-pressed={favorite} className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Star size={20} aria-hidden="true" fill={favorite?'currentColor':'none'}/></button>
  </article>;
}
