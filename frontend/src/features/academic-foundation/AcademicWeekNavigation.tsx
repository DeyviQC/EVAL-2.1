import type {CourseCalendar,WeekSelection} from './weeks.js';
import {adjacentWeek,initialWeek} from './weekly-navigation.js';
export function AcademicWeekNavigation({calendar,selection,busy,onSelect}:{calendar:CourseCalendar;selection:WeekSelection;busy:boolean;onSelect:(value:WeekSelection)=>void}){
 const revision=calendar.current;if(!revision)return null;
 const blocks=revision.blocks.filter(block=>block.kind==='teaching');
 const selected=blocks.findIndex(block=>selection.revision===revision.id&&block.weeks.some(week=>week.id===selection.week));
 const active=blocks[Math.max(0,selected)];
 function choose(index:number){const week=blocks[index]?.weeks[0];if(week?.id)onSelect({bucket:'week',revision:revision!.id,week:week.id});}
 return <div className="eval-academic-navigation">
  <div className="eval-bimester-tabs" role="tablist" aria-label="Bimestres del curso" onKeyDown={event=>{if(busy)return;const current=Number((event.target as HTMLElement).dataset.index);if(!Number.isInteger(current))return;const next=event.key==='ArrowRight'?(current+1)%blocks.length:event.key==='ArrowLeft'?(current+blocks.length-1)%blocks.length:event.key==='Home'?0:event.key==='End'?blocks.length-1:null;if(next!==null){event.preventDefault();choose(next);(event.currentTarget.children[next] as HTMLElement)?.focus();}}}>
   {blocks.map((block,index)=><button key={block.start_on} data-index={index} role="tab" aria-selected={selected===index} tabIndex={index===Math.max(0,selected)?0:-1} disabled={busy} onClick={()=>choose(index)} title={block.start_on+' a '+block.end_on}>Bimestre {['I','II','III','IV'][index]??index+1}</button>)}
  </div>
  <div className="eval-week-toolbar"><p>{active?.start_on} <span aria-hidden="true">—</span> {active?.end_on}</p><button disabled={busy} onClick={()=>onSelect(initialWeek(calendar))}>Ir a semana actual</button></div>
  <div className="eval-week-buttons" aria-label="Semanas del bimestre">{active?.weeks.map(week=><button key={week.id} aria-pressed={selection.week===week.id&&selection.revision===revision.id} disabled={busy} title={week.start_on+' a '+week.end_on} onClick={()=>onSelect({bucket:'week',revision:revision.id,week:week.id!})}>Semana {week.number}</button>)}</div>
  <div className="eval-week-paging"><button aria-label="Semana anterior" disabled={busy||!adjacentWeek(calendar,selection,-1)} onClick={()=>{const next=adjacentWeek(calendar,selection,-1);if(next)onSelect(next);}}>← Anterior</button><button aria-label="Semana siguiente" disabled={busy||!adjacentWeek(calendar,selection,1)} onClick={()=>{const next=adjacentWeek(calendar,selection,1);if(next)onSelect(next);}}>Siguiente →</button></div>
 </div>;
}
