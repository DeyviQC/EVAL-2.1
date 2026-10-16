<?php
declare(strict_types=1);

namespace Tests\Unit\Academic;

use App\Application\Academic\Queries\ClassroomOfficialExport;
use App\Infrastructure\Authentication\AuthenticatedActor;
use PHPUnit\Framework\TestCase;

final class DocumentIntegrityTest extends TestCase
{
    private array $sampleReport;
    private array $sampleBimesters;
    private AuthenticatedActor $actor;

    protected function setUp(): void
    {
        $this->sampleReport = [
            'scope' => [
                'period_id' => '1',
                'period_name' => 'EVAL desarrollo 2026',
                'period_state' => 'active',
                'grade_id' => '2',
                'grade_name' => '2.º',
                'section_id' => '3',
                'section_name' => 'B',
            ],
            'totals' => [
                'received' => 3,
                'pending' => 1,
                'graded' => 2,
                'AD' => 1,
                'A' => 1,
                'B' => 0,
                'C' => 0,
            ],
            'items' => [
                [
                    'id' => '101',
                    'name' => 'Alvarez Quispe, Maria',
                    'historical' => false,
                    'received' => 2,
                    'graded' => 1,
                    'pending' => 1,
                ],
                [
                    'id' => '102',
                    'name' => 'Bendezú Rojas, Carlos',
                    'historical' => false,
                    'received' => 1,
                    'graded' => 1,
                    'pending' => 0,
                ],
            ],
            'next_after' => null,
        ];

        $this->sampleBimesters = [
            'period_id' => '1',
            'period_state' => 'active',
            'bimesters' => [
                ['bimester_number' => 1, 'state' => 'locked', 'closed_by_name' => 'Subdirección', 'reopened_by_name' => null],
                ['bimester_number' => 2, 'state' => 'open', 'closed_by_name' => null, 'reopened_by_name' => null],
                ['bimester_number' => 3, 'state' => 'open', 'closed_by_name' => null, 'reopened_by_name' => null],
                ['bimester_number' => 4, 'state' => 'open', 'closed_by_name' => null, 'reopened_by_name' => null],
            ],
        ];

        $this->actor = new AuthenticatedActor('10', ['vice_principal']);
    }

    public function testCanonicalPayloadIncludesCompleteStudentRosterAndTotals(): void
    {
        $emissionId = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
        $payload = ClassroomOfficialExport::buildCanonicalPayload(
            $this->sampleReport,
            $this->sampleBimesters,
            $this->actor,
            $emissionId,
            7290,
            '2026-10-16T18:00:00Z'
        );

        $this->assertSame('I.E. NUESTRA SEÑORA DE LAS MERCEDES', $payload['institution']);
        $this->assertSame('2.1', $payload['version']);
        $this->assertSame($emissionId, $payload['emission_id']);
        $this->assertSame(7290, $payload['ledger_ordinal']);
        $this->assertSame(2, count($payload['students']));
        $this->assertSame('Alvarez Quispe, Maria', $payload['students'][0]['name']);
        $this->assertSame('101', $payload['students'][0]['id']);
        $this->assertSame(2, $payload['totals']['graded']);
    }

    public function testTamperingWithStudentNameChangesContentHash(): void
    {
        $emissionId = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
        $originalPayload = ClassroomOfficialExport::buildCanonicalPayload(
            $this->sampleReport,
            $this->sampleBimesters,
            $this->actor,
            $emissionId,
            7290,
            '2026-10-16T18:00:00Z'
        );
        $originalHash = ClassroomOfficialExport::hashPayload($originalPayload);

        $tamperedReport = $this->sampleReport;
        $tamperedReport['items'][0]['name'] = 'Alvarez Quispe, Maria (Tampered)';
        $tamperedPayload = ClassroomOfficialExport::buildCanonicalPayload(
            $tamperedReport,
            $this->sampleBimesters,
            $this->actor,
            $emissionId,
            7290,
            '2026-10-16T18:00:00Z'
        );
        $tamperedHash = ClassroomOfficialExport::hashPayload($tamperedPayload);

        $this->assertNotSame($originalHash, $tamperedHash);
    }

    public function testTamperingWithGradeTotalsChangesContentHash(): void
    {
        $emissionId = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
        $originalPayload = ClassroomOfficialExport::buildCanonicalPayload(
            $this->sampleReport,
            $this->sampleBimesters,
            $this->actor,
            $emissionId,
            7290,
            '2026-10-16T18:00:00Z'
        );
        $originalHash = ClassroomOfficialExport::hashPayload($originalPayload);

        $tamperedReport = $this->sampleReport;
        $tamperedReport['totals']['AD'] = 2; // Forged achievement
        $tamperedPayload = ClassroomOfficialExport::buildCanonicalPayload(
            $tamperedReport,
            $this->sampleBimesters,
            $this->actor,
            $emissionId,
            7290,
            '2026-10-16T18:00:00Z'
        );
        $tamperedHash = ClassroomOfficialExport::hashPayload($tamperedPayload);

        $this->assertNotSame($originalHash, $tamperedHash);
    }

    public function testSignatureVerificationValidatesWithServerSecretAndRejectsForgedSignatures(): void
    {
        $secretKey = 'test_secret_key_institucional_mercedes';
        $export = ClassroomOfficialExport::generate(
            $this->sampleReport,
            $this->sampleBimesters,
            $this->actor,
            7290,
            $secretKey
        );

        $this->assertTrue(ClassroomOfficialExport::verify($export['sha256'], $export['signature'], $secretKey));

        // Forged signature
        $forgedSig = hash('sha256', 'forged_signature_attempt');
        $this->assertFalse(ClassroomOfficialExport::verify($export['sha256'], $forgedSig, $secretKey));

        // Wrong secret key
        $this->assertFalse(ClassroomOfficialExport::verify($export['sha256'], $export['signature'], 'wrong_server_key'));
    }

    public function testVerificationCodeMatchesFormat(): void
    {
        $export = ClassroomOfficialExport::generate(
            $this->sampleReport,
            $this->sampleBimesters,
            $this->actor,
            7290,
            'test_key'
        );

        $this->assertMatchesRegularExpression('/^EVAL-2026-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/', $export['verification_code']);
        $this->assertStringContainsString($export['verification_code'], $export['html']);
        $this->assertStringContainsString($export['sha256'], $export['html']);
        $this->assertStringContainsString($export['signature'], $export['html']);
        $this->assertStringContainsString('Ordinal Ledger:</strong> 7290', $export['html']);
    }
}
