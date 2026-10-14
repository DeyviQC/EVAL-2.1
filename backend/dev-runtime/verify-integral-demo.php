<?php
declare(strict_types=1);
require __DIR__.'/config.php';
if(!evalDevBinding(getenv())||getenv('EVAL_DB_ROLE')!=='runtime')exit(2);
require dirname(__DIR__).'/bootstrap.php';
try{
 $db=Illuminate\Database\Capsule\Manager::connection();$checks=0;
 $check=function(bool $condition,string $description)use(&$checks){if(!$condition)throw new RuntimeException($description);$checks++;};
 $year=(new DateTimeImmutable('today',new DateTimeZone('America/Lima')))->format('Y');
 $period=$db->table('academic_periods')->where('name','EVAL demostración '.$year)->first();$check($period!==null&&$period->state==='active','Demo period');
 $enrollments=$db->table('student_enrollments')->where('academic_period_id',$period->id)->where('state','active')->get();
 $check($enrollments->count()===300,'300 active enrollments');$check($enrollments->pluck('student_id')->unique()->count()===300,'Unique students');
 $check($enrollments->pluck('grade_id')->unique()->count()===5,'Five grades');$check($enrollments->pluck('section_id')->unique()->count()===20,'20 classrooms');
 foreach($enrollments->groupBy('section_id') as $group)$check($group->count()===15,'15 students per classroom');
 $assignments=$db->table('teaching_assignments')->where('academic_period_id',$period->id)->where('state','active')->get();
 $check($assignments->count()===200,'200 active course assignments');$check($assignments->pluck('teacher_id')->unique()->count()===10,'Ten assigned teachers');
 foreach($assignments->groupBy('section_id') as $group){$check($group->count()===10&&$group->pluck('instructional_entry_id')->unique()->count()===10,'Ten distinct curricular areas per classroom');}
 $revision=$db->table('school_calendar_states as s')->join('school_calendar_revisions as r','r.id','=','s.revision_id')->where('s.period_id',$period->id)->first(['r.id','r.blocks']);
 $blocks=json_decode($revision->blocks,true,flags:JSON_THROW_ON_ERROR);$teaching=array_values(array_filter($blocks,fn($b)=>$b['kind']==='teaching'));
 $check(count($teaching)===4,'Four bimesters');$weekIds=array_column($teaching[3]['weeks'],'id');
 foreach(['material','activity'] as $kind){$rows=$db->table($kind.'_week_states as s')->join($kind.'_week_changes as c','c.id','=','s.change_id')->where('c.period_id',$period->id)->get(['c.calendar_revision_id','c.week_id']);
  $check($rows->count()===200,'All '.$kind.' resources week-associated');foreach($rows as $r)$check((string)$r->calendar_revision_id===(string)$revision->id&&in_array($r->week_id,$weekIds,true),'Content restricted to fourth bimester');}
 $activities=$db->table('activity_references')->whereIn('teaching_assignment_id',$assignments->pluck('id'))->pluck('id');$check($activities->count()===200,'200 activities');
 $deliveries=$db->table('activity_deliveries')->whereIn('activity_id',$activities)->get();$check($deliveries->count()===600,'600 deliveries');
 $check($db->table('delivery_assessments')->whereIn('submission_id',$deliveries->pluck('submission_id'))->count()===400,'400 actual assessments');
 $scopeErrors=$db->table('activity_deliveries as d')->join('activity_references as r','r.id','=','d.activity_id')->join('teaching_assignments as a','a.id','=','r.teaching_assignment_id')->join('submission_references as s','s.id','=','d.submission_id')->join('student_enrollments as e','e.id','=','s.accepted_under_enrollment_id')->where('a.academic_period_id',$period->id)->where(function($q){$q->whereColumn('d.student_id','<>','e.student_id')->orWhereColumn('e.section_id','<>','a.section_id')->orWhereColumn('e.grade_id','<>','a.grade_id')->orWhereColumn('e.academic_period_id','<>','a.academic_period_id');})->count();$check($scopeErrors===0,'Delivery enrollment/assignment integrity');
 $expected=['director'=>'director_admin','subdirector'=>'vice_principal','docente'=>'teacher','estudiante'=>'student'];
 foreach($expected as $login=>$role){$credential=$db->table('local_credentials')->where('login',$login)->first();$check($credential!==null&&$db->table('local_role_grants')->where('identity_id',$credential->id)->pluck('role')->all()===[$role],'Original role preserved');$check(!$db->table('local_account_events')->where('target_id',$credential->id)->whereIn('operation',['password_reset','password_changed','deactivated'])->exists(),'Original credentials unchanged by demo');}
 $names=$db->table('local_credentials as c')->join('retained_identity_profiles as p','p.identity_id','=','c.id')->where('c.login','like','demo.estudiante.%')->pluck('p.display_name');
 $check($names->count()===299&&$names->unique()->count()===299,'299 unique fictional names plus original student');
 foreach($names as $name)$check(count(explode(' ',$name))>=4&&!preg_match('/\d|Test|Alumna|Estudiante/u',$name),'Full natural fictional name');
 $noticeScope=fn()=>$db->table('academic_notifications')->where(function($q)use($activities,$deliveries){$q->whereIn('activity_id',$activities)->orWhereIn('submission_id',$deliveries->pluck('submission_id'));});
 $notifications=$noticeScope()->count();$check($notifications===4000,'4000 persisted recipient notifications');$check($noticeScope()->where('event','delivery_assessed')->count()===400,'400 grade notifications');
 echo json_encode(['passed'=>true,'checks'=>$checks,'students'=>300,'classrooms'=>20,'courses'=>200,'materials'=>200,'activities'=>200,'deliveries'=>600,'assessments'=>400,'notifications'=>$notifications,'detailedBimester'=>4,'academicWrites'=>0],JSON_THROW_ON_ERROR).PHP_EOL;
}catch(Throwable $e){fwrite(STDERR,'Demo validation failed: '.$e->getMessage().PHP_EOL);exit(2);}
