// Read-only catalog UI and semantic contrast acceptance.
import {chromium} from '../../frontend/node_modules/playwright-core/index.mjs';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {certificateOptions,loopbackCertificate} from './browser-options.mjs';
const root=process.env.EVAL_DEV_ROOT,chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);const passwords=JSON.parse(Buffer.concat(chunks).toString());
const browser=await chromium.launch({...certificateOptions(await loopbackCertificate(readFileSync(root+'/cert.pem'))),headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let checks=0,writes=0;const check=value=>{assert(value);checks++;};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('request',request=>{if(!['GET','HEAD'].includes(request.method())&&!new URL(request.url()).pathname.startsWith('/auth/'))writes++;});
 await page.goto('https://127.0.0.1:8443/');
 await page.getByLabel('Usuario',{exact:true}).fill('subdirector');await page.getByLabel('Contraseña',{exact:true}).fill(passwords.vice_principal);passwords.vice_principal='';
 await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await page.getByRole('navigation',{name:'Menú de Subdirector',exact:true}).waitFor();
 await page.getByRole('button',{name:'Catálogo',exact:true}).click();
 const area=page.getByRole('region',{name:'Gestión de catálogo',exact:true});
 await area.getByRole('navigation',{name:'Tipo de catálogo'}).waitFor();
 check(await area.locator('form').count()===0);await page.screenshot({path:root+'/catalog-menu.png',fullPage:true});
 check(await area.getByRole('navigation',{name:'Tipo de catálogo'}).getByRole('button').count()===3);await area.getByRole('button',{name:/Áreas y materias/}).click();await area.locator('.vp-catalog-record-card').first().waitFor();check(await area.getByRole('article').count()===0);
 await page.screenshot({path:root+'/catalog-simple-light.png',fullPage:true});
 const lightColor=await area.getByRole('heading',{level:2}).evaluate(e=>getComputedStyle(e).color);
 await area.getByRole('button',{name:'Añadir área o materia',exact:true}).click();
 await area.getByLabel('Nombre',{exact:true}).waitFor();check(await area.locator('form').count()===1);
 await area.getByLabel('Nombre',{exact:true}).fill('Prueba sin guardar');
 await area.getByRole('button',{name:'Cancelar',exact:true}).click();check(await area.locator('form').count()===0);
 await area.locator('.vp-catalog-record-card').first().click();const edit=area.getByRole('button',{name:/^Editar /}).first();await edit.click();
 check(await area.locator('form').count()===1);
 await page.getByRole('button',{name:'Modo oscuro',exact:true}).click();
 await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 const darkColor=await area.getByRole('heading',{level:2}).evaluate(e=>getComputedStyle(e).color);
 check(lightColor!==darkColor);
 const contrast=async()=>area.evaluate(element=>{
  function rgb(value){const n=value.match(/[\d.]+/g)?.map(Number);return n&&n.length>=3?[n[0]/(value.startsWith('color(srgb ')?1:255),n[1]/(value.startsWith('color(srgb ')?1:255),n[2]/(value.startsWith('color(srgb ')?1:255),n[3]??1]:[0,0,0,0];}
  function luminance(color){const channels=color.slice(0,3).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}
  return [...element.querySelectorAll('h2,h3,h4,label,input,select,button')].filter(e=>e.getBoundingClientRect().height>0&&!e.disabled).map(e=>{
   const style=getComputedStyle(e),foreground=rgb(style.color);let current=e,background=[1,1,1,1];
   while(current){const color=rgb(getComputedStyle(current).backgroundColor);if(color[3]===1){background=color;break;}current=current.parentElement;}
   const a=luminance(foreground),b=luminance(background);return {tag:e.tagName,text:e.textContent?.trim().slice(0,45),foreground:style.color,background:background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  });
 });
 const darkRatios=await contrast();check(darkRatios.every(row=>row.ratio>=4.5));
 check(await area.getByLabel('Nombre',{exact:true}).evaluate(e=>getComputedStyle(e).color)===darkColor);
 await page.screenshot({path:root+'/catalog-simple-dark.png',fullPage:true});
 await area.getByRole('button',{name:'Cancelar',exact:true}).click();
 await area.getByRole('button',{name:'← Volver',exact:true}).click();await area.getByRole('button',{name:'← Volver',exact:true}).click();await area.getByRole('button',{name:/Grados/}).click();await area.locator('.vp-catalog-record-card').first().click();await area.getByRole('article').first().waitFor();
 await area.getByRole('button',{name:/^Desactivar /}).first().click();
 await page.getByRole('dialog').waitFor();checks++;
 await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();check(!(await page.getByRole('dialog').isVisible()));
 await area.getByRole('button',{name:'← Volver',exact:true}).click();await area.getByRole('button',{name:'← Volver',exact:true}).click();
 await area.getByRole('button',{name:/Secciones/}).click();
 const picker=area.getByRole('navigation',{name:'Filtrar secciones por grado'});
 const gradeButtons=picker.getByRole('button');await gradeButtons.nth(1).waitFor();check(await gradeButtons.count()>=2);check(await area.locator('.vp-catalog-record-card').count()===0);
 const firstGrade=await gradeButtons.first().innerText();await gradeButtons.first().click();
 await area.locator('.vp-catalog-record-card').first().waitFor();
 check((await area.locator('.vp-catalog-record-card').allTextContents()).every(text=>text.includes(firstGrade+' · Sección')));
 await area.locator('.vp-catalog-record-card').first().click();await area.getByRole('button',{name:/^Editar /}).click();
 await area.getByRole('button',{name:'← Volver',exact:true}).click();check(await area.locator('form').count()===0);
 await area.getByRole('button',{name:'← Volver',exact:true}).click();
 const secondGrade=await picker.getByRole('button').nth(1).innerText();await picker.getByRole('button').nth(1).click();
 check((await area.locator('.vp-catalog-record-card').allTextContents()).every(text=>text.includes(secondGrade+' · Sección')));
 await page.screenshot({path:root+'/catalog-sections-by-grade-dark.png',fullPage:true});
 await area.getByRole('button',{name:'Añadir sección',exact:true}).click();
 await area.getByLabel('Grado',{exact:true}).waitFor();check(await area.getByLabel('Grado',{exact:true}).getAttribute('readonly')!==null);check(await area.getByLabel('Grado',{exact:true}).inputValue()===secondGrade);
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:1000});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(await area.locator('button').evaluateAll(buttons=>buttons.filter(e=>e.getBoundingClientRect().height>0).every(e=>e.getBoundingClientRect().height>=44)));
 }
 await page.setViewportSize({width:390,height:1000});await page.screenshot({path:root+'/catalog-simple-mobile-dark.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await area.getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.getByRole('button',{name:'Modo claro',exact:true}).click();await page.waitForFunction(()=>!document.documentElement.classList.contains('dark'));await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 check(await area.getByRole('heading',{level:2}).evaluate(e=>getComputedStyle(e).color)===lightColor);
 const lightRatios=await contrast();if(lightRatios.some(row=>row.ratio<4.5))console.log(JSON.stringify({lowContrast:lightRatios.filter(row=>row.ratio<4.5)}));check(lightRatios.every(row=>row.ratio>=4.5));check(writes===0);await page.screenshot({path:root+'/catalog-sections-by-grade-light.png',fullPage:true});
 console.log(JSON.stringify({passed:true,checks,darkMinimumContrast:Math.min(...darkRatios.map(r=>r.ratio)),lightMinimumContrast:Math.min(...lightRatios.map(r=>r.ratio)),viewports:[390,768,1440],academicWrites:writes}));
 await context.close();
}finally{await browser.close();}
