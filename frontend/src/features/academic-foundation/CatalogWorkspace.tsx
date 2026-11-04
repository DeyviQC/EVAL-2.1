import {useFormGate} from './form-gates.js';
import {compareGrades,compareSections} from './catalog-order.js';
import {useState,type FormEvent} from 'react';
import type {CatalogKind,CatalogRow} from './directory.js';

type Input={name:string;kind?:string;grade_id?:string};
type Props={kind:CatalogKind;rows:CatalogRow[];grades:CatalogRow[];loading:boolean;busy:boolean;uncertain:boolean;message:string;error:boolean;more:boolean;gradeBusy:boolean;moreGrades:boolean;onKind:(kind:CatalogKind)=>void;onRefresh:()=>void;onMore:()=>void;onMoreGrades:()=>void;onCreate:(input:Input)=>Promise<boolean>;onRename:(id:string,name:string)=>Promise<boolean>;onState:(id:string,active:boolean)=>Promise<boolean>};
export function sectionsForGrade(rows:CatalogRow[],gradeId:string){return rows.filter(row=>row.grade_id===gradeId).sort(compareSections);}
const categories:readonly {kind:CatalogKind;label:string;singular:string}[]=[{kind:'entry',label:'Áreas y materias',singular:'área o materia'},{kind:'grade',label:'Grados',singular:'grado'},{kind:'section',label:'Secciones',singular:'sección'}];
export function CatalogWorkspace(props:Props){
 const {kind,rows,loading,busy,uncertain}=props;
 const grades=[...props.grades].sort(compareGrades);
 const [creating,setCreating]=useState(false),[editing,setEditing]=useState<string|null>(null);
 const [entered,setEntered]=useState(false);
 const [selectedRecord,setSelectedRecord]=useState<string|null>(null);
 const [selectedGrade,setSelectedGrade]=useState('');
 const gradeId=selectedGrade;
 const gate=useFormGate([creating,editing,kind,gradeId]);
 const grade=grades.find(item=>item.id===gradeId);
 const visibleRows=kind==='section'?sectionsForGrade(rows,gradeId):kind==='grade'?[...rows].sort(compareGrades):rows;
 const rowLabel=(row:CatalogRow)=>kind==='section'?`${grades.find(item=>item.id===row.grade_id)?.name??'Grado'} · Sección ${row.name}`:row.name;
 const category=categories.find(item=>item.kind===kind)!;
 const blocked=busy||loading||uncertain||props.error;
 async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);const input:Input={name:String(data.get('name')??'')};if(kind==='entry')input.kind=String(data.get('kind'));if(kind==='section')input.grade_id=gradeId;if(await props.onCreate(input))setCreating(false);}
 async function rename(event:FormEvent<HTMLFormElement>,id:string){event.preventDefault();const name=String(new FormData(event.currentTarget).get('name')??'');if(await props.onRename(id,name))setEditing(null);}
 function choose(next:CatalogKind){setEntered(true);setSelectedGrade('');setSelectedRecord(null);setCreating(false);setEditing(null);if(next!==kind)props.onKind(next);}
 const atGrades=entered&&kind==='section'&&!gradeId;
 const atList=entered&&!atGrades;
 function back(){setCreating(false);setEditing(null);if(selectedRecord){setSelectedRecord(null);}else if(kind==='section'&&gradeId){setSelectedGrade('');}else{setEntered(false);}}
 return <section className="vp-catalog" aria-label="Gestión de catálogo" aria-busy={busy||loading}>
  <header className="vp-catalog-heading"><div><h2>Grados, secciones y áreas</h2><p>Organiza la estructura del colegio.</p></div></header>
  {entered&&<nav className="vp-catalog-path" aria-label="Ubicación en catálogo"><button type="button" disabled={busy||uncertain} onClick={back}>← Volver</button><span>Catálogo / {category.label}{grade?' / '+grade.name:''}{selectedRecord?' / '+(rows.find(row=>row.id===selectedRecord)?rowLabel(rows.find(row=>row.id===selectedRecord)!):'Detalle'):''}</span></nav>}
  {!entered&&<nav className="vp-catalog-menu" aria-label="Tipo de catálogo">{categories.map(item=><button type="button" key={item.kind} disabled={busy||uncertain} onClick={()=>choose(item.kind)}><span className="vp-catalog-tile-icon" aria-hidden="true">{item.kind==='grade'?'01':item.kind==='section'?'A B':'Aa'}</span><strong>{item.label}</strong><span>{item.kind==='grade'?'Gestionar los grados del colegio':item.kind==='section'?'Entrar por grado y ver sus aulas':'Gestionar las áreas de enseñanza'}</span><b aria-hidden="true">→</b></button>)}</nav>}
  {atGrades&&<div className="vp-catalog-grade-picker"><h3>¿Qué grado deseas organizar?</h3><nav aria-label="Filtrar secciones por grado">{grades.map(item=><button type="button" key={item.id} aria-pressed={gradeId===item.id} disabled={busy||uncertain} onClick={()=>{setSelectedGrade(item.id);setSelectedRecord(null);setCreating(false);setEditing(null);}}>{item.name}{item.is_active?'':' · Inactivo'}</button>)}</nav>{props.moreGrades&&<button type="button" disabled={props.gradeBusy} onClick={props.onMoreGrades}>Cargar más grados</button>}{!grades.length&&<p>{props.gradeBusy?'Cargando grados…':'Primero añade un grado en la pestaña Grados.'}</p>}</div>}
  {atList&&!selectedRecord&&<div className="vp-catalog-toolbar"><h3>{kind==='section'?'Secciones de '+(grade?.name??'un grado'):category.label}</h3><div><button type="button" disabled={blocked||creating||(kind==='section'&&!grade)} className="bg-primary" onClick={()=>{setEditing(null);setCreating(true);}}>Añadir {category.singular}</button><button type="button" disabled={busy||loading} onClick={props.onRefresh}>Actualizar</button></div></div>}
  {entered&&loading&&<p role="status">Cargando registros…</p>}
  {(!entered||selectedRecord||atGrades)&&(uncertain||props.error)&&<button type="button" disabled={busy||loading} onClick={props.onRefresh}>Actualizar</button>}
  {props.message&&<p role={props.error||uncertain?'alert':'status'}>{props.message}</p>}
  {uncertain&&<p role="alert">No repitas el cambio. Actualiza la lista y verifica el resultado con administración.</p>}
  {atList&&creating&&<form ref={gate.form} onInput={gate.inspect} onChange={gate.inspect} onSubmit={event=>void create(event)} aria-label={'Añadir '+category.singular} className="vp-catalog-editor"><fieldset disabled={blocked}>
   <legend>Añadir {category.singular}</legend>
   <div className="vp-catalog-fields"><div><label htmlFor="catalog-create-name">Nombre</label><input id="catalog-create-name" name="name" pattern=".*\S.*" required maxLength={255} autoFocus placeholder={kind==='section'?'Ejemplo: A':kind==='grade'?'Ejemplo: Primero':'Ejemplo: Matemática'}/></div>
   {kind==='entry'&&<div><label htmlFor="catalog-create-kind">Tipo</label><select id="catalog-create-kind" name="kind" defaultValue="area"><option value="area">Área</option><option value="subject">Materia</option></select></div>}
   {kind==='section'&&<div><label htmlFor="catalog-create-grade">Grado</label><input id="catalog-create-grade" value={grade?.name??''} readOnly aria-readonly="true"/></div>}</div>
   <div className="vp-catalog-actions"><button type="submit" disabled={!gate.complete} className="bg-primary">Guardar</button><button type="button" onClick={()=>setCreating(false)}>Cancelar</button></div>
  </fieldset></form>}
  {atList&&!creating&&!loading&&visibleRows.length===0&&!props.error&&<p role="status">{kind==='section'?'Este grado todavía no tiene secciones. Usa «Añadir sección».':'Todavía no hay registros en este apartado.'}</p>}
  {atList&&!creating&&!selectedRecord&&!loading&&<div className="vp-catalog-record-grid">{visibleRows.map(row=><button className="vp-catalog-record-card" type="button" key={row.id} onClick={()=>setSelectedRecord(row.id)}><strong>{rowLabel(row)}</strong><span>{row.is_active?'Activo':'Inactivo'}</span><b>Ver y gestionar →</b></button>)}</div>}
  {atList&&!creating&&selectedRecord&&<div className="vp-catalog-list">{!loading&&visibleRows.filter(row=>row.id===selectedRecord).map(row=><article key={row.id} aria-label={rowLabel(row)} className="vp-catalog-row">
   <div className="vp-catalog-row-main"><div><h4>{rowLabel(row)}</h4>{kind==='entry'?<p>{row.kind==='area'?'Área':'Materia'}</p>:null}</div><span className={'vp-catalog-state '+(row.is_active?'is-active':'is-inactive')}>{row.is_active?'Activo':'Inactivo'}</span><div className="vp-catalog-actions"><button type="button" disabled={blocked} aria-label={'Editar '+rowLabel(row)} onClick={()=>{setCreating(false);setEditing(editing===row.id?null:row.id);}}>Editar</button><button type="button" disabled={blocked} aria-label={(row.is_active?'Desactivar ':'Reactivar ')+rowLabel(row)} onClick={()=>{setEditing(null);setCreating(false);void props.onState(row.id,!row.is_active);}}>{row.is_active?'Desactivar':'Reactivar'}</button></div></div>
   {editing===row.id&&<form ref={gate.form} onInput={gate.inspect} onChange={gate.inspect} aria-label={'Editar '+rowLabel(row)} onSubmit={event=>void rename(event,row.id)} className="vp-catalog-editor"><fieldset disabled={blocked}><label htmlFor={'catalog-name-'+row.id}>Nombre</label><input id={'catalog-name-'+row.id} name="name" defaultValue={row.name} required maxLength={255} autoFocus/><div className="vp-catalog-actions"><button type="submit" className="bg-primary">Guardar nombre</button><button type="button" onClick={()=>setEditing(null)}>Cancelar</button></div></fieldset></form>}

  </article>)}</div>}
  {atList&&!selectedRecord&&props.more&&!loading&&<button disabled={busy} onClick={props.onMore}>Cargar más registros</button>}
 </section>;
}
