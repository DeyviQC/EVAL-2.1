import {useActionFeedback} from './ActionFeedback.js';
import {useFormGate,validDateOrder} from './form-gates.js';
import {useVicePrincipalTask} from './VicePrincipalWorkspace.js';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AcademicApiError, type createAcademicClient } from './api.js';
import { periodPage, catalogPage, type CatalogKind, type CatalogRow } from './directory.js';
import { type period } from './contracts.js';
import {CatalogWorkspace} from './CatalogWorkspace.js';
type Client=ReturnType<typeof createAcademicClient>;
type Period=ReturnType<typeof period>;
const control='rounded-lg border border-eval-ink/30 px-3 py-2';
function errorMessage(error:unknown){
  if(!(error instanceof AcademicApiError))return 'No se pudo validar la respuesta. Consulta de nuevo.';
  if(error.status===403)return 'No tienes permiso para esta operación.';
  if(error.status===401||error.status===419)return 'La sesión debe verificarse nuevamente.';
  if(error.outcomeUnknown)return 'No se pudo confirmar el resultado. No repitas la operación; consulta los registros antes de continuar.'+(error.correlationId?' Referencia: '+error.correlationId:'');
  if(error.status===409)return 'La operación entra en conflicto con el estado actual o con un nombre existente. Consulta los registros.';
  if(error.status===422)return 'Revisa los campos y las fechas. El servidor no aceptó la operación.';
  return 'No se pudo completar la consulta. Verifica la conexión y consulta de nuevo.';
}
export function FoundationWorkspace({section,client,onExpired}:{section:'periods'|'catalog';client:Client;onExpired:()=>void}){
  const feedback=useActionFeedback();
  const task=useVicePrincipalTask();
  const [startDate,setStartDate]=useState(''),[endDate,setEndDate]=useState('');
  const gate=useFormGate([startDate,endDate,task]);
  const [kind,setKind]=useState<CatalogKind>('entry');const [periods,setPeriods]=useState<Period[]>([]);const [rows,setRows]=useState<CatalogRow[]>([]);
  const [grades,setGrades]=useState<CatalogRow[]>([]);const [gradeCursor,setGradeCursor]=useState<string|null>(null);
  const [gradeBusy,setGradeBusy]=useState(false);const gradeRequest=useRef(false);
  const [cursor,setCursor]=useState<string|null>(null);const [phase,setPhase]=useState<'loading'|'ready'|'error'>('loading');
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [uncertain,setUncertain]=useState(false);
  const generation=useRef(0);const mounted=useRef(true);const writing=useRef(false);
  function failed(error:unknown){setMessage(errorMessage(error));if(error instanceof AcademicApiError){if(error.status===401||error.status===419)onExpired();if(error.outcomeUnknown)setUncertain(true);}}
  async function load(after:string|null=null,append=after!==null){const current=++generation.current;setPhase('loading');setMessage('');
    try{if(section==='periods'){const page=await client.directory('periods',periodPage,after);if(!mounted.current||current!==generation.current)return;setPeriods(old=>append?[...old,...page.items]:page.items);setCursor(page.next_after);}
      else{let page=await client.directory(`catalog/${kind}`,catalogPage(kind),after);const collected=[...page.items];
        // Grade navigation must include sections beyond the first directory page.
        while(kind==='section'&&page.next_after!==null){const previous=page.next_after;page=await client.directory('catalog/section',catalogPage('section'),previous);if(!mounted.current||current!==generation.current)return;if(page.items.some(row=>BigInt(row.id)<=BigInt(previous)))throw new Error('Invalid section cursor');collected.push(...page.items);if(page.next_after!==null&&BigInt(page.next_after)<=BigInt(previous))throw new Error('Invalid section cursor');}
        if(!mounted.current||current!==generation.current)return;setRows(old=>append?[...old,...collected]:collected);setCursor(page.next_after);}
      setPhase('ready');return true;
    }catch(error){if(!mounted.current||current!==generation.current)return;setPeriods([]);setRows([]);setCursor(null);setPhase('error');failed(error);}
  }
  async function refreshRecords(){
    if(await load())feedback.success(section==='periods'?'Períodos actualizados correctamente.':'Catálogo actualizado correctamente.');
  }
  async function loadGrades(after:string|null=null){if(gradeRequest.current)return;gradeRequest.current=true;setGradeBusy(true);
    try{const page=await client.directory('catalog/grade',catalogPage('grade'),after);if(!mounted.current)return;setGrades(old=>after?[...old,...page.items]:page.items);setGradeCursor(page.next_after);}
    catch(error){if(mounted.current){setGrades([]);failed(error);}}finally{gradeRequest.current=false;if(mounted.current)setGradeBusy(false);}}
  useEffect(()=>{mounted.current=true;lastPage.current=null;void load();if(section==='catalog'&&kind==='section')void loadGrades();return ()=>{mounted.current=false;generation.current++;};},[section,kind]);
  const lastPage=useRef<string|null>(null);
  async function mutate(operation:()=>Promise<unknown>,created=false,ask=true,label?:string,danger=false):Promise<boolean>{if(writing.current||uncertain)return false;writing.current=true;if(ask&&!await feedback.confirm({title:label??(created?'¿Crear este registro?':'¿Guardar los cambios?'),danger,message:created?'Se registrarán los datos que acabas de completar.':'Se actualizará el registro seleccionado.'})){writing.current=false;return false;}if(!mounted.current){writing.current=false;return false;}setBusy(true);setMessage('');
    try{const result=await operation() as {id:string};if(!mounted.current)return false;feedback.success(created?'Registro creado correctamente.':'Cambio confirmado.');
      if(created&&!(section==='catalog'&&kind==='section')){const prior=(BigInt(result.id)-1n).toString();lastPage.current=prior==='0'?null:prior;}
      const refreshed=await load(lastPage.current,false);if(mounted.current)setMessage(refreshed?'Cambio guardado.':'Cambio guardado. No se pudo actualizar la lista. Pulsa Actualizar.');return true;}
    catch(error){if(mounted.current)failed(error);return false;}finally{writing.current=false;if(mounted.current)setBusy(false);}
  }
  function create(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy||uncertain||phase!=='ready'||section==='periods'&&(!gate.complete||!validDateOrder(startDate,endDate)))return;const form=event.currentTarget;const data=new FormData(form);const name=String(data.get('name')??'');
    if(section==='periods')void mutate(()=>client.createPeriod({name,start_on:String(data.get('start_on')),end_on:String(data.get('end_on'))}),true);
    else void mutate(()=>client.createCatalog(kind,{name,...(kind==='entry'?{kind:String(data.get('kind'))}:kind==='section'?{grade_id:String(data.get('grade_id'))}:{})}),true);
  }
  if(section==='catalog')return <CatalogWorkspace kind={kind} rows={rows} grades={grades} loading={phase==='loading'} busy={busy} uncertain={uncertain} message={message} error={phase==='error'} more={cursor!==null} gradeBusy={gradeBusy} moreGrades={gradeCursor!==null} onKind={next=>{generation.current++;setRows([]);setCursor(null);setPhase('loading');setKind(next);}} onRefresh={()=>{void refreshRecords();if(kind==='section'&&!grades.length)void loadGrades();}} onMore={()=>void load(cursor)} onMoreGrades={()=>void loadGrades(gradeCursor)} onCreate={input=>mutate(()=>client.createCatalog(kind,input),true)} onRename={(id,name)=>mutate(()=>client.updateCatalog(kind,id,{name}))} onState={(id,is_active)=>mutate(()=>client.updateCatalog(kind,id,{is_active}),false,true,(is_active?'¿Reactivar':'¿Desactivar')+' este registro?',!is_active)}/>;
  return <section aria-label={section==='periods'?'Gestión de períodos':'Gestión de catálogo'} aria-busy={busy||phase==='loading'}>
    <h3 className="text-xl font-semibold">{section==='periods'?'Períodos académicos':'Catálogo académico'}</h3>
    <p>Consulta las fechas y el estado del año académico.</p>
    <button className={control} disabled={busy||phase==='loading'} onClick={()=>void refreshRecords()}>Actualizar registros</button>
    {phase==='loading'&&<p role="status">Consultando registros…</p>}
    {message&&<p role={phase==='error'||uncertain?'alert':'status'}>{message}</p>}
    {uncertain&&<p role="alert">Operaciones suspendidas para evitar duplicados. Verifica el resultado con administración antes de iniciar otra sesión de trabajo.</p>}
    {(task===null||task==='create')&&<form ref={gate.form} onInput={gate.inspect} onChange={gate.inspect} onSubmit={create} className="my-5 flex flex-wrap gap-3" aria-label={section==='periods'?'Crear período':'Crear registro de catálogo'}>
      <fieldset disabled={busy||uncertain||phase!=='ready'} className="flex flex-wrap gap-3">
        <legend>{section==='periods'?'Crear período':'Crear registro'}</legend>
        <label>Nombre <input className={control} name="name" pattern=".*\S.*" required maxLength={255}/></label>
        {section==='periods'?<><label>Inicio <input className={control} name="start_on" type="date" value={startDate} onChange={event=>setStartDate(event.target.value)} required/></label><label>Fin <input className={control} name="end_on" type="date" min={startDate||undefined} disabled={!startDate} value={endDate} onChange={event=>setEndDate(event.target.value)} required/></label></>:
          kind==='entry'?<label>Materia o área <select className={control} name="kind"><option value="subject">Materia</option><option value="area">Área</option></select></label>:
          kind==='section'?<><label>Grado <select className={control} name="grade_id" aria-label="Grado" required disabled={gradeBusy}><option value="">Selecciona un grado</option>{grades.map(grade=><option key={grade.id} value={grade.id}>{grade.name}{grade.is_active?'':' (inactivo)'}</option>)}</select></label>{gradeCursor&&<button type="button" disabled={gradeBusy} onClick={()=>void loadGrades(gradeCursor)}>Cargar más grados</button>}</>:null}
        <button className={control} type="submit" disabled={section==='periods'&&(!gate.complete||!validDateOrder(startDate,endDate))}>{section==='periods'?'Crear período':'Crear registro'}</button>
      </fieldset>
    </form>}
    {phase==='ready'&&(section==='periods'?periods.length===0:rows.length===0)&&<p>No hay registros para mostrar.</p>}
    {task!=='create'&&phase==='ready'&&section==='periods'&&periods.map(row=><article key={row.id} className="vp-period-card" data-state={row.state} aria-label={row.name}>
      <div className="vp-period-card-heading"><h4 className="font-semibold whitespace-pre-wrap">{row.name}</h4><span className="vp-period-status">{({planned:'Planificado',active:'Activo',closed:'Cerrado'})[row.state]}</span></div>
      <dl className="vp-period-dates"><div><dt>Inicio</dt><dd>{row.start_on}</dd></div><div><dt>Fin</dt><dd>{row.end_on}</dd></div></dl>
      {row.state!=='closed'&&<button className={control} disabled={busy||uncertain} onClick={()=>void mutate(()=>client.transitionPeriod(row.id,row.state==='planned'?'activate':'close'),false,true,(row.state==='planned'?'¿Activar':'¿Cerrar')+' el período «'+row.name+'»?',row.state==='active')}>{row.state==='planned'?'Solicitar activación':'Solicitar cierre'}</button>}
    </article>)}
    {phase==='ready'&&cursor&&<button className={control} disabled={busy} onClick={()=>void load(cursor)}>Cargar más registros</button>}
  </section>;
}
