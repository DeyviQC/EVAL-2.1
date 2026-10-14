<?php
declare(strict_types=1);
// Targeted development-only correction of the four explicitly provisional names.
require __DIR__.'/config.php';
if(!evalDevBinding(getenv())||getenv('EVAL_DB_ROLE')!=='migration'||getenv('EVAL_NORMALIZE_DEMO_NAMES')!=='1')exit(2);
require dirname(__DIR__).'/bootstrap.php';
try{
 $db=Illuminate\Database\Capsule\Manager::connection();$root=dirname(__DIR__,2).'/.local/eval-dev';$journal=$root.'/profile-name-cleanup.json';
 $map=['director'=>['Director de desarrollo','José Antonio Medina Flores'],'subdirector'=>['Subdirector de desarrollo','Patricia Elena Salazar Quispe'],'docente'=>['Docente de desarrollo','Luis Alberto Paredes Salazar'],'estudiante'=>['Estudiante de desarrollo','María Fernanda Quispe Huamán']];
 $updates=[];$db->transaction(function()use($db,$map,$journal,&$updates){
  $before=[];foreach($map as $login=>[$old,$new]){$row=$db->table('local_credentials as c')->join('retained_identity_profiles as p','p.identity_id','=','c.id')->where('c.login',$login)->lockForUpdate()->first(['c.id','c.password','p.display_name']);if(!$row)throw new RuntimeException('Original account missing');$before[(string)$row->id]=$row->password;if($row->display_name===$old)$updates[]=['identity_id'=>(string)$row->id,'login'=>$login,'previous_name'=>$old,'name'=>$new];}
  if(!$updates)return;if(is_file($journal))throw new RuntimeException('Existing maintenance journal requires review');
  $record=['operation'=>'normalize_original_fictional_profile_names','actor'=>'explicitly_authorized_local_maintenance','status'=>'prepared','recorded_at'=>gmdate('c'),'changes'=>$updates];if(file_put_contents($journal,json_encode($record,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Maintenance audit unavailable');
  foreach($updates as $change)$db->table('retained_identity_profiles')->where('identity_id',$change['identity_id'])->where('display_name',$change['previous_name'])->update(['display_name'=>$change['name']]);
  foreach($before as $id=>$hash)if(!hash_equals($hash,$db->table('local_credentials')->where('id',$id)->value('password')))throw new RuntimeException('Credentials changed unexpectedly');
 });
 if($updates){$record=json_decode(file_get_contents($journal),true,flags:JSON_THROW_ON_ERROR);$record['status']='committed';file_put_contents($journal,json_encode($record,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),LOCK_EX);}
 echo json_encode(['profilesUpdated'=>count($updates),'credentialsChanged'=>false,'customProfilesOverwritten'=>false,'audit'=>'private maintenance journal'],JSON_THROW_ON_ERROR).PHP_EOL;
}catch(Throwable $e){fwrite(STDERR,'Development name cleanup requires review; original credentials are retained.'.PHP_EOL);exit(2);}
