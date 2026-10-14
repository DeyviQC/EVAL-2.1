const assert={equal:(actual:unknown,expected:unknown)=>{if(actual!==expected)throw Error('Weekly navigation mismatch');},deepEqual:(actual:unknown,expected:unknown)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Weekly selection mismatch');}};
import {initialWeek,adjacentWeek,bimesterLabel,limaDate} from './weekly-navigation.js';
import type {CourseCalendar} from './weeks.js';
const calendar:CourseCalendar={course_id:'1',period_id:'1',retained:[],current:{id:'2',period_id:'1',source:'Institution-configured',recorded_at:'2026-01-01',blocks:[
 {kind:'management',start_on:'2026-01-01',end_on:'2026-01-09',weeks:[]},
 {kind:'teaching',start_on:'2026-01-12',end_on:'2026-01-23',weeks:[{id:'a'.repeat(32),number:1,start_on:'2026-01-12',end_on:'2026-01-16'},{id:'b'.repeat(32),number:2,start_on:'2026-01-19',end_on:'2026-01-23'}]},
 {kind:'teaching',start_on:'2026-02-02',end_on:'2026-02-06',weeks:[{id:'c'.repeat(32),number:3,start_on:'2026-02-02',end_on:'2026-02-06'}]},
]}};
export const weeklyNavigationCases:[string,()=>void][]=[
 ['weekly navigation selects inclusive configured week dates',()=>{assert.equal(initialWeek(calendar,'2026-01-16').week,'a'.repeat(32));assert.equal(initialWeek(calendar,'2026-01-19').week,'b'.repeat(32));}],
 ['weekly navigation handles weekends, management gaps and dates outside year',()=>{assert.equal(initialWeek(calendar,'2026-01-17').week,'a'.repeat(32));assert.equal(initialWeek(calendar,'2026-01-30').week,'b'.repeat(32));assert.equal(initialWeek(calendar,'2025-12-31').week,'a'.repeat(32));assert.equal(initialWeek(calendar,'2027-01-01').week,'c'.repeat(32));}],
 ['weekly navigation crosses bimesters and never wraps beyond calendar',()=>{assert.equal(adjacentWeek(calendar,initialWeek(calendar,'2026-01-20'),1)?.week,'c'.repeat(32));assert.equal(adjacentWeek(calendar,initialWeek(calendar,'2026-01-12'),-1),null);assert.equal(adjacentWeek(calendar,initialWeek(calendar,'2026-02-02'),1),null);assert.equal(adjacentWeek(calendar,{bucket:'earlier'},1),null);}],
 ['weekly navigation does not invent a calendar and numbers teaching bimesters only',()=>{assert.deepEqual(initialWeek({...calendar,current:null}),{bucket:'unassigned'});assert.equal(bimesterLabel(calendar.current!.blocks,0),'Gestión académica');assert.equal(bimesterLabel(calendar.current!.blocks,2),'Bimestre 2');}],
 ['weekly current date uses school timezone rather than UTC midnight',()=>{assert.equal(limaDate(new Date('2026-10-14T02:00:00Z')),'2026-10-13');}],
];
