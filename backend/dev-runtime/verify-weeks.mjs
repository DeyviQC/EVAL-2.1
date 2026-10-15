// Real runtime verification; creates one explicitly synthetic activity, preserving existing calendars.
import {chromium} from '../../frontend/node_modules/playwright-core/index.mjs';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {certificateOptions, resolveBrowserExecutable} from './browser-options.mjs';
const root=process.env.EVAL_DEV_ROOT;if(!root)throw Error('Owned runtime required');const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);const passwords=JSON.parse(Buffer.concat(chunks).toString());
const origin='https://127.0.0.1:8443';let checks=0;
const browser=await chromium.launch({...certificateOptions(readFileSync(resolve(root,'cert.pem'))),headless:true,executablePath:resolveBrowserExecutable()??chromium.executablePath()});
async function login(name,password){const context=await browser.newContext();const page=await context.newPage();await page.goto(origin);await page.getByLabel('Usuario',{exact:true}).fill(name);await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByRole('heading',{name:'Tu espacio académico',exact:true}).waitFor();return page;}
async function api(page,path,body){return page.evaluate(async({path,body})=>{const session=await(await fetch('/auth/session')).json();const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-TOKEN':session.csrf_token},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,body:await response.json()};},{path,body});}
async function openCourse(page,course){
 const btn=page.getByRole('button',{name:/^(Mis cursos|Cursos)$/});await btn.first().click();
 const gradeBtn=page.getByRole('button',{name:course.grade,exact:true});
 if(await gradeBtn.waitFor({timeout:3000}).then(()=>true).catch(()=>false)){
  await gradeBtn.click();
  await page.getByRole('button',{name:'Sección '+course.section,exact:true}).click();
 }
 await page.waitForFunction(()=>!document.querySelector('section[aria-busy="true"]'));
 await page.getByRole('article',{name:course.subject+' · '+course.grade+' '+course.section,exact:true}).getByRole('button',{name:'Entrar al curso',exact:true}).click();
 await page.getByRole('button',{name:'Semanas',exact:true}).click();
}
try{
 const teacher=await login('docente',passwords.teacher);const courses=await api(teacher,'/academic/my-courses');assert.equal(courses.status,200);const course=courses.body.data.items.find(c=>c.can_publish);assert(course);checks++;
 const calendar=await api(teacher,'/academic/my-courses/'+course.id+'/weeks');assert.equal(calendar.status,200);const calendarBefore=JSON.stringify(calendar.body.data);checks++;
 const title='Synthetic weekly runtime verification '+Date.now();const published=await api(teacher,'/education/courses/'+course.id+'/activities',{title,instructions:'Synthetic local verification only; not student work',due_on:null});assert.equal(published.status,201);const id=published.body.data.id;checks++;
 await openCourse(teacher,course);
 const other=teacher.getByText('Buscar y consultar otros recursos');
 if(await other.count()){await other.click();await teacher.getByRole('button',{name:'Sin semana',exact:true}).click();}
 await teacher.getByRole('heading',{name:title,exact:true}).waitFor();checks++;
 // Clear an unassigned synthetic task to exercise runtime history/pointer writes without publishing any calendar.
 const clear=await api(teacher,'/academic/resource-weeks/activity/'+id,{expected_version:0,calendar_revision_id:null,week_id:null});assert.equal(clear.status,200);assert.equal(clear.body.data.version,1);checks++;
 const student=await login('estudiante',passwords.student);const studentCourse=await api(student,'/academic/my-courses/'+course.id);assert.equal(studentCourse.status,200);
 await openCourse(student,studentCourse.body.data);
 const studentOther=student.getByText('Buscar y consultar otros recursos');
 if(await studentOther.count()){await studentOther.click();await student.getByRole('button',{name:'Sin semana',exact:true}).click();}
 await student.getByRole('heading',{name:title,exact:true}).waitFor();checks++;
 const read=await api(student,'/academic/resource-weeks/activity/'+id);assert.equal(read.status,200);assert.equal(read.body.data.version,1);checks++;
 const forbidden=await api(student,'/academic/resource-weeks/activity/'+id,{expected_version:1,calendar_revision_id:null,week_id:null});assert.equal(forbidden.status,403);checks++;
 const history=await api(teacher,'/academic/resource-weeks/activity/'+id+'/history');assert.equal(history.status,200);assert.equal(history.body.data.items.length,1);checks++;
 const unchanged=await api(teacher,'/academic/my-courses/'+course.id+'/weeks');assert.equal(JSON.stringify(unchanged.body.data),calendarBefore);checks++;
 console.log(JSON.stringify({checks,fixtureActivity:id,fixtureAssignment:course.id,existingCalendarsChanged:false,realWeekAssignmentTested:false,reason:'No synthetic calendar is published over an existing development course'}));
}finally{await browser.close();}
