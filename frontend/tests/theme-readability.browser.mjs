// Local built-CSS regression: actual calendar markup plus shared module surfaces.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {chromium} from '../node_modules/playwright-core/index.mjs';
import {CalendarWorkspace} from '../.test-build/features/academic-foundation/CalendarWorkspace.js';

const assets=new URL('../dist/assets/',import.meta.url);
const cssFile=(await readdir(assets)).find(name=>name.endsWith('.css'));
assert.ok(cssFile,'Run npm run build first');
const css=await readFile(new URL(cssFile,assets),'utf8');
const calendar=renderToStaticMarkup(React.createElement(CalendarWorkspace,{
  academic:{},client:{isUncertain:()=>false},onExpired:()=>{},
}));
const shared=`<article><h3>Materiales del curso</h3><p class="text-text-muted">Información del material</p></article>
<div class="eval-read-profile"><dl><dt>Nombre</dt><dd>Docente</dd></dl></div>
<table><thead><tr><th>Registro</th></tr></thead><tbody><tr><td>Contenido</td></tr></tbody></table>
<ol class="eval-week-grid"><li><strong>Semana 1</strong><small>Fecha publicada</small></li></ol>
<div class="eval-content-toolbar"><button type="button">Materiales</button></div>`;
const browser=await chromium.launch({channel:'chrome'});
let checked=0;
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.route('**/*',route=>route.abort());
  for(const role of ['vice_principal']) {
    await page.setContent(`<style>${css}</style><main class="eval-layout" data-role="${role}"><div class="eval-workspace"><div class="eval-workspace-content">${calendar}${shared}</div></div></main>`);
    for(const theme of ['light','dark','light']) {
      await page.evaluate(theme=>{
        document.documentElement.classList.toggle('dark',theme==='dark');
      },theme);
      // Allow existing control color transitions to finish before sampling.
      await page.waitForTimeout(250);
      const results=await page.evaluate(()=>{
        const context=document.createElement('canvas').getContext('2d');
        const rgba=value=>{
          context.clearRect(0,0,1,1);
          context.fillStyle=value;
          context.fillRect(0,0,1,1);
          const [r,g,b,a]=context.getImageData(0,0,1,1).data;
          return [r,g,b,a/255];
        };
        const luminance=rgb=>rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
        const selector='.eval-period-picker label,.eval-period-picker select,.eval-period-summary p,article h3,article p,dt,dd,th,td,.eval-week-grid strong,.eval-week-grid small,.eval-content-toolbar button';
        return [...document.querySelectorAll(selector)].map(element=>{
          let current=element,background;
          while(current){
            const style=getComputedStyle(current);
            const color=rgba(style.backgroundColor);
            if(color.length===3||color[3]===1){background=color;break;}
            current=current.parentElement;
          }
          if(!background)throw Error('No opaque background found');
          const foreground=rgba(getComputedStyle(element).color);
          const a=luminance(foreground),b=luminance(background);
          return {text:element.textContent,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
        });
      });
      assert.ok(results.length>=13,'Expected calendar and shared module samples');
      for(const result of results)assert.ok(result.contrast>=4.5,`${role}/${theme}: ${result.text} contrast ${result.contrast}`);
      checked+=results.length;
    }
  }
  console.log(JSON.stringify({result:'pass',roles:1,themeTransitions:'light-dark-light',contrastChecks:checked}));
} finally {await browser.close();}
