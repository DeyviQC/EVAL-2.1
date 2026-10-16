<?php

declare(strict_types=1);

namespace App\Application\Academic\Queries;

use App\Application\Academic\AcademicCommandFailure;
use App\Application\Academic\Commands\FoundationCommandChecks;
use App\Infrastructure\Authentication\AuthenticatedActor;
use App\Infrastructure\Persistence\Academic\AcademicLockSet;
use Illuminate\Database\Connection;

final class BimesterClosuresQuery
{
    public function __construct(private Connection $db) {}

    public function getForPeriod(AuthenticatedActor $actor, int|string $periodId): array
    {
        FoundationCommandChecks::credentials($this->db, $actor);
        if ($this->db->table('retained_identities')->where('id', $actor->identityId)->value('credential_status') !== 'active') {
            throw new AcademicCommandFailure('forbidden');
        }

        $roles = $this->db->table('local_role_grants')->where('identity_id', $actor->identityId)->pluck('role')->all();
        if (!array_intersect($roles, ['director_admin', 'vice_principal', 'teacher'])) {
            throw new AcademicCommandFailure('forbidden');
        }

        $periodId = AcademicLockSet::id((string)$periodId);
        $period = $this->db->table('academic_periods')->where('id', $periodId)->first(['id', 'name', 'state']);
        if (!$period) {
            throw new AcademicCommandFailure('not_found');
        }

        $rows = $this->db->table('bimester_grade_closures as b')
            ->leftJoin('retained_identity_profiles as cp', 'cp.identity_id', '=', 'b.closed_by')
            ->leftJoin('retained_identity_profiles as rp', 'rp.identity_id', '=', 'b.reopened_by')
            ->where('b.period_id', $periodId)
            ->get([
                'b.bimester_number',
                'b.state',
                'b.closed_by',
                'cp.display_name as closed_by_name',
                'b.closed_at',
                'b.reopened_by',
                'rp.display_name as reopened_by_name',
                'b.reopened_at',
                'b.justification',
            ])
            ->keyBy('bimester_number');

        $bimesters = [];
        for ($i = 1; $i <= 4; $i++) {
            $row = $rows->get($i);
            $bimesters[] = [
                'bimester_number' => $i,
                'state' => $row ? (string)$row->state : 'open',
                'closed_by' => $row && $row->closed_by ? (string)$row->closed_by : null,
                'closed_by_name' => $row && $row->closed_by_name ? (string)$row->closed_by_name : null,
                'closed_at' => $row && $row->closed_at ? (string)$row->closed_at : null,
                'reopened_by' => $row && $row->reopened_by ? (string)$row->reopened_by : null,
                'reopened_by_name' => $row && $row->reopened_by_name ? (string)$row->reopened_by_name : null,
                'reopened_at' => $row && $row->reopened_at ? (string)$row->reopened_at : null,
                'justification' => $row && $row->justification ? (string)$row->justification : null,
            ];
        }

        return [
            'period_id' => (string)$periodId,
            'period_state' => (string)$period->state,
            'bimesters' => $bimesters,
        ];
    }
}
