<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
if (!evalDevBinding(getenv()) || getenv('EVAL_DB_ROLE') !== 'runtime') {
    fwrite(STDERR, "Invalid environment\n");
    exit(2);
}
require dirname(__DIR__) . '/bootstrap.php';

use App\Application\Academic\Commands\ResourceWeekAssociations;
use App\Infrastructure\Persistence\Academic\LocalMaterialStorage;
use App\Infrastructure\Authentication\{AuthenticatedActor, CredentialRevision};

try {
    $db = Illuminate\Database\Capsule\Manager::connection();
    $root = dirname(__DIR__, 2) . '/.local/eval-dev';
    $storage = new LocalMaterialStorage($root . '/materials');
    $service = new ResourceWeekAssociations($db, $storage);

    $actorCache = [];
    $actorFor = function (string $teacherId) use ($db, &$actorCache): AuthenticatedActor {
        if (isset($actorCache[$teacherId])) return $actorCache[$teacherId];
        $c = $db->table('local_credentials')->where('id', $teacherId)->first();
        if (!$c) throw new RuntimeException("Teacher not found: $teacherId");
        $actor = new AuthenticatedActor(
            (string)$c->id,
            $db->table('local_role_grants')->where('identity_id', $c->id)->pluck('role')->all(),
            CredentialRevision::current($db, (string)$c->id, $c->password)
        );
        $actorCache[$teacherId] = $actor;
        return $actor;
    };

    $calState = $db->table('school_calendar_states')->where('period_id', 1)->first();
    if (!$calState || !$calState->revision_id) {
        throw new RuntimeException("Calendar revision not published for period 1");
    }
    $revId = (string)$calState->revision_id;

    $rev = $db->table('school_calendar_revisions')->where('id', $revId)->first();
    $blocks = json_decode($rev->blocks, true);
    $weeks = [];
    foreach ($blocks as $b) {
        foreach ($b['weeks'] as $w) {
            $weeks[] = $w['id'];
        }
    }
    if (empty($weeks)) throw new RuntimeException("No weeks in calendar");

    $associated = ['materials' => 0, 'activities' => 0];

    // Associate materials
    $materials = $db->table('course_materials')->get();
    foreach ($materials as $idx => $mat) {
        $existing = $db->table('material_week_states')->where('resource_id', $mat->id)->first();
        if ($existing) continue;

        $assignment = $db->table('teaching_assignments')->where('id', $mat->assignment_id)->first();
        if (!$assignment) continue;

        $tActor = $actorFor((string)$assignment->teacher_id);
        $weekId = $weeks[$idx % min(8, count($weeks))]; // Distribute over first 8 weeks

        try {
            $service->set($tActor, 'material', (string)$mat->id, [
                'expected_version' => 0,
                'calendar_revision_id' => $revId,
                'week_id' => $weekId,
            ]);
            $associated['materials']++;
        } catch (\Throwable $e) {
            fwrite(STDERR, "Material {$mat->id} assoc failed: " . $e->getMessage() . "\n");
        }
    }

    // Associate activities
    $activities = $db->table('activity_references')->get();
    foreach ($activities as $idx => $act) {
        $existing = $db->table('activity_week_states')->where('resource_id', $act->id)->first();
        if ($existing) continue;

        $assignment = $db->table('teaching_assignments')->where('id', $act->teaching_assignment_id)->first();
        if (!$assignment) continue;

        $tActor = $actorFor((string)$assignment->teacher_id);
        $weekId = $weeks[$idx % min(6, count($weeks))]; // Distribute over first 6 weeks

        try {
            $service->set($tActor, 'activity', (string)$act->id, [
                'expected_version' => 0,
                'calendar_revision_id' => $revId,
                'week_id' => $weekId,
            ]);
            $associated['activities']++;
        } catch (\Throwable $e) {
            fwrite(STDERR, "Activity {$act->id} assoc failed: " . $e->getMessage() . "\n");
        }
    }

    echo json_encode([
        'status' => 'success',
        'associated' => $associated,
        'weeks_used' => min(8, count($weeks)),
        'revision' => $revId,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;

} catch (\Throwable $e) {
    fwrite(STDERR, "Error: " . $e->getMessage() . "\n");
    exit(1);
}
