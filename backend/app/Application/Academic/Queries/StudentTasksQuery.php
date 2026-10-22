<?php
declare(strict_types=1);

namespace App\Application\Academic\Queries;

use App\Application\Academic\AcademicCommandFailure;
use App\Infrastructure\Authentication\AuthenticatedActor;
use Illuminate\Database\Connection;

final class StudentTasksQuery
{
    private array $subjectColors = [
        'Matemática' => '#3B82F6',
        'Comunicación' => '#8B5CF6',
        'Ciencia y Tecnología' => '#10B981',
        'Ciencias Sociales' => '#F59E0B',
        'Arte' => '#EC4899',
        'Educación Física' => '#EF4444',
        'Inglés' => '#6366F1',
        'Religión' => '#14B8A6',
        'Tutoría' => '#64748B',
    ];

    public function __construct(private Connection $db, private AcademicIdentityLabels $labels) {}

    public function get(AuthenticatedActor $actor): array
    {
        if (!$this->db->table('local_role_grants')->where('identity_id', $actor->identityId)->where('role', 'student')->exists()) {
            throw new AcademicCommandFailure('forbidden');
        }

        $enrollment = $this->activeEnrollment($actor);
        if ($enrollment === null) {
            return ['items' => [], 'overview' => ['pending' => 0, 'delivered' => 0, 'graded' => 0, 'overdue' => 0]];
        }

        $rows = $this->tasks($actor, $enrollment);
        $items = array_map(fn (array $row) => $this->project($actor, $row), $rows);
        $counts = $this->counts($items);

        return ['items' => $items, 'overview' => $counts];
    }

    private function activeEnrollment(AuthenticatedActor $actor): ?object
    {
        return $this->db->table('student_enrollments as e')
            ->join('academic_periods as p', 'p.id', '=', 'e.academic_period_id')
            ->where('e.student_id', $actor->identityId)
            ->where('e.state', 'active')
            ->where('p.state', 'active')
            ->first(['e.academic_period_id', 'e.grade_id', 'e.section_id']);
    }

    private function tasks(AuthenticatedActor $actor, object $enrollment): array
    {
        return $this->db->table('activity_references as r')
            ->join('activity_contents as c', 'c.activity_id', '=', 'r.id')
            ->join('teaching_assignments as a', 'a.id', '=', 'r.teaching_assignment_id')
            ->join('instructional_entries as i', 'i.id', '=', 'a.instructional_entry_id')
            ->join('academic_periods as p', 'p.id', '=', 'a.academic_period_id')
            ->leftJoin('activity_deliveries as d', function ($join) use ($actor) {
                $join->on('d.activity_id', '=', 'r.id')->where('d.student_id', '=', $actor->identityId);
            })
            ->leftJoin('delivery_versions as v', function ($join) {
                $join->on('v.submission_id', '=', 'd.submission_id')->whereColumn('v.id', '=', 'd.current_version_id');
            })
            ->leftJoin('delivery_assessments as g', function ($join) {
                $join->on('g.submission_id', '=', 'd.submission_id')->whereColumn('g.id', '=', 'd.current_assessment_id');
            })
            ->where('a.academic_period_id', $enrollment->academic_period_id)
            ->where('a.grade_id', $enrollment->grade_id)
            ->where('a.section_id', $enrollment->section_id)
            ->where('a.state', 'active')
            ->where('p.state', 'active')
            ->where('c.state', 'open')
            ->where(function ($q) use ($actor) {
                $q->whereExists(function ($en) use ($actor) {
                    $en->selectRaw('1')->from('student_enrollments as en')
                        ->where('en.student_id', $actor->identityId)
                        ->whereColumn('en.academic_period_id', 'a.academic_period_id')
                        ->whereColumn('en.grade_id', 'a.grade_id')
                        ->whereColumn('en.section_id', 'a.section_id')
                        ->where('en.state', 'active');
                })->orWhereExists(function ($hist) use ($actor) {
                    $hist->selectRaw('1')->from('student_enrollments as en')
                        ->where('en.student_id', $actor->identityId)
                        ->whereColumn('en.academic_period_id', 'a.academic_period_id')
                        ->whereColumn('en.grade_id', 'a.grade_id')
                        ->whereColumn('en.section_id', 'a.section_id')
                        ->where(function ($h) {
                            $h->whereNotNull('en.operational_start_key')
                                ->where(function ($range) {
                                    $range->whereNull('en.operational_end_key')
                                        ->orWhereColumn('c.publication_key', '<', 'en.operational_end_key');
                                })
                                ->whereColumn('c.publication_key', '>=', 'en.operational_start_key');
                        });
                });
            })
            ->orderByRaw('c.due_on IS NULL, c.due_on ASC')
            ->orderBy('r.id')
            ->get([
                'r.id as activity_id',
                'r.teaching_assignment_id',
                'c.title',
                'c.instructions',
                'c.due_on',
                'c.state as activity_state',
                'a.teacher_id',
                'i.name as subject',
                'd.submission_id',
                'd.current_version_id',
                'd.current_assessment_id',
                'v.recorded_at as delivered_at',
                'v.filename as delivered_filename',
                'g.grade as assessment_grade',
                'g.feedback as assessment_feedback',
                'g.recorded_at as assessment_graded_at',
            ])
            ->map(fn ($r) => (array) $r)
            ->all();
    }

    private function project(AuthenticatedActor $actor, array $row): array
    {
        $today = $this->today();
        $dueOn = $row['due_on'];
        $category = $this->dueCategory($dueOn, $today);
        $hasDelivery = $row['current_version_id'] !== null;
        $isGraded = $hasDelivery && $row['current_assessment_id'] !== null;

        return [
            'id' => (string) $row['activity_id'],
            'assignment_id' => (string) $row['teaching_assignment_id'],
            'title' => $row['title'],
            'due_on' => $dueOn,
            'category' => $category,
            'course' => [
                'id' => (string) $row['teaching_assignment_id'],
                'subject' => $row['subject'],
                'teacher' => $this->labels->displayName((string) $row['teacher_id']) ?? 'Docente',
                'color' => $this->subjectColors[$row['subject']] ?? '#3B82F6',
            ],
            'state' => $row['activity_state'],
            'delivery' => [
                'has_delivery' => $hasDelivery,
                'is_graded' => $isGraded,
                'delivered_at' => $hasDelivery ? $row['delivered_at'] : null,
                'filename' => $hasDelivery ? $row['delivered_filename'] : null,
                'grade' => $isGraded ? $row['assessment_grade'] : null,
                'feedback' => $isGraded ? $row['assessment_feedback'] : null,
                'graded_at' => $isGraded ? $row['assessment_graded_at'] : null,
            ],
            'can_submit' => $row['activity_state'] === 'open' && !$isGraded,
        ];
    }

    private function dueCategory(?string $due, string $today): string
    {
        if ($due === null) {
            return 'later';
        }
        if ($due < $today) {
            return 'overdue';
        }
        if ($due === $today) {
            return 'today';
        }
        $tomorrow = (new \DateTimeImmutable($today, new \DateTimeZone('America/Lima')))->modify('+1 day')->format('Y-m-d');
        if ($due === $tomorrow) {
            return 'tomorrow';
        }
        $weekEnd = (new \DateTimeImmutable($today, new \DateTimeZone('America/Lima')))->modify('+' . ((7 - (int) (new \DateTimeImmutable($today, new \DateTimeZone('America/Lima')))->format('w')) % 7) . ' days')->format('Y-m-d');
        if ($due <= $weekEnd) {
            return 'this_week';
        }
        return 'later';
    }

    private function today(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('America/Lima')))->format('Y-m-d');
    }

    private function counts(array $items): array
    {
        $pending = 0;
        $delivered = 0;
        $graded = 0;
        $overdue = 0;
        foreach ($items as $item) {
            if ($item['delivery']['is_graded']) {
                $graded++;
                $delivered++;
            } elseif ($item['delivery']['has_delivery']) {
                $delivered++;
            } else {
                $pending++;
            }
            if ($item['category'] === 'overdue') {
                $overdue++;
            }
        }
        return ['pending' => $pending, 'delivered' => $delivered, 'graded' => $graded, 'overdue' => $overdue];
    }
}
