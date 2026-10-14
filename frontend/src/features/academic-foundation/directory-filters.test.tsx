import {renderToStaticMarkup} from 'react-dom/server';
import {ClassroomFilters} from './ClassroomFilters.js';
import {filterQuery} from './directory-filters.js';
import {createAcademicClient} from './api.js';
function assert(value:unknown):asserts value{if(!value)throw Error('Directory filter assertion failed');}
export const directoryFilterCases:readonly (readonly [string,()=>void|Promise<void>])[]=[
 ['classroom filters reject injected authority and invalid state before transport',()=>{for(const value of [{actor:'1'},{grade_id:'0'},{state:'closed'},{search:'a'.repeat(101)}]){let rejected=false;try{filterQuery(value);}catch{rejected=true;}assert(rejected);}}],
 ['directory search safely encodes Unicode and query delimiters',()=>{const params=new URLSearchParams(filterQuery({search:'  María & grado=3  ',grade_id:'2'}));assert(params.get('search')==='María & grado=3'&&params.get('grade_id')==='2'&&!params.has('grado'));}],
 ['filtered paging preserves the selected classroom and current-history boundary',async()=>{let url='';const client=createAcademicClient(async(input)=>{url=String(input);return new Response(JSON.stringify({data:{items:[],next_after:null}}));},()=> 'token');await client.enrollmentDirectory('enrollments',v=>v,'51',{academic_period_id:'1',grade_id:'2',section_id:'3',state:'history'});const params=new URL(url,'https://eval.test').searchParams;assert(params.get('after')==='51'&&params.get('section_id')==='3'&&params.get('state')==='history');}],
 ['dependent classroom section selector cannot offer another grade',()=>{const html=renderToStaticMarkup(<ClassroomFilters value={{academic_period_id:'1',grade_id:'2',state:'active'}} onChange={()=>{}} periods={[{id:'1',name:'2026'}]} grades={[{id:'2',name:'Segundo',is_active:true}]} sections={[{id:'3',name:'A del segundo',grade_id:'2',is_active:true},{id:'4',name:'B del tercero',grade_id:'5',is_active:true}]}/>);assert(html.includes('A del segundo')&&!html.includes('B del tercero')&&html.includes('Historial de matrículas'));}],
];
