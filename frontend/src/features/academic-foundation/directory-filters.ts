import {decimalId,exact} from './contracts.js';
export type DirectoryFilters={academic_period_id?:string;grade_id?:string;section_id?:string;teacher_id?:string;instructional_entry_id?:string;state?:string;search?:string};
export function filterQuery(filters:DirectoryFilters,assignment=false):string {
 const ids=['academic_period_id','grade_id','section_id',...(assignment?['teacher_id','instructional_entry_id']:[])];
 const values=exact(filters,[],[...ids,'state','search']);const query=new URLSearchParams();
 for(const key of ids)if(values[key]!==undefined&&values[key]!=='')query.set(key,decimalId(values[key]));
 if(values.state){if(!(assignment?['planned','active','closed']:['active','history']).includes(String(values.state)))throw Error('Invalid directory state');query.set('state',String(values.state));}
 if(values.search){if(typeof values.search!=='string'||Array.from(values.search).length>100)throw Error('Invalid directory search');query.set('search',values.search.trim());}
 return query.toString();
}
