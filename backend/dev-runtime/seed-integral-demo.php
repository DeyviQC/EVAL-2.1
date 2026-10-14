<?php
declare(strict_types=1);
// Explicit, additive development command. Domain services own all academic writes.
require __DIR__.'/config.php';
if(!evalDevBinding(getenv())||getenv('EVAL_DB_ROLE')!=='runtime'||getenv('EVAL_INTEGRAL_DEMO')!=='1')exit(2);
require dirname(__DIR__).'/bootstrap.php';
use App\Application\Academic\Commands\{AcademicPeriodCommands,AcademicCatalogCommands,TeachingAssignmentCommands,EnrollmentCommands,SchoolCalendarCommands,ResourceWeekAssociations,CourseMaterials,ActivityDelivery,DeliveryAssessment};
use App\Infrastructure\Persistence\Academic\LocalMaterialStorage;
try {
 $db=Illuminate\Database\Capsule\Manager::connection();
 $actor=function(string $login)use($db){$c=$db->table('local_credentials')->where('login',$login)->first();if(!$c)throw new RuntimeException('Missing development actor');return new App\Infrastructure\Authentication\AuthenticatedActor((string)$c->id,$db->table('local_role_grants')->where('identity_id',$c->id)->pluck('role')->all(),App\Infrastructure\Authentication\CredentialRevision::current($db,(string)$c->id,$c->password));};
 $manager=$actor('subdirector');$originalTeacher=$actor('docente');$originalStudent=$actor('estudiante');
 $year=(int)(new DateTimeImmutable('today',new DateTimeZone('America/Lima')))->format('Y');$start="$year-01-01";$end="$year-12-31";
 $counts=['accounts'=>0,'enrollments'=>0,'assignments'=>0,'activities'=>0,'materials'=>0,'deliveries'=>0,'assessments'=>0];
 $periodService=new AcademicPeriodCommands($db);$catalog=new AcademicCatalogCommands($db);$accounts=new App\Application\Accounts\LocalAccountService($db);
 $assignments=new TeachingAssignmentCommands($db);$enrollments=new EnrollmentCommands($db);$calendars=new SchoolCalendarCommands($db);
 $root=dirname(__DIR__,2).'/.local/eval-dev';$materials=new CourseMaterials($db,new LocalMaterialStorage($root.'/materials'));$activities=new ActivityDelivery($db,new LocalMaterialStorage($root.'/deliveries'));$assessments=new DeliveryAssessment($db);
 $weeks=new ResourceWeekAssociations($db,new LocalMaterialStorage($root.'/materials'));
 // Refuse an unrelated active year instead of closing/replacing it.
 $name="EVAL demostración $year";$period=$db->table('academic_periods')->where('name',$name)->first();$active=$db->table('academic_periods')->where('state','active')->first();
 if($active&&(!$period||(string)$active->id!==(string)$period->id))throw new RuntimeException('An unrelated academic period is active');
 if(!$period){$id=$periodService->create($manager,['name'=>$name,'start_on'=>$start,'end_on'=>$end]);$periodService->activate($manager,$id);$period=$db->table('academic_periods')->where('id',$id)->first();}
 if($period->state!=='active'||$period->start_on!==$start||$period->end_on!==$end)throw new RuntimeException('Demo year collision');
 $revision=$calendars->current($manager,(string)$period->id);
 $source='EVAL synthetic four-bimester demonstration; institutional dates must be configured by Subdirector';
 if($revision===null){
  $blocks=[];$number=1;
  foreach([['03-16','05-15'],['05-25','07-24'],['08-10','10-09'],['10-19','12-18']] as [$from,$until]){
   $block=['kind'=>'teaching','start_on'=>"$year-$from",'end_on'=>"$year-$until",'weeks'=>[]];$cursor=new DateTimeImmutable($block['start_on']);
   while($cursor->format('Y-m-d')<=$block['end_on']){$to=min($cursor->modify('+4 days')->format('Y-m-d'),$block['end_on']);$block['weeks'][]=['number'=>$number++,'start_on'=>$cursor->format('Y-m-d'),'end_on'=>$to];$cursor=$cursor->modify('+7 days');}
   $blocks[]=$block;
  }
  $draft=$calendars->create($manager,(string)$period->id,['blocks'=>$blocks]);
  $revision=$calendars->publish($manager,$draft['id'],['expected_version'=>$draft['version'],'source'=>$source,'confirmed'=>true]);
 }
 if($revision['source']!==$source)throw new RuntimeException('Existing institutional calendar is not demo-owned');
 // Only one configured bimester contains detailed content. Selection is stable on reruns.
 $demoBlock=$revision['blocks'][3];$demoWeek=$demoBlock['weeks'][0];
 $areas=[
  ['Matemática','matematica','Fracciones y porcentajes en el mercado','Resuelve tres situaciones de compra y explica los descuentos.','Luis Alberto Paredes Salazar'],
  ['Comunicación','comunicacion','Lectura y argumentación','Redacta una opinión con dos argumentos sobre el texto leído.','Rosa Elena Cárdenas Huamán'],
  ['Ciencia y Tecnología','ciencia','Uso responsable del agua','Propón una pregunta investigable y un procedimiento de observación.','María Isabel Quispe Rojas'],
  ['Ciencias Sociales','sociales','Historia y patrimonio local','Presenta una línea de tiempo y explica su importancia.','Jorge Antonio Salazar Medina'],
  ['Desarrollo Personal, Ciudadanía y Cívica','dpcc','Convivencia y participación','Propón acuerdos de aula que respeten los derechos de todas.','Elena Patricia Rojas Flores'],
  ['Inglés como Lengua Extranjera','ingles','My school and daily routines','Write five sentences about your school day.','Ana Lucía Torres Vargas'],
  ['Arte y Cultura','arte','Expresiones artísticas locales','Presenta un boceto acompañado de una explicación.','Pedro Miguel Huamán Quispe'],
  ['Educación Física','fisica','Hábitos saludables','Diseña una rutina y explica sus cuidados y beneficios.','Patricia Alejandra Medina Soto'],
  ['Educación para el Trabajo','trabajo','Propuesta de emprendimiento','Identifica una necesidad y propone una solución.','Carlos Eduardo Flores Mendoza'],
  ['Educación Religiosa','religion','Valores y solidaridad','Reflexiona sobre una acción solidaria y la convivencia.','Lucía Beatriz Vargas Cárdenas'],
 ];
 $account=function(string $login,string $display,string $role)use($db,$accounts,$manager,$actor,&$counts){
  $id=$db->table('local_credentials')->where('login',$login)->value('id');
  if($id===null){$accounts->execute($manager,'created',null,['name'=>$display,'username'=>$login,'role'=>$role]);$counts['accounts']++;}
  elseif($db->table('retained_identity_profiles')->where('identity_id',$id)->value('display_name')!==$display||$db->table('local_role_grants')->where('identity_id',$id)->pluck('role')->all()!==[$role])throw new RuntimeException('Demo identity collision');
  return $actor($login);
 };
 $entries=[];$teachers=[];
 foreach($areas as [$area,$slug,$topic,$instructions,$teacherName]){
  $entry=$db->table('instructional_entries')->where('name',$area)->where('kind','area')->where('is_active',true)->value('id');
  if($entry===null)$entry=$catalog->create($manager,'entry',['name'=>$area,'kind'=>'area']);$entries[$slug]=(string)$entry;
  $teachers[$slug]=$slug==='matematica'?$originalTeacher:$account('demo.docente.'.$slug,$teacherName,'teacher');
 }
 $first=['María Fernanda','Valeria Alejandra','Camila Antonella','Luciana Isabel','Sofía Gabriela','Daniela Patricia','Renata Lucía','Andrea Nicole','Natalia Beatriz','Paola Fernanda','Jimena Abigail','Alessandra María','Gabriela Estefanía','Adriana Milagros','Fernanda Belén','Isabela Victoria','Rosa Alejandra','Ana Lucía','Claudia Valentina','Mariana Elizabeth'];
 $surnames=['Quispe','Huamán','Rojas','Flores','Medina','Torres','Mendoza','Vargas','Cárdenas','Salazar','Soto','Paredes','García','López','Castro'];
 $courseIds=[];$rosters=[];$names=['Primero','Segundo','Tercero','Cuarto','Quinto'];$identityIndex=0;
 foreach($names as $g=>$gradeName){
  $grade=$db->table('grades')->where('name',$gradeName)->where('is_active',true)->value('id');if($grade===null)$grade=$catalog->create($manager,'grade',['name'=>$gradeName]);
  foreach(['A','B','C','D'] as $letter){$key=($g+1).strtolower($letter);$section=$db->table('sections')->where('grade_id',$grade)->where('name',$letter)->where('is_active',true)->value('id');if($section===null)$section=$catalog->create($manager,'section',['name'=>$letter,'grade_id'=>(string)$grade]);
   for($i=0;$i<15;$i++){
    // Preserve the original student account/profile/secret rather than rewriting it.
    $student=$key==='1a'&&$i===0?$originalStudent:$account('demo.estudiante.'.$key.'.'.sprintf('%02d',$i+1),$first[$identityIndex%20].' '.$surnames[intdiv($identityIndex,20)%15].' '.$surnames[($identityIndex+4)%15],'student');$identityIndex++;
    $existing=$db->table('student_enrollments')->where('student_id',$student->identityId)->where('academic_period_id',$period->id)->first();
    if(!$existing){$enrollments->create($manager,['student_id'=>$student->identityId,'academic_period_id'=>(string)$period->id,'grade_id'=>(string)$grade,'section_id'=>(string)$section,'effective_from'=>$start]);$counts['enrollments']++;}
    elseif((string)$existing->grade_id!==(string)$grade||(string)$existing->section_id!==(string)$section||$existing->state!=='active')throw new RuntimeException('Demo enrollment collision');
    $rosters[$key][]=$student;
   }
   foreach($areas as [$area,$slug]){
    $existing=$db->table('teaching_assignments')->where('academic_period_id',$period->id)->where('instructional_entry_id',$entries[$slug])->where('grade_id',$grade)->where('section_id',$section)->first();
    if(!$existing){$id=$assignments->create($manager,['teacher_id'=>$teachers[$slug]->identityId,'academic_period_id'=>(string)$period->id,'instructional_entry_id'=>$entries[$slug],'grade_id'=>(string)$grade,'section_id'=>(string)$section,'effective_from'=>$start,'effective_until'=>$end]);$assignments->activate($manager,$id);$counts['assignments']++;}
    else{if((string)$existing->teacher_id!==$teachers[$slug]->identityId||!in_array($existing->state,['planned','active'],true))throw new RuntimeException('Demo assignment collision');$id=(string)$existing->id;if($existing->state==='planned')$assignments->activate($manager,$id);}
    $courseIds[$key][$slug]=$id;
   }
  }
 }
 $pdf=function(array $lines):string{$content="BT /F1 12 Tf 50 790 Td ";foreach($lines as $i=>$line){if($i)$content.="0 -22 Td ";$line=iconv('UTF-8','Windows-1252//TRANSLIT',$line);$content.='('.str_replace(['\\','(',')'],['\\\\','\\(','\\)'],$line).") Tj ";}$content.='ET';$objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',"<< /Length ".strlen($content)." >>\nstream\n".$content."\nendstream"];$result="%PDF-1.4\n";$offsets=[0];foreach($objects as $i=>$object){$offsets[]=strlen($result);$result.=($i+1)." 0 obj\n".$object."\nendobj\n";}$xref=strlen($result);$result.="xref\n0 6\n0000000000 65535 f \n";foreach(array_slice($offsets,1) as $offset)$result.=sprintf('%010d 00000 n ',$offset)."\n";return $result."trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n".$xref."\n%%EOF\n";};
 $input=tempnam($root,'integral-demo-');
 try{foreach($courseIds as $classroom=>$courses)foreach($areas as [$area,$slug,$topic,$instructions]){
  $id=$courses[$slug];$teacher=$teachers[$slug];$title='Demostración · '.$topic.' · '.strtoupper($classroom);
  $material=$db->table('course_materials')->where('assignment_id',$id)->where('title',$title)->value('id');
  if($material===null){file_put_contents($input,$pdf(['EVAL - Recurso ficticio de demostración',$area,$topic,'Lee el tema y explica tus ideas con un ejemplo.','No corresponde a información real de menores.']));$material=$materials->publish($teacher,$id,['title'=>$title,'description'=>'Recurso educativo ficticio del cuarto bimestre. Oferta académica configurable.'],$input,'guia-'.$slug.'.pdf');$counts['materials']++;}
  if($material===null)$material=$db->table('course_materials')->where('assignment_id',$id)->where('title',$title)->value('id');
  $activity=$db->table('activity_references as r')->join('activity_contents as c','c.activity_id','=','r.id')->where('r.teaching_assignment_id',$id)->where('c.title',$title)->value('r.id');
  if($activity===null){$activity=$activities->write($teacher,'publish',$id,['title'=>$title,'instructions'=>$instructions.' Ejemplo ficticio de EVAL.','due_on'=>null])['id'];$counts['activities']++;}
  foreach(['material'=>(string)$material,'activity'=>(string)$activity] as $kind=>$resource){$association=$weeks->consult($teacher,$kind,$resource);if($association['calendar_revision_id']===null)$weeks->set($teacher,$kind,$resource,['expected_version'=>$association['version'],'calendar_revision_id'=>$revision['id'],'week_id'=>$demoWeek['id']]);elseif($association['calendar_revision_id']!==$revision['id']||$association['week_id']!==$demoWeek['id'])throw new RuntimeException('Demo week collision');}
  foreach(array_slice($rosters[$classroom],0,3) as $index=>$student){$delivery=$db->table('activity_deliveries')->where('activity_id',$activity)->where('student_id',$student->identityId)->first();
   if(!$delivery){$result=$activities->write($student,'submit',(string)$activity,['answer'=>'Explico una situación de '.$area.' y justifico mi propuesta: '.$topic.'. Respuesta ficticia para explorar EVAL.']);$counts['deliveries']++;$delivery=$db->table('activity_deliveries')->where('submission_id',$result['id'])->first();}
   if($index<2&&$delivery->current_assessment_id===null){$assessments->assess($teacher,(string)$delivery->submission_id,['grade'=>['AD','A'][$index],'feedback'=>'Demostración: tu explicación es clara. Añade evidencias para fortalecer tu argumento.','expected_version_id'=>(string)$delivery->current_version_id,'expected_assessment_id'=>null]);$counts['assessments']++;}
  }
 }}finally{if(is_file($input))unlink($input);}
 $result=['dataset'=>'integral-demo-v1','fictional'=>true,'period'=>(string)$period->id,'grades'=>5,'classrooms'=>20,'students'=>300,'studentsPerClassroom'=>15,'areas'=>10,'assignments'=>200,'detailedBimester'=>4,'originalAccountsPreserved'=>4,'new'=>$counts,'pending'=>['schedules','attendance','quizzes','rubrics','supportPlans']];
 file_put_contents($root.'/integral-demo-summary.json',json_encode($result,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR).PHP_EOL;
}catch(Throwable $error){$category=$error instanceof App\Application\Academic\AcademicCommandFailure?$error->category:get_class($error);fwrite(STDERR,'Integral demo stopped at '.basename($error->getFile()).':'.$error->getLine().' ('.$category.'). Existing data was not replaced; rerun resumes compatible records.'.PHP_EOL);exit(2);}
