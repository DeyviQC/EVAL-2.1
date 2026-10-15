// Built application, authorized synthetic HTTP fixtures, no database writes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {chromium} from '../node_modules/playwright-core/index.mjs';
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const proxy=await readFile(new URL('../../backend/dev-runtime/https-proxy.mjs',import.meta.url),'utf8');
const policy=proxy.match(/'Content-Security-Policy':"([^"]+)"/)[1];
const server=createServer(async(req,res)=>{try{
 const filename=resolve(dist,'.'+(req.url==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
 if(!filename.startsWith(resolve(dist)+sep))throw Error('Invalid path');
 res.setHeader('Content-Type',extname(filename)==='.js'?'text/javascript':extname(filename)==='.css'?'text/css':'text/html');
 if(filename.endsWith('.html'))res.setHeader('Content-Security-Policy',policy);
 res.end(await readFile(filename));
}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const course={id:'2',subject:'Matemática de prueba',kind:'subject',grade:'3',section:'B',period:'Pruebas 2026',period_state:'active',state:'active',teacher:'Docente de prueba',can_publish:false};
const week='a'.repeat(32);
const revision={id:'4',period_id:'3',source:'Calendario de prueba',recorded_at:'2026-10-15 12:00:00',blocks:[{kind:'teaching',start_on:'2026-03-16',end_on:'2026-03-20',weeks:[{number:1,start_on:'2026-03-16',end_on:'2026-03-20',id:week}]}]};
const material={id:'1',assignment_id:'2',author_id:'1',author_name:course.teacher,title:'Guía de fracciones',description:'Material real del curso seleccionado.',filename:'guia.pdf',mime:'application/pdf',bytes:50,published_at:'2026-10-15 12:00:00'};
const activity={id:'2',assignment_id:'2',title:'Actividad de fracciones',instructions:'Resuelve los ejercicios de la guía.',due_on:null,state:'open',can_close:false,can_submit:true};
let browser,mode='ready',writes=0,external=0,queries=0;
try{
 browser=await chromium.launch({channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url()),p=url.pathname;
  if(!request.url().startsWith(origin)){external++;return route.abort();}
  if(request.method()!=='GET')writes++;
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  const data=body=>json({data:body});
  if(p==='/auth/session')return json({authenticated:true,csrf_token:'synthetic-test-token'});
  if(p==='/account/bootstrap')return data({account:{id:'1',name:'Estudiante de prueba',username:'estudiante',can_manage:false},role:'student',navigation:{sections:['my_enrollments']}});
  if(p==='/account')return data({id:'1',name:'Estudiante de prueba',username:'estudiante',can_manage:false});
  if(p==='/academic/navigation')return data({sections:['my_enrollments']});
  if(p==='/academic/my-courses')return data({items:[course],next_after:null});
  if(p==='/academic/my-courses/2')return data(course);
  if(p==='/academic/my-courses/2/weeks')return data({course_id:'2',period_id:'3',current:revision,retained:[]});
  if(p.startsWith('/academic/my-courses/2/weeks/')){
   queries++;if(mode==='denied')return json({error:'forbidden'},403);
   if(mode==='expired')return json({error:'session_expired'},401);
   const kind=p.split('/').at(-1),resource=kind==='material'?material:activity;
   const entry=resource=>({resource,association:{kind,resource_id:resource.id,assignment_id:'2',period_id:'3',version:1,calendar_revision_id:'4',week_id:week,earlier_calendar:false}});
   const paged=mode==='paginated'&&kind==='material',after=url.searchParams.get('after');
   const items=mode==='empty'?[]:paged?(after?[entry({...material,id:'51'})]:Array.from({length:50},(_,i)=>entry({...material,id:String(i+1)}))):[entry(resource)];
   return data({course_id:'2',kind,bucket:url.searchParams.get('bucket'),total:paged?51:items.length,items,next_after:paged&&!after?'50':null});
  }
  if(p.startsWith('/academic/materials/1/file'))return route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"sandbox; default-src 'none'"},body:'<p>Same-origin retained file fixture</p>'});
  return route.continue();
 });
 await page.goto(origin);
 await page.getByRole('button',{name:'Cursos',exact:true}).first().waitFor({timeout:7000}).catch(async error=>{console.error(JSON.stringify({body:await page.locator('body').innerText(),errors}));throw error;});
 await page.getByRole('button',{name:'Cursos',exact:true}).first().click();
 await page.getByRole('button',{name:'Entrar al curso',exact:true}).click();
 // Explicit selection avoids coupling the test to the current date's initial-week heuristic.
 const weekButton=page.getByRole('button',{name:/Semana 1\b/}).first();
 if(await weekButton.count())await weekButton.click();
 const opener=page.getByRole('button',{name:'Proyectar semana',exact:true});
 await opener.click();
 const dialog=page.getByRole('dialog',{name:'Pantalla de Aula'});
 await dialog.getByRole('heading',{name:material.title,exact:true}).waitFor();
 assert.equal(await dialog.locator('iframe').getAttribute('src'),'/academic/materials/1/file?disposition=inline');
 await page.frameLocator('iframe').getByText('Same-origin retained file fixture').waitFor();
 await page.keyboard.press('ArrowRight');
 await dialog.getByRole('heading',{name:activity.title,exact:true}).first().waitFor();
 assert.equal(await dialog.getByText(activity.instructions).count(),1);
 await page.keyboard.press('ArrowLeft');
 await dialog.locator('iframe').waitFor();
 await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.equal(await opener.evaluate(el=>el===document.activeElement),true);
 for(const state of ['empty','denied','ready']){
  mode=state;await opener.click();
  if(state==='empty')await dialog.getByRole('heading',{name:'Una semana por descubrir'}).waitFor();
  else if(state==='denied'){await dialog.getByRole('alert').waitFor();assert.equal(await dialog.locator('iframe').count(),0);}
  else await dialog.locator('iframe').waitFor();
  if(state==='ready'){
   await page.emulateMedia({reducedMotion:'reduce'});
   for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);}
   assert.equal(await dialog.locator('.eval-projection-resource').evaluate(el=>getComputedStyle(el).animationName),'none');
   await page.evaluate(()=>document.documentElement.classList.add('dark'));
   const contrast=await dialog.evaluate(element=>{
    const luminance=value=>{const channels=value.match(/[\d.]+/g).slice(0,3).map(Number).map(channel=>{channel/=255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
    const foreground=luminance(getComputedStyle(element.querySelector('.eval-projection-copy h1')).color);
    const background=luminance(getComputedStyle(element).backgroundColor);
    return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
   });
   assert.ok(contrast>=4.5,`Dark-mode projection title contrast was ${contrast}`);
   await page.evaluate(()=>document.documentElement.classList.remove('dark'));
  }
  await dialog.getByRole('button',{name:'Volver al curso',exact:true}).click();
 }
 mode='paginated';await opener.click();await dialog.locator('iframe').waitFor();
 await dialog.getByRole('button',{name:'Cargar más recursos'}).click();
 await dialog.getByText('1 de 52',{exact:true}).waitFor();assert.equal(await dialog.getByRole('button',{name:'Cargar más recursos'}).count(),0);
 const blocked=await page.evaluate(()=>new Promise(resolve=>{
  const frame=document.createElement('iframe');frame.title='External security probe';
  document.addEventListener('securitypolicyviolation',function listener(event){if(event.effectiveDirective==='frame-src'){document.removeEventListener('securitypolicyviolation',listener);frame.remove();resolve(true);}});
  frame.src='https://example.invalid/';document.body.append(frame);setTimeout(()=>{frame.remove();resolve(false);},2000);
 }));assert.equal(blocked,true);
 await dialog.getByRole('button',{name:'Volver al curso',exact:true}).click();
 mode='expired';await opener.click();
 await dialog.waitFor({state:'detached'});
 assert.equal(await page.locator('.eval-projection iframe').count(),0);
 assert.equal(await page.getByRole('button',{name:'Proyectar semana',exact:true}).count(),0);
 assert.equal(writes,0);assert.equal(external,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'pass',weeklyQueries:queries,writes,externalRequests:external,checks:['integrated-file','activity','keyboard','focus-restoration','empty','denied','reduced-motion','desktop-tablet-mobile']}));
}finally{await browser?.close();await new Promise(done=>server.close(done));}
