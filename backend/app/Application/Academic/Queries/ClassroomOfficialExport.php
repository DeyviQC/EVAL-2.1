<?php
declare(strict_types=1);

namespace App\Application\Academic\Queries;

use App\Infrastructure\Authentication\AuthenticatedActor;

final class ClassroomOfficialExport
{
    public const FORMAT_VERSION = '2.1';
    public const INSTITUTION = 'I.E. NUESTRA SEÑORA DE LAS MERCEDES';
    public const DEFAULT_SECRET = 'EVAL_INSTITUTIONAL_DOCUMENT_SECRET_KEY_2026';

    /**
     * Resolves the server key for document signing.
     */
    public static function resolveSigningKey(?string $explicitKey = null): string
    {
        if ($explicitKey !== null && $explicitKey !== '') {
            return $explicitKey;
        }
        $runtimeKey = getenv('EVAL_RUNTIME_KEY');
        if ($runtimeKey) {
            return $runtimeKey;
        }
        return self::DEFAULT_SECRET;
    }

    /**
     * Builds canonical payload containing full academic evidence and student roster.
     */
    public static function buildCanonicalPayload(
        array $report,
        array $bimesters,
        AuthenticatedActor $actor,
        string $emissionId,
        int $ledgerOrdinal = 0,
        ?string $nowUtc = null
    ): array {
        $scope = $report['scope'];
        $totals = $report['totals'];
        $items = $report['items'];
        $bimesterList = $bimesters['bimesters'] ?? [];

        $allLocked = count($bimesterList) > 0 && array_reduce($bimesterList, fn($carry, $b) => $carry && ($b['state'] === 'locked'), true);
        $anyLocked = count($bimesterList) > 0 && array_reduce($bimesterList, fn($carry, $b) => $carry || ($b['state'] === 'locked'), false);

        $conditionLabel = $allLocked
            ? 'CONSOLIDADO DEFINITIVO'
            : ($anyLocked
                ? 'CONSOLIDADO PARCIAL'
                : 'VISTA PROVISIONAL');

        // Canonical student roster (sorted deterministically by ID)
        $students = [];
        $sortedItems = $items;
        usort($sortedItems, fn($a, $b) => strcmp((string)$a['id'], (string)$b['id']));

        foreach ($sortedItems as $st) {
            $students[] = [
                'id' => (string)$st['id'],
                'name' => (string)$st['name'],
                'historical' => (bool)$st['historical'],
                'received' => (int)$st['received'],
                'graded' => (int)$st['graded'],
                'pending' => (int)$st['pending'],
            ];
        }

        // Canonical bimesters state
        $bimestersData = [];
        for ($i = 1; $i <= 4; $i++) {
            $found = null;
            foreach ($bimesterList as $bim) {
                if ((int)$bim['bimester_number'] === $i) {
                    $found = $bim;
                    break;
                }
            }
            $bimestersData[] = [
                'bimester' => $i,
                'state' => $found['state'] ?? 'open',
                'closed_by' => $found['closed_by_name'] ?? null,
                'reopened_by' => $found['reopened_by_name'] ?? null,
            ];
        }

        return [
            'institution' => self::INSTITUTION,
            'version' => self::FORMAT_VERSION,
            'emission_id' => $emissionId,
            'scope' => [
                'period_id' => (string)$scope['period_id'],
                'period_name' => (string)$scope['period_name'],
                'period_state' => (string)$scope['period_state'],
                'grade_id' => (string)$scope['grade_id'],
                'grade_name' => (string)$scope['grade_name'],
                'section_id' => (string)$scope['section_id'],
                'section_name' => (string)$scope['section_name'],
            ],
            'totals' => [
                'received' => (int)$totals['received'],
                'pending' => (int)$totals['pending'],
                'graded' => (int)$totals['graded'],
                'AD' => (int)$totals['AD'],
                'A' => (int)$totals['A'],
                'B' => (int)$totals['B'],
                'C' => (int)$totals['C'],
            ],
            'condition' => $conditionLabel,
            'bimesters' => $bimestersData,
            'students' => $students,
            'emitted_by' => [
                'identity_id' => (string)$actor->identityId,
                'roles' => $actor->roles,
            ],
            'emitted_at_utc' => $nowUtc ?: (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z'),
            'ledger_ordinal' => $ledgerOrdinal,
        ];
    }

    /**
     * Hashes canonical payload into SHA-256.
     */
    public static function hashPayload(array $payload): string
    {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return hash('sha256', (string)$json);
    }

    /**
     * Signs hash with server HMAC-SHA-256.
     */
    public static function sign(string $hash, ?string $secretKey = null): string
    {
        $key = self::resolveSigningKey($secretKey);
        return hash_hmac('sha256', $hash, $key);
    }

    /**
     * Verifies HMAC signature.
     */
    public static function verify(string $hash, string $signature, ?string $secretKey = null): bool
    {
        $expected = self::sign($hash, $secretKey);
        return hash_equals($expected, $signature);
    }

    /**
     * Formats human-readable verification code from content hash.
     */
    public static function verificationCode(string $hash): string
    {
        $clean = strtoupper(substr($hash, 0, 12));
        return 'EVAL-2026-' . substr($clean, 0, 4) . '-' . substr($clean, 4, 4) . '-' . substr($clean, 8, 4);
    }

    /**
     * Generates a tamper-evident, standalone official institutional grade sheet document.
     *
     * @param array $report Output from ClassroomReport::read
     * @param array $bimesters Output from BimesterClosuresQuery::getForPeriod
     * @param AuthenticatedActor $actor Generating actor
     * @param int $ledgerOrdinal Ordinal recorded from academic_write_guard
     * @param string|null $secretKey Explicit signing key or null for environment
     * @return array{html: string, sha256: string, signature: string, verification_code: string, emission_id: string, filename: string}
     */
    public static function generate(
        array $report,
        array $bimesters,
        AuthenticatedActor $actor,
        int $ledgerOrdinal = 0,
        ?string $secretKey = null
    ): array {
        $scope = $report['scope'];
        $totals = $report['totals'];
        $items = $report['items'];
        $bimesterList = $bimesters['bimesters'] ?? [];

        $nowLima = (new \DateTimeImmutable('now', new \DateTimeZone('America/Lima')))->format('d/m/Y H:i:s');
        $nowUtc = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');
        $emissionId = bin2hex(random_bytes(16));

        $canonical = self::buildCanonicalPayload($report, $bimesters, $actor, $emissionId, $ledgerOrdinal, $nowUtc);
        $contentHash = self::hashPayload($canonical);
        $signature = self::sign($contentHash, $secretKey);
        $verificationCode = self::verificationCode($contentHash);

        $conditionLabel = $canonical['condition'];
        $conditionFull = match($conditionLabel) {
            'CONSOLIDADO DEFINITIVO' => 'CONSOLIDADO DEFINITIVO (TODOS LOS BIMESTRES CERRADOS)',
            'CONSOLIDADO PARCIAL' => 'CONSOLIDADO PARCIAL (BIMESTRES CON BLOQUEO ACTIVO)',
            default => 'VISTA PROVISIONAL EN PROCESO'
        };

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

        $verifyUrl = "/reports/verify?code=" . urlencode($verificationCode);

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
  .seal-box { background: #f0fdf4; border: 1.5px solid #16a34a; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 8pt; color: #14532d; }
  .seal-box code { font-family: Consolas, monospace; font-size: 7.5pt; word-break: break-all; color: #0f172a; }
  .code-highlight { font-size: 11pt; font-weight: bold; color: #15803d; letter-spacing: 1px; }
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

<div class="no-print" style="margin-bottom:15px;padding:10px 15px;background:#e0f2fe;border:1px solid #7dd3fc;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
  <span><strong>Documento Institucional Oficial EVAL</strong> · Firma Criptográfica Verificable por Servidor</span>
  <div>
    <a href="{$verifyUrl}" target="_blank" style="margin-right:10px;color:#0369a1;font-weight:bold;text-decoration:underline;">Verificar Autenticidad</a>
    <button onclick="window.print()" style="background:#0f172a;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;font-weight:bold;">Imprimir / Guardar en PDF</button>
  </div>
</div>

<div class="header">
  <h1>I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO</h1>
  <h2>CONSOLIDADO INSTITUCIONAL DE EVALUACIONES Y SEGUIMIENTO DE AULA</h2>
  <p>Plataforma Educativa EVAL v2.1 · Registro Académico Seguro y Descentralizado</p>
</div>

<div class="meta-grid">
  <div><strong>Período Lectivo:</strong> {$esc($scope['period_name'])}</div>
  <div><strong>Grado y Sección:</strong> {$esc($scope['grade_name'])} {$esc($scope['section_name'])}</div>
  <div><strong>Condición de Calificaciones:</strong> <strong>{$esc($conditionFull)}</strong></div>
  <div><strong>Total Estudiantes Evaluados:</strong> {$esc((string)count($items))}</div>
  <div><strong>Fecha de Emisión Oficial:</strong> {$esc($nowLima)} (Hora de Perú)</div>
  <div><strong>Generado por Actor ID:</strong> {$esc($actor->identityId)} ({$esc($actorRoles)})</div>
</div>

{$bimestersHtml}

<div class="seal-box">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
    <strong>🛡️ SELLO DE INTEGRIDAD CRIPTOGRÁFICA Y FIRMA INSTITUCIONAL:</strong>
    <span class="code-highlight">{$esc($verificationCode)}</span>
  </div>
  <div><strong>ID de Emisión Única:</strong> <code>{$esc($emissionId)}</code> &middot; <strong>Ordinal Ledger:</strong> {$ledgerOrdinal} &middot; <strong>Algoritmo:</strong> HMAC-SHA-256 (EVAL Core v2.1)</div>
  <div><strong>Hash SHA-256 (Nómina Completa y Calificaciones):</strong> <code>{$esc($contentHash)}</code></div>
  <div><strong>Firma Digital del Servidor:</strong> <code>{$esc($signature)}</code></div>
  <div style="font-size:7pt;color:#166534;margin-top:4px;">
    Certificado inmutable: Esta acta ampara la integridad de las calificaciones y la nómina completa registrada en la bitácora del servidor EVAL. Verifique en <a href="{$verifyUrl}" style="color:#166534;font-weight:bold;">{$verifyUrl}</a>.
  </div>
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
        $filename = "acta-eval-{$cleanPeriod}-{$cleanGrade}{$cleanSec}-{$verificationCode}.html";

        return [
            'html' => $html,
            'sha256' => $contentHash,
            'signature' => $signature,
            'verification_code' => $verificationCode,
            'emission_id' => $emissionId,
            'filename' => $filename,
        ];
    }
}
