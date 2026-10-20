<?php
declare(strict_types=1);
namespace App\Application\Academic\Queries;

use Illuminate\Database\Connection;
use App\Infrastructure\Authentication\AuthenticatedActor;
use App\Application\Academic\AcademicCommandFailure;
use App\Application\Academic\Commands\FoundationCommandChecks;

final class StudentDashboardQuery
{
    public function __construct(private Connection $db, private AcademicIdentityLabels $labels) {}

    public function get(AuthenticatedActor $actor): array
    {
        FoundationCommandChecks::credentials($this->db, $actor);
        if ($this->db->table('retained_identities')->where('id', $actor->identityId)->value('credential_status') !== 'active') {
            throw new AcademicCommandFailure('forbidden');
        }
        if (!$this->db->table('local_role_grants')->where('identity_id', $actor->identityId)->where('role', 'student')->exists()) {
            throw new AcademicCommandFailure('forbidden');
        }

        $enrollment = $this->activeEnrollment($actor);
        if ($enrollment === null) {
            return $this->emptyDashboard();
        }

        $assignments = $this->authorizedAssignments($actor, $enrollment);
        $assignmentIds = $assignments->pluck('id')->all();

        $overview = $this->overview($actor, $enrollment, $assignmentIds);
        $average = $this->average($actor);
        $undelivered = $this->undeliveredActivities($actor, $assignmentIds);
        $resume = $this->resume($actor, $undelivered);
        $upcoming = $this->upcoming($undelivered, $resume);
        $courses = $this->courses($actor, $assignments);
        $notices = $this->notices($actor);
        $agenda = $this->agenda($enrollment);

        return [
            'overview' => $overview,
            'average' => $average,
            'resume' => $resume,
            'upcoming' => $upcoming,
            'courses' => $courses,
            'notices' => $notices,
            'agenda' => $agenda,
        ];
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

    private function authorizedAssignments(AuthenticatedActor $actor, object $enrollment)
    {
        return $this->db->table('teaching_assignments as a')
            ->join('academic_periods as p', 'p.id', '=', 'a.academic_period_id')
            ->join('instructional_entries as i', 'i.id', '=', 'a.instructional_entry_id')
            ->join('grades as g', 'g.id', '=', 'a.grade_id')
            ->join('sections as s', 's.id', '=', 'a.section_id')
            ->where('a.state', 'active')
            ->where('p.state', 'active')
            ->where('g.is_active', true)
            ->where('g.name', 'not like', '%verificac%')
            ->where('g.name', 'not like', '%verification%')
            ->where('g.name', 'not like', '%prueba%')
            ->where('g.name', 'not like', '%test%')
            ->where('a.academic_period_id', $enrollment->academic_period_id)
            ->where('a.grade_id', $enrollment->grade_id)
            ->where('a.section_id', $enrollment->section_id)
            ->get(['a.id', 'a.teacher_id', 'i.name as subject', 'i.kind', 'g.name as grade', 's.name as section']);
    }

    private function overview(AuthenticatedActor $actor, object $enrollment, array $assignmentIds): array
    {
        $courses = count($assignmentIds);
        $deliveriesQuery = $this->db->table('activity_deliveries')->where('student_id', $actor->identityId);
        $allDeliveries = (clone $deliveriesQuery)->count();
        $graded = (clone $deliveriesQuery)->whereNotNull('current_assessment_id')->count();

        $deliveredActivityIds = (clone $deliveriesQuery)->pluck('activity_id')->all();
        $pending = $this->db->table('activity_references as r')
            ->join('activity_contents as c', 'c.activity_id', '=', 'r.id')
            ->whereIn('r.teaching_assignment_id', $assignmentIds)
            ->where('c.state', 'open')
            ->whereNotIn('r.id', $deliveredActivityIds)
            ->count();

        $unread = $this->db->table('academic_notifications')
            ->where('recipient_id', $actor->identityId)
            ->whereNull('read_at')
            ->count();

        return [
            'courses' => $courses,
            'pending' => $pending,
            'deliveries' => $allDeliveries,
            'graded' => $graded,
            'unread' => $unread,
        ];
    }

    private function average(AuthenticatedActor $actor): array
    {
        $grades = $this->db->table('activity_deliveries as d')
            ->join('delivery_assessments as g', function ($join) {
                $join->on('g.submission_id', '=', 'd.submission_id')
                    ->on('g.id', '=', 'd.current_assessment_id');
            })
            ->where('d.student_id', $actor->identityId)
            ->pluck('g.grade')
            ->all();

        if (count($grades) < 3) {
            return ['grade' => null, 'label' => 'En progreso'];
        }

        $map = ['AD' => 4, 'A' => 3, 'B' => 2, 'C' => 1];
        $sum = 0;
        foreach ($grades as $grade) {
            $sum += $map[$grade] ?? 0;
        }
        $average = $sum / count($grades);
        $rounded = (int) round($average);
        $letter = match ($rounded) {
            4 => 'AD',
            3 => 'A',
            2 => 'B',
            1 => 'C',
            default => 'C',
        };
        $label = match ($letter) {
            'AD' => 'Destacado',
            'A' => 'Logrado',
            'B' => 'En proceso',
            'C' => 'En inicio',
        };

        return ['grade' => $letter, 'label' => $label];
    }

    private function undeliveredActivities(AuthenticatedActor $actor, array $assignmentIds): array
    {
        if ($assignmentIds === []) {
            return [];
        }

        $delivered = $this->db->table('activity_deliveries')
            ->where('student_id', $actor->identityId)
            ->pluck('activity_id')
            ->all();

        $rows = $this->db->table('activity_references as r')
            ->join('activity_contents as c', 'c.activity_id', '=', 'r.id')
            ->join('teaching_assignments as a', 'a.id', '=', 'r.teaching_assignment_id')
            ->join('instructional_entries as i', 'i.id', '=', 'a.instructional_entry_id')
            ->join('grades as g', 'g.id', '=', 'a.grade_id')
            ->join('sections as s', 's.id', '=', 'a.section_id')
            ->whereIn('r.teaching_assignment_id', $assignmentIds)
            ->where('c.state', 'open')
            ->whereNotIn('r.id', $delivered)
            ->orderBy('c.due_on', 'asc')
            ->orderBy('r.id', 'asc')
            ->get(['r.id', 'r.teaching_assignment_id', 'c.title', 'c.due_on', 'c.published_at', 'i.name as subject', 'g.id as grade_id', 'g.name as grade', 's.id as section_id', 's.name as section'])
            ->all();

        return array_map(fn ($row) => (array) $row, $rows);
    }

    private function resume(AuthenticatedActor $actor, array $activities): ?array
    {
        if ($activities === []) {
            return null;
        }
        $activity = $activities[0];
        return [
            'kind' => 'activity',
            'id' => (string) $activity['id'],
            'assignment_id' => (string) $activity['teaching_assignment_id'],
            'course' => $activity['subject'] . ' · ' . $activity['grade'] . ' ' . $activity['section'],
            'classroom' => [
                'grade_id' => (string) $activity['grade_id'],
                'grade' => $activity['grade'],
                'section_id' => (string) $activity['section_id'],
                'section' => $activity['section'],
            ],
            'title' => $activity['title'],
            'due_on' => $activity['due_on'],
            'progress' => $this->courseProgress((string) $activity['teaching_assignment_id'], $actor->identityId),
            'cta' => 'Continuar actividad',
        ];
    }

    private function upcoming(array $activities, ?array $resume): array
    {
        $skip = $resume !== null ? (string) $resume['id'] : null;
        $items = [];
        foreach ($activities as $activity) {
            if ($skip !== null && (string) $activity['id'] === $skip) {
                continue;
            }
            if (count($items) >= 5) {
                break;
            }
            $items[] = [
                'id' => (string) $activity['id'],
                'assignment_id' => (string) $activity['teaching_assignment_id'],
                'title' => $activity['title'],
                'course' => $activity['subject'] . ' · ' . $activity['grade'] . ' ' . $activity['section'],
                'due_on' => $activity['due_on'],
                'category' => $this->dueCategory($activity['due_on']),
            ];
        }
        return $items;
    }

    private function dueCategory(?string $due): string
    {
        if ($due === null) {
            return 'later';
        }
        $today = $this->today();
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
        return 'later';
    }

    private function estimatedProgress(?string $publishedAt, ?string $dueOn): int
    {
        if ($dueOn === null || $publishedAt === null) {
            return 0;
        }
        $published = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s.u', $publishedAt) ?: \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $publishedAt);
        if ($published === false) {
            return 0;
        }
        $today = new \DateTimeImmutable('today', new \DateTimeZone('America/Lima'));
        $due = new \DateTimeImmutable($dueOn, new \DateTimeZone('America/Lima'));
        if ($today >= $due) {
            return 0;
        }
        $start = $published->setTime(0, 0);
        if ($today <= $start) {
            return 0;
        }
        $total = $due->getTimestamp() - $start->getTimestamp();
        if ($total <= 0) {
            return 0;
        }
        $elapsed = $today->getTimestamp() - $start->getTimestamp();
        return (int) round(min(100, max(0, ($elapsed / $total) * 100)));
    }

    private function courseProgress(string $assignmentId, string $studentId): int
    {
        $published = $this->db->table('activity_references as r')
            ->join('activity_contents as c', 'c.activity_id', '=', 'r.id')
            ->where('r.teaching_assignment_id', $assignmentId)
            ->count();
        $delivered = $this->db->table('activity_deliveries as d')
            ->join('activity_references as r', 'r.id', '=', 'd.activity_id')
            ->where('r.teaching_assignment_id', $assignmentId)
            ->where('d.student_id', $studentId)
            ->count();
        return $published === 0 ? 0 : (int) round(($delivered / $published) * 100);
    }

    private function courses(AuthenticatedActor $actor, $assignments): array
    {
        $items = [];
        foreach ($assignments as $row) {
            $assignmentId = (string) $row->id;
            $teacher = $this->labels->displayName((string) $row->teacher_id);
            $items[] = [
                'id' => $assignmentId,
                'subject' => $row->subject,
                'grade' => $row->grade,
                'section' => $row->section,
                'teacher' => $teacher ?? 'Docente',
                'progress' => $this->courseProgress($assignmentId, $actor->identityId),
                'subject_color' => $this->subjectColor($row->subject),
            ];
        }
        return $items;
    }

    private function subjectColor(string $subject): string
    {
        $colors = [
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
        return $colors[$subject] ?? '#3B82F6';
    }

    private function notices(AuthenticatedActor $actor): array
    {
        $rows = $this->db->table('academic_notifications as n')
            ->where('n.recipient_id', $actor->identityId)
            ->orderByDesc('n.id')
            ->limit(5)
            ->get(['n.id', 'n.event', 'n.created_at', 'n.activity_id'])
            ->all();

        $items = [];
        foreach ($rows as $row) {
            $message = match ($row->event) {
                'activity_published' => 'Hay una nueva actividad disponible.',
                'delivery_accepted' => 'Has recibido una nueva entrega.',
                'delivery_updated' => 'Una entrega recibida fue actualizada.',
                'delivery_assessed' => 'Hay una calificación disponible.',
                'assessment_corrected' => 'Una calificación fue actualizada.',
            };
            $course = null;
            if ($row->activity_id !== null) {
                $course = $this->courseForActivity((string) $row->activity_id);
            }
            $items[] = [
                'id' => (string) $row->id,
                'event' => $row->event,
                'message' => $message,
                'created_at' => $row->created_at,
                'course' => $course,
            ];
        }
        return $items;
    }

    private function courseForActivity(string $activityId): ?string
    {
        $row = $this->db->table('activity_references as r')
            ->join('teaching_assignments as a', 'a.id', '=', 'r.teaching_assignment_id')
            ->join('instructional_entries as i', 'i.id', '=', 'a.instructional_entry_id')
            ->join('grades as g', 'g.id', '=', 'a.grade_id')
            ->join('sections as s', 's.id', '=', 'a.section_id')
            ->where('r.id', $activityId)
            ->first(['i.name as subject', 'g.name as grade', 's.name as section']);
        if (!$row) {
            return null;
        }
        return $row->subject . ' · ' . $row->grade . ' ' . $row->section;
    }

    private function agenda(object $enrollment): array
    {
        $revisionId = $this->db->table('school_calendar_states')
            ->where('period_id', $enrollment->academic_period_id)
            ->value('revision_id');

        if ($revisionId === null) {
            return ['current_week' => null, 'slots' => []];
        }

        $revision = $this->db->table('school_calendar_revisions')->where('id', $revisionId)->first();
        if (!$revision) {
            return ['current_week' => null, 'slots' => []];
        }

        $blocks = json_decode((string) $revision->blocks, true, flags: JSON_THROW_ON_ERROR);
        if (!is_array($blocks)) {
            return ['current_week' => null, 'slots' => []];
        }

        $weeks = [];
        foreach ($blocks as $block) {
            if (($block['kind'] ?? '') === 'teaching' && is_array($block['weeks'] ?? null)) {
                foreach ($block['weeks'] as $week) {
                    $weeks[] = $week;
                }
            }
        }

        $today = $this->today();
        $current = null;
        $currentIndex = null;
        foreach ($weeks as $index => $week) {
            $start = $week['start_on'] ?? null;
            $end = $week['end_on'] ?? null;
            if ($start !== null && $end !== null && $today >= $start && $today <= $end) {
                $current = $week;
                $currentIndex = $index;
                break;
            }
        }

        if ($current === null) {
            return ['current_week' => null, 'slots' => []];
        }

        $slots = [];
        for ($offset = 0; $offset < 5; $offset++) {
            $index = $currentIndex + $offset;
            if (!isset($weeks[$index])) {
                break;
            }
            $week = $weeks[$index];
            $start = new \DateTimeImmutable($week['start_on'], new \DateTimeZone('America/Lima'));
            $active = $today >= $week['start_on'] && $today <= $week['end_on'];
            $slot = [
                'day' => $this->dayAbbreviation($start->format('N')),
                'date' => $week['start_on'],
                'label' => 'Semana ' . ($week['number'] ?? ''),
                'active' => $active,
            ];
            if ($active) {
                $slot['badge'] = 'Hoy';
            }
            $slots[] = $slot;
        }

        return [
            'current_week' => [
                'number' => (int) $current['number'],
                'start_on' => $current['start_on'],
                'end_on' => $current['end_on'],
            ],
            'slots' => $slots,
        ];
    }

    private function dayAbbreviation(string $isoDay): string
    {
        return match ($isoDay) {
            '1' => 'Lun',
            '2' => 'Mar',
            '3' => 'Mié',
            '4' => 'Jue',
            '5' => 'Vie',
            '6' => 'Sáb',
            '7' => 'Dom',
        };
    }

    private function today(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('America/Lima')))->format('Y-m-d');
    }

    private function emptyDashboard(): array
    {
        return [
            'overview' => ['courses' => 0, 'pending' => 0, 'deliveries' => 0, 'graded' => 0, 'unread' => 0],
            'average' => ['grade' => null, 'label' => 'En progreso'],
            'resume' => null,
            'upcoming' => [],
            'courses' => [],
            'notices' => [],
            'agenda' => ['current_week' => null, 'slots' => []],
        ];
    }
}
