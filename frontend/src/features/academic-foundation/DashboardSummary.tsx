import {useEffect,useState} from 'react';
import {exact} from './contracts.js';
import {AcademicApiError} from './api.js';
import type {DashboardRole} from './role-dashboards.js';
import type {AccountClient} from './accounts.js';
export function dashboardOverview(value:unknown){const row=exact(value,['courses','classrooms','students','activities','deliveries','graded','pending','unread']);for(const count of Object.values(row))if(!Number.isSafeInteger(count)||(count as number)<0)throw Error('Invalid overview count');return row as Record<'courses'|'classrooms'|'students'|'activities'|'deliveries'|'graded'|'pending'|'unread',number>;}
export function DashboardSummary({client,role,onSelect}:{client:AccountClient;role:DashboardRole;onSelect:(id:string)=>void}){
 const [data,setData]=useState<ReturnType<typeof dashboardOverview>|null>(null),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setError(false);void client.overview().then(result=>{if(active)setData(result);}).catch(error=>{if(active){setData(null);setError(true);}if(error instanceof AcademicApiError&&[401,419].includes(error.status??0))setError(true);});return()=>{active=false;};},[client,revision]);
 if(error)return <div className="eval-summary-error" role="status">No se pudo consultar tu resumen. <button onClick={()=>setRevision(revision+1)}>Reintentar</button></div>;
 if(!data)return <p role="status" className="eval-summary-loading">Consultando tu resumen académico…</p>;
 const cards=role==='student'?[['Mis cursos',data.courses,'my_enrollments'],['Pendientes',data.pending,'activities'],['Calificadas',data.graded,'activities'],['Notificaciones',data.unread,'notifications']]:role==='teacher'?[['Aulas asignadas',data.classrooms,'my_assignments'],['Actividades',data.activities,'activities'],['Por revisar',data.pending,'activities'],['Notificaciones',data.unread,'notifications']]:role==='director_admin'?[
  [data.students===1?'Estudiante matriculada':'Estudiantes matriculadas',data.students,'reports'],
  [data.classrooms===1?'Salón':'Salones',data.classrooms,'reports'],
  [data.activities===1?'Actividad':'Actividades',data.activities,'reports'],
  [data.graded===1?'Entrega calificada':'Entregas calificadas',data.graded,'reports'],
 ]:[['Estudiantes matriculadas',data.students,'enrollments'],['Salones',data.classrooms,'assignments'],['Actividades',data.activities,'reports'],['Entregas calificadas',data.graded,'reports']];
 return <div className="eval-summary-grid" aria-label="Resumen académico">{cards.map(([label,value,id])=><button key={label} aria-label={role==='director_admin'?`${label}: ${value}. Ver seguimiento académico`:undefined} onClick={()=>onSelect(String(id))}><strong>{value}</strong><span>{label}</span>{role==='director_admin'&&<small className="eval-summary-action">Ver seguimiento <span aria-hidden="true">↗</span></small>}</button>)}</div>;
}
