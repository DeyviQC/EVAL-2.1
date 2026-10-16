<?php
declare(strict_types=1);
namespace App\Application\Academic\Queries;
use Illuminate\Database\Connection;
use App\Infrastructure\Authentication\AuthenticatedActor;
use App\Application\Accounts\LocalAccountService;
final class DashboardOverview {
 public function __construct(private Connection $db){}
 public function get(AuthenticatedActor $actor):array {
  $role=(new LocalAccountService($this->db))->dashboardRole($actor)['role'];
  $query=$this->db->table('teaching_assignments as a')
    ->join('academic_periods as p','p.id','=','a.academic_period_id')
    ->join('grades as g','g.id','=','a.grade_id')
    ->where('a.state','active')
    ->where('p.state','active')
    ->where('g.is_active',true)
    ->where('g.name','not like','%verification%')
    ->where('g.name','not like','%test%');
  if($role==='teacher')$query->where('a.teacher_id',$actor->identityId);
  if($role==='student')$query->whereExists(function($q)use($actor){$q->selectRaw('1')->from('student_enrollments as e')->where('e.student_id',$actor->identityId)->where('e.state','active')->whereColumn('e.academic_period_id','a.academic_period_id')->whereColumn('e.grade_id','a.grade_id')->whereColumn('e.section_id','a.section_id');});
  $assignments=$query->get(['a.id','a.grade_id','a.section_id']);$ids=$assignments->pluck('id');
  $tasks=$this->db->table('activity_references as r')->join('activity_contents as c','c.activity_id','=','r.id')->whereIn('r.teaching_assignment_id',$ids);
  $activityIds=(clone $tasks)->pluck('r.id');
  $deliveries=$this->db->table('activity_deliveries')->whereIn('activity_id',$activityIds);if($role==='student')$deliveries->where('student_id',$actor->identityId);
  $delivered=(clone $deliveries)->count();$graded=(clone $deliveries)->whereNotNull('current_assessment_id')->count();
  $pending=$role==='student'?(clone $tasks)->where('c.state','open')->whereNotIn('r.id',(clone $deliveries)->pluck('activity_id'))->count():$delivered-$graded;
  $students=$role==='student'?1:($role==='teacher'?$this->db->table('student_enrollments as e')->join('grades as eg','eg.id','=','e.grade_id')->where('eg.is_active',true)->where('eg.name','not like','%verification%')->where('eg.name','not like','%test%')->whereIn('e.section_id',$assignments->pluck('section_id'))->where('e.state','active')->whereIn('e.academic_period_id',$this->db->table('academic_periods')->where('state','active')->pluck('id'))->distinct()->count('e.student_id'):$this->db->table('student_enrollments as e')->join('academic_periods as p','p.id','=','e.academic_period_id')->join('grades as eg','eg.id','=','e.grade_id')->where('eg.is_active',true)->where('eg.name','not like','%verification%')->where('eg.name','not like','%test%')->where('e.state','active')->where('p.state','active')->distinct()->count('e.student_id'));
  $classroomsCount=$assignments->map(fn($row)=>$row->grade_id.'-'.$row->section_id)->unique()->count();
  return ['courses'=>$assignments->count(),'classrooms'=>$classroomsCount,'students'=>$students,'activities'=>(clone $tasks)->count(),'deliveries'=>$delivered,'graded'=>$graded,'pending'=>$pending,'unread'=>$this->db->table('academic_notifications')->where('recipient_id',$actor->identityId)->whereNull('read_at')->count()];
 }
}
