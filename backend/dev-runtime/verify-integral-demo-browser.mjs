// Read-only demo acceptance. Four original credentials supplied privately through stdin.
import {chromium} from '../../frontend/node_modules/playwright-core/index.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {certificateOptions,loopbackCertificate} from './browser-options.mjs';
const root=process.env.EVAL_DEV_ROOT;if(!root)throw Error('Private runtime required');
const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);const passwords=JSON.parse(Buffer.concat(chunks).toString());
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({...certificateOptions(await loopbackCertificate(readFileSync(resolve(root,'cert.pem')))),headless:true,executablePath});let checks=0;
async function get(page,path){return page.evaluate(async path=>{const res=await fetch(path);return {status:res.status,data:(await res.json()).data};},path);}
async function all(page,path){let items=[],after=null;do{const result=await get(page,path+(after?(path.includes('?')?'&':'?')+'after='+after:''));assert.equal(result.status,200);items.push(...result.data.items);after=result.data.next_after;}while(after);return items;}
try{
 for(const [login,role,label] of [['estudiante','student','Estudiante'],['docente','teacher','Docente'],['director','director_admin','Director'],['subdirector','vice_principal','Subdirector']]){
  const context=await browser.newContext({viewport:{width:1360,height:960}});const page=await context.newPage();await page.goto('https://127.0.0.1:8443');
  await page.getByLabel('Usuario',{exact:true}).fill(login);await page.getByLabel('Contraseña',{exact:true}).fill(passwords[role]);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByRole('navigation',{name:'Menú de '+label,exact:true}).waitFor();checks++;
  if(role==='student'||role==='teacher'){
   const courses=await all(page,'/academic/my-courses');assert.equal(courses.length,role==='student'?10:20);checks++;
   const course=courses[0];const tasks=await all(page,'/education/courses/'+course.id+'/activities');assert.equal(tasks.length,1);checks++;
   const calendar=await get(page,'/academic/my-courses/'+course.id+'/weeks');assert.equal(calendar.status,200);assert.equal(calendar.data.current.blocks.filter(b=>b.kind==='teaching').length,4);checks++;
   const fourth=calendar.data.current.blocks.filter(b=>b.kind==='teaching')[3];const q=new URLSearchParams({bucket:'week',revision:calendar.data.current.id,week:fourth.weeks[0].id});
   for(const kind of ['material','activity']){const result=await get(page,'/academic/my-courses/'+course.id+'/weeks/'+kind+'?'+q);assert.equal(result.status,200);assert.equal(result.data.total,1);checks++;}
   const deliveries=await all(page,'/education/activities/'+tasks[0].id+'/deliveries');assert.equal(deliveries.length,role==='student'?1:3);checks++;
   if(role==='student'){
    const foreign=await get(page,'/academic/my-courses/'+(BigInt(course.id)+10n));assert([403,404].includes(foreign.status));checks++;
    await page.getByRole('button',{name:'Mi calendario',exact:true}).click();await page.getByRole('article',{name:course.subject+' · '+course.grade+' '+course.section,exact:true}).getByRole('button',{name:'Entrar al curso',exact:true}).click();
    await page.getByLabel('Bimestre',{exact:true}).waitFor();await page.getByLabel('Bimestre',{exact:true}).selectOption(fourth.start_on);
    await page.getByRole('heading',{name:'Semana '+fourth.weeks[0].number,exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:tasks[0].title,exact:true}).count(),2);checks++;
    await page.getByRole('button',{name:'Semana siguiente →',exact:true}).click();await page.getByRole('heading',{name:'Semana '+fourth.weeks[1].number,exact:true}).waitFor();checks++;
    await page.getByRole('button',{name:'← Semana anterior',exact:true}).click();await page.getByRole('heading',{name:'Semana '+fourth.weeks[0].number,exact:true}).waitFor();checks++;
    await page.screenshot({path:resolve(root,'integral-demo-student-week.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
   }
  }
  if(role==='director_admin'){assert.equal(await page.getByRole('button',{name:'Usuarios',exact:true}).count(),0);checks++;}
  await context.close();
 }
 console.log(JSON.stringify({passed:true,checks,originalLogins:4,studentCourses:10,teacherCourses:20,weeklyContentVerified:true,academicWrites:0}));
}finally{await browser.close();}
