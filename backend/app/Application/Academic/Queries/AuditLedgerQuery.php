<?php
declare(strict_types=1);
namespace App\Application\Academic\Queries;

use Illuminate\Database\Connection;
use App\Infrastructure\Authentication\AuthenticatedActor;
use App\Application\Academic\Commands\FoundationCommandChecks;
use App\Application\Academic\AcademicCommandFailure;
use App\Infrastructure\Persistence\Academic\AcademicLockSet;

final class AuditLedgerQuery
{
    public function __construct(private Connection $db) {}

    public function page(AuthenticatedActor $actor, ?string $after = null, ?string $entityType = null, ?string $search = null): array
    {
        FoundationCommandChecks::credentials($this->db, $actor);
        if ($this->db->table('retained_identities')->where('id', $actor->identityId)->value('credential_status') !== 'active') {
            throw new AcademicCommandFailure('forbidden');
        }

        $roles = $this->db->table('local_role_grants')->where('identity_id', $actor->identityId)->pluck('role')->all();
        if (!array_intersect($roles, ['director_admin', 'vice_principal'])) {
            throw new AcademicCommandFailure('forbidden');
        }

        if ($entityType !== null && !in_array($entityType, ['period', 'entry', 'grade', 'section', 'enrollment', 'assignment'], true)) {
            throw new AcademicCommandFailure('invalid_input');
        }

        if ($search !== null && (!is_string($search) || mb_strlen($search) > 100)) {
            throw new AcademicCommandFailure('invalid_input');
        }

        $q = $this->db->table('academic_lifecycle_events as l')
            ->leftJoin('retained_identity_profiles as p', 'p.identity_id', '=', 'l.actor_id')
            ->select([
                'l.id',
                'l.entity_type',
                'l.event_type',
                'l.period_id',
                'l.entry_id',
                'l.grade_id',
                'l.section_id',
                'l.enrollment_id',
                'l.assignment_id',
                'l.actor_id',
                'p.display_name as actor_name',
                'l.previous_state',
                'l.new_state',
                'l.effective_on',
                'l.operation_key',
                'l.correlation_id',
                'l.recorded_at'
            ]);

        if ($entityType !== null) {
            $q->where('l.entity_type', $entityType);
        }

        if ($search !== null && trim($search) !== '') {
            $term = mb_strtolower(trim($search));
            $q->where(function ($sub) use ($term) {
                $sub->whereRaw("LOCATE(?, LOWER(COALESCE(p.display_name, ''))) > 0", [$term])
                    ->orWhereRaw("LOCATE(?, LOWER(COALESCE(l.operation_key, ''))) > 0", [$term])
                    ->orWhereRaw("LOCATE(?, LOWER(COALESCE(l.correlation_id, ''))) > 0", [$term])
                    ->orWhereRaw("LOCATE(?, LOWER(COALESCE(l.event_type, ''))) > 0", [$term])
                    ->orWhereRaw("LOCATE(?, LOWER(COALESCE(l.entity_type, ''))) > 0", [$term]);
                if (ctype_digit($term)) {
                    $sub->orWhere('l.actor_id', (int)$term)
                        ->orWhere('l.period_id', (int)$term)
                        ->orWhere('l.entry_id', (int)$term)
                        ->orWhere('l.grade_id', (int)$term)
                        ->orWhere('l.section_id', (int)$term)
                        ->orWhere('l.enrollment_id', (int)$term)
                        ->orWhere('l.assignment_id', (int)$term);
                }
            });
        }

        if ($after !== null) {
            $q->where('l.id', '>', AcademicLockSet::id($after));
        }

        $rows = $q->orderBy('l.id')->limit(51)->get();
        $items = [];

        foreach ($rows->take(50) as $row) {
            $targetId = (string)($row->period_id ?? $row->entry_id ?? $row->grade_id ?? $row->section_id ?? $row->enrollment_id ?? $row->assignment_id);
            $actorName = is_string($row->actor_name) && trim($row->actor_name) !== ''
                ? $row->actor_name
                : 'Usuario #' . $row->actor_id;

            $items[] = [
                'id' => (string)$row->id,
                'entity_type' => (string)$row->entity_type,
                'event_type' => (string)$row->event_type,
                'target_id' => $targetId,
                'actor_id' => (string)$row->actor_id,
                'actor_name' => $actorName,
                'previous_state' => $row->previous_state !== null ? (string)$row->previous_state : null,
                'new_state' => $row->new_state !== null ? (string)$row->new_state : null,
                'effective_on' => (string)$row->effective_on,
                'operation_key' => (string)$row->operation_key,
                'correlation_id' => (string)$row->correlation_id,
                'recorded_at' => (string)$row->recorded_at,
            ];
        }

        return [
            'items' => $items,
            'next_after' => $rows->count() > 50 ? end($items)['id'] : null,
        ];
    }
}
