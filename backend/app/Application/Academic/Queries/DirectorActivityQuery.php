<?php
declare(strict_types=1);
namespace App\Application\Academic\Queries;
use Illuminate\Database\Connection;
use App\Infrastructure\Authentication\AuthenticatedActor;
use App\Application\Academic\Commands\FoundationCommandChecks;
use App\Application\Academic\AcademicCommandFailure;
use App\Application\Academic\Authorization\AcademicAuthorization;
use App\Infrastructure\Persistence\Academic\AcademicLockSet;

/** Bounded read-only monitoring; preserves the original assignment route. */
final class DirectorActivityQuery
{
    public function __construct(private Connection $db){}
    public function page(AuthenticatedActor $actor,string $assignment,?string $after):array
    {
        FoundationCommandChecks::credentials($this->db,$actor);
        AcademicLockSet::id($assignment);if($after!==null)AcademicLockSet::id($after);
        if(!$this->db->table('local_role_grants')->where('identity_id',$actor->identityId)->where('role','director_admin')->exists()
            ||!(new AcademicAuthorization($this->db))->allows($actor,'assignment.read',['assignment_id'=>$assignment]))throw new AcademicCommandFailure('forbidden');
        $query=$this->db->table('activity_references as r')->join('activity_contents as c','c.activity_id','=','r.id')->where('r.teaching_assignment_id',$assignment);
        if($after!==null)$query->where('r.id','>',$after);
        $rows=$query->orderBy('r.id')->limit(51)->get(['r.id','c.title','c.instructions','c.due_on','c.state']);
        $ids=$rows->take(50)->pluck('id')->all();
        $counts=$this->db->table('activity_deliveries')->whereIn('activity_id',$ids)->selectRaw('activity_id, COUNT(*) as received, SUM(current_assessment_id IS NOT NULL) as graded')->groupBy('activity_id')->get()->keyBy('activity_id');
        $items=$rows->take(50)->map(function($row)use($counts){$c=$counts->get($row->id);$received=(int)($c->received??0);$graded=(int)($c->graded??0);return ['id'=>(string)$row->id,'title'=>$row->title,'instructions'=>$row->instructions,'due_on'=>$row->due_on,'state'=>$row->state,'received'=>$received,'graded'=>$graded,'pending'=>$received-$graded];})->all();
        return ['items'=>$items,'next_after'=>$rows->count()>50?end($items)['id']:null];
    }
}
