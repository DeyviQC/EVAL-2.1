import {useFormGate} from './form-gates.js';
import {useActionFeedback} from './ActionFeedback.js';
import {useVicePrincipalTask} from './VicePrincipalWorkspace.js';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { AccountError,type Account,type AccountClient,type OwnAccount,type AccountDirectoryFilters } from './accounts.js';
import type { AcademicClient } from './api.js';
import { BulkImportWorkspace } from './BulkImportWorkspace.js';
import { Upload } from 'lucide-react';
const field='w-full rounded-xl border border-border bg-surface text-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
const button='inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
function message(error:unknown){if(error instanceof AccountError){if(error.uncertain)return 'No se pudo confirmar el resultado. Revisa la cuenta antes de continuar.';if(error.category==='username_unavailable')return 'Ese nombre de usuario ya está registrado.';if(error.category==='invalid_current_password')return 'La contraseña actual no es correcta.';if(error.category==='password_unchanged')return 'La nueva contraseña debe ser diferente a la contraseña provisional.';if(error.category==='invalid_input')return 'Revisa los campos y los límites indicados.';}return 'No se pudo completar la consulta u operación.';}
export function UsersWorkspace({client,academic,onExpired}:{client:AccountClient;academic?:AcademicClient|undefined;onExpired:()=>void}){
 const feedback=useActionFeedback();
 const task=useVicePrincipalTask();
 const [selectedAccount,setSelectedAccount]=useState<string|null>(null);
 const [roleFilter,setRoleFilter]=useState<Account['role']|''>('');
 const [statusFilter,setStatusFilter]=useState<'active'|'inactive'|''>('');
 const [directoryReady,setDirectoryReady]=useState(false),[directoryError,setDirectoryError]=useState(false);
 const appliedFilters=useRef<AccountDirectoryFilters>({});
 const generation=useRef(0);
 const [panel,setPanel]=useState<'list'|'create'|'bulk'>('list');const [items,setItems]=useState<Account[]>([]),[after,setAfter]=useState<string|null>(null),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[secret,setSecret]=useState<{username:string;password:string}|null>(null),[unknown,setUnknown]=useState(false);
 const accountGate=useFormGate([panel]);
 useEffect(()=>{if(task==='list'||task==='create'||task==='bulk'){setPanel(task);setSelectedAccount(null);}},[task]);
 function failure(error:unknown){if(error instanceof AccountError&&[401,419].includes(error.status??0)){onExpired();return;}setUnknown(error instanceof AccountError&&error.uncertain);setNotice(message(error));}
 async function load(next:string|null=null,append=false,filters=appliedFilters.current){
  const request=++generation.current;setBusy(true);setDirectoryReady(false);setDirectoryError(false);
  if(!append){setSelectedAccount(null);appliedFilters.current={...filters};setItems([]);setAfter(null);}
  try{const page=await client.directory('',next,filters);if(request!==generation.current)return;setItems(prior=>append?[...prior,...page.items]:page.items);setAfter(page.next_after);setDirectoryReady(true);}
  catch(error){if(request===generation.current){setDirectoryError(true);if(error instanceof AccountError&&[401,419].includes(error.status??0))onExpired();}}
  finally{if(request===generation.current)setBusy(false);}
 }
 useEffect(()=>{void load(null,false,{});return()=>{generation.current++;};},[client]);
 function applyFilters(){setNotice('');void load(null,false,{search:search.trim(),role:roleFilter,status:statusFilter});}
 function clearFilters(){setSearch('');setRoleFilter('');setStatusFilter('');setNotice('');void load(null,false,{});}
 async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,values=new FormData(form);if(busy||unknown||!await feedback.confirm({title:'¿Crear esta cuenta?',message:'Se creará el acceso de '+String(values.get('name'))+'.'}))return;setBusy(true);setNotice('');setSecret(null);try{const username=String(values.get('username')).trim().toLowerCase();const result=await client.create(String(values.get('name')),username,String(values.get('role')) as Account['role']);feedback.success('Cuenta creada correctamente.');setSecret({username,password:result.password!});form.reset();setPanel('list');setNotice('Cuenta creada. Asigna su aula o curso desde la sección correspondiente.');try{setSearch(username);setRoleFilter('');setStatusFilter('');await load(null,false,{search:username});}catch{setNotice('Cuenta creada; no se pudo actualizar la lista. Guarda su contraseña.');}}catch(error){failure(error);}finally{setBusy(false);}}
 async function confirm(confirmation:{account:Account;action:'reset-password'|'deactivate'|'reactivate'}){if(busy||unknown)return;if(!await feedback.confirm({title:confirmation.action==='deactivate'?'¿Desactivar esta cuenta?':confirmation.action==='reactivate'?'¿Reactivar esta cuenta?':'¿Restablecer la contraseña?',message:confirmation.account.name+' · '+(confirmation.action==='reset-password'?'Se generará una nueva contraseña y se cerrarán sus sesiones.':'Sus matrículas, cursos e historial se conservarán.'),danger:confirmation.action!=='reactivate'}))return;setBusy(true);setNotice('');setSecret(null);try{const result=await client.action(confirmation.account.id,confirmation.action);if(result.password)setSecret({username:confirmation.account.username,password:result.password});setNotice('Operación confirmada.');feedback.success('Acceso actualizado correctamente.');try{await load();}catch{setNotice('Operación confirmada; no se pudo actualizar la lista.');}}catch(error){failure(error);}finally{setBusy(false);}}
 return <section aria-label="Gestión de usuarios" aria-busy={busy} className="eval-users-workspace space-y-6">
  <header className="border-b border-border/80 pb-5">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
        ADMINISTRACIÓN LOCAL
      </span>
    </div>
    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-text tracking-tight">Usuarios</h2>
    <p className="text-xs sm:text-sm text-text-muted mt-1">Gestión de cuentas institucionales para docentes y estudiantes.</p>
  </header>
  {task===null&&<div className="eval-course-tabs flex gap-2 p-1 bg-surface-2 border border-border rounded-xl max-w-md" role="group" aria-label="Gestión de usuarios">
    <button aria-pressed={panel==='list'} disabled={busy} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${panel==='list'?'bg-primary text-white shadow-xs':'text-text-muted hover:text-text'}`} onClick={()=>setPanel('list')}>Consultar usuarios</button>
    <button aria-pressed={panel==='create'} disabled={busy} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${panel==='create'?'bg-primary text-white shadow-xs':'text-text-muted hover:text-text'}`} onClick={()=>setPanel('create')}>Crear cuenta</button>
    <button aria-pressed={panel==='bulk'} disabled={busy} className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${panel==='bulk'?'bg-primary text-white shadow-xs':'text-text-muted hover:text-text'}`} onClick={()=>setPanel('bulk')}><Upload size={18} aria-hidden="true" className="shrink-0"/> Carga masiva</button>
  </div>}
  {notice&&<div className="p-3.5 rounded-xl bg-surface-2 border border-border text-xs text-text"><p role="status">{notice}</p></div>}
  {secret&&<section className="my-5 rounded-2xl border border-primary/30 bg-primary-soft/30 p-5 space-y-3"><h3 className="font-bold text-text text-sm">Acceso de {secret.username}</h3><label className="block text-xs font-semibold text-text uppercase tracking-wider">Contraseña generada<input className={field} value={secret.password} readOnly autoComplete="off" /></label><p className="text-xs text-text-muted">Guárdala antes de cerrar este mensaje. No podrás consultarla de nuevo.</p><button className={button} onClick={()=>setSecret(null)}>Ocultar contraseña</button></section>}
  {unknown&&<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2"><p>Consulta el usuario. Para continuar tras revisar el resultado, <button className={button} onClick={()=>{client.acknowledgeReview();setUnknown(false);setNotice('Resultado revisado. Puedes realizar una nueva operación explícita.');}}>He revisado el resultado</button></p></div>}
  {panel==='bulk'&&<BulkImportWorkspace client={client} academic={academic} onExpired={onExpired} onComplete={()=>void load()}/>}
  {panel==='create'&&<form ref={accountGate.form} onInput={accountGate.inspect} onChange={accountGate.inspect} onSubmit={event=>void create(event)} aria-label="Crear cuenta" className="max-w-lg p-6 bg-surface border border-border rounded-2xl shadow-xs"><fieldset disabled={busy||unknown} className="space-y-4"><legend className="font-bold text-text text-base">Crear cuenta</legend><label className="block text-xs font-semibold text-text uppercase tracking-wider">Nombre<input className={field} name="name" pattern=".*\S.*" required maxLength={255} /></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Nombre de usuario (DNI o institucional)<input className={field} name="username" aria-label="Nombre de usuario" required minLength={3} maxLength={64} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,63}" autoCapitalize="none" autoComplete="off" /><small className="text-[11px] text-text-muted mt-1 block">DNI (8 dígitos) para estudiantes, o usuario institucional (3–64 caracteres alfanuméricos).</small></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Tipo de cuenta<select className={field} name="role" aria-label="Tipo de cuenta"><option value="student">Estudiante</option><option value="teacher">Docente</option></select></label><p className="text-xs text-text-muted">Crear la cuenta no matricula al estudiante ni asigna cursos al docente.</p><button disabled={!accountGate.complete} className={button+' bg-accent text-navy-950 hover:bg-accent-hover font-bold border-transparent px-5 py-2.5'}>Crear cuenta</button></fieldset></form>}
  <div hidden={panel!=='list'} className="space-y-4">
    <form aria-label="Filtrar alumnos y docentes" className="p-4 bg-surface border border-border rounded-xl shadow-xs flex flex-wrap items-end gap-3" onSubmit={event=>{event.preventDefault();applyFilters();}}>
      <label className="flex-1 min-w-[200px] text-xs font-semibold text-text uppercase tracking-wider">Nombre o DNI/usuario<input className={field} value={search} disabled={busy} onChange={event=>setSearch(event.target.value)} maxLength={100} placeholder="Escribe un nombre o usuario" /></label>
      <label className="text-xs font-semibold text-text uppercase tracking-wider">Tipo de cuenta<select className={field} value={roleFilter} disabled={busy} onChange={event=>setRoleFilter(event.target.value as Account['role']|'')}><option value="">Todos</option><option value="student">Estudiantes</option><option value="teacher">Docentes</option></select></label>
      <label className="text-xs font-semibold text-text uppercase tracking-wider">Estado<select className={field+(statusFilter==='active'?' eval-status-active':statusFilter==='inactive'?' eval-status-inactive':'')} value={statusFilter} disabled={busy} onChange={event=>setStatusFilter(event.target.value as 'active'|'inactive'|'')}><option value="">Todos</option><option value="active" className="eval-status-active">Activo</option><option value="inactive" className="eval-status-inactive">Inactivo</option></select></label>
      <button className={button} disabled={busy}>Buscar</button>
      <button className={button} disabled={busy} type="button" onClick={clearFilters}>Limpiar filtros</button>
    </form>
    {busy&&<p role="status">Consultando usuarios…</p>}
    {directoryReady&&<p role="status" className="text-sm text-text-muted">{items.length===0?'No se encontraron usuarios con estos filtros.':`${items.length} usuarios mostrados${after?' · Hay más resultados':''}.`}</p>}
    {directoryError&&<div role="alert"><p>No se pudo actualizar el directorio.</p><button className={button} disabled={busy} onClick={()=>void load()}>Reintentar consulta</button></div>}
    {task!==null&&selectedAccount&&<button type="button" onClick={()=>{setSelectedAccount(null);}}>← Volver a usuarios</button>}
    <div className="grid gap-4 sm:grid-cols-2">
      {items.filter(account=>task===null||!selectedAccount||account.id===selectedAccount).map(account=><article key={account.id} className="rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"><div className="space-y-1"><div className="flex items-center justify-between gap-2"><h3 className="font-bold text-base text-text">{account.name}</h3><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${account.active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'}`}>{account.active?'Activa':'Desactivada'}</span></div><p className="text-xs text-text-muted font-mono">{account.username}</p><p className="text-xs font-medium text-text">{account.role==='teacher'?'Docente':'Estudiante'}</p></div><div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">{task!==null&&!selectedAccount?<button type="button" onClick={()=>setSelectedAccount(account.id)}>Ver cuenta →</button>:<><button className={button} disabled={busy||unknown} onClick={()=>void confirm({account,action:'reset-password'})}>Restablecer contraseña</button><button className={button} disabled={busy||unknown} onClick={()=>void confirm({account,action:account.active?'deactivate':'reactivate'})}>{account.active?'Desactivar':'Reactivar'}</button></>}</div></article>)}
    </div>
    {after&&<button className={button} disabled={busy} onClick={()=>void load(after,true)}>Ver más usuarios</button>}

  </div>
 </section>;
}
export function OwnAccountWorkspace({client,account,onExpired,profileLabel="Subdirector"}:{client:AccountClient;account:OwnAccount;onExpired:()=>void;profileLabel?:string}){
 const feedback=useActionFeedback();
 const parentTask=useVicePrincipalTask();
 const [localTask,setLocalTask]=useState<'profile'|'security'|null>(null);
 const task=parentTask??localTask;
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[unknown,setUnknown]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,values=new FormData(form),password=String(values.get('password'));if(password!==values.get('confirm')){setNotice('Las contraseñas nuevas no coinciden.');return;}const bytes=new TextEncoder().encode(password).length;if(bytes<12||bytes>72){setNotice('La nueva contraseña debe tener entre 12 y 72 bytes UTF-8.');return;}if(busy||unknown||!await feedback.confirm({title:'¿Cambiar tu contraseña?',message:'Se actualizará tu acceso y tendrás que iniciar sesión nuevamente.'}))return;setBusy(true);setNotice('');try{await client.changePassword(String(values.get('current_password')),password);feedback.success('Contraseña actualizada.');form.reset();onExpired();}catch(error){form.reset();if(error instanceof AccountError&&[401,419].includes(error.status??0)){onExpired();return;}setUnknown(error instanceof AccountError&&error.uncertain);setNotice(message(error));}finally{setBusy(false);}}
 return <section className="space-y-6 max-w-lg">
  <header className="border-b border-border/80 pb-5">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
        PERFIL INSTITUCIONAL
      </span>
    </div>
    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-text tracking-tight">Mi cuenta</h2>
    <p className="text-xs sm:text-sm text-text-muted mt-1">{account.name} · {account.username}</p>
  </header>
  {notice&&<div className="p-3.5 rounded-xl bg-surface-2 border border-border text-xs text-text"><p role="status">{notice}</p></div>}
  {parentTask===null&&(localTask===null?<nav className="eval-consult-grid" aria-label="Opciones de mi cuenta"><button type="button" onClick={()=>setLocalTask('profile')}><strong>Mis datos</strong><span>Nombre, usuario y perfil</span><b>Consultar →</b></button><button type="button" onClick={()=>setLocalTask('security')}><strong>Cambiar contraseña</strong><span>Actualiza tu acceso personal</span><b>Abrir →</b></button></nav>:<button type="button" className="eval-role-back" disabled={busy} onClick={()=>setLocalTask(null)}>← Volver a mi cuenta</button>)}
  {task==='security'&&<form onSubmit={event=>void submit(event)} className="p-6 bg-surface border border-border rounded-2xl shadow-xs"><fieldset disabled={busy||unknown} className="space-y-4"><legend className="font-bold text-text text-base">Cambiar contraseña</legend><label className="block text-xs font-semibold text-text uppercase tracking-wider">Contraseña actual<input className={field} name="current_password" type="password" required autoComplete="current-password" /></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Nueva contraseña<input className={field} name="password" type="password" required autoComplete="new-password" /></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Confirmar nueva contraseña<input className={field} name="confirm" type="password" required autoComplete="new-password" /></label><p className="text-xs text-text-muted">Entre 12 y 72 bytes UTF-8. Después del cambio deberás ingresar con la nueva contraseña.</p><button className={button+' bg-accent text-navy-950 hover:bg-accent-hover font-bold border-transparent px-5 py-2.5'}>Cambiar contraseña</button></fieldset></form>}
  {task==='profile'&&<dl className="vp-profile-card eval-profile-card"><dt>Nombre</dt><dd>{account.name}</dd><dt>Usuario</dt><dd>{account.username}</dd><dt>Perfil</dt><dd>{profileLabel}</dd></dl>}
  {unknown&&<button className={button} onClick={onExpired}>Volver a ingresar para comprobar el resultado</button>}
 </section>;
}

export function MandatoryPasswordChangeWorkspace({
  client,
  account,
  onExpired,
}: {
  client: AccountClient;
  account: OwnAccount;
  onExpired: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [unknown, setUnknown] = useState(false);
  const [success, setSuccess] = useState(false);
  const actionFeedback=useActionFeedback();
  const passwordWriting=useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const current = String(values.get('current_password') ?? '');
    const password = String(values.get('password') ?? '');
    const confirm = String(values.get('confirm') ?? '');

    if (password !== confirm) {
      setNotice('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (password === current) {
      setNotice('La nueva contraseña debe ser diferente a la contraseña provisional.');
      return;
    }
    const bytes = new TextEncoder().encode(password).length;
    if (bytes < 12 || bytes > 72) {
      setNotice('La nueva contraseña debe tener entre 12 y 72 caracteres.');
      return;
    }

    if(busy||unknown||passwordWriting.current)return;
    passwordWriting.current=true;
    setBusy(true);
    setNotice('');
    try {
      if(!await actionFeedback.confirm({title:'¿Guardar tu nueva contraseña?',message:'Se actualizará tu acceso y tendrás que iniciar sesión nuevamente.'}))return;
      await client.changePassword(current, password);
      actionFeedback.success('Contraseña actualizada correctamente.');
      form.reset();
      setSuccess(true);
    } catch (error) {
      if (error instanceof AccountError && [401, 419].includes(error.status ?? 0)) {
        onExpired();
        return;
      }
      setUnknown(error instanceof AccountError && error.uncertain);
      setNotice(message(error));
    } finally {
      passwordWriting.current=false;
      setBusy(false);
    }
  }

  if (success) {
    return (
      <section className="max-w-md mx-auto my-12 p-8 bg-surface border border-emerald-500/30 rounded-2xl shadow-lg text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl font-bold">
          ✓
        </div>
        <h2 className="font-serif text-2xl font-normal text-text tracking-tight">¡Contraseña actualizada!</h2>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          Tu nueva contraseña personal se guardó de forma segura. Por seguridad institucional, las sesiones anteriores se han cerrado.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onExpired}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-white py-3 px-4 text-sm font-semibold transition-all cursor-pointer shadow-sm"
          >
            Iniciar sesión con mi nueva contraseña
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto my-6 p-6 sm:p-8 bg-surface border border-border rounded-2xl shadow-md space-y-6">
      <header className="border-b border-border/80 pb-4 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-3">
          🔒 Seguridad obligatoria
        </span>
        <h2 className="font-serif text-2xl font-normal text-text tracking-tight">Cambio obligatorio de contraseña</h2>
        <p className="text-xs text-text-muted mt-2 leading-relaxed">
          Hola, <strong className="text-text">{account.name}</strong> ({account.username}). Para proteger tus datos y calificaciones en el colegio, debes reemplazar la contraseña provisional por una propia antes de continuar.
        </p>
      </header>

      {notice && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs" role="alert">
          {notice}
        </div>
      )}

      <form onSubmit={event => void submit(event)} className="space-y-4" aria-label="Cambio obligatorio de contraseña">
        <fieldset disabled={busy || unknown} className="space-y-4">
          <label className="block text-xs font-semibold text-text uppercase tracking-wider">
            Contraseña provisional actual
            <input
              className={field}
              name="current_password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              placeholder="Contraseña que te entregó el colegio"
            />
          </label>

          <label className="block text-xs font-semibold text-text uppercase tracking-wider">
            Nueva contraseña personal
            <input
              className={field}
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Mínimo 12 caracteres"
            />
          </label>

          <label className="block text-xs font-semibold text-text uppercase tracking-wider">
            Confirmar nueva contraseña
            <input
              className={field}
              name="confirm"
              type="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Repite tu nueva contraseña"
            />
          </label>

          <div className="rounded-xl bg-surface-2 p-3 text-[11px] text-text-muted space-y-1">
            <p className="font-semibold text-text">Requisitos de seguridad:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Mínimo 12 caracteres (hasta 72 bytes).</li>
              <li>Diferente a la contraseña provisional.</li>
              <li>Se recomienda incluir letras mayúsculas, minúsculas y números.</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center rounded-xl bg-accent text-navy-950 hover:bg-accent-hover font-bold py-3 px-4 text-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {busy ? 'Guardando contraseña…' : 'Establecer nueva contraseña y acceder'}
          </button>
        </fieldset>
      </form>

      {unknown && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2">
          <p>No se pudo confirmar el resultado. Si tu contraseña ya fue cambiada, vuelve a iniciar sesión.</p>
          <button className={button} onClick={onExpired}>Volver a ingresar</button>
        </div>
      )}
    </section>
  );
}

