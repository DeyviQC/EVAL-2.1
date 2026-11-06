import {useState} from 'react';
import {MaterialMaintenancePanel} from './MaterialMaintenancePanel.js';
import type {MaterialMaintenanceClient} from './material-maintenance.js';
export function MaterialOptions({id,client,onChanged,onExpired}:{id:string;client:MaterialMaintenanceClient;onChanged:()=>Promise<void>;onExpired:()=>void}){
 const [open,setOpen]=useState(false);
 return <details className="eval-material-options rounded-xl border border-border/70 bg-surface-2/50 p-3 text-xs transition-all" onToggle={event=>setOpen(event.currentTarget.open)}><summary className="cursor-pointer font-semibold text-text hover:text-primary transition-colors select-none">⚙️ Opciones del material</summary>{open&&<MaterialMaintenancePanel id={id} client={client} onChanged={onChanged} onExpired={onExpired}/>}</details>;
}
