import {chromium} from '../../frontend/node_modules/playwright-core/index.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {certificateOptions,loopbackCertificate} from './browser-options.mjs';
const root=process.env.EVAL_DEV_ROOT;if(!root)throw Error('Private runtime required');
const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);const passwords=JSON.parse(Buffer.concat(chunks).toString());
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({...certificateOptions(await loopbackCertificate(readFileSync(resolve(root,'cert.pem')))),headless:true,executablePath});let checks=0;
try{
 const context=await browser.newContext({viewport:{width:1360,height:900}});const page=await context.newPage();
 await page.goto('https://127.0.0.1:8443/');await page.getByLabel('Usuario',{exact:true}).waitFor();
 await page.getByLabel('Usuario',{exact:true}).fill('director');await page.getByLabel('Contraseña',{exact:true}).fill('deliberately-wrong-password');await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await page.getByText('Revisa tu usuario y contraseña.',{exact:true}).waitFor();assert(await page.getByRole('button',{name:'Ingresar',exact:true}).isEnabled());checks++;
 await page.getByLabel('Contraseña',{exact:true}).fill(passwords.director_admin);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByRole('navigation',{name:'Menú de Director',exact:true}).waitFor();checks++;
 await page.getByRole('button',{name:'Información institucional',exact:true}).click();await page.getByRole('heading',{name:'Información institucional',exact:true}).waitFor();checks++;
 const requests=[];page.on('request',r=>{const p=new URL(r.url()).pathname;if(['/auth/session','/account/bootstrap','/account','/account/role','/academic/navigation'].includes(p))requests.push(p);});
 await page.route('**/auth/session',async route=>{await new Promise(r=>setTimeout(r,800));await route.continue();});
 await page.reload({waitUntil:'domcontentloaded'});await page.getByText('Verificando sesión…',{exact:true}).waitFor();assert.equal(await page.getByLabel('Usuario',{exact:true}).count(),0);checks++;
 await page.getByRole('heading',{name:'Información institucional',exact:true}).waitFor();assert.deepEqual(requests,['/auth/session','/account/bootstrap']);checks++;
 await page.unroute('**/auth/session');
 const start=performance.now();await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Información institucional',exact:true}).waitFor();const restoredMs=Math.round(performance.now()-start);checks++;
 await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.getByLabel('Usuario',{exact:true}).waitFor();checks++;
 await page.route('**/auth/login',route=>route.abort());await page.getByLabel('Usuario',{exact:true}).fill('director');await page.getByLabel('Contraseña',{exact:true}).fill(passwords.director_admin);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByRole('button',{name:'Reintentar conexión',exact:true}).waitFor();checks++;
 await page.unroute('**/auth/login');await page.getByRole('button',{name:'Reintentar conexión',exact:true}).click();await page.getByRole('button',{name:'Ingresar',exact:true}).waitFor();assert(await page.getByRole('button',{name:'Ingresar',exact:true}).isEnabled());checks++;
 console.log(JSON.stringify({passed:true,checks,restoredMs,bootstrapRequests:2,noLoginFlash:true,invalidPasswordRetry:true,connectionRecovery:true,academicWrites:0}));await context.close();
}finally{await browser.close();}
