import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {CheckCircle2,TriangleAlert,X} from 'lucide-react';
type Prompt={title:string;message:string;danger?:boolean};
export function confirmationLabel(title:string){
 const action=title.replace(/^[¿\s]+|[?\s]+$/g,'');
 return 'Confirmar: '+action.charAt(0).toLocaleLowerCase('es')+action.slice(1);
}
type Feedback={confirm:(prompt:Prompt)=>Promise<boolean>;success:(message:string)=>void};
const fallback:Feedback={confirm:async()=>true,success:()=>{}};
const Context=createContext<Feedback>(fallback);
export const useActionFeedback=()=>useContext(Context);
export function ActionFeedbackProvider({enabled,scope,children}:{enabled:boolean;scope?:string;children:ReactNode}){
 const specificActions=scope?.split(':')[1]==='vice_principal';
 const [prompt,setPrompt]=useState<Prompt|null>(null),[notice,setNotice]=useState(''),[noticeVersion,setNoticeVersion]=useState(0);const noticeRef=useRef<HTMLDivElement>(null);const dialog=useRef<HTMLDialogElement>(null),resolver=useRef<((answer:boolean)=>void)|null>(null);
 function answer(value:boolean){resolver.current?.(value);resolver.current=null;dialog.current?.close();setPrompt(null);}
 useEffect(()=>{if(prompt&&!dialog.current?.open)dialog.current?.showModal();},[prompt]);
 useEffect(()=>{if(!enabled){setPrompt(null);dialog.current?.close();}answer(false);const cancel=()=>answer(false);window.addEventListener('popstate',cancel);return()=>{window.removeEventListener('popstate',cancel);resolver.current?.(false);resolver.current=null;};},[enabled,scope]);
 useEffect(()=>{if(!notice)return;noticeRef.current?.showPopover();const timer=setTimeout(()=>setNotice(''),specificActions?5000:8000);return()=>clearTimeout(timer);},[notice,noticeVersion,specificActions]);
 const feedback:Feedback=enabled?{confirm:input=>new Promise(resolve=>{if(resolver.current){resolve(false);return;}resolver.current=resolve;setNotice('');setPrompt(input);}),success:message=>{setNotice(message);if(specificActions)setNoticeVersion(version=>version+1);}}:fallback;
 return <Context.Provider value={feedback}>{children}{(enabled||!!notice)&&<>
  <dialog ref={dialog} className={'eval-action-dialog '+(prompt?.danger?'is-danger':'')} aria-labelledby="eval-confirm-title" aria-describedby="eval-confirm-description" onCancel={event=>{event.preventDefault();answer(false);}}>
   <div className="eval-confirm-icon"><TriangleAlert size={27} aria-hidden="true"/></div><h2 id="eval-confirm-title">{prompt?.title}</h2><p id="eval-confirm-description">{prompt?.message}</p><div className="eval-confirm-buttons"><button type="button" autoFocus onClick={()=>answer(false)}>Cancelar</button><button type="button" className="eval-confirm-accept" onClick={()=>answer(true)}>{specificActions&&prompt?confirmationLabel(prompt.title):'Confirmar'}</button></div>
  </dialog>
  {notice&&<div ref={noticeRef} popover="manual" className="eval-action-notice" role="status" aria-live="polite"><CheckCircle2 size={24} aria-hidden="true"/><span>{notice}</span><button type="button" aria-label="Cerrar aviso" onClick={()=>setNotice('')}><X size={20}/></button></div>}
 </>}</Context.Provider>;
}
