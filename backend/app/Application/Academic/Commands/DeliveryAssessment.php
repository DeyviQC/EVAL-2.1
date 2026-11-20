<?php
declare(strict_types=1);
namespace App\Application\Academic\Commands;
use Illuminate\Database\Connection;
use App\Infrastructure\Authentication\AuthenticatedActor;
use App\Application\Academic\AcademicCommandFailure;
use App\Infrastructure\Persistence\Academic\{AcademicLockSet,AcademicWriteTransaction,AcademicMutationResult,LifecycleEvent};
final class DeliveryAssessment {
 public function __construct(private Connection $db){}
 private function roles(AuthenticatedActor $actor):array {
  FoundationCommandChecks::credentials($this->db,$actor);
  if($this->db->table('retained_identities')->where('id',$actor->identityId)->value('credential_status')!=='active')throw new AcademicCommandFailure('forbidden');
  return $this->db->table('local_role_grants')->where('identity_id',$actor->identityId)->pluck('role')->all();
 }
 private function delivery(string $id):array {
  $r=$this->db->table('activity_deliveries as d')->join('submission_references as s','s.id','=','d.submission_id')->join('teaching_assignments as a','a.id','=','s.teaching_assignment_id')->join('academic_periods as p','p.id','=','a.academic_period_id')->where('d.submission_id',AcademicLockSet::id($id))->first(['d.*','s.teaching_assignment_id','a.teacher_id','a.academic_period_id','p.state as period_state']);
  if(!$r)throw new AcademicCommandFailure('not_found');return (array)$r;
 }
 private function authorize(AuthenticatedActor $actor,array $r):array {
  $roles=$this->roles($actor);
  if(!((in_array('teacher',$roles,true)&&(string)$r['teacher_id']===$actor->identityId)||(in_array('student',$roles,true)&&(string)$r['student_id']===$actor->identityId)))throw new AcademicCommandFailure('not_found');return $roles;
 }
 private function view(array $r):array {return ['id'=>(string)$r['id'],'version_id'=>(string)$r['version_id'],'grade'=>$r['grade'],'feedback'=>$r['feedback'],'recorded_at'=>$r['recorded_at']];}
 private function resolveBimesterNumber(string $periodId, string $activityId): ?int {
  if ($this->db->getSchemaBuilder()->hasTable('activity_week_states')) {
   $weekChange = $this->db->table('activity_week_states as s')
       ->join('activity_week_changes as c', 'c.id', '=', 's.change_id')
       ->where('s.resource_id', $activityId)
       ->first(['c.calendar_revision_id', 'c.week_id']);
   if ($weekChange && $weekChange->calendar_revision_id && $weekChange->week_id) {
       $revision = $this->db->table('school_calendar_revisions')->where('id', $weekChange->calendar_revision_id)->first();
       if ($revision && $revision->blocks) {
           $blocks = json_decode((string)$revision->blocks, true);
           if (is_array($blocks)) {
               $teachingIdx = 0;
               foreach ($blocks as $block) {
                   if (($block['kind'] ?? '') === 'teaching') {
                       $teachingIdx++;
                       foreach ($block['weeks'] ?? [] as $w) {
                           if (($w['id'] ?? '') === $weekChange->week_id) {
                               return $teachingIdx;
                           }
                       }
                   }
               }
           }
       }
   }
  }
  if ($this->db->getSchemaBuilder()->hasTable('activity_contents')) {
   $content = $this->db->table('activity_contents')->where('activity_id', $activityId)->first(['due_on', 'published_at']);
   $actDate = $content?->due_on ?? ($content?->published_at ? substr((string)$content->published_at, 0, 10) : null);
   if ($actDate) {
       $revisions = $this->db->table('school_calendar_revisions')->where('period_id', $periodId)->orderByDesc('id')->get();
       foreach ($revisions as $rev) {
           if ($rev->blocks) {
               $blocks = json_decode((string)$rev->blocks, true);
               if (is_array($blocks)) {
                   $teachingIdx = 0;
                   foreach ($blocks as $block) {
                       if (($block['kind'] ?? '') === 'teaching') {
                           $teachingIdx++;
                           if (isset($block['start_on'], $block['end_on']) && $actDate >= $block['start_on'] && $actDate <= $block['end_on']) {
                               return $teachingIdx;
                           }
                       }
                   }
               }
           }
       }
   }
  }
  return null;
 }
 private function assertBimesterAssessmentAllowed(string $periodId, string $activityId): void {
  if (!$this->db->getSchemaBuilder()->hasTable('bimester_grade_closures')) return;
  $bimesterNumber = $this->resolveBimesterNumber($periodId, $activityId);
  if ($bimesterNumber !== null) {
   $isLocked = $this->db->table('bimester_grade_closures')
       ->where('period_id', $periodId)
       ->where('bimester_number', $bimesterNumber)
       ->where('state', 'locked')
       ->exists();
   if ($isLocked) throw new AcademicCommandFailure('bimester_locked');
   return;
  }
  $anyLocked = $this->db->table('bimester_grade_closures')
      ->where('period_id', $periodId)
      ->where('state', 'locked')
      ->exists();
  if ($anyLocked) throw new AcademicCommandFailure('unmapped_bimester');
 }
 private function isBimesterLocked(string $periodId, string $activityId): bool {
  if (!$this->db->getSchemaBuilder()->hasTable('bimester_grade_closures')) return false;
  $bimesterNumber = $this->resolveBimesterNumber($periodId, $activityId);
  if ($bimesterNumber !== null) {
   return $this->db->table('bimester_grade_closures')
       ->where('period_id', $periodId)
       ->where('bimester_number', $bimesterNumber)
       ->where('state', 'locked')
       ->exists();
  }
  return $this->db->table('bimester_grade_closures')
      ->where('period_id', $periodId)
      ->where('state', 'locked')
      ->exists();
 }
 public function projection(AuthenticatedActor $actor,string $id):array {
  $r=$this->delivery($id);$roles=$this->authorize($actor,$r);$current=null;if(!$this->db->getSchemaBuilder()->hasTable('delivery_assessments'))return ['assessment'=>null,'can_assess'=>false];
  if($r['current_assessment_id']!==null){$row=$this->db->table('delivery_assessments')->where('id',$r['current_assessment_id'])->where('submission_id',$id)->first();if(!$row)throw new AcademicCommandFailure('reference_unavailable');$current=$this->view((array)$row);}
  // Match the command's compatibility rule: an installation without the
  // optional closure table has no stored locks. Never query that absent table.
  $hasClosures=$this->db->getSchemaBuilder()->hasTable('bimester_grade_closures');
  $bimester=$hasClosures?$this->resolveBimesterNumber((string)$r['academic_period_id'],(string)$r['activity_id']):null;
  $anyLocked=$hasClosures&&$this->db->table('bimester_grade_closures')->where('period_id',(string)$r['academic_period_id'])->where('state','locked')->exists();
  $isLocked=$hasClosures&&($bimester!==null?$this->db->table('bimester_grade_closures')->where('period_id',(string)$r['academic_period_id'])->where('bimester_number',$bimester)->where('state','locked')->exists():$anyLocked);
  $unmapped=($bimester===null)&&$anyLocked;
  return ['assessment'=>$current,'can_assess'=>$r['period_state']==='active'&&(string)$r['teacher_id']===$actor->identityId&&in_array('teacher',$roles,true)&&!$isLocked,'is_locked'=>$isLocked,'unmapped_bimester'=>$unmapped];
 }
 public function projections(AuthenticatedActor $actor,array $rows,array $assignment,array $roles,string $activityId):array {
  if(!$rows)return [];
  if(!$this->db->getSchemaBuilder()->hasTable('delivery_assessments')){$empty=[];foreach($rows as $r)$empty[(string)$r->submission_id]=['assessment'=>null,'can_assess'=>false];return $empty;}
  $periodId=(string)$assignment['academic_period_id'];$periodActive=$this->db->table('academic_periods')->where('id',$periodId)->value('state')==='active';
  $hasClosures=$this->db->getSchemaBuilder()->hasTable('bimester_grade_closures');
  $bimester=$hasClosures?$this->resolveBimesterNumber($periodId,$activityId):null;
  $anyLocked=$hasClosures&&$this->db->table('bimester_grade_closures')->where('period_id',$periodId)->where('state','locked')->exists();
  $isLocked=$hasClosures&&($bimester!==null?$this->db->table('bimester_grade_closures')->where('period_id',$periodId)->where('bimester_number',$bimester)->where('state','locked')->exists():$anyLocked);
  $unmapped=($bimester===null)&&$anyLocked;$canAssess=$periodActive&&(string)$assignment['teacher_id']===$actor->identityId&&in_array('teacher',$roles,true)&&!$isLocked;
  $assessmentIds=array_values(array_filter(array_map(fn($r)=>$r->current_assessment_id,$rows),fn($id)=>$id!==null));
  $assessments=$assessmentIds?$this->db->table('delivery_assessments')->whereIn('id',$assessmentIds)->get()->keyBy(fn($row)=>(string)$row->id):collect();
  $result=[];foreach($rows as $r){$sid=(string)$r->submission_id;$current=null;if($r->current_assessment_id!==null){$row=$assessments->get((string)$r->current_assessment_id);if(!$row||(string)$row->submission_id!==$sid)throw new AcademicCommandFailure('reference_unavailable');$current=$this->view((array)$row);}$result[$sid]=['assessment'=>$current,'can_assess'=>$canAssess,'is_locked'=>$isLocked,'unmapped_bimester'=>$unmapped];}
  return $result;
 }
 public function history(AuthenticatedActor $actor,string $id,?string $after):array {
  $this->authorize($actor,$this->delivery($id));$q=$this->db->table('delivery_assessments')->where('submission_id',$id);if($after!==null)$q->where('id','>',AcademicLockSet::id($after));$rows=$q->orderBy('id')->limit(51)->get();$items=$rows->take(50)->map(fn($r)=>$this->view((array)$r))->values()->all();return ['items'=>$items,'next_after'=>$rows->count()>50?end($items)['id']:null];
 }
 public function assess(AuthenticatedActor $actor,string $id,array $input):array {
  $this->roles($actor);$id=AcademicLockSet::id($id);FoundationCommandChecks::fields($input,['grade','feedback','expected_version_id','expected_assessment_id'],['grade','feedback','expected_version_id','expected_assessment_id']);
  if(!is_string($input['grade'])||!in_array($input['grade'],['AD','A','B','C'],true)||!is_string($input['feedback'])||!mb_check_encoding($input['feedback'],'UTF-8')||trim($input['feedback'])===''||mb_strlen($input['feedback'])>5000||!is_string($input['expected_version_id'])||($input['expected_assessment_id']!==null&&!is_string($input['expected_assessment_id'])))throw new AcademicCommandFailure('invalid_input');
  $expectedVersion=AcademicLockSet::id($input['expected_version_id']);$expectedAssessment=$input['expected_assessment_id']===null?null:AcademicLockSet::id($input['expected_assessment_id']);$delivery=null;
  return (new AcademicWriteTransaction($this->db))->execute($actor->identityId,
   function()use($id){$r=$this->delivery($id);return new AcademicLockSet(['academic_periods'=>[$r['academic_period_id']],'retained_identities'=>[$r['teacher_id'],$r['student_id']],'teaching_assignments'=>[$r['teaching_assignment_id']],'activity_references'=>[$r['activity_id']],'submission_references'=>[$id]]);},
   function($context)use($actor,$id,$expectedVersion,$expectedAssessment,&$delivery){$roles=$this->roles($actor);$delivery=$this->delivery($id);$a=$context->row('teaching_assignments',$delivery['teaching_assignment_id']);if(!in_array('teacher',$roles,true)||(string)$a['teacher_id']!==$actor->identityId)throw new AcademicCommandFailure('forbidden');if($context->row('academic_periods',$a['academic_period_id'])['state']!=='active')throw new AcademicCommandFailure('period_not_active');$this->assertBimesterAssessmentAllowed((string)$a['academic_period_id'],(string)$delivery['activity_id']);if((string)$delivery['current_version_id']!==$expectedVersion)throw new AcademicCommandFailure('stale_delivery_version');$current=$delivery['current_assessment_id']===null?null:(string)$delivery['current_assessment_id'];if($current!==$expectedAssessment)throw new AcademicCommandFailure('stale_assessment');return true;},
   function($context,$boundary)use($actor,$id,$input,&$delivery){$revision=(string)$this->db->table('delivery_assessments')->insertGetId(['submission_id'=>$id,'version_id'=>$delivery['current_version_id'],'teacher_id'=>$actor->identityId,'grade'=>$input['grade'],'feedback'=>$input['feedback'],'operation_key'=>$boundary->toServerKey(),'recorded_at'=>$boundary->timestamp->format('Y-m-d H:i:s.u')]);$this->db->table('activity_deliveries')->where('submission_id',$id)->update(['current_assessment_id'=>$revision]);$event=$delivery['current_assessment_id']===null?'delivery_assessed':'assessment_corrected';(new AcademicNotifications($this->db))->emit($event,[(string)$delivery['student_id']],null,$id,$boundary->toServerKey(),$boundary->timestamp->format('Y-m-d H:i:s.u'));return new AcademicMutationResult(['id'=>$id,'assessment_id'=>$revision],[new LifecycleEvent('assignment',(string)$delivery['teaching_assignment_id'],$delivery['current_assessment_id']===null?'delivery_assessed':'assessment_corrected',null,null,['resource_id'=>$id])]);});
 }
}
