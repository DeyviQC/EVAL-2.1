import {allowedSection,type DashboardRole} from './role-dashboards.js';
type Binding={account:string;role:DashboardRole};
type Entry={evalView:1;account:string;role:DashboardRole;section:string|null};
export type HistoryPort={state:()=>unknown;url:()=>string;push:(state:Entry,url:string)=>void;replace:(state:Entry,url:string)=>void;listen:(callback:(state:unknown)=>void)=>()=>void};
export function historySection(value:unknown,binding:Binding):string|null|undefined{
 if(!value||typeof value!=='object')return undefined;
 const row=value as Partial<Entry>;
 if(row.evalView!==1||row.account!==binding.account||row.role!==binding.role)return undefined;
 if(row.section!==null&&typeof row.section!=='string')return undefined;
 return allowedSection(binding.role,row.section)?row.section:undefined;
}
export function createViewHistory(port:HistoryPort,binding:Binding,initial:string|null,onRestore:(section:string|null)=>void){
 let current=historySection(port.state(),binding);const entry=(section:string|null):Entry=>({evalView:1,...binding,section});
 function url(section:string|null){const target=new URL(port.url());if(section)target.searchParams.set('view',section);else target.searchParams.delete('view');return target.pathname+target.search+target.hash;}
 function write(section:string|null,replace=false){try{if(replace)port.replace(entry(section),url(section));else port.push(entry(section),url(section));}catch{/* Navigation still works in restricted browser environments. */}}
 if(current===undefined){current=allowedSection(binding.role,initial)?initial:null;write(null,true);write(current);}else onRestore(current);
 const remove=port.listen(state=>{const restored=historySection(state,binding);current=restored??null;if(restored===undefined)write(null,true);onRestore(current);});
 return {visit(section:string|null){if(!allowedSection(binding.role,section))return;if(section!==current){write(section);current=section;}},dispose:remove};
}
export function browserHistoryPort():HistoryPort{
 return {state:()=>window.history.state,url:()=>window.location.href,push:(state,url)=>window.history.pushState(state,'',url),replace:(state,url)=>window.history.replaceState(state,'',url),listen:callback=>{const listener=(event:PopStateEvent)=>callback(event.state);window.addEventListener('popstate',listener);return()=>window.removeEventListener('popstate',listener);}};
}
