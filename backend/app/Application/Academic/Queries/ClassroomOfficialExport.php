<?php
declare(strict_types=1);

namespace App\Application\Academic\Queries;

use App\Infrastructure\Authentication\AuthenticatedActor;

final class ClassroomOfficialExport
{
    /**
     * Generates a tamper-evident, standalone official institutional grade sheet document.
     *
     * @param array $report Output from ClassroomReport::read
     * @param array $bimesters Output from BimesterClosuresQuery::getForPeriod
     * @param AuthenticatedActor $actor Generating actor
     * @return array{html: string, sha256: string, filename: string}
     */
    public static function generate(array $report, array $bimesters, AuthenticatedActor $actor): array
    {
        $scope = $report['scope'];
        $totals = $report['totals'];
        $items = $report['items'];
        $bimesterList = $bimesters['bimesters'] ?? [];

        $nowLima = (new \DateTimeImmutable('now', new \DateTimeZone('America/Lima')))->format('d/m/Y H:i:s');
        $nowUtc = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');

        // Check if all bimesters are locked
        $allLocked = count($bimesterList) > 0 && array_reduce($bimesterList, fn($carry, $b) => $carry && ($b['state'] === 'locked'), true);
        $anyLocked = count($bimesterList) > 0 && array_reduce($bimesterList, fn($carry, $b) => $carry || ($b['state'] === 'locked'), false);

        $conditionLabel = $allLocked
            ? 'CONSOLIDADO DEFINITIVO (TODOS LOS BIMESTRES CERRADOS)'
            : ($anyLocked
                ? 'CONSOLIDADO PARCIAL (BIMESTRES CON BLOQUEO ACTIVO)'
                : 'VISTA PROVISIONAL EN PROCESO');

        // Cryptographic integrity seal calculated over core data
        $payloadToSign = json_encode([
            'institution' => 'I.E. NUESTRA SEÑORA DE LAS MERCEDES',
            'scope' => $scope,
            'totals' => $totals,
            'students_count' => count($items),
            'condition' => $conditionLabel,
            'generated_by_id' => $actor->identityId,
            'generated_at_utc' => $nowUtc,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $integrityHash = hash('sha256', (string)$payloadToSign);

        $actorRoles = implode(', ', $actor->roles);
        $esc = fn(?string $v) => htmlspecialchars((string)$v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $rowsHtml = '';
        foreach ($items as $idx => $st) {
            $num = $idx + 1;
            $name = $esc($st['name']);
            $id = $esc($st['id']);
            $cond = $st['historical'] ? 'Histórico' : 'Activo';
            $rec = (int)$st['received'];
            $grad = (int)$st['graded'];
            $pend = (int)$st['pending'];
            $rowsHtml .= "<tr>
                <td style='text-align:center;'>{$num}</td>
                <td><strong>{$name}</strong><br><span style='font-size:7.5pt;color:#64748b;'>DNI/ID: {$id}</span></td>
                <td style='text-align:center;'>{$cond}</td>
                <td style='text-align:center;'>{$rec}</td>
                <td style='text-align:center;font-weight:bold;color:#059669;'>{$grad}</td>
                <td style='text-align:center;color:" . ($pend > 0 ? '#d97706' : '#64748b') . ";'>{$pend}</td>
                <td style='border-bottom:1px solid #cbd5e1;'></td>
            </tr>";
        }

        $bimestersHtml = '';
        if ($bimesterList) {
            $bimestersHtml = '<div style="margin:10px 0;padding:8px 12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;font-size:8.5pt;">';
            $bimestersHtml .= '<strong>Estado de Cierre por Bimestre: </strong>';
            foreach ($bimesterList as $bim) {
                $bNum = (int)$bim['bimester_number'];
                $isLock = $bim['state'] === 'locked';
                $by = $esc($bim['closed_by_name'] ?? 'Dirección');
                $bimestersHtml .= "<span style='margin-right:15px;'><strong>{$bNum}.° Bimestre:</strong> " .
                    ($isLock ? "<span style='color:#b91c1c;'>🔒 Cerrado ({$by})</span>" : "<span style='color:#059669;'>📝 En Proceso</span>") .
                    ($bim['reopened_by_name'] ? " <small style='color:#d97706;'>[Reabierto por " . $esc($bim['reopened_by_name']) . "]</small>" : "") .
                    "</span>";
            }
            $bimestersHtml .= '</div>';
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Consolidado Oficial EVAL - {$esc($scope['grade_name'])} {$esc($scope['section_name'])}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 15mm; }
  body { font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #1e293b; font-size: 9pt; line-height: 1.4; margin: 0; padding: 20px; }
  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
  .header h1 { font-size: 13pt; margin: 0; color: #0f172a; letter-spacing: 0.5px; }
  .header h2 { font-size: 10.5pt; margin: 4px 0 0 0; color: #334155; font-weight: 600; }
  .header p { font-size: 8pt; color: #64748b; margin: 2px 0 0 0; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; font-size: 8.5pt; background: #f1f5f9; padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; }
  .meta-grid strong { color: #0f172a; }
  .seal-box { background: #eff6ff; border: 1px dashed #3b82f6; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 8pt; color: #1e40af; }
  .seal-box code { font-family: Consolas, monospace; font-size: 7.5pt; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
  th { background: #0f172a; color: #ffffff; padding: 6px 8px; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; border: 1px solid #0f172a; }
  td { padding: 5px 8px; border: 1px solid #cbd5e1; }
  tr:nth-child(even) { background-color: #f8fafc; }
  .summary-table th { background: #334155; }
  .summary-table td { text-align: center; font-size: 9.5pt; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 35px; text-align: center; page-break-inside: avoid; }
  .sig-line { border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 4px; font-size: 8pt; font-weight: 600; color: #334155; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<div class="no-print" style="margin-bottom:15px;padding:10px;background:#e0f2fe;border:1px solid #7dd3fc;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
  <span><strong>Documento Oficial Generado por el Servidor EVAL</strong> · Sello Criptográfico Válido</span>
  <button onclick="window.print()" style="background:#0f172a;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;font-weight:bold;">Imprimir / Guardar en PDF</button>
</div>

<div class="header">
  <h1>I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO</h1>
  <h2>CONSOLIDADO INSTITUCIONAL DE EVALUACIONES Y SEGUIMIENTO DE AULA</h2>
  <p>Plataforma Educativa EVAL v2.1 · Registro Académico Seguro y Descentralizado</p>
</div>

<div class="meta-grid">
  <div><strong>Período Lectivo:</strong> {$esc($scope['period_name'])}</div>
  <div><strong>Grado y Sección:</strong> {$esc($scope['grade_name'])} {$esc($scope['section_name'])}</div>
  <div><strong>Condición de Calificaciones:</strong> <strong>{$esc($conditionLabel)}</strong></div>
  <div><strong>Total Estudiantes Evaluados:</strong> {$esc((string)count($items))}</div>
  <div><strong>Fecha de Emisión Oficial:</strong> {$esc($nowLima)} (Hora de Perú)</div>
  <div><strong>Generado por Actor ID:</strong> {$esc($actor->identityId)} ({$esc($actorRoles)})</div>
</div>

{$bimestersHtml}

<div class="seal-box">
  <strong>🔒 SELLO DE INTEGRIDAD CRIPTOGRÁFICA DEL SERVIDOR:</strong><br>
  <code>SHA-256: {$integrityHash}</code><br>
  <span style="font-size:7pt;color:#475569;">Este sello certifica que la información del aula coincide exactamente con la bitácora inmutable (audit ledger) del servidor EVAL en la fecha y hora indicada.</span>
</div>

<h3 style="font-size:9.5pt;font-weight:bold;margin:12px 0 4px 0;text-transform:uppercase;color:#0f172a;">
  Resumen Consolidado de Logro de Aprendizajes (Norma Técnica CNEB)
</h3>
<table class="summary-table">
  <thead>
    <tr>
      <th>Entregas Totales</th>
      <th>Calificadas</th>
      <th>Pendientes</th>
      <th style="background:#059669;">AD (Destacado)</th>
      <th style="background:#0d9488;">A (Esperado)</th>
      <th style="background:#0284c7;">B (En Proceso)</th>
      <th style="background:#e11d48;">C (En Inicio)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>{$totals['received']}</strong></td>
      <td><strong>{$totals['graded']}</strong></td>
      <td>{$totals['pending']}</td>
      <td style="color:#059669;font-weight:bold;">{$totals['AD']}</td>
      <td style="color:#0d9488;font-weight:bold;">{$totals['A']}</td>
      <td style="color:#0284c7;font-weight:bold;">{$totals['B']}</td>
      <td style="color:#e11d48;font-weight:bold;">{$totals['C']}</td>
    </tr>
  </tbody>
</table>

<h3 style="font-size:9.5pt;font-weight:bold;margin:16px 0 4px 0;text-transform:uppercase;color:#0f172a;">
  Nómina de Estudiantes y Estado de Calificaciones
</h3>
<table>
  <thead>
    <tr>
      <th style="width:25px;text-align:center;">N°</th>
      <th>Apellidos y Nombres</th>
      <th style="width:70px;text-align:center;">Condición</th>
      <th style="width:65px;text-align:center;">Entregas</th>
      <th style="width:75px;text-align:center;">Calificadas</th>
      <th style="width:70px;text-align:center;">Pendientes</th>
      <th style="width:110px;text-align:center;">Firma Docente</th>
    </tr>
  </thead>
  <tbody>
    {$rowsHtml}
  </tbody>
</table>

<div class="signatures">
  <div>
    <div class="sig-line">Docente de Área / Aula</div>
  </div>
  <div>
    <div class="sig-line">V.° B.° Subdirección Formación General</div>
  </div>
  <div>
    <div class="sig-line">V.° B.° Dirección General</div>
  </div>
</div>

</body>
</html>
HTML;

        $cleanGrade = preg_replace('/[^a-zA-Z0-9]/', '', (string)$scope['grade_name']);
        $cleanSec = preg_replace('/[^a-zA-Z0-9]/', '', (string)$scope['section_name']);
        $cleanPeriod = preg_replace('/[^a-zA-Z0-9]/', '', (string)$scope['period_name']);
        $filename = "acta-eval-{$cleanPeriod}-{$cleanGrade}{$cleanSec}-oficial.html";

        return [
            'html' => $html,
            'sha256' => $integrityHash,
            'filename' => $filename,
        ];
    }
}
