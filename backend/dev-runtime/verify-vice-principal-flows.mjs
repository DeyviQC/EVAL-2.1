// Read-only acceptance of every vice-principal workspace and progressive classroom paths.
import {chromium} from '../../frontend/node_modules/playwright-core/index.mjs';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {certificateOptions,loopbackCertificate} from './browser-options.mjs';
const root=process.env.EVAL_DEV_ROOT,chunks=[];for await(const c of process.stdin)chunks.push(c);const passwords=JSON.parse(Buffer.concat(chunks).toString());
const browser=await chromium.launch({...certificateOptions(await loopbackCertificate(readFileSync(root+'/cert.pem'))),headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let checks=0,writes=0;const errors=[];const check=(v,label)=>{assert(v,label);checks++;};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method())&&!new URL(r.url()).pathname.startsWith('/auth/'))writes++;});
 await page.goto('https://127.0.0.1:8443/');await page.getByLabel('Usuario',{exact:true}).fill('subdirector');await page.getByLabel('Contraseña',{exact:true}).fill(passwords.vice_principal);passwords.vice_principal='';await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 const sidebar=page.getByRole('navigation',{name:'Menú de Subdirector',exact:true});await sidebar.waitFor();
 async function open(label,homeLabel){if(homeLabel){await sidebar.getByRole('button',{name:'Inicio',exact:true}).click();await page.locator('.vp-organization').getByRole('button',{name:new RegExp(homeLabel)}).click();}else await sidebar.getByRole('button',{name:label,exact:true}).click();await page.locator('.vp-workflow').waitFor();}
 const modules=[['Períodos',null,2],['Matrículas',null,2],['Docentes',null,2],['Usuarios',null,3],['Calendario institucional',null,3],['Supervisión',null,1],['Reportes',null,2],['Auditoría',null,1],[null,'Historial',2],[null,'Notificaciones',1],[null,'Mi cuenta',2]];
 for(const [label,homeLabel,count] of modules){
  await open(label,homeLabel);const flow=page.locator('.vp-workflow'),menu=flow.locator('nav.vp-action-grid');check(await menu.getByRole('button').count()===count,'task choices '+(label??homeLabel));check(await flow.locator('.vp-task-content').count()===0,'deferred workspace');
  for(let i=0;i<count;i++){
   await menu.getByRole('button').nth(i).click();const task=flow.locator('.vp-task-content');await task.waitFor();
   await page.waitForFunction(()=>!document.querySelector('.vp-task-content:not([hidden]) [aria-busy="true"]'));
   if(label==='Matrículas'||label==='Docentes'){check(await task.locator('form:visible').count()===(i===1?1:0),'create separated from list');}
   if(homeLabel==='Mi cuenta')check(await task.locator('input[type="password"]:visible').count()===(i===1?3:0),'profile separate from password');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'desktop overflow '+(label??homeLabel));
   await flow.getByRole('button',{name:'Volver a opciones',exact:true}).click();await menu.waitFor();check(!(await task.isVisible()),'back hides task');
  }
 }
 async function classroom(label,action){await open(label);const flow=page.locator('.vp-workflow');await flow.locator('nav.vp-action-grid').getByRole('button',{name:new RegExp(action)}).click();const steps=flow.getByRole('region',{name:'Seleccionar aula',exact:true});
  await steps.getByRole('heading',{name:'Selecciona el año académico',exact:true}).waitFor();await steps.locator('.vp-choice-grid button').first().click();await steps.getByRole('heading',{name:'Selecciona el grado',exact:true}).waitFor();await steps.locator('.vp-choice-grid button').first().click();await steps.getByRole('heading',{name:'Selecciona la sección',exact:true}).waitFor();await steps.locator('.vp-choice-grid button').first().click();await page.waitForFunction(()=>!document.querySelector('.vp-task-content:not([hidden]) [aria-busy="true"]'));check(await steps.getByRole('heading').count()===0,'classroom ready');return flow;
 }
 let flow=await classroom('Matrículas','Estudiantes por aula');await flow.getByRole('button',{name:'Ver matrícula →',exact:true}).first().click();await flow.getByRole('button',{name:'Trasladar',exact:true}).click();await flow.getByRole('form',{name:'Confirmar cambio de matrícula'}).waitFor();await flow.getByRole('button',{name:'Cancelar',exact:true}).click();checks++;
 await page.screenshot({path:root+'/vp-flow-enrollment-light.png',fullPage:true});
 flow=await classroom('Docentes','Docentes por aula');await flow.getByRole('button',{name:'Ver asignación →',exact:true}).first().click();check(await flow.getByRole('button',{name:'Cerrar asignación',exact:true}).count()===1,'single assignment actions');
 flow=await classroom('Supervisión','Revisar materiales');await flow.locator('.vp-supervision-course .vp-choice-grid button').first().click();await flow.getByRole('region',{name:'Materiales del curso'}).waitFor();await flow.locator('.vp-supervision-results .vp-action-grid button').first().click();check(await flow.getByRole('link',{name:'Abrir material',exact:true}).count()===1,'single material detail');await flow.getByRole('button',{name:'← Volver a materiales',exact:true}).click();
 flow=await classroom('Reportes','Reporte de aula');await flow.getByRole('button',{name:'Consultar reporte',exact:true}).click();await flow.getByRole('heading',{name:/2026.*Primero/}).waitFor();check(!(await flow.getByText('Cierre de Bimestres y Bloqueo de Calificaciones',{exact:true}).isVisible()),'closing separated from report');
 await open('Usuarios');flow=page.locator('.vp-workflow');await flow.locator('nav.vp-action-grid').getByRole('button',{name:/Buscar una cuenta/}).click();await flow.getByRole('button',{name:'Ver cuenta →',exact:true}).first().click();check(await flow.getByRole('button',{name:'Restablecer contraseña',exact:true}).count()===1,'one account detail');
 await open('Calendario institucional');flow=page.locator('.vp-workflow');await flow.locator('nav.vp-action-grid').getByRole('button',{name:/Calendario publicado/}).click();await flow.locator('#calendar-period option').nth(1).waitFor({state:'attached'});const period=await flow.locator('#calendar-period option').nth(1).getAttribute('value');await flow.locator('#calendar-period').selectOption(period);await page.waitForFunction(()=>!document.querySelector('.vp-task-content:not([hidden]) [aria-busy="true"]'));check(await flow.locator('form:visible').count()===0,'published calendar has no editor');
 await open('Matrículas');flow=page.locator('.vp-workflow');await page.screenshot({path:root+'/vp-flow-menu-light.png',fullPage:true});
 await page.getByRole('button',{name:'Modo oscuro',exact:true}).click();await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));await page.evaluate(async()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
 await page.screenshot({path:root+'/vp-flow-menu-dark.png',fullPage:true});
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'menu responsive');check(await flow.locator('.vp-action-grid button').evaluateAll(list=>list.every(b=>b.getBoundingClientRect().height>=44)),'target size');}
 await flow.locator('nav.vp-action-grid').getByRole('button',{name:/Nueva matrícula/}).click();await page.waitForFunction(()=>!document.querySelector('.vp-task-content:not([hidden]) [aria-busy="true"]'));
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'form responsive');}
 await page.setViewportSize({width:390,height:1000});await page.screenshot({path:root+'/vp-flow-form-mobile-dark.png',fullPage:true});
 check(errors.length===0,'no browser exceptions: '+errors.join('; '));check(writes===0,'no academic writes');console.log(JSON.stringify({passed:true,checks,modules:11,academicWrites:writes,pageErrors:errors.length}));await context.close();
}finally{await browser.close();}
