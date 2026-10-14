import type {CourseCalendar,WeekSelection} from './weeks.js';
import type {CalendarBlock} from './calendars.js';

export function limaDate(now=new Date()):string {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(value=>value.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
export function initialWeek(calendar:CourseCalendar,today=limaDate()):WeekSelection {
 const revision=calendar.current;
 if(!revision)return {bucket:'unassigned'};
 const weeks=revision.blocks.flatMap(block=>block.weeks);
 const week=weeks.find(w=>w.start_on<=today&&w.end_on>=today)
  ??weeks.filter(w=>w.start_on<=today).at(-1)??weeks[0];
 return week?.id?{bucket:'week',revision:revision.id,week:week.id}:{bucket:'unassigned'};
}
export function bimesterLabel(blocks:CalendarBlock[],index:number):string {
 return blocks[index]?.kind==='teaching'
  ?`Bimestre ${blocks.slice(0,index+1).filter(block=>block.kind==='teaching').length}`
  :'Gestión académica';
}
export function adjacentWeek(calendar:CourseCalendar,selection:WeekSelection,offset:-1|1):WeekSelection|null {
 const revision=calendar.current;
 if(!revision||selection.bucket!=='week'||selection.revision!==revision.id)return null;
 const weeks=revision.blocks.flatMap(block=>block.weeks);
 const index=weeks.findIndex(week=>week.id===selection.week);
 const target=index<0?null:weeks[index+offset];
 return target?.id?{bucket:'week',revision:revision.id,week:target.id}:null;
}
