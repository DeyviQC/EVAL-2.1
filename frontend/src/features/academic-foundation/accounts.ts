import {dashboardOverview} from './DashboardSummary.js';
import {dashboardRole as decodeDashboardRole} from './role-dashboards.js';
import {navigationSections} from './navigation.js';
import { exact,text,decimalId } from './contracts.js';
export type Account={id:string;name:string;username:string;role:'teacher'|'student';active:boolean};
export type AccountDirectoryFilters={search?:string;role?:Account['role']|'';status?:'active'|'inactive'|''};
export type OwnAccount={id:string;name:string;username:string;can_manage:boolean;must_change_password?:boolean};
export function ownAccount(wire:unknown):OwnAccount{const envelope=exact(wire,['data']),row=exact(envelope.data,['id','name','username','can_manage'],['must_change_password']);if(typeof row.can_manage!=='boolean')throw new Error('Invalid account');if(row.must_change_password!==undefined&&typeof row.must_change_password!=='boolean')throw new Error('Invalid account');return {id:decimalId(row.id),name:text(row.name),username:text(row.username),can_manage:row.can_manage,must_change_password:Boolean(row.must_change_password)};}
export function accountDirectory(wire:unknown):{items:Account[];next_after:string|null}{const envelope=exact(wire,['data']),page=exact(envelope.data,['items','next_after']);if(!Array.isArray(page.items)||page.items.length>50)throw new Error('Invalid accounts');const items=page.items.map(value=>{const row=exact(value,['id','name','username','role','active']);if(!['teacher','student'].includes(row.role as string)||typeof row.active!=='boolean')throw new Error('Invalid account');return {id:decimalId(row.id),name:text(row.name),username:text(row.username),role:row.role as Account['role'],active:row.active};});return {items,next_after:page.next_after===null?null:decimalId(page.next_after)};}
export class AccountError extends Error{constructor(public category:string,public status:number|null,public uncertain=false){super(category);}}
export function createAccountClient(csrf:()=>string,transport:typeof fetch=fetch){
 let uncertain=false;
 async function request(path:string,input?:Record<string,unknown>){const unsafe=input!==undefined;if(unsafe&&uncertain)throw new AccountError('outcome_unknown',null,true);const token=csrf();if(unsafe&&!token)throw new AccountError('csrf_missing',419);
 const abort=new AbortController();let timer:ReturnType<typeof setTimeout>;const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Account request timed out'));},10000);});
 try {
 let response:Response;try{response=await Promise.race([transport(path,{method:unsafe?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:abort.signal,headers:{Accept:'application/json',...(unsafe?{'Content-Type':'application/json','X-CSRF-TOKEN':token}:{})},...(unsafe?{body:JSON.stringify(input)}:{})}),deadline]);}catch{if(unsafe)uncertain=true;throw new AccountError('connection_failed',null,unsafe);}
 let wire:unknown;try{wire=await Promise.race([response.json(),deadline]);}catch{if(unsafe)uncertain=true;throw new AccountError('invalid_response',response.status,unsafe);}
 if(!response.ok){const category=typeof (wire as {error?:unknown})?.error==='string'?(wire as {error:string}).error:'invalid_response';if(unsafe&&response.status>=500)uncertain=true;throw new AccountError(category,response.status,unsafe&&response.status>=500);}
 return wire;
 }finally{clearTimeout(timer!);}
 }
 async function mutation(path:string,input:Record<string,unknown>,secret=false){const wire=await request(path,input);try{const envelope=exact(wire,['data']),row=exact(envelope.data,secret?['id','password']:['id']);const result={id:decimalId(row.id),...(secret?{password:text(row.password)}:{})};if(secret&&(result.password===undefined||result.password.length<8||result.password.length>72))throw new Error();return result;}catch{uncertain=true;throw new AccountError('invalid_response',200,true);}}
 async function bootstrap(){const r=exact(exact(await request('/account/bootstrap'),['data']).data,['account','role','navigation']);return {account:ownAccount({data:r.account}),role:decodeDashboardRole({data:{role:r.role}}),sections:navigationSections({data:r.navigation})};}
 async function directory(username='',after:string|null=null,filters:AccountDirectoryFilters={}){
  const params=new URLSearchParams();
  if(username)params.set('username',username);
  if(after)params.set('after',decimalId(after));
  if(filters.search?.trim())params.set('search',filters.search.trim());
  if(filters.role)params.set('role',filters.role);
  if(filters.status)params.set('status',filters.status);
  return accountDirectory(await request('/users?'+params));
 }
 return {bootstrap,overview:async()=>dashboardOverview(exact(await request('/account/overview'),['data']).data),dashboardRole:async()=>decodeDashboardRole(await request('/account/role')),own:async()=>ownAccount(await request('/account')),directory,create:(name:string,username:string,role:Account['role'])=>mutation('/users',{name,username,role},true),action:(id:string,action:'reset-password'|'deactivate'|'reactivate')=>mutation('/users/'+decimalId(id)+'/'+action,{},action==='reset-password'),changePassword:(current_password:string,password:string)=>mutation('/account/password',{current_password,password}),acknowledgeReview:()=>{uncertain=false;}};
}
export type AccountClient=ReturnType<typeof createAccountClient>;
