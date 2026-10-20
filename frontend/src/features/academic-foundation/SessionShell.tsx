import {roleMenus,roleLabels,allowedSection,StudentDashboard,TeacherDashboard,DirectorDashboard,VicePrincipalDashboard,type DashboardRole} from './role-dashboards.js';
import {InstitutionReadView} from './InstitutionReadView.js';
import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { createSessionClient, createSessionController, type SessionView } from './session.js';
import { createNavigationController, sectionLabels } from './navigation.js';
import { createAcademicClient } from './api.js';
import { MyCourses } from './MyCourses.js';
import { createMaterialClient } from './materials.js';
import { createAccountClient,type OwnAccount } from './accounts.js';
import { createActivityClient } from './activities.js';
import { NotificationWorkspace } from './NotificationWorkspace.js';
import { createNotificationClient } from './notifications.js';
import { createReportClient } from './reports.js';
import { ActivityWorkspace } from './ActivityWorkspace.js';
import { createCalendarClient } from './calendars.js';
import { createWeeksClient } from './weeks.js';
import {SessionPanel} from './InstitutionalShell.js';
import {NavButton} from './InstitutionalUI.js';
import {emptyClassroom} from './course-classrooms.js';

const FoundationWorkspace = lazy(() => import('./FoundationWorkspace.js').then(m => ({ default: m.FoundationWorkspace })));
const EnrollmentWorkspace = lazy(() => import('./EnrollmentWorkspace.js').then(m => ({ default: m.EnrollmentWorkspace })));
const AssignmentWorkspace = lazy(() => import('./AssignmentWorkspace.js').then(m => ({ default: m.AssignmentWorkspace })));
const UsersWorkspace = lazy(() => import('./AccountWorkspace.js').then(m => ({ default: m.UsersWorkspace })));
const OwnAccountWorkspace = lazy(() => import('./AccountWorkspace.js').then(m => ({ default: m.OwnAccountWorkspace })));
const MandatoryPasswordChangeWorkspace = lazy(() => import('./AccountWorkspace.js').then(m => ({ default: m.MandatoryPasswordChangeWorkspace })));
const ReportWorkspace = lazy(() => import('./ReportWorkspace.js').then(m => ({ default: m.ReportWorkspace })));
const SupervisionWorkspace = lazy(() => import('./SupervisionWorkspace.js').then(m => ({ default: m.SupervisionWorkspace })));
const HistoryWorkspace = lazy(() => import('./HistoryWorkspace.js').then(m => ({ default: m.HistoryWorkspace })));
const CalendarWorkspace = lazy(() => import('./CalendarWorkspace.js').then(m => ({ default: m.CalendarWorkspace })));
const AuditWorkspace = lazy(() => import('./AuditWorkspace.js').then(m => ({ default: m.AuditWorkspace })));
export {SessionPanel} from './InstitutionalShell.js';
export function SessionShell() {
  const session=useMemo(()=>createSessionClient(),[]);
  const controller=useMemo(()=>createSessionController(session),[session]);
  const academic=useMemo(()=>createAcademicClient(fetch,()=>session.csrfToken()??''),[session]);
  const materials=useMemo(()=>createMaterialClient(fetch,()=>session.csrfToken()??''),[session]);
  const weeks=useMemo(()=>createWeeksClient(()=>session.csrfToken()??''),[session]);
  const calendars=useMemo(()=>createCalendarClient(()=>session.csrfToken()??''),[session]);
  const accounts=useMemo(()=>createAccountClient(()=>session.csrfToken()??''),[session]);
  const notices=useMemo(()=>createNotificationClient(()=>session.csrfToken()??''),[session]);
  const [unread,setUnread]=useState<number|null>(null);
  const reports=useMemo(()=>createReportClient(),[]);
  const activities=useMemo(()=>createActivityClient(()=>session.csrfToken()??''),[session]);
  const [own,setOwn]=useState<OwnAccount|null>(null);const [role,setRole]=useState<DashboardRole|null>(null),[profileError,setProfileError]=useState(false);
  const navigation=useMemo(()=>createNavigationController(),[]);
  const context=useSyncExternalStore(navigation.subscribe,navigation.snapshot,navigation.snapshot);
  const [selected,setSelected]=useState<string|null>(null);
  const [courseClassroom,setCourseClassroom]=useState(emptyClassroom);
  const [courseTarget,setCourseTarget]=useState<string|null>(null);
  const view=useSyncExternalStore(controller.subscribe,controller.snapshot,controller.snapshot);
  useEffect(()=>{void controller.refresh();return ()=>controller.invalidate();},[controller]);
  useEffect(()=>{setUnread(null);setSelected(null);setCourseClassroom(emptyClassroom());setCourseTarget(null);navigation.clear();return ()=>navigation.clear();},[view.phase,navigation]);
  useEffect(()=>{let active=true;setOwn(null);setRole(null);setProfileError(false);if(view.phase==='authenticated')void accounts.bootstrap().then(({account,role:profile,sections})=>{if(active){setOwn(account);setRole(profile);navigation.hydrate(sections);try{const stored=sessionStorage.getItem('eval-view:'+account.id+':'+profile);if(stored&&allowedSection(profile,stored))setSelected(stored);}catch{}}}).catch(()=>{if(active)setProfileError(true);});return ()=>{active=false;};},[view.phase,accounts]);  const safeSelected=role&&allowedSection(role,selected)?selected:null;
  const [activityFilter,setActivityFilter]=useState<'all'|'pending'|'submitted'>('all');
  const choose=(id:string|null,subfilter?:'all'|'pending'|'submitted',preserveCourseTarget=false)=>{if(own?.must_change_password)return;if(!preserveCourseTarget)setCourseTarget(null);if(id==='activities')setActivityFilter(subfilter??'all');if(role&&own&&allowedSection(role,id)){setSelected(id);try{const key='eval-view:'+own.id+':'+role;if(id)sessionStorage.setItem(key,id);else sessionStorage.removeItem(key);}catch{}}};
  const menu=role?roleMenus[role]:[];
  const activeLabel=own?.must_change_password?'Cambio obligatorio de contraseña':(menu.find(entry=>entry.id===safeSelected)?.label??'Inicio');
  function content(){
    if(!role||!own)return <><p role="status">{profileError?'No se pudo confirmar tu perfil.':'Consultando tu perfil…'}</p>{profileError&&<button onClick={()=>void controller.refresh()}>Volver a consultar</button>}</>;
    if(own.must_change_password)return <MandatoryPasswordChangeWorkspace client={accounts} account={own} onExpired={controller.invalidate}/>;
    if(context.phase==='loading')return <p role="status">Consultando tus secciones…</p>;
    if(context.phase==='unavailable')return <><p role="alert">No se pudo confirmar la navegación.</p><button onClick={()=>void navigation.refresh()}>Volver a consultar</button></>;
    if(context.phase!=='ready')return null;
    if(safeSelected===null){const Dashboard={student:StudentDashboard,teacher:TeacherDashboard,director_admin:DirectorDashboard,vice_principal:VicePrincipalDashboard}[role];return <Dashboard name={own.name} onSelect={choose} onCourseSelect={(assignmentId,selection)=>{setCourseClassroom(selection);setCourseTarget(assignmentId);choose('my_enrollments',undefined,true);}} client={accounts}/>;}
    const teacherMode=role==='teacher';
    switch(safeSelected){
      case 'my_assignments':case 'my_enrollments':case 'weeks':return <MyCourses key="courses" classroom={courseClassroom} onClassroomChange={setCourseClassroom} initialCourseId={courseTarget} client={academic} materials={materials} weeks={weeks} activities={activities} teacherMode={teacherMode} onExpired={controller.invalidate}/>;
      case 'materials':case 'library':return <MyCourses key={safeSelected} classroom={courseClassroom} onClassroomChange={setCourseClassroom} client={academic} materials={materials} teacherMode={teacherMode} materialsOnly={safeSelected==='materials'} libraryOnly={safeSelected==='library'} onExpired={controller.invalidate}/>;
      case 'activities':return <ActivityWorkspace classroom={courseClassroom} onClassroomChange={setCourseClassroom} teacherMode={teacherMode} client={activities} mode="activities" initialFilter={activityFilter} onExpired={controller.invalidate}/>;
      case 'institution':return <InstitutionReadView client={academic} onExpired={controller.invalidate}/>;
      case 'reports':return <ReportWorkspace client={reports} academic={academic} onExpired={controller.invalidate}/>;
      case 'history':return <HistoryWorkspace client={academic} kinds={role==='director_admin'||role==='vice_principal'?['enrollments','assignments']:role==='student'?['enrollments']:['assignments']} onExpired={controller.invalidate}/>;
      case 'audit':return <AuditWorkspace client={academic} onExpired={controller.invalidate}/>;
      case 'periods':case 'catalog':return <FoundationWorkspace key={safeSelected} section={safeSelected} client={academic} onExpired={controller.invalidate}/>;
      case 'enrollments':return <EnrollmentWorkspace client={academic} onExpired={controller.invalidate}/>;
      case 'assignments':return <AssignmentWorkspace client={academic} onExpired={controller.invalidate}/>;
      case 'calendar':return <CalendarWorkspace academic={academic} client={calendars} onExpired={controller.invalidate}/>;
      case 'users':return <UsersWorkspace client={accounts} academic={academic} onExpired={controller.invalidate}/>;
      case 'supervision':return <SupervisionWorkspace client={materials.observations} onExpired={controller.invalidate}/>;
      case 'notifications':return <NotificationWorkspace client={notices} onExpired={controller.invalidate} onCount={setUnread} onSection={()=>choose('activities')}/>;
      case 'account':return role==='director_admin'?<section className="eval-read-profile"><h3>Mi perfil</h3><dl><dt>Nombre</dt><dd>{own.name}</dd><dt>Usuario</dt><dd>{own.username}</dd><dt>Perfil</dt><dd>Director · Solo lectura</dd></dl></section>:<OwnAccountWorkspace client={accounts} account={own} onExpired={controller.invalidate}/>;
    }
    return <p>Esta sección no está disponible para tu perfil.</p>;
  }
  return <SessionPanel role={role??undefined} account={own} profileLabel={role?roleLabels[role]+(role==='director_admin'?' · Solo lectura':''):undefined} onNotifications={role&&role!=='director_admin'&&!own?.must_change_password?()=>choose('notifications'):undefined} unread={unread} activeLabel={activeLabel} view={view} onLogin={controller.login} onLogout={controller.logout} onRefresh={controller.refresh} selected={own?.must_change_password?null:safeSelected} onSelect={choose} navigation={role&&context.phase==='ready'&&!own?.must_change_password?<nav className="eval-navigation" aria-label="Secciones académicas"><NavButton aria-pressed={safeSelected===null} onClick={()=>choose(null)}>Inicio</NavButton>{menu.map(entry=><NavButton key={entry.id} icon={entry.icon} aria-pressed={safeSelected===entry.id} onClick={()=>choose(entry.id)}>{entry.label}</NavButton>)}</nav>:undefined}><Suspense fallback={<div className="p-8 text-center text-xs text-text-muted animate-pulse">Cargando sección institucional…</div>}>{content()}</Suspense></SessionPanel>;
}
