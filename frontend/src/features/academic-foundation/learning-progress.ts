import {exact,text} from './contracts.js';
export function learningProgress(value:unknown){
 const row=exact(value,['state','late','grade','feedback','delivered','graded']);
 if(!['pending','submitted','graded','review'].includes(String(row.state))||typeof row.late!=='boolean'||!Number.isSafeInteger(row.delivered)||!Number.isSafeInteger(row.graded)||(row.delivered as number)<0||(row.graded as number)<0||(row.graded as number)>(row.delivered as number))throw Error('Invalid learning progress');
 if(row.grade!==null&&!['AD','A','B','C'].includes(String(row.grade))||(row.grade===null)!==(row.feedback===null))throw Error('Invalid assessment');
 if(row.state==='pending'&&row.delivered!==0||row.state==='submitted'&&(row.delivered!==1||row.graded!==0)||row.state==='review'&&(row.delivered as number)<=(row.graded as number)||row.state==='graded'&&(row.graded===0||row.graded!==row.delivered))throw Error('Inconsistent learning progress');
 return {state:row.state as 'pending'|'submitted'|'graded'|'review',late:row.late,grade:row.grade as 'AD'|'A'|'B'|'C'|null,feedback:row.feedback===null?null:text(row.feedback),delivered:row.delivered as number,graded:row.graded as number};
}
export type LearningProgress=ReturnType<typeof learningProgress>;
export const progressLabels={pending:'Pendiente',submitted:'Entregada',graded:'Calificada',review:'Por revisar'};
