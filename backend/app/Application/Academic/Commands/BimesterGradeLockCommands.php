<?php

declare(strict_types=1);

namespace App\Application\Academic\Commands;

use App\Application\Academic\AcademicCommandFailure;
use App\Infrastructure\Authentication\AuthenticatedActor;
use App\Infrastructure\Persistence\Academic\AcademicLockSet;
use App\Infrastructure\Persistence\Academic\AcademicMutationResult;
use App\Infrastructure\Persistence\Academic\AcademicWriteTransaction;
use App\Infrastructure\Persistence\Academic\LifecycleEvent;
use Illuminate\Database\Connection;

final class BimesterGradeLockCommands
{
    public function __construct(private Connection $db) {}

    private function authorize(AuthenticatedActor $actor): void
    {
        FoundationCommandChecks::credentials($this->db, $actor);
        if ($this->db->table('retained_identities')->where('id', $actor->identityId)->value('credential_status') !== 'active') {
            throw new AcademicCommandFailure('forbidden');
        }

        $roles = $this->db->table('local_role_grants')->where('identity_id', $actor->identityId)->pluck('role')->all();
        if (!array_intersect($roles, ['vice_principal'])) {
            throw new AcademicCommandFailure('forbidden');
        }
    }

    public function close(AuthenticatedActor $actor, int|string $periodId, int $bimesterNumber): array
    {
        $this->authorize($actor);
        $periodId = AcademicLockSet::id((string)$periodId);

        if ($bimesterNumber < 1 || $bimesterNumber > 4) {
            throw new AcademicCommandFailure('invalid_input');
        }

        return (new AcademicWriteTransaction($this->db))->execute(
            $actor->identityId,
            fn() => new AcademicLockSet(['academic_periods' => [$periodId]]),
            function ($context) use ($periodId, $bimesterNumber) {
                $period = $context->row('academic_periods', $periodId);
                if ($period['state'] !== 'active') {
                    throw new AcademicCommandFailure('period_not_active');
                }

                $existing = $this->db->table('bimester_grade_closures')
                    ->where('period_id', $periodId)
                    ->where('bimester_number', $bimesterNumber)
                    ->first();

                if ($existing && $existing->state === 'locked') {
                    throw new AcademicCommandFailure('bimester_already_locked');
                }

                return true;
            },
            function ($context, $boundary) use ($actor, $periodId, $bimesterNumber) {
                $key = $boundary->toServerKey();
                $stamp = $boundary->timestamp->format('Y-m-d H:i:s.u');

                $existing = $this->db->table('bimester_grade_closures')
                    ->where('period_id', $periodId)
                    ->where('bimester_number', $bimesterNumber)
                    ->first();

                if ($existing) {
                    $this->db->table('bimester_grade_closures')
                        ->where('id', $existing->id)
                        ->update([
                            'state' => 'locked',
                            'closed_by' => $actor->identityId,
                            'closed_at' => $stamp,
                            'reopened_by' => null,
                            'reopened_at' => null,
                            'justification' => null,
                            'operation_key' => $key,
                            'recorded_at' => $stamp,
                            'updated_at' => $stamp,
                        ]);
                    $recordId = (string)$existing->id;
                } else {
                    $recordId = (string)$this->db->table('bimester_grade_closures')->insertGetId([
                        'period_id' => $periodId,
                        'bimester_number' => $bimesterNumber,
                        'state' => 'locked',
                        'closed_by' => $actor->identityId,
                        'closed_at' => $stamp,
                        'reopened_by' => null,
                        'reopened_at' => null,
                        'justification' => null,
                        'operation_key' => $key,
                        'recorded_at' => $stamp,
                        'created_at' => $stamp,
                        'updated_at' => $stamp,
                    ]);
                }

                $event = new LifecycleEvent(
                    'period',
                    $periodId,
                    'bimester_closed',
                    'open',
                    'locked',
                    [
                        'bimester' => $bimesterNumber,
                        'closed_by' => $actor->identityId,
                    ]
                );

                return new AcademicMutationResult(
                    [
                        'id' => $recordId,
                        'period_id' => $periodId,
                        'bimester_number' => $bimesterNumber,
                        'state' => 'locked',
                        'closed_at' => $stamp,
                    ],
                    [$event]
                );
            }
        );
    }

    public function reopen(AuthenticatedActor $actor, int|string $periodId, int $bimesterNumber, string $justification): array
    {
        $this->authorize($actor);
        $periodId = AcademicLockSet::id((string)$periodId);

        if ($bimesterNumber < 1 || $bimesterNumber > 4) {
            throw new AcademicCommandFailure('invalid_input');
        }

        $trimmedJustification = trim($justification);
        if (mb_strlen($trimmedJustification) < 10 || mb_strlen($trimmedJustification) > 500) {
            throw new AcademicCommandFailure('invalid_justification');
        }

        return (new AcademicWriteTransaction($this->db))->execute(
            $actor->identityId,
            fn() => new AcademicLockSet(['academic_periods' => [$periodId]]),
            function ($context) use ($periodId, $bimesterNumber) {
                $period = $context->row('academic_periods', $periodId);
                if ($period['state'] !== 'active') {
                    throw new AcademicCommandFailure('period_not_active');
                }

                $existing = $this->db->table('bimester_grade_closures')
                    ->where('period_id', $periodId)
                    ->where('bimester_number', $bimesterNumber)
                    ->first();

                if (!$existing || $existing->state !== 'locked') {
                    throw new AcademicCommandFailure('bimester_not_locked');
                }

                return true;
            },
            function ($context, $boundary) use ($actor, $periodId, $bimesterNumber, $trimmedJustification) {
                $key = $boundary->toServerKey();
                $stamp = $boundary->timestamp->format('Y-m-d H:i:s.u');

                $existing = $this->db->table('bimester_grade_closures')
                    ->where('period_id', $periodId)
                    ->where('bimester_number', $bimesterNumber)
                    ->first();

                $this->db->table('bimester_grade_closures')
                    ->where('id', $existing->id)
                    ->update([
                        'state' => 'open',
                        'reopened_by' => $actor->identityId,
                        'reopened_at' => $stamp,
                        'justification' => $trimmedJustification,
                        'operation_key' => $key,
                        'recorded_at' => $stamp,
                        'updated_at' => $stamp,
                    ]);

                $event = new LifecycleEvent(
                    'period',
                    $periodId,
                    'bimester_reopened',
                    'locked',
                    'open',
                    [
                        'bimester' => $bimesterNumber,
                        'reopened_by' => $actor->identityId,
                        'justification' => $trimmedJustification,
                    ]
                );

                return new AcademicMutationResult(
                    [
                        'id' => (string)$existing->id,
                        'period_id' => $periodId,
                        'bimester_number' => $bimesterNumber,
                        'state' => 'open',
                        'reopened_at' => $stamp,
                        'justification' => $trimmedJustification,
                    ],
                    [$event]
                );
            }
        );
    }
}
