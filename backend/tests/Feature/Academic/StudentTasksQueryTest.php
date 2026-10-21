<?php
declare(strict_types=1);

namespace Tests\Feature\Academic;

use App\Application\Academic\Queries\StudentTasksQuery;
use App\Infrastructure\Persistence\Academic\LocalIdentityLabels;
use Tests\Support\SubmissionReferenceTestCase;

final class StudentTasksQueryTest extends SubmissionReferenceTestCase
{
    protected const DATABASE = 'eval_u11_test';

    private StudentTasksQuery $query;

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
            ] as $file => $table) {
                if (!$this->migration->getSchemaBuilder()->hasTable($table)) {
                    (require dirname(__DIR__, 3) . '/database/migrations/' . $file)->up($this->migration);
                }
            }
        } finally {
            $manager->setDefaultConnection($default);
        }

        $this->query = new StudentTasksQuery($this->db, new LocalIdentityLabels($this->db));
    }

    public function testNonStudentIsForbidden(): void
    {
        $this->expectException(\App\Application\Academic\AcademicCommandFailure::class);
        $this->query->get($this->teacherActor);
    }

    public function testStudentWithoutEnrollmentGetsEmptyList(): void
    {
        $student = $this->actor('student');
        $result = $this->query->get($student);
        $this->assertSame([], $result['items']);
        $this->assertSame(0, $result['overview']['pending']);
    }

    public function testTasksIncludeCourseDeliveryAndGradeStatus(): void
    {
        $activity = $this->publishActivity('Guía 4', '2026-10-26');
        $result = $this->query->get($this->studentActor);

        $this->assertCount(1, $result['items']);
        $this->assertSame('Guía 4', $result['items'][0]['title']);
        $this->assertSame('pending', $this->statusFor($result['items'][0]));
        $this->assertSame(1, $result['overview']['pending']);
        $this->assertSame(0, $result['overview']['delivered']);

        $submission = $this->submitActivity($activity);
        $result = $this->query->get($this->studentActor);
        $this->assertSame('delivered', $this->statusFor($result['items'][0]));
        $this->assertSame(0, $result['overview']['pending']);
        $this->assertSame(1, $result['overview']['delivered']);

        $this->assess($submission, 'AD');
        $result = $this->query->get($this->studentActor);
        $this->assertSame('graded', $this->statusFor($result['items'][0]));
        $this->assertSame('AD', $result['items'][0]['delivery']['grade']);
        $this->assertNotEmpty($result['items'][0]['delivery']['feedback']);
        $this->assertSame(1, $result['overview']['graded']);
    }

    public function testTasksOrderedByDueDateAndOpenActivitiesOnly(): void
    {
        $this->publishExtraActivity('Segunda', '2026-10-27');
        $this->publishExtraActivity('Primera', '2026-10-25');

        $result = $this->query->get($this->studentActor);
        $titles = array_map(fn ($item) => $item['title'], $result['items']);
        $this->assertSame(['Primera', 'Segunda'], $titles);
    }

    public function testDueCategoriesUseLimaTimezone(): void
    {
        $today = (new \DateTimeImmutable('now', new \DateTimeZone('America/Lima')))->format('Y-m-d');
        $this->publishExtraActivity('Hoy', $today);
        $tomorrow = (new \DateTimeImmutable($today, new \DateTimeZone('America/Lima')))->modify('+1 day')->format('Y-m-d');
        $this->publishExtraActivity('Mañana', $tomorrow);

        $result = $this->query->get($this->studentActor);
        $map = [];
        foreach ($result['items'] as $item) {
            $map[$item['title']] = $item['category'];
        }
        $this->assertSame('today', $map['Hoy']);
        $this->assertSame('tomorrow', $map['Mañana']);
    }

    private function statusFor(array $item): string
    {
        if ($item['delivery']['is_graded']) {
            return 'graded';
        }
        if ($item['delivery']['has_delivery']) {
            return 'delivered';
        }
        return 'pending';
    }
}
