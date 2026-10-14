<?php
declare(strict_types=1);
// Local maintenance verification. Accepted vice-principal work is forced to roll
// back at the ledger boundary; no academic record or account is retained.
require __DIR__.'/config.php';
if(!evalDevBinding(getenv())||getenv('EVAL_DB_ROLE')!=='migration')exit(2);
require dirname(__DIR__).'/bootstrap.php';
$db=Illuminate\Database\Capsule\Manager::connection();$triggers=[];$exitCode=0;
try{
 $actor=function(string $login)use($db){$row=$db->table('local_credentials')->where('login',$login)->first();return new App\Infrastructure\Authentication\AuthenticatedActor((string)$row->id,$db->table('local_role_grants')->where('identity_id',$row->id)->pluck('role')->all(),App\Infrastructure\Authentication\CredentialRevision::current($db,(string)$row->id,$row->password));};
 $director=$actor('director');$vice=$actor('subdirector');$checks=0;
 $assert=function(bool $value)use(&$checks){if(!$value)throw new RuntimeException('Role policy verification failed');$checks++;};
 $snapshot=fn()=>[$db->table('academic_periods')->count(),$db->table('academic_lifecycle_events')->count(),$db->table('local_credentials')->count(),$db->table('academic_write_guard')->value('last_ordinal')];
 $before=$snapshot();$service=new App\Application\Academic\Commands\AcademicPeriodCommands($db);
 $input=['name'=>'Role policy rollback probe','start_on'=>'2026-01-01','end_on'=>'2026-12-31'];
 try{$service->create($director,$input);throw new RuntimeException('Director wrote a period');}catch(App\Application\Academic\AcademicCommandFailure $e){$assert($e->category==='forbidden');}
 $assert($snapshot()===$before);
 $suffix=bin2hex(random_bytes(4));$name='role_probe_period_'.$suffix;
 $db->unprepared('CREATE TRIGGER '.$name.' BEFORE INSERT ON academic_periods FOR EACH ROW SET @eval_role_period_insert_seen=1');$triggers[]=$name;
 $name='role_probe_rollback_'.$suffix;
 $db->unprepared("CREATE TRIGGER $name BEFORE INSERT ON academic_lifecycle_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Role policy rollback probe'");$triggers[]=$name;
 $db->statement('SET @eval_role_period_insert_seen=0');
 try{$service->create($vice,$input);throw new RuntimeException('Rollback probe committed');}catch(App\Infrastructure\Persistence\Academic\AcademicTransactionFailure $e){$assert($e->category==='integrity_conflict');}
 $assert((int)$db->selectOne('SELECT @eval_role_period_insert_seen AS seen')->seen===1);
 $assert($snapshot()===$before);
 $accounts=new App\Application\Accounts\LocalAccountService($db);
 try{$accounts->execute($director,'created',null,['name'=>'Probe','username'=>'role.probe','role'=>'student']);throw new RuntimeException('Director created an account');}catch(App\Application\Academic\AcademicCommandFailure $e){$assert($e->category==='forbidden');}
 $assert($snapshot()===$before);
 echo json_encode(['passed'=>true,'checks'=>$checks,'vice_period_creation_reached_insert'=>true,'forced_rollback'=>true,'retained_test_records'=>0]).PHP_EOL;
}catch(Throwable $e){fwrite(STDERR,'Role policy verification failed ('.get_class($e).').'.PHP_EOL);$exitCode=2;}
finally{foreach(array_reverse($triggers) as $name)$db->unprepared('DROP TRIGGER IF EXISTS '.$name);}
exit($exitCode);
