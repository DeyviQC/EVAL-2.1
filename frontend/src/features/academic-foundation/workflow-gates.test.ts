import {validDateOrder} from './form-gates.js';
import {bimesterWriteResult} from './reports.js';
const assert=(value:unknown)=>{if(!value)throw Error('Workflow gate assertion failed');};
function rejects(fn:()=>unknown){try{fn();}catch{return;}throw Error('Expected rejection');}
export const workflowGateCases:readonly (readonly [string,()=>void])[]=[
 ['form date gates reject incomplete, impossible and reversed dates',()=>{assert(!validDateOrder('',''));assert(!validDateOrder('2026-02-30',''));assert(!validDateOrder('2026-05-02','2026-05-01'));assert(validDateOrder('2026-05-01',''));assert(validDateOrder('2026-05-01','2026-05-01'));}],
 ['bimester acknowledgements match the server contract and reject wrong targets',()=>{const closed={id:'9',period_id:'1',bimester_number:2,state:'locked',closed_at:'2026-10-23T12:00:00Z'};assert(bimesterWriteResult(closed,'1',2,'locked').id==='9');rejects(()=>bimesterWriteResult(closed,'2',2,'locked'));rejects(()=>bimesterWriteResult(closed,'1',1,'locked'));rejects(()=>bimesterWriteResult({id:'9'},'1',2,'locked'));const opened={id:'9',period_id:'1',bimester_number:2,state:'open',reopened_at:'2026-10-23T12:00:00Z',justification:'Approved correction'};assert(bimesterWriteResult(opened,'1',2,'open').state==='open');}],
];
