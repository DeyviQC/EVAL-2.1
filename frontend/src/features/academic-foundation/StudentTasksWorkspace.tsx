import {useEffect,useState} from 'react';
import {AccountError,type AccountClient} from './accounts.js';
import type {ActivityClient,Activity} from './activities.js';
import {ActivityCard} from './ActivityWorkspace.js';
import {StudentTaskList,StudentTaskDrawer} from './StudentTaskList.js';
import type {StudentTask,StudentTasks} from './student-tasks.js';
import {AcademicApiError} from './api.js';

export function StudentTasksWorkspace({accounts,activities,onExpired,initialActivityId=null}:{accounts:AccountClient;activities:ActivityClient;onExpired:()=>void;initialActivityId?:string|null}){
 const [data,setData]=useState<StudentTasks|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const [selected,setSelected]=useState<StudentTask|null>(null),[activity,setActivity]=useState<Activity|null>(null),[detailError,setDetailError]=useState(false),[opened,setOpened]=useState<Activity|null>(null),[revision,setRevision]=useState(0),[detailRevision,setDetailRevision]=useState(0);
 useEffect(()=>{
  let active=true;setLoading(true);setError(false);
  void accounts.studentTasks().then(result=>{if(active)setData(result);}).catch(err=>{
   if(!active)return;
   if(err instanceof AccountError&&[401,419].includes(err.status??0)){onExpired();return;}
   setError(true);setData(null);
  }).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[accounts,revision]);
 useEffect(()=>{
  if(!initialActivityId)return;let active=true;setLoading(true);
  void activities.detail(initialActivityId).then(result=>{if(active)setOpened(result);}).catch(err=>{if(!active)return;if(err instanceof AcademicApiError&&[401,419].includes(err.status??0))onExpired();else setDetailError(true);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[initialActivityId,activities]);
 useEffect(()=>{
  let active=true;setActivity(null);setDetailError(false);
  if(selected)void activities.detail(selected.id).then(result=>{if(active)setActivity(result);}).catch(err=>{
   if(!active)return;
   if(err instanceof AcademicApiError&&[401,419].includes(err.status??0)){onExpired();return;}
   setDetailError(true);
  });
  return()=>{active=false;};
 },[selected,activities,detailRevision]);
 if(opened)return <section aria-label="Mi entrega" className="eval-role-detail space-y-5">
  <button type="button" className="eval-role-back" onClick={()=>{setOpened(null);setRevision(value=>value+1);}}>← Volver a mis tareas</button>
  <ActivityCard key={opened.id} activity={opened} client={activities} mode="deliveries" initialPanel="deliveries" onExpired={onExpired}/>
 </section>;
 return <section aria-label="Tareas" className="space-y-6">
  {detailError&&!selected&&<p role="alert">No se pudo abrir la tarea seleccionada. Puedes consultarla en la lista.</p>}
  <StudentTaskList data={data} loading={loading} error={error} onRetry={()=>setRevision(value=>value+1)} onOpen={task=>{setActivity(null);setSelected(task);}}/>
  <StudentTaskDrawer task={selected} activity={selected&&activity?.id===selected.id?activity:null} error={detailError} onRetry={()=>setDetailRevision(value=>value+1)} onClose={()=>setSelected(null)} onAction={()=>{if(activity&&activity.id===selected?.id){setOpened(activity);setSelected(null);}}}/>
 </section>;
}
