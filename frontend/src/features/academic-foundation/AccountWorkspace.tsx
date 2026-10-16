import { useEffect,useState,type FormEvent } from 'react';
import { AccountError,type Account,type AccountClient,type OwnAccount } from './accounts.js';
import type { AcademicClient } from './api.js';
import { BulkImportWorkspace } from './BulkImportWorkspace.js';
const field='w-full rounded-xl border border-border bg-surface text-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
const button='inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
function message(error:unknown){if(error instanceof AccountError){if(error.uncertain)return 'No se pudo confirmar el resultado. Revisa la cuenta antes de continuar.';if(error.category==='username_unavailable')return 'Ese nombre de usuario ya está registrado.';if(error.category==='invalid_current_password')return 'La contraseña actual no es correcta.';if(error.category==='password_unchanged')return 'La nueva contraseña debe ser diferente a la contraseña provisional.';if(error.category==='invalid_input')return 'Revisa los campos y los límites indicados.';}return 'No se pudo completar la consulta u operación.';}
export function UsersWorkspace({client,academic,onExpired}:{client:AccountClient;academic?:AcademicClient|undefined;onExpired:()=>void}){
 const [panel,setPanel]=useState<'list'|'create'|'bulk'>('list');const [items,setItems]=useState<Account[]>([]),[after,setAfter]=useState<string|null>(null),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[secret,setSecret]=useState<{username:string;password:string}|null>(null),[confirmation,setConfirmation]=useState<{account:Account;action:'reset-password'|'deactivate'|'reactivate'}|null>(null),[unknown,setUnknown]=useState(false);
 function failure(error:unknown){if(error instanceof AccountError&&[401,419].includes(error.status??0)){onExpired();return;}setUnknown(error instanceof AccountError&&error.uncertain);setNotice(message(error));}
 async function load(next:string|null=null,append=false){setBusy(true);try{const page=await client.directory(search,next);setItems(prior=>append?[...prior,...page.items]:page.items);setAfter(page.next_after);}catch(error){failure(error);}finally{setBusy(false);}}
 useEffect(()=>{void load();},[client]);
 async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,values=new FormData(form);setBusy(true);setNotice('');setSecret(null);try{const username=String(values.get('username')).trim().toLowerCase();const result=await client.create(String(values.get('name')),username,String(values.get('role')) as Account['role']);setSecret({username,password:result.password!});form.reset();setPanel('list');setNotice('Cuenta creada. Asigna su aula o curso desde la sección correspondiente.');try{const page=await client.directory(username);setItems(page.items);setAfter(page.next_after);setSearch(username);}catch{setNotice('Cuenta creada; no se pudo actualizar la lista. Guarda su contraseña.');}}catch(error){failure(error);}finally{setBusy(false);}}
 async function confirm(){if(!confirmation)return;setBusy(true);setNotice('');setSecret(null);try{const result=await client.action(confirmation.account.id,confirmation.action);if(result.password)setSecret({username:confirmation.account.username,password:result.password});setConfirmation(null);setNotice('Operación confirmada.');try{const page=await client.directory(search);setItems(page.items);setAfter(page.next_after);}catch{setNotice('Operación confirmada; no se pudo actualizar la lista.');}}catch(error){failure(error);}finally{setBusy(false);}}
 return <section aria-label="Gestión de usuarios" aria-busy={busy} className="space-y-6">
  <header className="border-b border-border/80 pb-5">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
        ADMINISTRACIÓN LOCAL
      </span>
    </div>
    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-text tracking-tight">Usuarios</h2>
    <p className="text-xs sm:text-sm text-text-muted mt-1">Gestión de cuentas institucionales para docentes y estudiantes.</p>
  </header>
  <div className="eval-course-tabs flex gap-2 p-1 bg-surface-2 border border-border rounded-xl max-w-md" role="group" aria-label="Gestión de usuarios">
    <button aria-pressed={panel==='list'} disabled={busy} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${panel==='list'?'bg-primary text-white shadow-xs':'text-text-muted hover:text-text'}`} onClick={()=>setPanel('list')}>Consultar usuarios</button>
    <button aria-pressed={panel==='create'} disabled={busy} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${panel==='create'?'bg-primary text-white shadow-xs':'text-text-muted hover:text-text'}`} onClick={()=>setPanel('create')}>Crear cuenta</button>
    <button aria-pressed={panel==='bulk'} disabled={busy} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${panel==='bulk'?'bg-primary text-white shadow-xs':'text-text-muted hover:text-text'}`} onClick={()=>setPanel('bulk')}>📥 Carga masiva</button>
  </div>
  {notice&&<div className="p-3.5 rounded-xl bg-surface-2 border border-border text-xs text-text"><p role="status">{notice}</p></div>}
  {secret&&<section className="my-5 rounded-2xl border border-primary/30 bg-primary-soft/30 p-5 space-y-3"><h3 className="font-bold text-text text-sm">Acceso de {secret.username}</h3><label className="block text-xs font-semibold text-text uppercase tracking-wider">Contraseña generada<input className={field} value={secret.password} readOnly autoComplete="off" /></label><p className="text-xs text-text-muted">Guárdala antes de cerrar este mensaje. No podrás consultarla de nuevo.</p><button className={button} onClick={()=>setSecret(null)}>Ocultar contraseña</button></section>}
  {unknown&&<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2"><p>Consulta el usuario. Para continuar tras revisar el resultado, <button className={button} onClick={()=>{client.acknowledgeReview();setUnknown(false);setNotice('Resultado revisado. Puedes realizar una nueva operación explícita.');}}>He revisado el resultado</button></p></div>}
  {panel==='bulk'&&<BulkImportWorkspace client={client} academic={academic} onExpired={onExpired} onComplete={()=>void load()}/>}
  {panel==='create'&&<form onSubmit={event=>void create(event)} aria-label="Crear cuenta" className="max-w-lg p-6 bg-surface border border-border rounded-2xl shadow-xs"><fieldset disabled={busy||unknown} className="space-y-4"><legend className="font-bold text-text text-base">Crear cuenta</legend><label className="block text-xs font-semibold text-text uppercase tracking-wider">Nombre<input className={field} name="name" required maxLength={255} /></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Nombre de usuario (DNI o institucional)<input className={field} name="username" aria-label="Nombre de usuario" required minLength={3} maxLength={64} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,63}" autoCapitalize="none" autoComplete="off" /><small className="text-[11px] text-text-muted mt-1 block">DNI (8 dígitos) para estudiantes, o usuario institucional (3–64 caracteres alfanuméricos).</small></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Tipo de cuenta<select className={field} name="role" aria-label="Tipo de cuenta"><option value="student">Estudiante</option><option value="teacher">Docente</option></select></label><p className="text-xs text-text-muted">Crear la cuenta no matricula al estudiante ni asigna cursos al docente.</p><button className={button+' bg-accent text-navy-950 hover:bg-accent-hover font-bold border-transparent px-5 py-2.5'}>Crear cuenta</button></fieldset></form>}
  <div hidden={panel!=='list'} className="space-y-4">
    <form className="p-4 bg-surface border border-border rounded-xl shadow-xs flex flex-wrap items-end gap-3 max-w-lg" onSubmit={event=>{event.preventDefault();void load();}}>
      <label className="flex-1 min-w-[200px] text-xs font-semibold text-text uppercase tracking-wider">Buscar usuario<input className={field} value={search} onChange={event=>setSearch(event.target.value)} maxLength={64} /></label>
      <button className={button} disabled={busy}>Buscar</button>
      <button className={button} disabled={busy} type="button" onClick={()=>{setSearch('');setBusy(true);void client.directory().then(page=>{setItems(page.items);setAfter(page.next_after);}).catch(failure).finally(()=>setBusy(false));}}>Mostrar todos</button>
    </form>
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map(account=><article key={account.id} className="rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"><div className="space-y-1"><div className="flex items-center justify-between gap-2"><h3 className="font-bold text-base text-text">{account.name}</h3><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${account.active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-surface-2 text-text-muted border-border'}`}>{account.active?'Activa':'Desactivada'}</span></div><p className="text-xs text-text-muted font-mono">{account.username}</p><p className="text-xs font-medium text-text">{account.role==='teacher'?'Docente':'Estudiante'}</p></div><div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2"><button className={button} disabled={busy||unknown} onClick={()=>setConfirmation({account,action:'reset-password'})}>Restablecer contraseña</button><button className={button} disabled={busy||unknown} onClick={()=>setConfirmation({account,action:account.active?'deactivate':'reactivate'})}>{account.active?'Desactivar':'Reactivar'}</button></div></article>)}
    </div>
    {after&&<button className={button} disabled={busy} onClick={()=>void load(after,true)}>Ver más usuarios</button>}
    {confirmation&&<section className="my-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3" aria-label="Confirmar mantenimiento de cuenta"><h3 className="font-bold text-sm text-text">{confirmation.account.name} · {confirmation.account.username}</h3><p className="text-xs text-text">{confirmation.action==='reset-password'?'Se generará una nueva contraseña y las sesiones anteriores dejarán de funcionar.':confirmation.action==='deactivate'?'Se bloqueará su acceso. Sus matrículas, asignaciones e historial se conservan.':'Se habilitará su acceso con la contraseña vigente.'}</p><div className="flex gap-2"><button className={button+' bg-primary text-white hover:bg-primary-hover border-transparent'} disabled={busy||unknown} onClick={()=>void confirm()}>{confirmation.action==='reset-password'?'Confirmar restablecimiento':confirmation.action==='deactivate'?'Confirmar desactivación':'Confirmar reactivación'}</button><button className={button} disabled={busy} onClick={()=>setConfirmation(null)}>Cancelar</button></div></section>}
  </div>
 </section>;
}
export function OwnAccountWorkspace({client,account,onExpired}:{client:AccountClient;account:OwnAccount;onExpired:()=>void}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[unknown,setUnknown]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,values=new FormData(form),password=String(values.get('password'));if(password!==values.get('confirm')){setNotice('Las contraseñas nuevas no coinciden.');return;}const bytes=new TextEncoder().encode(password).length;if(bytes<12||bytes>72){setNotice('La nueva contraseña debe tener entre 12 y 72 bytes UTF-8.');return;}setBusy(true);setNotice('');try{await client.changePassword(String(values.get('current_password')),password);form.reset();onExpired();}catch(error){form.reset();if(error instanceof AccountError&&[401,419].includes(error.status??0)){onExpired();return;}setUnknown(error instanceof AccountError&&error.uncertain);setNotice(message(error));}finally{setBusy(false);}}
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
  <form onSubmit={event=>void submit(event)} className="p-6 bg-surface border border-border rounded-2xl shadow-xs"><fieldset disabled={busy||unknown} className="space-y-4"><legend className="font-bold text-text text-base">Cambiar contraseña</legend><label className="block text-xs font-semibold text-text uppercase tracking-wider">Contraseña actual<input className={field} name="current_password" type="password" required autoComplete="current-password" /></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Nueva contraseña<input className={field} name="password" type="password" required autoComplete="new-password" /></label><label className="block text-xs font-semibold text-text uppercase tracking-wider">Confirmar nueva contraseña<input className={field} name="confirm" type="password" required autoComplete="new-password" /></label><p className="text-xs text-text-muted">Entre 12 y 72 bytes UTF-8. Después del cambio deberás ingresar con la nueva contraseña.</p><button className={button+' bg-accent text-navy-950 hover:bg-accent-hover font-bold border-transparent px-5 py-2.5'}>Cambiar contraseña</button></fieldset></form>
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

    setBusy(true);
    setNotice('');
    try {
      await client.changePassword(current, password);
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

