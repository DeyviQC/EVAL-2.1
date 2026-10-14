import {useEffect,useRef,type ReactNode} from 'react';
export function AcademicDialog({label,onClose,children,returnFocus}:{label:string;onClose:()=>void;children:ReactNode;returnFocus?:HTMLElement|null}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const prior=returnFocus??document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();if(prior?.isConnected&&prior!==document.body)prior.focus();};},[]);
 return <dialog ref={ref} className="eval-academic-dialog" aria-label={label} onCancel={event=>{event.preventDefault();onClose();}}><header><strong>{label}</strong><button aria-label="Cerrar detalle de actividad" onClick={onClose}>Cerrar ×</button></header>{children}</dialog>;
}
