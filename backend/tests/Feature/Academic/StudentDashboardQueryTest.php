<?php
declare(strict_types=1);

namespace Tests\Feature\Academic;

use App\Application\Academic\Commands\ActivityDelivery;
use App\Application\Academic\Commands\DeliveryAssessment;
use App\Application\Academic\Commands\SchoolCalendarCommands;
use App\Application\Academic\Queries\StudentDashboardQuery;
use App\Infrastructure\Persistence\Academic\LocalIdentityLabels;
use App\Infrastructure\Persistence\Academic\LocalMaterialStorage;
use Tests\Support\SubmissionReferenceTestCase;

final class StudentDashboardQueryTest extends SubmissionReferenceTestCase
{
    protected const DATABASE = 'eval_u11_test';

    private StudentDashboardQuery $query;
    private LocalMaterialStorage $storage;
    private string $directory = '';

    protected function setUp(): void
    {
        parent::setUp();

        $manager = \Illuminate\Database\Eloquent\Model::getConnectionResolver();
        $default = $manager->getDefaultConnection();
        try {
            $manager->setDefaultConnection('migration');
            foreach ([
                '2026_10_08_000012_create_activity_delivery_content.php' => 'activity_contents',
                '2026_10_08_000013_create_delivery_assessments.php' => 'delivery_assessments',
                '2026_10_08_000014_create_academic_notifications.php' => 'academic_notifications',
                '2026_10_08_000018_create_school_calendars.php' => 'school_calendar_revisions',
                '2026_10_08_000019_create_resource_week_associations.php' => 'material_week_changes',
            ] as $file => $table) {
                if (!$this->migration->getSchemaBuilder()->hasTable($table)) {
                    (require dirname(__DIR__, 3) . '/database/migrations/' . $file)->up($this->migration);
                }
            }
        } finally {
            $manager->setDefaultConnection($default);
        }

        $this->directory = sys_get_temp_dir() . '/eval-student-dashboard-' . bin2hex(random_bytes(8));
        mkdir($this->directory);
        $this->storage = new LocalMaterialStorage($this->directory . '/private');

        $this->query = new StudentDashboardQuery($this->db, new LocalIdentityLabels($this->db));
        $this->migration->table('retained_identity_profiles')->insert([
            'identity_id' => $this->teacherActor->identityId,
            'display_name' => 'Synthetic teacher',
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->directory !== '') {
            (new \Illuminate\Filesystem\Filesystem)->deleteDirectory($this->directory);
        }
        parent::tearDown();
    }

    public function testNonStudentIsForbidden(): void
    {
        $this->expectException(\App\Application\Academic\AcademicCommandFailure::class);
        $this->query->get($this->teacherActor);
    }

    public function testStudentWithoutEnrollmentGetsEmptyDashboard(): void
    {
        $student = $this->actor('student');
        $dashboard = $this->query->get($student);
        $this->assertSame(0, $dashboard['overview']['courses']);
        $this->assertSame(0, $dashboard['overview']['pending']);
        $this->assertNull($dashboard['resume']);
        $this->assertSame([], $dashboard['upcoming']);
        $this->assertSame([], $dashboard['courses']);
        $this->assertSame([], $dashboard['notices']);
        $this->assertNull($dashboard['agenda']['current_week']);
    }

    public function testStudentGetsCorrectCountsAndCourseProgress(): void
    {
        $activityA = $this->publishActivity('Actividad A', '2026-10-20');
        $activityB = $this->publishActivity('Actividad B', '2026-10-21');

        $dashboard = $this->query->get($this->studentActor);

        $this->assertSame(1, $dashboard['overview']['courses']);
        $this->assertSame(2, $dashboard['overview']['pending']);
        $this->assertSame(0, $dashboard['overview']['deliveries']);
        $this->assertSame(0, $dashboard['overview']['graded']);
        $this->assertSame(1, count($dashboard['courses']));
        $this->assertSame(0, $dashboard['courses'][0]['progress']);
        $this->assertSame(2, $dashboard['courses'][0]['pending_count']);
        $this->assertSame('Actividad A', $dashboard['courses'][0]['next_due']['title']);
        $this->assertSame('2026-10-20', $dashboard['courses'][0]['next_due']['due_on']);
        $this->assertContains($dashboard['courses'][0]['next_due']['category'], ['today', 'tomorrow', 'later', 'overdue']);
        $this->assertNotNull($dashboard['courses'][0]['latest_published_at']);

        $this->submitActivity($activityA);
        $dashboard = $this->query->get($this->studentActor);
        $this->assertSame(1, $dashboard['overview']['deliveries']);
        $this->assertSame(1, $dashboard['overview']['pending']);
        $this->assertSame(50, $dashboard['courses'][0]['progress']);
        $this->assertSame(1, $dashboard['courses'][0]['pending_count']);
        $this->assertSame('Actividad B', $dashboard['courses'][0]['next_due']['title']);
    }

    public function testAverageCalculationRequiresAtLeastThreeGradedDeliveries(): void
    {
        $grades = ['AD', 'A'];
        foreach ($grades as $index => $grade) {
            $activity = $this->publishExtraActivity('Actividad ' . $index, '2026-10-' . (20 + $index));
            $submission = $this->submitActivity($activity);
            $this->assess($submission, $grade);
        }

        $dashboard = $this->query->get($this->studentActor);
        $this->assertNull($dashboard['average']['grade']);
        $this->assertSame('En progreso', $dashboard['average']['label']);

        foreach (['B', 'AD', 'AD', 'AD'] as $index => $grade) {
            $activity = $this->publishExtraActivity('Actividad extra ' . $index, '2026-10-' . (25 + $index));
            $submission = $this->submitActivity($activity);
            $this->assess($submission, $grade);
        }

        $dashboard = $this->query->get($this->studentActor);
        $this->assertSame('AD', $dashboard['average']['grade']);
        $this->assertSame('Destacado', $dashboard['average']['label']);
    }

    public function testResumeAndUpcomingOrderingExcludesDeliveredActivities(): void
    {
        $activityA = $this->publishExtraActivity('Primera', '2026-10-19');
        $activityB = $this->publishExtraActivity('Segunda', '2026-10-20');
        $activityC = $this->publishExtraActivity('Tercera', '2026-10-21');

        $this->submitActivity($activityB);

        $dashboard = $this->query->get($this->studentActor);
        $this->assertSame('Primera', $dashboard['resume']['title']);
        $this->assertSame(33, $dashboard['resume']['progress']);
        $this->assertSame($dashboard['courses'][0]['progress'], $dashboard['resume']['progress']);
        $this->assertSame($this->grade, $dashboard['resume']['classroom']['grade_id']);
        $this->assertSame($this->section, $dashboard['resume']['classroom']['section_id']);
        $this->assertSame('Tercera', $dashboard['upcoming'][0]['title']);
        $this->assertSame(1, count($dashboard['upcoming']));
        $this->assertSame(2, $dashboard['courses'][0]['pending_count']);
        $this->assertSame('Primera', $dashboard['courses'][0]['next_due']['title']);
        $this->assertNotNull($dashboard['courses'][0]['latest_published_at']);
    }

    public function testLatestPublishedAtIncludesDeliveredActivities(): void
    {
        $activityA = $this->publishActivity('Primera publicada', '2026-10-20');
        $activityB = $this->publishActivity('Segunda publicada', '2026-10-21');

        $this->submitActivity($activityB);

        $dashboard = $this->query->get($this->studentActor);
        $this->assertSame(1, $dashboard['courses'][0]['pending_count']);
        $this->assertSame('Primera publicada', $dashboard['courses'][0]['next_due']['title']);

        $dates = $this->db->table('activity_contents')
            ->whereIn('activity_id', [$activityA, $activityB])
            ->pluck('published_at', 'activity_id')
            ->all();

        $latestDate = null;
        foreach ($dates as $publishedAt) {
            $date = $publishedAt !== null ? substr((string) $publishedAt, 0, 10) : null;
            if ($date !== null && ($latestDate === null || $date > $latestDate)) {
                $latestDate = $date;
            }
        }

        $this->assertSame($latestDate, $dashboard['courses'][0]['latest_published_at']);
    }

    public function testPerCourseMetricsRespectAssignmentBoundaries(): void
    {
        $scienceEntry = $this->catalog->create($this->actor, 'entry', ['name' => 'Ciencia ' . $this->suffix, 'kind' => 'subject']);
        $scienceAssignment = $this->assignment(['teacher_id' => $this->teacherActor->identityId, 'instructional_entry_id' => $scienceEntry]);
        $this->assignments->activate($this->actor, $scienceAssignment);

        $this->publishActivity('Matemática A', '2026-10-20');
        $this->publishActivity('Matemática B', '2026-10-22');
        $this->publishOnAssignment('Ciencia A', '2026-10-21', $scienceAssignment);

        $dashboard = $this->query->get($this->studentActor);
        $this->assertSame(2, count($dashboard['courses']));
        $this->assertSame(3, $dashboard['overview']['pending']);

        $bySubject = [];
        foreach ($dashboard['courses'] as $course) {
            $bySubject[$course['subject']] = $course;
        }

        $this->assertSame(2, $bySubject['Subject ' . $this->suffix]['pending_count']);
        $this->assertSame('Matemática A', $bySubject['Subject ' . $this->suffix]['next_due']['title']);
        $this->assertSame('2026-10-20', $bySubject['Subject ' . $this->suffix]['next_due']['due_on']);

        $this->assertSame(1, $bySubject['Ciencia ' . $this->suffix]['pending_count']);
        $this->assertSame('Ciencia A', $bySubject['Ciencia ' . $this->suffix]['next_due']['title']);
        $this->assertSame('2026-10-21', $bySubject['Ciencia ' . $this->suffix]['next_due']['due_on']);

        foreach ($dashboard['courses'] as $course) {
            $this->assertContains($course['next_due']['category'], ['today', 'tomorrow', 'later', 'overdue']);
            $this->assertNotNull($course['latest_published_at']);
        }
    }

    public function testNoticesIncludeCourseContext(): void
    {
        $this->migration->table('academic_notifications')->insert([
            'recipient_id' => $this->studentActor->identityId,
            'event' => 'activity_published',
            'activity_id' => $this->activityId,
            'submission_id' => null,
            'operation_key' => 1,
            'created_at' => '2026-10-19 10:00:00.000000',
        ]);

        $dashboard = $this->query->get($this->studentActor);
        $this->assertSame(1, count($dashboard['notices']));
        $this->assertSame('Hay una nueva actividad disponible.', $dashboard['notices'][0]['message']);
        $this->assertStringContainsString('Subject', $dashboard['notices'][0]['course']);
    }

    public function testAgendaReturnsCurrentWeekAndNextFourWeekSlots(): void
    {
        $today = new \DateTimeImmutable('now', new \DateTimeZone('America/Lima'));
        $monday = $today->modify('-' . ((int) $today->format('N') - 1) . ' days');

        $weeksPerBimester = 2;
        $teachingBlocks = [];
        $allWeeks = [];
        $number = 1;
        for ($b = 0; $b < 4; $b++) {
            $blockStart = $monday->modify('+' . ($b * ($weeksPerBimester * 7 + 7)) . ' days');
            $blockEnd = $blockStart->modify('+' . ($weeksPerBimester * 7 + 4) . ' days');
            $weeks = [];
            for ($w = 0; $w < $weeksPerBimester; $w++) {
                $start = $blockStart->modify('+' . ($w * 7) . ' days');
                $end = $start->modify('+4 days');
                $weeks[] = [
                    'number' => $number,
                    'start_on' => $start->format('Y-m-d'),
                    'end_on' => $end->format('Y-m-d'),
                ];
                $allWeeks[] = $weeks[$w];
                $number++;
            }
            $teachingBlocks[] = ['kind' => 'teaching', 'start_on' => $blockStart->format('Y-m-d'), 'end_on' => $blockEnd->format('Y-m-d'), 'weeks' => $weeks];
        }

        $blocks = [
            ['kind' => 'management', 'start_on' => $monday->modify('-14 days')->format('Y-m-d'), 'end_on' => $monday->modify('-1 day')->format('Y-m-d'), 'weeks' => []],
            ...$teachingBlocks,
        ];

        $calendars = new SchoolCalendarCommands($this->migration);
        $draft = $calendars->create($this->actor, $this->period, ['blocks' => $blocks]);
        $calendars->publish($this->actor, $draft['id'], ['expected_version' => 1, 'source' => 'Fixture', 'confirmed' => true]);

        $dashboard = $this->query->get($this->studentActor);
        $this->assertSame(1, $dashboard['agenda']['current_week']['number']);
        $this->assertSame(5, count($dashboard['agenda']['slots']));
        $this->assertSame('Semana 1', $dashboard['agenda']['slots'][0]['label']);
        $this->assertTrue($dashboard['agenda']['slots'][0]['active']);
        $this->assertSame('Hoy', $dashboard['agenda']['slots'][0]['badge']);
    }

    private function publishActivity(string $title, string $dueOn): string
    {
        $result = (new ActivityDelivery($this->migration, $this->storage))->write(
            $this->teacherActor,
            'publish',
            $this->assignmentId,
            ['title' => $title, 'instructions' => 'Instrucciones', 'due_on' => $dueOn]
        );
        return $result['id'];
    }

    private function publishExtraActivity(string $title, string $dueOn): string
    {
        $result = (new ActivityDelivery($this->migration, $this->storage))->write(
            $this->teacherActor,
            'publish',
            $this->assignmentId,
            ['title' => $title, 'instructions' => 'Instrucciones', 'due_on' => $dueOn]
        );
        return $result['id'];
    }

    private function publishOnAssignment(string $title, string $dueOn, string $assignmentId): string
    {
        $result = (new ActivityDelivery($this->migration, $this->storage))->write(
            $this->teacherActor,
            'publish',
            $assignmentId,
            ['title' => $title, 'instructions' => 'Instrucciones', 'due_on' => $dueOn]
        );
        return $result['id'];
    }

    private function submitActivity(string $activityId): string
    {
        $result = (new ActivityDelivery($this->migration, $this->storage))->write(
            $this->studentActor,
            'submit',
            $activityId,
            ['answer' => 'Respuesta del estudiante']
        );
        return $result['id'];
    }

    private function assess(string $submissionId, string $grade): void
    {
        $version = (string) $this->db->table('delivery_versions')
            ->where('submission_id', $submissionId)
            ->orderByDesc('id')
            ->value('id');
        (new DeliveryAssessment($this->migration))->assess($this->teacherActor, $submissionId, [
            'grade' => $grade,
            'feedback' => 'Retroalimentación',
            'expected_version_id' => $version,
            'expected_assessment_id' => null,
        ]);
    }
}
