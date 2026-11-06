import {consultationMatch} from './consultation-search.js';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,CalendarDays,GraduationCap,School} from 'lucide-react';
import {type AcademicClient,AcademicApiError} from './api.js';
import {periodPage,catalogPage,type CatalogRow} from './directory.js';
const categories=[{id:'periods',label:'Períodos',description:'Años académicos y estado',icon:CalendarDays},{id:'catalog/grade',label:'Grados',description:'Grados de la institución',icon:GraduationCap},{id:'catalog/section',label:'Secciones',description:'Salones organizados por grado',icon:School},{id:'catalog/entry',label:'Áreas y materias',description:'Oferta académica',icon:BookOpen}] as const;
type Category=typeof categories[number]['id'];
type Row={id:string;name:string;state:string;grade_id?:string};
export function InstitutionReadView({client,onExpired}:{client:AcademicClient;onExpired:()=>void}){
 const [category,setCategory]=useState<Category|null>(null),[rows,setRows]=useState<Row[]>([]),[grades,setGrades]=useState<CatalogRow[]>([]),[grade,setGrade]=useState(''),[after,setAfter]=useState<string|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [search,setSearch]=useState(''),[stateFilter,setStateFilter]=useState('');
 const generation=useRef(0),heading=useRef<HTMLHeadingElement>(null);
 async function load(cursor:string|null=null){
  if(!category)return;const token=++generation.current;setBusy(true);setNotice('');
  try{
   if(category==='catalog/section'){
    async function collect(kind:'grade'|'section'){
     let cursor:string|null=null;const result:CatalogRow[]=[];
     do{const page:{items:CatalogRow[];next_after:string|null}=await client.directory(kind==='grade'?'catalog/grade':'catalog/section',catalogPage(kind),cursor);if(token!==generation.current)return [];if(cursor&&page.items.some(row=>BigInt(row.id)<=BigInt(cursor!)))throw Error('Invalid cursor');result.push(...page.items);if(page.next_after!==null&&cursor!==null&&BigInt(page.next_after)<=BigInt(cursor))throw Error('Invalid cursor');cursor=page.next_after;}while(cursor!==null);
     return result;
    }
    const [allGrades,sections]=await Promise.all([collect('grade'),collect('section')]);
    if(token!==generation.current)return;setGrades(allGrades);setRows(sections.map(row=>({...row,state:row.is_active?'Activo':'Inactivo'})));setAfter(null);
   }else{
    const page=category==='periods'?await client.directory('periods',periodPage,cursor):await client.directory(category,catalogPage(category==='catalog/grade'?'grade':'entry'),cursor);
    if(token!==generation.current)return;
    setRows(page.items.map(row=>({id:row.id,name:row.name,state:'state' in row?({planned:'Planificado',active:'Activo',closed:'Cerrado'}[row.state]??row.state):row.is_active?'Activo':'Inactivo'})));setAfter(page.next_after);
   }
  }catch(error){if(token===generation.current){setRows([]);setAfter(null);if(error instanceof AcademicApiError&&[401,419].includes(error.status??0))onExpired();else setNotice('No se pudo consultar la información. Vuelve a intentarlo.');}}
  finally{if(token===generation.current)setBusy(false);}
 }
 useEffect(()=>{setRows([]);setAfter(null);setGrade('');setSearch('');setStateFilter('');void load();heading.current?.focus();return()=>{generation.current++;};},[category,client]);
 const current=categories.find(item=>item.id===category),gradeName=grades.find(item=>item.id===grade)?.name;
 const shown=(category==='catalog/section'?rows.filter(row=>row.grade_id===grade):rows).filter(row=>consultationMatch(search,row.name)&&(!stateFilter||row.state===stateFilter));
 return <section aria-label="Información institucional" aria-busy={busy} className="eval-institution space-y-6">
  <header><span className="eval-role-eyebrow">Dirección · Solo lectura</span><h2 ref={heading} tabIndex={-1}>{current?.label??'Información institucional'}</h2><p>{current?.description??'Elige qué deseas consultar.'}</p></header>
  {!category?<nav className="eval-consult-grid" aria-label="Consultas institucionales">{categories.map(({id,label,description,icon:Icon})=><button key={id} type="button" onClick={()=>setCategory(id)}><span className="eval-consult-icon"><Icon size={27}/></span><strong>{label}</strong><span>{description}</span><b>Consultar →</b></button>)}</nav>:<>
   <nav className="eval-role-breadcrumb" aria-label="Ubicación de la consulta"><button type="button" disabled={busy} onClick={()=>setCategory(null)}>← Todas las consultas</button>{gradeName&&<><span>/</span><button type="button" disabled={busy} onClick={()=>setGrade('')}>{gradeName} · Cambiar grado</button></>}</nav>
   <div className="eval-find-panel"><label>Buscar en esta consulta<input value={search} maxLength={100} onChange={e=>setSearch(e.target.value)} placeholder="Escribe un nombre" /></label><label>Estado<select value={stateFilter} onChange={e=>setStateFilter(e.target.value)}><option value="">Todos</option>{[...new Set(rows.map(row=>row.state))].map(state=><option key={state}>{state}</option>)}</select></label><button onClick={()=>{setSearch('');setStateFilter('');}}>Limpiar filtros</button><p>La búsqueda filtra los registros de la página visible.</p></div><p role="status">{notice|| (busy?'Consultando…':'')}</p>
   {category==='catalog/section'&&!grade?<div className="eval-consult-grid" aria-label="Seleccionar grado">{grades.filter(row=>consultationMatch(search,row.name)&&(!stateFilter||(row.is_active?'Activo':'Inactivo')===stateFilter)).map(row=><button type="button" key={row.id} disabled={busy} onClick={()=>{setGrade(row.id);setSearch('');setStateFilter('');}}><span className="eval-consult-icon"><GraduationCap size={27}/></span><strong>{row.name}</strong><span>{rows.filter(section=>section.grade_id===row.id).length} secciones · {row.is_active?'Activo':'Inactivo'}</span><b>Ver secciones →</b></button>)}{!busy&&!grades.length&&!notice&&<p>No hay grados registrados.</p>}</div>:<>
    {gradeName&&<h3>Secciones de {gradeName}</h3>}
    <div className="eval-directory-table"><table><thead><tr><th>{category==='catalog/section'?'Sección':'Nombre'}</th><th>Estado</th></tr></thead><tbody>{shown.map(row=><tr key={row.id}><td>{category==='catalog/section'?gradeName+' · '+row.name:row.name}</td><td><span className={'eval-record-state '+(row.state==='Activo'?'is-active':'')}>{row.state}</span></td></tr>)}</tbody></table></div>
    {!busy&&!shown.length&&!notice&&<p className="eval-empty-state">No hay registros para esta consulta.</p>}
   </>}
   <div className="eval-activity-actions"><button type="button" disabled={busy} onClick={()=>void load()}>Actualizar consulta</button>{after&&<button type="button" disabled={busy} onClick={()=>void load(after)}>Siguiente página</button>}</div>
  </>}
 </section>;
}
