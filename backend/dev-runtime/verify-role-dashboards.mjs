import {chromium} from '../../frontend/node_modules/playwright-core/index.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {certificateOptions,loopbackCertificate} from './browser-options.mjs';
const root=process.env.EVAL_DEV_ROOT;if(!root)throw Error('Private EVAL runtime required');
const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);const passwords=JSON.parse(Buffer.concat(chunks).toString());
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({...certificateOptions(await loopbackCertificate(readFileSync(resolve(root,'cert.pem')))),headless:true,executablePath});
let checks=0;
try{
 for(const [login,role,label,section,expected] of [['estudiante','student','Estudiante','Mis actividades','Actividades'],['docente','teacher','Docente','Actividades y entregas','Actividades'],['director','director_admin','Director','Información institucional','Información institucional'],['subdirector','vice_principal','Subdirector','Usuarios','Usuarios']]){
  const context=await browser.newContext({viewport:{width:1360,height:960}});
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const page=await context.newPage();await page.goto('https://127.0.0.1:8443/?role=vice_principal');
  await page.getByLabel('Usuario',{exact:true}).fill(login);await page.getByLabel('Contraseña',{exact:true}).fill(passwords[role]);await page.getByRole('button',{name:'Ingresar',exact:true}).click();
  await page.getByRole('navigation',{name:'Menú de '+label,exact:true}).waitFor();checks++;
  assert.equal(await page.locator('.eval-layout').getAttribute('data-role'),role);checks++;
  if(role==='director_admin'){assert.equal(await page.getByRole('button',{name:'Usuarios',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Períodos académicos',exact:true}).count(),0);checks+=2;}
  if(role==='student'||role==='teacher'){assert.equal(await page.getByRole('button',{name:'Usuarios',exact:true}).count(),0);checks++;}
  await page.screenshot({path:resolve(root,'dashboard-'+role+'.png'),fullPage:true});
  await page.getByRole('button',{name:section,exact:true}).click();await page.getByRole('heading',{name:expected,exact:true}).waitFor();checks++;
  if(role==='director_admin'){assert.equal(await page.locator('form').count(),0);checks++;}
  await page.getByRole('button',{name:'Inicio',exact:true}).click();
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));checks++;
  await page.getByRole('button',{name:/^Secciones/}).click();await page.getByRole('button',{name:section,exact:true}).click();await page.getByRole('heading',{name:expected,exact:true}).waitFor();checks++;
  await page.waitForFunction(()=>![...document.querySelectorAll('.eval-workspace-content [aria-busy]')].some(e=>e.getAttribute('aria-busy')==='true'));await page.screenshot({path:resolve(root,'dashboard-mobile-'+role+'.png'),fullPage:true});
  await context.close();
 }
 console.log(JSON.stringify({passed:true,checks,independentDashboards:4,mobileWidth:390,roleUrlIgnored:true,academicWrites:0}));
}finally{await browser.close();}
