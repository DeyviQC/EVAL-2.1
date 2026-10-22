<?php
declare(strict_types=1);
require __DIR__.'/config.php';
if(!evalDevBinding(getenv())||getenv('EVAL_DB_ROLE')!=='runtime')throw new RuntimeException('Invalid directory verification binding');
require dirname(__DIR__).'/bootstrap.php';
$runtime=Illuminate\Database\Capsule\Manager::connection();
$config=$runtime->getConfig();
$config['username']=getenv('EVAL_MIGRATION_USER');
$config['password']=getenv('EVAL_MIGRATION_PASSWORD');
$fixtureCapsule=new Illuminate\Database\Capsule\Manager();
$fixtureCapsule->addConnection($config,'directory_fixture');
$db=$fixtureCapsule->getConnection('directory_fixture');
$service=new App\Application\Accounts\LocalAccountService($db);
$checks=0;
$assert=function(bool $ok)use(&$checks){if(!$ok)throw new RuntimeException('Directory assertion failed at '.($checks+1));$checks++;};
$actor=function(string $login)use($db){$r=$db->table('local_credentials')->where('login',$login)->first();return new App\Infrastructure\Authentication\AuthenticatedActor((string)$r->id,$db->table('local_role_grants')->where('identity_id',$r->id)->pluck('role')->all(),App\Infrastructure\Authentication\CredentialRevision::current($db,(string)$r->id,$r->password));};
$deny=function(string $category,callable $run)use($assert){try{$run();throw new RuntimeException('Expected directory denial');}catch(App\Application\Academic\AcademicCommandFailure $e){$assert($e->category===$category);}};
$db->beginTransaction();
try{
    $prefix='directory.'.bin2hex(random_bytes(5));
    $ids=[];
    for($n=0;$n<54;$n++){
        $id=(string)$db->table('retained_identities')->insertGetId(['credential_status'=>$n===53?'deactivated':'active']);$ids[]=$id;
        $db->table('local_credentials')->insert(['id'=>$id,'login'=>$prefix.'.'.$n,'password'=>'fixture-unusable-hash']);
        $db->table('retained_identity_profiles')->insert(['identity_id'=>$id,'display_name'=>$prefix.' Alice '.($n===53?'%_!':($n===52?'AlphaZ!':'Person '.$n))]);
        $db->table('local_role_grants')->insert(['identity_id'=>$id,'role'=>$n===53?'teacher':'student']);
    }
    $manager=$actor('subdirector');
    $first=$service->directory($manager,['search'=>strtoupper($prefix),'role'=>'student','status'=>'active']);
    $assert(count($first['items'])===50&&$first['next_after']===$ids[49]);
    $last=$service->directory($manager,['search'=>$prefix,'role'=>'student','status'=>'active','after'=>$first['next_after']]);
    $assert(array_column($last['items'],'id')===array_slice($ids,50,3)&&$last['next_after']===null);
    $match=$service->directory($manager,['search'=>'  '.$prefix.' Alice %_!  ','role'=>'teacher','status'=>'inactive']);
    $assert(array_column($match['items'],'id')===[$ids[53]]);
    $assert(array_column($service->directory($manager,['search'=>$prefix.' Alice %_!'])['items'],'id')===[$ids[53]]);
    $assert(count($service->directory($manager,['search'=>$prefix.'.3'])['items'])===11);
    $assert(count($service->directory($manager,['username'=>strtoupper($prefix.'.3')])['items'])===1);
    $assert($service->directory($manager,['search'=>$prefix,'role'=>'student','status'=>'inactive'])['items']===[]);
    $assert(count($service->directory($actor('director'),['search'=>$prefix,'role'=>'teacher'])['items'])===1);
    foreach(['docente','estudiante'] as $login)$deny('forbidden',fn()=>$service->directory($actor($login),['search'=>$prefix]));
    foreach([['search'=>str_repeat('x',101)],['search'=>[]],['role'=>'director_admin'],['status'=>'deleted'],['after'=>'0'],['unknown'=>'x']] as $input)$deny('invalid_input',fn()=>$service->directory($manager,$input));
    $assert(array_keys($match['items'][0])===['id','name','username','role','active']);
}finally{$db->rollBack();}
$assert(!$db->table('local_credentials')->where('login','like',$prefix.'%')->exists());
echo json_encode(['checks'=>$checks,'fixtures_rolled_back'=>true]).PHP_EOL;
