import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { certificateOptions, loopbackCertificate, resolveBrowserExecutable } from './browser-options.mjs';
const root=process.env.EVAL_DEV_ROOT,chunks=[];
for await(const chunk of process.stdin)chunks.push(chunk);
const {password}=JSON.parse(Buffer.concat(chunks).toString());
const browser=await chromium.launch({...certificateOptions(await loopbackCertificate(readFileSync(resolve(root,'cert.pem')))),headless:true,executablePath:resolveBrowserExecutable()??chromium.executablePath()});
let checks=0;
function check(value,label){assert.ok(value,label);checks++;}
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await page.goto('https://127.0.0.1:8443/');
 await page.getByLabel('Usuario',{exact:true}).fill('subdirector');
 await page.getByLabel('Contraseña',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await page.getByRole('heading',{name:'Tu espacio académico'}).waitFor();
 const sidebar=page.getByRole('complementary',{name:'Barra lateral de navegación'});
 await sidebar.getByRole('button',{name:'Inicio',exact:true}).click();
 await page.getByRole('region',{name:'Bienvenida del subdirector'}).waitFor();
 await page.screenshot({path:resolve(root,'vice-principal-home-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'home mobile overflow');
 await page.screenshot({path:resolve(root,'vice-principal-home-mobile.png'),fullPage:true});
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 await page.screenshot({path:resolve(root,'vice-principal-home-dark.png'),fullPage:true});
 await page.evaluate(()=>document.documentElement.classList.remove('dark'));
 await page.setViewportSize({width:1280,height:900});
 await page.getByRole('button',{name:'Gestionar alumnos y docentes',exact:true}).click();
 await page.getByRole('heading',{name:'Usuarios',exact:true}).waitFor();
 check(true,'home primary shortcut opens existing users workspace');
 for(const name of ['Inicio','Períodos','Calendario institucional','Catálogo','Matrículas','Docentes','Usuarios','Supervisión','Reportes','Auditoría']){
  await sidebar.getByRole('button',{name,exact:true}).click();
  await page.locator('#eval-main').waitFor();
  await page.waitForFunction(()=>!document.querySelector('#eval-main')?.textContent.includes('Cargando sección institucional…'));
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow '+width);
  }
  await page.setViewportSize({width:1280,height:900});
 }
 await sidebar.getByRole('button',{name:'Usuarios',exact:true}).click();
 await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
 const field=page.getByRole('form',{name:'Crear cuenta'}).getByLabel('Nombre',{exact:true});
 await field.focus();
 check(await field.evaluate(el=>{const s=getComputedStyle(el);return s.borderTopWidth==='0px'&&s.borderBottomWidth==='2px'&&s.outlineStyle==='none';}),'underline focus');
 const style=el=>{const s=getComputedStyle(el);return [s.backgroundColor,s.borderTopWidth,s.color,s.padding,s.borderRadius];};
 const sidebarBefore=await sidebar.getByRole('button',{name:'Usuarios',exact:true}).evaluate(style);
 await page.locator('.eval-layout').evaluate(el=>{el.dataset.role='teacher';});
 const teacherBorder=await field.evaluate(el=>getComputedStyle(el).borderTopWidth);
 check(teacherBorder!=='0px','teacher retains bordered field');
 check(JSON.stringify(sidebarBefore)===JSON.stringify(await sidebar.getByRole('button',{name:'Usuarios',exact:true}).evaluate(style)),'sidebar unchanged by role scoped styles');
 await page.locator('.eval-layout').evaluate(el=>{el.dataset.role='vice_principal';});
 await page.getByRole('button',{name:'Carga masiva',exact:true}).click();
 await page.mouse.move(0,0);
 check(await page.getByRole('button',{name:'Carga masiva',exact:true}).locator('svg').count()===1,'import vector icon');
 check(await page.getByText('Seleccionar archivo CSV',{exact:true}).evaluate(el=>getComputedStyle(el).color==='rgb(255, 255, 255)'),'upload action readable on primary blue');
 check(await page.getByRole('button',{name:'Carga masiva',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor==='rgb(42, 85, 163)'),'selected important action stays blue');
 await page.screenshot({path:resolve(root,'vice-principal-import-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'import mobile overflow');
 await page.screenshot({path:resolve(root,'vice-principal-import-mobile.png'),fullPage:true});
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 check(await page.locator('.eval-course-tabs').evaluate(el=>getComputedStyle(el).backgroundColor!=='rgb(255, 255, 255)'),'tabs respect dark theme');
 check(await field.count()===0,'create form unmounted in import panel');
 await page.screenshot({path:resolve(root,'vice-principal-import-dark.png'),fullPage:true});
 const account=await page.evaluate(async()=>{const response=await fetch('/account');return (await response.json()).data;});
 for(const section of ['history','notifications','account']){
  await page.evaluate(({id,section})=>sessionStorage.setItem('eval-view:'+id+':vice_principal',section),{id:account.id,section});
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.eval-layout')?.getAttribute('data-role')==='vice_principal');
  await page.waitForFunction(()=>!document.querySelector('#eval-main')?.textContent.includes('Cargando sección institucional…'));
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),section+' mobile overflow');
 }
 console.log(JSON.stringify({checks,screens:13,account_mutations:0}));
}finally{await browser.close();}
