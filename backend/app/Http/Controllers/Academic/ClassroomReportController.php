<?php
declare(strict_types=1);
namespace App\Http\Controllers\Academic;
use Symfony\Component\HttpFoundation\{Request,Response,JsonResponse};
use Illuminate\Database\Connection;
use App\Infrastructure\Authentication\AuthenticatedActor;
use App\Application\Academic\Commands\FoundationCommandChecks;
use App\Application\Academic\Queries\ClassroomReport;
use App\Application\Academic\Queries\BimesterClosuresQuery;
use App\Application\Academic\Queries\ClassroomOfficialExport;
use App\Application\Academic\AcademicCommandFailure;
use App\Infrastructure\Persistence\Academic\AcademicTransactionFailure;
use App\Infrastructure\Persistence\Academic\{AcademicLockSet,AcademicWriteTransaction,AcademicMutationResult,LifecycleEvent};

final class ClassroomReportController {
 public function __construct(private Connection $db){}

 private static function renderVerifyHtml(array $payload):string {
  $esc=fn(?string $v)=>htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
  $isValid=$payload['valid']??false;
  $title=$isValid?'Documento Verificado y Auténtico':'Documento No Verificado';
  $badgeColor=$isValid?'#15803d':'#b91c1c';
  $badgeBg=$isValid?'#f0fdf4':'#fef2f2';
  $badgeBorder=$isValid?'#86efac':'#fca5a5';
  $statusIcon=$isValid?'✓':'✗';
  $statusLabel=$isValid?'DOCUMENTO INSTITUCIONAL OFICIAL VÁLIDO':'NO SE PUDO VALIDAR EL DOCUMENTO';
  $msg=$esc($payload['message']??'Este documento ha sido verificado criptográficamente contra el registro inmutable de la plataforma educativa EVAL.');
  $details='';
  if($isValid){
   $details=<<<HTML
   <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:16px;font-size:14px;line-height:1.6;">
     <p style="margin:4px 0;"><strong>Institución:</strong> {$esc($payload['institution'])}</p>
     <p style="margin:4px 0;"><strong>Tipo de Documento:</strong> {$esc($payload['document_type'])}</p>
     <p style="margin:4px 0;"><strong>Código de Verificación:</strong> <code style="font-size:15px;color:#15803d;font-weight:bold;">{$esc($payload['verification_code'])}</code></p>
     <p style="margin:4px 0;"><strong>ID de Emisión Única:</strong> <code style="font-size:12px;">{$esc($payload['emission_id'])}</code></p>
     <p style="margin:4px 0;"><strong>Ordinal en Ledger Inmutable:</strong> #{$payload['ledger_ordinal']}</p>
     <p style="margin:4px 0;"><strong>Fecha y Hora de Emisión:</strong> {$esc($payload['emitted_at'])}</p>
     <p style="margin:4px 0;"><strong>Hash de Integridad (SHA-256):</strong> <code style="font-size:11px;word-break:break-all;">{$esc($payload['sha256'])}</code></p>
     <p style="margin:4px 0;"><strong>Firma Digital del Servidor (HMAC-SHA-256):</strong> <code style="font-size:11px;word-break:break-all;color:#0f172a;">{$esc($payload['signature'])}</code></p>
   </div>
HTML;
  }
  return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$title} - EVAL</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; color: #0f172a; padding: 24px; margin: 0; }
.card { max-width: 680px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); padding: 32px; border: 1px solid #e2e8f0; }
.badge { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; padding: 8px 16px; border-radius: 9999px; }
h1 { font-size: 20px; font-weight: 800; margin: 16px 0 8px 0; color: #0f172a; }
p { margin: 8px 0; color: #475569; }
</style>
</head>
<body>
<div class="card">
  <div class="badge" style="background:{$badgeBg};color:{$badgeColor};border:1px solid {$badgeBorder};">
    <span>{$statusIcon}</span> {$statusLabel}
  </div>
  <h1>I.E. NUESTRA SEÑORA DE LAS MERCEDES</h1>
  <p>{$msg}</p>
  {$details}
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;display:flex;justify-content:space-between;">
    <span>EVAL Plataforma Educativa Institucional v2.1</span>
    <span>Ayacucho, Perú</span>
  </div>
</div>
</body>
</html>
HTML;
 }

 public function handle(Request $request,AuthenticatedActor $actor):Response {
  try{
   if($request->getPathInfo()==='/reports/verify'){
    if(!$request->isMethod('GET')||$request->getContent()!==''||$request->request->all()||$request->files->all())throw new AcademicCommandFailure('invalid_input');
    $input=$request->query->all();
    FoundationCommandChecks::fields($input,['code','id','hash','format'],[]);
    foreach($input as $v)if(!is_string($v))throw new AcademicCommandFailure('invalid_input');
    $code=$input['code']??null;$id=$input['id']??null;$hash=$input['hash']??null;$format=$input['format']??null;
    if($code===null&&$id===null&&$hash===null)throw new AcademicCommandFailure('invalid_input');
    if($code!==null&&!preg_match('/^EVAL-2026-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/i',$code))throw new AcademicCommandFailure('invalid_input');
    if($id!==null&&!preg_match('/^[a-f0-9]{32}$/i',$id))throw new AcademicCommandFailure('invalid_input');
    if($hash!==null&&!preg_match('/^[a-f0-9]{64}$/i',$hash))throw new AcademicCommandFailure('invalid_input');
    if($format!==null&&$format!=='html'&&$format!=='json')throw new AcademicCommandFailure('invalid_input');

    $q=$this->db->table('academic_lifecycle_events')->where('event_type','official_document_emitted');
    if($code!==null)$q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.verification_code')) = ?",[$code]);
    elseif($id!==null)$q->where(fn($sub)=>$sub->where('correlation_id',$id)->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.emission_id')) = ?",[$id]));
    else $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sha256')) = ?",[$hash]);

    $event=$q->first();
    if(!$event){
     $payload=['valid'=>false,'status'=>'not_found','message'=>'El código de verificación o documento no existe en el registro institucional de EVAL.'];
     if($format==='html')return new Response(self::renderVerifyHtml($payload),200,['Content-Type'=>'text/html; charset=UTF-8','Cache-Control'=>'no-store, private']);
     $response=new JsonResponse($payload,200);$response->headers->set('Cache-Control','no-store, private');return $response;
    }

    $meta=json_decode((string)$event->metadata,true)??[];
    $eventSha=(string)($meta['sha256']??'');
    $eventSig=(string)($meta['signature']??'');
    $isSignatureValid=ClassroomOfficialExport::verify($eventSha,$eventSig);

    $payload=[
     'valid'=>$isSignatureValid,
     'status'=>$isSignatureValid?'verified':'signature_invalid',
     'institution'=>ClassroomOfficialExport::INSTITUTION,
     'document_type'=>'Consolidado Oficial de Aula',
     'verification_code'=>$meta['verification_code']??null,
     'emission_id'=>$meta['emission_id']??$event->correlation_id,
     'sha256'=>$eventSha,
     'signature'=>$eventSig,
     'signature_valid'=>$isSignatureValid,
     'ledger_ordinal'=>(int)$event->operation_key,
     'emitted_at'=>$event->recorded_at,
     'emitted_by_id'=>(string)$event->actor_id,
     'scope'=>[
      'period_id'=>(string)($meta['period_id']??''),
      'grade_id'=>(string)($meta['grade_id']??''),
      'section_id'=>(string)$event->section_id,
     ],
     'students_count'=>(int)($meta['students_count']??0),
    ];

    if($format==='html')return new Response(self::renderVerifyHtml($payload),200,['Content-Type'=>'text/html; charset=UTF-8','Cache-Control'=>'no-store, private']);
    $response=new JsonResponse($payload,200);$response->headers->set('Cache-Control','no-store, private');return $response;
   }

   if($request->getPathInfo()!=='/reports/classroom')throw new AcademicCommandFailure('not_found');
   if(!$request->isMethod('GET')||$request->getContent()!==''||$request->request->all()||$request->files->all())throw new AcademicCommandFailure('invalid_input');
   $input=$request->query->all();FoundationCommandChecks::fields($input,['period_id','grade_id','section_id','after','format'],['period_id','grade_id','section_id']);
   foreach($input as $value)if(!is_string($value))throw new AcademicCommandFailure('invalid_input');
   $format=$input['format']??null;
   if($format!==null&&$format!=='official'&&$format!=='json')throw new AcademicCommandFailure('invalid_input');
   $data=(new ClassroomReport($this->db))->read($actor,$input['period_id'],$input['grade_id'],$input['section_id'],$input['after']??null);
   if($format==='official'){
    $bimesters=(new BimesterClosuresQuery($this->db))->getForPeriod($actor,$input['period_id']);
    $secId=$input['section_id'];$perId=$input['period_id'];$grdId=$input['grade_id'];
    $export=(new AcademicWriteTransaction($this->db))->execute(
     $actor->identityId,
     fn()=>new AcademicLockSet(['sections'=>[$secId]]),
     fn($context)=>true,
     function($context,$boundary)use($data,$bimesters,$actor,$secId,$perId,$grdId){
      $export=ClassroomOfficialExport::generate($data,$bimesters,$actor,$boundary->ordinal);
      $event=new LifecycleEvent(
       'section',$secId,'official_document_emitted',null,'emitted',[
        'verification_code'=>$export['verification_code'],
        'sha256'=>$export['sha256'],
        'signature'=>$export['signature'],
        'emission_id'=>$export['emission_id'],
        'period_id'=>$perId,
        'grade_id'=>$grdId,
        'section_id'=>$secId,
        'students_count'=>count($data['items']),
       ]
      );
      return new AcademicMutationResult($export,[$event]);
     }
    );
    $response=new Response($export['html'],200,[
     'Content-Type'=>'text/html; charset=UTF-8',
     'Content-Disposition'=>'inline; filename="'.$export['filename'].'"',
     'X-EVAL-Integrity-SHA256'=>$export['sha256'],
     'X-EVAL-Verification-Code'=>$export['verification_code'],
     'X-EVAL-Emission-ID'=>$export['emission_id'],
     'Cache-Control'=>'no-store, private',
    ]);
    return $response;
   }
   $response=new JsonResponse(['data'=>$data]);$response->headers->set('Cache-Control','no-store, private');return $response;
  }catch(\InvalidArgumentException){return FoundationController::failure(new AcademicCommandFailure('invalid_input'));}
  catch(AcademicCommandFailure|AcademicTransactionFailure $e){return FoundationController::failure($e);}
  catch(\Throwable){return FoundationController::failure(new AcademicTransactionFailure('database_unavailable',bin2hex(random_bytes(16))));}
 }
}
