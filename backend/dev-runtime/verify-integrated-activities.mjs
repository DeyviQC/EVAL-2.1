// Local demo integration harness: credentials JSON through stdin only. Creates one identified, closed verification activity.
import https from 'node:https';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const chunks=[];for await(const c of process.stdin)chunks.push(c);const passwords=JSON.parse(Buffer.concat(chunks).toString());
const ca=readFileSync(new URL('../../.local/eval-dev/cert.pem',import.meta.url));let checks=0;
async function session(login,password){
 let cookie='',csrf='';
 async function request(path,body){return new Promise((ok,fail)=>{const multipart=Buffer.isBuffer(body);const data=body===undefined?null:multipart?body:JSON.stringify(body);const r=https.request({hostname:'127.0.0.1',port:8443,path,ca,method:data?'POST':'GET',headers:{Accept:'application/json',Cookie:cookie,...(data?{'Origin':'https://127.0.0.1:8443','Content-Type':multipart?'multipart/form-data; boundary=eval-test-boundary':'application/json','Content-Length':Buffer.byteLength(data),'X-CSRF-TOKEN':csrf}:{})}},res=>{const cookies=res.headers['set-cookie'];if(cookies)cookie=cookies.map(c=>c.split(';')[0]).join('; ');let text='';res.on('data',c=>text+=c);res.on('end',()=>{try{ok({status:res.statusCode,body:res.headers['content-type']?.includes('application/json')?JSON.parse(text):text});}catch{fail(Error('Unexpected JSON response'));}});});r.setTimeout(15000,()=>r.destroy(Error('Local request timed out')));r.on('error',fail);if(data)r.write(data);r.end();});}
 const start=await request('/auth/session');assert.equal(start.status,200);csrf=start.body.csrf_token;const auth=await request('/auth/login',{login,password});assert.equal(auth.status,200);assert(auth.body.authenticated);const current=await request('/auth/session');csrf=current.body.csrf_token;return request;
}
const teacher=await session('docente',passwords.teacher);
async function all(path,actor=teacher){let after=null,items=[];do{const res=await actor(path+(after?(path.includes('?')?'&':'?')+'after='+after:''));assert.equal(res.status,200);items.push(...res.body.data.items);after=res.body.data.next_after;}while(after);return items;}
const metadata=await teacher('/education/classrooms');assert.equal(metadata.status,200);checks++;
const classrooms=metadata.body.data.items;assert(classrooms.length>0);checks++;
const teacherCourses=await all('/education/courses');
for(const c of [classrooms[0],classrooms.at(-1)]) {
 const filtered=await all('/education/courses?'+new URLSearchParams({grade_id:c.grade_id,section_id:c.section_id}));
 assert.deepEqual(filtered.map(c=>c.id),teacherCourses.filter(r=>r.label.includes(' · '+c.grade+' '+c.section+' · ')).map(c=>c.id));checks++;
}
for(const q of ['grade_id=0','section_id[]=1','actor=1']){assert.equal((await teacher('/education/courses?'+q)).status,422);checks++;}
const student=await session('estudiante',passwords.student);
const studentCourses=await all('/education/courses',student);
let sampleActivity=null;
for(const course of teacherCourses){
 const activities=await all('/education/courses/'+course.id+'/activities');
 for(const activity of activities){
  sampleActivity??=activity;
  const pending=await all('/education/activities/'+activity.id+'/pending-students');
  const deliveries=await all('/education/activities/'+activity.id+'/deliveries');
  assert(!pending.some(p=>deliveries.some(d=>d.student_name===p.student_name)));checks++;
 }
}
assert(sampleActivity);assert([403,404].includes((await student('/education/activities/'+sampleActivity.id+'/pending-students')).status));checks++;
for(const [login,role] of [['director','director_admin'],['subdirector','vice_principal']]){
 const actor=await session(login,passwords[role]);
 assert.equal((await actor('/education/classrooms')).status,403);checks++;
 assert([403,404].includes((await actor('/education/activities/'+sampleActivity.id+'/pending-students')).status));checks++;
}
const shared=teacherCourses.find(c=>c.can_publish&&studentCourses.some(s=>s.id===c.id));assert(shared);
const made=await teacher('/education/courses/'+shared.id+'/activities',{title:'Verificación del flujo integrado '+Date.now(),instructions:'Actividad de prueba: envío, revisión y nota. Se cierra al finalizar.',due_on:null});
assert.equal(made.status,201);checks++;const id=made.body.data.id;
const before=await all('/education/activities/'+id+'/pending-students');assert(before.length>0);checks++;
const upload=Buffer.from(['--eval-test-boundary','Content-Disposition: form-data; name="answer"','','Respuesta de prueba','--eval-test-boundary','Content-Disposition: form-data; name="file"; filename="verificacion.txt"','Content-Type: text/plain','','Evidencia de prueba','--eval-test-boundary--',''].join(String.fromCharCode(13,10)));const submitted=await student('/education/activities/'+id+'/deliveries',upload);assert.equal(submitted.status,201);checks++;
const own=await all('/education/activities/'+id+'/deliveries',student);assert.equal(own.length,1);assert.equal(own[0].assessment,null);checks++;
const received=await all('/education/activities/'+id+'/deliveries');assert.equal(received[0].id,own[0].id);checks++;
const pending=await all('/education/activities/'+id+'/pending-students');assert.equal(pending.length,before.length-1);checks++;
const file=await teacher('/education/versions/'+own[0].version.id+'/file');assert.equal(file.status,200);assert.equal(file.body,'Evidencia de prueba');checks++;
const attempt=await student('/education/deliveries/'+own[0].id+'/assessments',{grade:'AD',feedback:'No permitido',expected_version_id:own[0].version.id,expected_assessment_id:null});assert.equal(attempt.status,403);checks++;
const grading=await teacher('/education/deliveries/'+own[0].id+'/assessments',{grade:'A',feedback:'Trabajo revisado en la verificación del flujo.',expected_version_id:own[0].version.id,expected_assessment_id:null});assert.equal(grading.status,201);checks++;
const result=await all('/education/activities/'+id+'/deliveries',student);assert.equal(result[0].assessment.id,grading.body.data.assessment_id);assert.equal(result[0].assessment.grade,'A');checks++;
const deniedUpdate=await student('/education/activities/'+id+'/deliveries',upload);assert.equal(deniedUpdate.status,409);checks++;
const studentFeed=await student('/notifications');assert.equal(studentFeed.status,200);assert.equal(studentFeed.body.data.items[0].event,'delivery_assessed');checks++;
const teacherFeed=await teacher('/notifications');assert.equal(teacherFeed.status,200);assert.equal(teacherFeed.body.data.items[0].event,'delivery_accepted');checks++;
const closed=await teacher('/education/activities/'+id+'/close',{});assert.equal(closed.status,201);checks++;
const final=await student('/education/activities/'+id);assert.equal(final.body.data.state,'closed');assert.equal(final.body.data.can_submit,false);checks++;
console.log(JSON.stringify({passed:true,checks,verifiedWorkflow:'publish-upload-download-assess-student-result-close',verificationActivity:id,schemaChanged:false}));
