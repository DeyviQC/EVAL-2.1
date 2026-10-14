// Real-data, read-only acceptance for the shared course experience and four dashboards.
import {chromium} from '../../frontend/node_modules/playwright-core/index.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {certificateOptions,loopbackCertificate} from './browser-options.mjs';
const root=process.env.EVAL_DEV_ROOT;if(!root)throw Error('Private runtime required');const chunks=[];for await(const c of process.stdin)chunks.push(c);const passwords=JSON.parse(Buffer.concat(chunks).toString());
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({...certificateOptions(await loopbackCertificate(readFileSync(resolve(root,'cert.pem')))),headless:true,executablePath});let checks=0;
async function get(page,path){return page.evaluate(async path=>{const response=await fetch(path);return {status:response.status,data:(await response.json()).data};},path);}
async function all(page,path){let after=null,items=[];do{const result=await get(page,path+(after?(path.includes('?')?'&':'?')+'after='+after:''));assert.equal(result.status,200);items.push(...result.data.items);after=result.data.next_after;}while(after);return items;}
async function settled(page){await page.waitForFunction(()=>![...document.querySelectorAll('.eval-workspace-content [aria-busy]')].some(e=>e.getAttribute('aria-busy')==='true'));}
try{
 for(const [login,role,label] of [['estudiante','student','Estudiante'],['docente','teacher','Docente'],['director','director_admin','Director'],['subdirector','vice_principal','Subdirector']]){
  const context=await browser.newContext({viewport:{width:1360,height:950}});const page=await context.newPage();await page.goto('https://127.0.0.1:8443/?role=vice_principal');await page.getByLabel('Usuario',{exact:true}).fill(login);await page.getByLabel('Contraseña',{exact:true}).fill(passwords[role]);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByRole('navigation',{name:'Menú de '+label,exact:true}).waitFor();checks++;
  await page.locator('.eval-summary-grid button').first().waitFor();assert.equal(await page.locator('.eval-summary-grid button').count(),4);assert.equal(await page.getByText(/de desarrollo/).count(),0);checks+=2;
  const overview=await get(page,'/account/overview');assert.equal(overview.status,200);assert.equal(overview.data.courses,role==='student'?10:role==='teacher'?20:200);assert.equal(overview.data.pending,role==='student'?0:role==='teacher'?20:200);checks+=3;
  await page.screenshot({path:resolve(root,'shared-dashboard-'+role+'.png'),fullPage:true});
  if(role==='student'||role==='teacher'){
   const courses=await all(page,'/academic/my-courses');
   const tested=role==='student'?[courses[0],courses[1],courses[9]]:[courses[0],courses.at(-1)];
   for(const course of tested){
    const calendar=await get(page,'/academic/my-courses/'+course.id+'/weeks');const revision=calendar.data.current;const block=revision.blocks.filter(b=>b.kind==='teaching')[3];const query=new URLSearchParams({bucket:'week',revision:revision.id,week:block.weeks[0].id});
    const response=await get(page,'/academic/my-courses/'+course.id+'/weeks/activity?'+query);assert.equal(response.status,200);assert.equal(response.data.items.length,1);const progress=response.data.items[0].progress;assert.equal(progress.state,role==='student'?'graded':'review');assert.equal(progress.delivered,role==='student'?1:3);assert.equal(progress.graded,role==='student'?1:2);if(role==='teacher'){assert.equal(progress.grade,null);assert.equal(progress.feedback,null);}else assert(progress.grade&&progress.feedback);checks+=5;
    const pending=await get(page,'/academic/my-courses/'+course.id+'/weeks/activity?bucket=pending');assert.equal(pending.status,200);assert.equal(pending.data.total,role==='student'?0:1);checks+=2;
    if(await page.getByRole('button',{name:'← Volver a mis cursos',exact:true}).count()){await page.getByRole('button',{name:'← Volver a mis cursos',exact:true}).click();await settled(page);}await page.getByRole('button',{name:role==='student'?'Mis cursos':'Cursos y aulas',exact:true}).click();
    if(role==='teacher'){await page.getByRole('button',{name:course.grade,exact:true}).click();await page.getByRole('button',{name:'Sección '+course.section,exact:true}).click();}
    await page.getByRole('article',{name:course.subject+' · '+course.grade+' '+course.section,exact:true}).getByRole('button',{name:'Entrar al curso',exact:true}).click();
    await page.getByRole('tab',{name:'Bimestre IV',exact:true}).click();await page.getByRole('heading',{name:'Semana '+block.weeks[0].number,exact:true}).waitFor();await settled(page);
    assert.equal(await page.locator('.eval-classroom').getAttribute('data-course'),course.id);assert.equal(await page.locator('.eval-classroom-header h3').innerText(),course.subject);assert.equal(await page.getByRole('tab').count(),4);assert.equal(await page.locator('.eval-learning-card').count(),2);assert.equal(await page.locator('.eval-progress-pill').innerText(),role==='student'?'Calificada · '+progress.grade:'Por revisar');checks+=5;
    await page.getByRole('button',{name:'Semana siguiente',exact:true}).click();await settled(page);assert.equal(await page.locator('.eval-learning-card').count(),0);assert(await page.getByText('Esta semana todavía no tiene contenido',{exact:true}).isVisible());checks+=2;
    await page.getByRole('button',{name:'Semana anterior',exact:true}).click();await settled(page);assert.equal(await page.locator('.eval-learning-card').count(),2);checks++;
    await page.getByRole('tab',{name:'Bimestre IV',exact:true}).focus();await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>document.querySelectorAll('[role=tab]')[2]?.getAttribute('aria-selected')==='true');assert(await page.getByRole('tab',{name:'Bimestre III',exact:true}).getAttribute('aria-selected')==='true');checks++;await settled(page);await page.getByRole('tab',{name:'Bimestre IV',exact:true}).click();await settled(page);
    await page.getByRole('button',{name:role==='student'?'Ver entrega y calificación →':'Revisar actividad y entregas →',exact:true}).click();await page.getByRole('dialog',{name:'Actividad y seguimiento',exact:true}).waitFor();await page.getByRole('button',{name:'Cerrar detalle de actividad',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0);assert(await page.getByRole('button',{name:role==='student'?'Ver entrega y calificación →':'Revisar actividad y entregas →',exact:true}).evaluate(el=>document.activeElement===el));checks+=2;
    if(role==='student')assert.equal(await page.getByRole('button',{name:'＋ Crear actividad',exact:true}).count(),0);else {await page.getByRole('button',{name:'＋ Crear actividad',exact:true}).click();assert(await page.getByRole('form',{name:'Publicar actividad en esta semana',exact:true}).isVisible());await page.getByRole('button',{name:'Cancelar',exact:true}).click();}checks++;
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:resolve(root,'shared-course-'+role+'-'+course.id+'.png'),fullPage:true});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;await page.setViewportSize({width:1360,height:950});
   }
   if(role==='student')assert.equal((await get(page,'/academic/my-courses/'+(BigInt(courses[0].id)+10n))).status,404);else assert.equal((await get(page,'/academic/my-courses/'+(BigInt(courses[0].id)+1n))).status,404);checks++;
  }else{
   await page.getByRole('button',{name:role==='director_admin'?'Información institucional':'Usuarios',exact:true}).click();await settled(page);if(role==='director_admin')assert.equal(await page.locator('form').count(),0);else assert(await page.getByRole('button',{name:'Crear cuenta',exact:true}).isVisible());checks++;
   await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
  }
  await context.close();
 }
 console.log(JSON.stringify({passed:true,checks,dashboards:4,studentSubjects:3,teacherClassrooms:2,keyboardTabs:true,academicWrites:0}));
}finally{await browser.close();}
