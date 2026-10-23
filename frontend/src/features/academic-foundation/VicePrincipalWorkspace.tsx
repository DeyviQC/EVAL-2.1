import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,FileText,FolderOpen,GraduationCap,History,LockKeyhole,Search,UserPlus,Users} from 'lucide-react';

type Choice={id:string;label:string;description:string;icon:typeof Users};
export const vicePrincipalTasks:Record<string,{title:string;choices:Choice[]}>= {
 periods:{title:'Períodos académicos',choices:[{id:'list',label:'Consultar períodos',description:'Revisar fechas y estados.',icon:CalendarDays},{id:'create',label:'Nuevo período',description:'Registrar un año académico.',icon:UserPlus}]},
 enrollments:{title:'Matrículas',choices:[{id:'list',label:'Estudiantes por aula',description:'Consultar, trasladar o cerrar matrículas.',icon:GraduationCap},{id:'create',label:'Nueva matrícula',description:'Matricular a una estudiante.',icon:UserPlus}]},
 assignments:{title:'Asignaciones docentes',choices:[{id:'list',label:'Docentes por aula',description:'Consultar cursos y cambiar asignaciones.',icon:Users},{id:'create',label:'Asignar docente',description:'Planificar un curso en un aula.',icon:UserPlus}]},
 users:{title:'Usuarios',choices:[{id:'list',label:'Buscar una cuenta',description:'Consultar y gestionar accesos.',icon:Search},{id:'create',label:'Crear una cuenta',description:'Registrar estudiante o docente.',icon:UserPlus},{id:'bulk',label:'Carga masiva',description:'Importar cuentas desde un archivo.',icon:Users}]},
 calendar:{title:'Calendario institucional',choices:[{id:'published',label:'Calendario publicado',description:'Consultar bimestres y semanas.',icon:CalendarDays},{id:'drafts',label:'Revisar borradores',description:'Abrir, editar o publicar un borrador.',icon:FileText},{id:'create',label:'Nuevo borrador',description:'Preparar las fechas del colegio.',icon:UserPlus}]},
 supervision:{title:'Supervisión de materiales',choices:[{id:'review',label:'Revisar materiales',description:'Elegir un aula y acompañar al docente.',icon:FolderOpen}]},
 reports:{title:'Reportes',choices:[{id:'classroom',label:'Reporte de aula',description:'Consultar resultados y descargar reportes.',icon:FileText},{id:'bimesters',label:'Cierre de bimestres',description:'Revisar el estado de las calificaciones.',icon:LockKeyhole}]},
 history:{title:'Historial',choices:[{id:'enrollments',label:'Matrículas anteriores',description:'Consultar la trayectoria de las estudiantes.',icon:GraduationCap},{id:'assignments',label:'Asignaciones anteriores',description:'Consultar los cambios de docentes.',icon:History}]},
 audit:{title:'Bitácora de auditoría',choices:[{id:'all',label:'Consultar movimientos',description:'Buscar operaciones y ver sus detalles.',icon:Search}]},
 notifications:{title:'Notificaciones',choices:[{id:'inbox',label:'Ver avisos',description:'Consultar las novedades de tu cuenta.',icon:FileText}]},
 account:{title:'Mi cuenta',choices:[{id:'profile',label:'Mis datos',description:'Consultar tu nombre y usuario.',icon:Users},{id:'security',label:'Cambiar contraseña',description:'Actualizar tu acceso personal.',icon:LockKeyhole}]},
};
const FlowContext=createContext<string|null>(null);
export const useVicePrincipalTask=()=>useContext(FlowContext);
export function VicePrincipalWorkspace({section,children}:{section:string;children:ReactNode}){
 const [pending,setPending]=useState(false);
 const config=vicePrincipalTasks[section];const [task,setTask]=useState<string|null>(null),[menu,setMenu]=useState(true);const root=useRef<HTMLElement>(null);const title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const node=root.current;if(!node)return;const refresh=()=>setPending(!!node.querySelector('[aria-busy="true"]'));const observer=new MutationObserver(refresh);observer.observe(node,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-busy']});refresh();return()=>observer.disconnect();},[task,menu]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});title.current?.focus({preventScroll:true});},[menu,task]);
 if(!config)return <>{children}</>;
 const current=config.choices.find(choice=>choice.id===task);
 return <section ref={root} className="vp-workflow" aria-label={'Opciones de '+config.title}>
  <header className="vp-workflow-heading"><span className="vp-workflow-eyebrow">SUBDIRECCIÓN</span><h2 ref={title} tabIndex={-1}>{config.title}</h2><p>{menu?'¿Qué deseas hacer?':current?.label}</p></header>
  {menu&&<nav className="vp-action-grid" aria-label={'Acciones de '+config.title}>{config.choices.map(({id,label,description,icon:Icon})=><button key={id} type="button" onClick={()=>{setTask(id);setMenu(false);}}><span className="vp-action-icon"><Icon size={25} strokeWidth={1.6} aria-hidden="true"/></span><strong>{label}</strong><span>{description}</span><ArrowRight size={20} aria-hidden="true"/></button>)}</nav>}
  {!menu&&<nav className="vp-flow-path" aria-label="Ubicación del módulo"><button type="button" disabled={pending} onClick={()=>{if(root.current?.querySelector('[aria-busy="true"]'))return;setMenu(true);}}><ArrowLeft size={18} aria-hidden="true"/> Volver a opciones</button><span>{config.title} / {current?.label}</span></nav>}
  {task&&<div hidden={menu} className="vp-task-content"><FlowContext.Provider value={task}>{children}</FlowContext.Provider></div>}
 </section>;
}

type Named={id:string;name:string;grade_id?:string};
export function ClassroomSteps({period,grade,section,periods,grades,sections,onChange,disabled=false}:{period:string;grade:string;section:string;periods:Named[];grades:Named[];sections:Named[];onChange:(period:string,grade:string,section:string)=>void;disabled?:boolean}){
 const step=!period?'Año académico':!grade?'Grado':!section?'Sección':null;
 const choices=!period?periods:!grade?grades:sections.filter(item=>item.grade_id===grade);
 return <section className="vp-classroom-steps" aria-label="Seleccionar aula">
  <nav className="vp-scope-path" aria-label="Aula seleccionada">
   {period&&<button type="button" disabled={disabled} onClick={()=>onChange('','','')}>{periods.find(item=>item.id===period)?.name??'Año'} · Cambiar</button>}
   {grade&&<button type="button" disabled={disabled} onClick={()=>onChange(period,'','')}>{grades.find(item=>item.id===grade)?.name??'Grado'} · Cambiar</button>}
   {section&&<button type="button" disabled={disabled} onClick={()=>onChange(period,grade,'')}>Sección {sections.find(item=>item.id===section)?.name} · Cambiar</button>}
  </nav>
  {step&&<><h3>Selecciona {step==='Año académico'?'el año académico':step==='Grado'?'el grado':'la sección'}</h3><div className="vp-choice-grid">{choices.map(item=><button type="button" disabled={disabled} key={item.id} onClick={()=>!period?onChange(item.id,'',''):!grade?onChange(period,item.id,''):onChange(period,grade,item.id)}>{step==='Sección'?'Sección ':''}{item.name}<ArrowRight size={18} aria-hidden="true"/></button>)}</div>{!choices.length&&<p role="status">{disabled?'Cargando opciones…':'No hay opciones cargadas. Actualiza o carga más registros.'}</p>}</>}
 </section>;
}
