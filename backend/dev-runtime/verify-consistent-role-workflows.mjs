// Role acceptance: all domain writes are intercepted, never persisted.
import {chromium} from '../../frontend/node_modules/playwright-core/index.mjs';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {certificateOptions,loopbackCertificate} from './browser-options.mjs';
import {openApplicationPage} from './open-application-page.mjs';
const root=process.env.EVAL_DEV_ROOT,chunks=[];
for await(const chunk of process.stdin)chunks.push(chunk);
const passwords=JSON.parse(Buffer.concat(chunks).toString());
const browser=await chromium.launch({...certificateOptions(await loopbackCertificate(readFileSync(root+'/cert.pem'))),headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let checks=0,writes=0,diagnosticPage;const errors=[];
const check=(condition,label)=>{assert(condition,label);checks++;};
const get=(page,path)=>page.evaluate(async path=>{const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw Error('Read failed '+response.status);return (await response.json()).data;},path);
async function login(role,username,label){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await openApplicationPage(context);diagnosticPage=page;page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)console.log(JSON.stringify({failedRead:new URL(response.url()).pathname,status:response.status()}));});
 await page.getByLabel('Usuario',{exact:true}).fill(username);await page.getByLabel('Contraseña',{exact:true}).fill(passwords[role]);passwords[role]='';await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 const menu=page.getByRole('navigation',{name:'Menú de '+label,exact:true});await menu.waitFor();
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()==='GET'||!/^\/(education|academic|account|users)(\/|$)/.test(url.pathname)){await route.continue();return;}
  writes++;
  const data=url.pathname.endsWith('/assessments')?{id:'9999999',assessment_id:'9999999'}:url.pathname.endsWith('/deliveries')?{id:'9999999',version_id:'9999999'}:/\/(withdraw|restore|replace-file|edit)$/.test(url.pathname)?{id:url.pathname.split('/').at(-2),revision_id:'9999999'}:{id:'9999999'};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});
 });
 return {context,page,menu};
}
async function cancel(page,title){const before=writes,dialog=page.locator('dialog.eval-action-dialog');await dialog.waitFor();check(await dialog.getByRole('heading',{name:title,exact:true}).isVisible(),'correct confirmation');await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();check(writes===before,'cancel does not write');}
async function settleTheme(page){await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));});}
async function readable(locator){
 const ratio=await locator.evaluate(element=>{const rgb=value=>{const values=value.match(/[\d.]+/g).map(Number);return values.slice(0,3).map(v=>v/(value.startsWith('color(srgb ')?1:255));};const light=values=>values.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);const style=getComputedStyle(element);const a=light(rgb(style.color)),b=light(rgb(style.backgroundColor));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});check(ratio>=4.5,'button text contrast '+ratio.toFixed(2));
}
async function fits(page){for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow at '+width);}}
try{
 {
  const {context,page,menu}=await login('student','estudiante','Estudiante');
  const data=await get(page,'/account/student-tasks'),graded=data.items.find(task=>task.delivery.is_graded&&task.id!==data.items[0]?.id);
  const pending=data.items[0];check(!!pending,'student has assigned tasks');
  // The original demonstration account has already graded all its work.
  // Present one pending task through read fixtures, without changing enrollment or grades.
  Object.assign(pending,{can_submit:true,state:'open',delivery:{has_delivery:false,is_graded:false,delivered_at:null,filename:null,grade:null,feedback:null,graded_at:null}});
  data.overview={pending:1,delivered:0,graded:data.items.length-1,overdue:pending.category==='overdue'?1:0};
  const activity=await get(page,'/education/activities/'+pending.id);Object.assign(activity,{state:'open',can_submit:true,can_close:false});
  await page.route('**/account/student-tasks',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})}));
  await page.route('**/education/activities/'+pending.id,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:activity})}));
  await page.route('**/education/activities/'+pending.id+'/deliveries',route=>route.request().method()==='GET'?route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{items:[],next_after:null}})}):route.fallback());
  check(!!pending,'available student delivery');
  await menu.getByRole('button',{name:'Tareas',exact:true}).click();
  await page.getByRole('button',{name:'Abrir tarea '+pending.title+' de '+pending.course.subject,exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'Detalle de tarea',exact:true});await drawer.waitFor();
  await drawer.getByRole('button',{name:pending.delivery.has_delivery?'Actualizar entrega':'Entregar ahora',exact:true}).click();
  let form=page.getByRole('form',{name:/^(Enviar mi entrega|Actualizar mi entrega)$/});await form.waitFor();
  await form.getByRole('button',{name:/^(Enviar entrega|Actualizar entrega)$/}).click();
  check(await page.locator('dialog.eval-action-dialog:visible').count()===0,'empty delivery rejected before confirmation');
  await form.getByLabel('Respuesta',{exact:true}).fill('Verificación de interfaz sin guardar en la base.');
  await form.getByRole('button',{name:/^(Enviar entrega|Actualizar entrega)$/}).click();await cancel(page,pending.delivery.has_delivery?'¿Actualizar tu entrega?':'¿Enviar este trabajo?');
  check((await form.getByLabel('Respuesta',{exact:true}).inputValue()).length>0,'cancel preserves response');
  await form.getByRole('button',{name:/^(Enviar entrega|Actualizar entrega)$/}).click();
  await page.locator('dialog.eval-action-dialog').getByRole('button',{name:'Confirmar',exact:true}).click();
  const notice=page.locator('.eval-action-notice');await notice.waitFor();check(await notice.innerText().then(text=>text.includes('Trabajo enviado correctamente.')),'delivery success notice');check(await notice.evaluate(element=>element.matches(':popover-open')),'success notice is in top layer');
  await page.getByRole('button',{name:'← Volver a mis tareas',exact:true}).click();
  if(graded){await page.getByRole('button',{name:'Abrir tarea '+graded.title+' de '+graded.course.subject,exact:true}).click();await drawer.getByRole('button',{name:'Ver entrega',exact:true}).click();await page.getByRole('region',{name:'Mi entrega',exact:true}).waitFor();check(await page.getByRole('form',{name:/^(Enviar mi entrega|Actualizar mi entrega)$/}).count()===0,'graded work remains read-only');await page.getByRole('button',{name:'← Volver a mis tareas',exact:true}).click();}
  await fits(page);await page.getByRole('button',{name:'Modo oscuro',exact:true}).click();await settleTheme(page);await readable(page.locator('#task-order'));await page.screenshot({path:root+'/consistent-student-dark.png',fullPage:true});
  await page.getByRole('button',{name:'Abrir mi cuenta',exact:true}).click();await page.getByRole('navigation',{name:'Opciones de mi cuenta',exact:true}).getByRole('button',{name:/^Cambiar contraseña/}).click();await page.getByLabel('Contraseña actual',{exact:true}).fill('preview-current-password');await page.getByLabel('Nueva contraseña',{exact:true}).fill('preview-new-password-2026');await page.getByLabel('Confirmar nueva contraseña',{exact:true}).fill('preview-new-password-2026');
  await page.getByRole('button',{name:'Cambiar contraseña',exact:true}).click();await cancel(page,'¿Cambiar tu contraseña?');
  await context.close();
 }
 {
  const {context,page,menu}=await login('teacher','docente','Docente');
  await menu.getByRole('button',{name:'Tareas y entregas',exact:true}).click();
  const classroom=page.getByRole('region',{name:'Seleccionar aula de mis cursos',exact:true});await classroom.getByRole('group',{name:'Grado',exact:true}).getByRole('button').first().click();await classroom.getByRole('button',{name:/^Sección /}).first().click();
  await page.getByRole('button',{name:'+ Nueva actividad',exact:true}).waitFor();await page.getByRole('button',{name:'+ Nueva actividad',exact:true}).click();
  const create=page.getByRole('form',{name:'Crear actividad',exact:true});await create.getByLabel('Título',{exact:true}).fill('Vista previa de tarea');await create.getByLabel('Instrucciones',{exact:true}).fill('Consigna de verificación; no se guardará.');await create.locator('[name=due_on]').fill('2020-01-01');check(!await create.evaluate(form=>form.checkValidity()),'past deadline rejected');await create.locator('[name=due_on]').fill('');await create.getByRole('button',{name:'Publicar actividad',exact:true}).click();await cancel(page,'¿Publicar esta actividad?');
  await page.getByRole('button',{name:'Cancelar creación',exact:true}).click();
  const card=page.locator('article').filter({has:page.getByRole('button',{name:'Ver detalles',exact:true})}).first();
  await card.getByRole('button',{name:'Ver detalles',exact:true}).click();await card.getByRole('button',{name:'Cerrar actividad',exact:true}).click();await cancel(page,'¿Cerrar esta actividad?');
  await card.getByRole('button',{name:/^(Ver entregas|Entregas y calificaciones)$/}).click();
  await card.locator('details summary').first().click();
  const assessment=page.getByRole('form',{name:/^(Calificar entrega|Corregir calificación)$/}).first();await assessment.waitFor();
  await assessment.getByRole('button',{name:/^A Logro esperado$/}).click();await assessment.getByLabel('Retroalimentación',{exact:true}).fill('Retroalimentación de verificación sin persistencia.');await assessment.getByRole('button',{name:'Guardar calificación',exact:true}).click();await cancel(page,(await assessment.getAttribute('aria-label'))==='Corregir calificación'?'¿Corregir la calificación?':'¿Guardar la calificación?');
  await menu.getByRole('button',{name:'Cursos y aulas',exact:true}).click();
  await page.getByRole('button',{name:'Entrar al curso',exact:true}).first().click();
  await page.getByRole('button',{name:'Materiales y publicación',exact:true}).click();
  await page.getByRole('button',{name:'Publicar material',exact:true}).click();const material=page.getByRole('form',{name:'Publicar material',exact:true});
  await material.locator('[name=title]').fill('Recurso de verificación');await material.locator('[name=file]').setInputFiles({name:'preview.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\npreview')});
  await material.getByRole('button',{name:/Publicar/}).click();await cancel(page,'¿Publicar este material?');await page.getByRole('button',{name:'Cerrar formulario',exact:true}).click();
  await page.locator('.eval-material-options summary').first().click();const maintenance=page.getByRole('region',{name:'Mantenimiento del material',exact:true}).first();await maintenance.getByRole('button',{name:'Editar material',exact:true}).click();await maintenance.getByLabel('Nuevo título',{exact:true}).fill('Título de vista previa');await maintenance.getByRole('button',{name:'Guardar cambios del material',exact:true}).click();await cancel(page,'¿Guardar los cambios?');
  await maintenance.getByRole('button',{name:'Cancelar edición',exact:true}).click();await maintenance.getByRole('button',{name:'Retirar material',exact:true}).click();await cancel(page,'¿Retirar este material?');
  await fits(page);await page.getByRole('button',{name:'Modo oscuro',exact:true}).click();await settleTheme(page);await maintenance.getByRole('button',{name:'Retirar material',exact:true}).click();const dialog=page.locator('dialog.eval-action-dialog');await dialog.waitFor();await page.screenshot({path:root+'/consistent-teacher-confirmation-dark.png',fullPage:true});await page.keyboard.press('Escape');check(!await dialog.isVisible(),'Escape cancels teacher action');
  await readable(maintenance.getByRole('button',{name:'Retirar material',exact:true}));
  await maintenance.getByRole('button',{name:'Reemplazar archivo',exact:true}).click();await maintenance.getByLabel('Nuevo archivo',{exact:true}).setInputFiles({name:'replacement.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 replacement')});await maintenance.getByRole('button',{name:'Revisar reemplazo de archivo',exact:true}).click();await cancel(page,'¿Reemplazar el archivo?');
  await page.getByRole('button',{name:'Semanas',exact:true}).click();
  const courseId=await page.locator('.eval-classroom').getAttribute('data-course'),calendar=await get(page,'/academic/my-courses/'+courseId+'/weeks');const fourth=calendar.current.blocks.filter(block=>block.kind==='teaching')[3];
  await page.getByRole('tab',{name:'Bimestre IV',exact:true}).click();await page.getByRole('heading',{name:'Semana '+fourth.weeks[0].number,exact:true}).waitFor();await page.getByRole('button',{name:'＋ Crear actividad',exact:true}).click();
  const weekly=page.getByRole('form',{name:'Publicar actividad en esta semana',exact:true});await weekly.locator('[name=title]').fill('Actividad semanal de vista previa');await weekly.locator('[name=instructions]').fill('Consigna sin guardar.');await weekly.getByRole('button',{name:'Publicar en esta semana',exact:true}).click();await cancel(page,'¿Publicar esta actividad?');await weekly.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByRole('button',{name:/^Revisar actividad y entregas/}).first().click();const academic=page.locator('dialog.eval-academic-dialog').filter({has:page.getByRole('button',{name:'Ver detalles',exact:true})});await academic.waitFor();await academic.getByRole('button',{name:'Ver detalles',exact:true}).click();await academic.getByRole('button',{name:'Cerrar actividad',exact:true}).click();await cancel(page,'¿Cerrar esta actividad?');check(await academic.isVisible(),'parent detail remains after canceling nested confirmation');
  await context.close();
 }
 {
  const {context,page,menu}=await login('director_admin','director','Director');
  await menu.getByRole('button',{name:'Información institucional',exact:true}).click();const institution=page.getByRole('region',{name:'Información institucional',exact:true});
  check(await institution.locator('.eval-consult-grid button').count()===4,'director consultation categories');await institution.getByRole('button',{name:/^Secciones/}).click();await institution.getByLabel('Seleccionar grado',{exact:true}).getByRole('button').first().click();
  await institution.getByRole('heading',{name:/^Secciones de /}).waitFor();check(await institution.locator('tbody tr').count()>0,'sections grouped by selected grade');check(await institution.getByRole('button',{name:/Crear|Editar|Eliminar|Desactivar|Guardar/}).count()===0,'director has no mutation controls');
  await fits(page);await page.getByRole('button',{name:'Modo oscuro',exact:true}).click();await settleTheme(page);await readable(institution.getByRole('button',{name:'← Todas las consultas',exact:true}));await readable(institution.locator('td').first());await page.screenshot({path:root+'/consistent-director-dark.png',fullPage:true});
  await menu.getByRole('button',{name:'Mi perfil',exact:true}).click();check(await page.locator('form').count()===0,'director profile read-only');await context.close();
 }
 check(errors.length===0,'no page errors: '+errors.join(';'));
 console.log(JSON.stringify({passed:true,checks,interceptedWrites:writes,actualDomainWrites:0,pageErrors:errors.length}));
}catch(error){if(diagnosticPage&&!diagnosticPage.isClosed()){console.log(JSON.stringify({url:diagnosticPage.url(),pageErrors:errors,buttons:await diagnosticPage.getByRole('button').count()}));await diagnosticPage.screenshot({path:root+'/consistent-roles-diagnostic.png',fullPage:true});}throw error;}finally{await browser.close();}
