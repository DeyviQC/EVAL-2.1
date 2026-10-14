<?php
declare(strict_types=1);
namespace App\Application\Academic\Queries;
use App\Application\Academic\AcademicCommandFailure;
use App\Infrastructure\Persistence\Academic\AcademicLockSet;

/** Filters narrow authorized directory reads before cursor pagination. */
final class DirectoryFilters
{
    public static function apply($query,array $filters,string $kind):void
    {
        $assignment=$kind==='assignments';
        $ids=['academic_period_id','grade_id','section_id'];
        if($assignment)$ids=array_merge($ids,['teacher_id','instructional_entry_id']);
        if(array_diff(array_keys($filters),array_merge($ids,['state','search'])))throw new AcademicCommandFailure('invalid_input');
        $alias=$assignment?'a':'e';
        foreach($ids as $key){
            if(!isset($filters[$key]))continue;
            try{$value=AcademicLockSet::id($filters[$key]);}catch(\InvalidArgumentException|\TypeError){throw new AcademicCommandFailure('invalid_input');}
            $query->where($alias.'.'.$key,$value);
        }
        if(isset($filters['state'])){
            $states=$assignment?['planned','active','closed']:['active','history'];
            if(!is_string($filters['state'])||!in_array($filters['state'],$states,true))throw new AcademicCommandFailure('invalid_input');
            $query->where($alias.'.state',$filters['state']==='history'?'!=':'=',$filters['state']==='history'?'active':$filters['state']);
        }
        if(isset($filters['search'])){
            if(!is_string($filters['search'])||mb_strlen($filters['search'])>100)throw new AcademicCommandFailure('invalid_input');
            $query->whereRaw("LOCATE(?, LOWER(COALESCE(n.display_name, ''))) > 0",[mb_strtolower(trim($filters['search']))]);
        }
    }
}
