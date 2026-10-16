<?php
declare(strict_types=1);

require __DIR__.'/config.php';
if (!evalDevBinding(getenv()) || getenv('EVAL_DB_ROLE') !== 'runtime') {
    throw new RuntimeException('Invalid verification binding');
}
require dirname(__DIR__).'/bootstrap.php';

try {
    $db = Illuminate\Database\Capsule\Manager::connection();
    $checks = 0;
    $assert = function(bool $condition) use (&$checks) {
        if (!$condition) throw new RuntimeException('Bimester verification assertion failed');
        $checks++;
    };

$actor = function(string $login) use ($db) {
    $row = $db->table('local_credentials')->where('login', $login)->first();
    if (!$row) throw new RuntimeException("Actor $login not found");
    return new App\Infrastructure\Authentication\AuthenticatedActor(
        (string)$row->id,
        $db->table('local_role_grants')->where('identity_id', $row->id)->pluck('role')->all(),
        App\Infrastructure\Authentication\CredentialRevision::current($db, (string)$row->id, $row->password)
    );
};

$director = $actor('director');
$subdirector = $actor('subdirector');
$teacher = $actor('docente');
$student = $actor('estudiante');

$periodId = (string)$db->table('academic_periods')->where('state', 'active')->value('id');
if (!$periodId) throw new RuntimeException('No active period found for testing');

$query = new App\Application\Academic\Queries\BimesterClosuresQuery($db);
$commands = new App\Application\Academic\Commands\BimesterGradeLockCommands($db);

// 1. Initial State: All 4 bimesters exist and can be queried by Director and Subdirector
$directorView = $query->getForPeriod($director, $periodId);
$assert(is_array($directorView['bimesters']));
$assert(count($directorView['bimesters']) === 4);
$assert($directorView['period_id'] === $periodId);

// Teachers can read bimester closure status
$teacherView = $query->getForPeriod($teacher, $periodId);
$assert(count($teacherView['bimesters']) === 4);

// Students are forbidden
try {
    $query->getForPeriod($student, $periodId);
    throw new RuntimeException('Expected student denial');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'forbidden');
}

// 2. Ensure clean baseline: ensure bimester 1 is open
$existingB1 = $db->table('bimester_grade_closures')->where('period_id', $periodId)->where('bimester_number', 1)->first();
if ($existingB1 && $existingB1->state === 'locked') {
    $commands->reopen($director, $periodId, 1, 'Preparación inicial de verificación');
}

// 3. Subdirector closes Bimestre 1
$closeResult = $commands->close($subdirector, $periodId, 1);
$assert($closeResult['bimester_number'] === 1);
$assert($closeResult['state'] === 'locked');

// Verify query reflects locked status
$updated = $query->getForPeriod($director, $periodId);
$b1 = $updated['bimesters'][0];
$assert($b1['bimester_number'] === 1);
$assert($b1['state'] === 'locked');
$assert($b1['closed_by'] === $subdirector->identityId);
$assert($b1['closed_at'] !== null);

// 4. Closing already locked bimester is rejected
try {
    $commands->close($director, $periodId, 1);
    throw new RuntimeException('Expected bimester_already_locked rejection');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'bimester_already_locked');
}

// 5. Role denial: Teachers cannot close bimesters
try {
    $commands->close($teacher, $periodId, 2);
    throw new RuntimeException('Expected teacher close denial');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'forbidden');
}

// 6. Grade Locking Enforcement: Teachers cannot assess locked bimesters
$deliveryRow = $db->table('activity_deliveries as d')
    ->join('submission_references as s', 's.id', '=', 'd.submission_id')
    ->join('teaching_assignments as a', 'a.id', '=', 's.teaching_assignment_id')
    ->where('a.academic_period_id', $periodId)
    ->where('a.teacher_id', $teacher->identityId)
    ->first(['d.submission_id', 'd.current_version_id', 'd.current_assessment_id']);

if ($deliveryRow) {
    $assessmentCommands = new App\Application\Academic\Commands\DeliveryAssessment($db);
    try {
        $assessmentCommands->assess($teacher, (string)$deliveryRow->submission_id, [
            'grade' => 'A',
            'feedback' => 'Tentativa de calificar bimestre cerrado',
            'expected_version_id' => (string)$deliveryRow->current_version_id,
            'expected_assessment_id' => $deliveryRow->current_assessment_id ? (string)$deliveryRow->current_assessment_id : null
        ]);
        throw new RuntimeException('Expected bimester_locked failure');
    } catch (App\Application\Academic\AcademicCommandFailure $e) {
        $assert($e->category === 'bimester_locked');
    }
}

// 7. Exceptional Reopening Protocol
// Short or empty justification rejected
try {
    $commands->reopen($director, $periodId, 1, 'Corta');
    throw new RuntimeException('Expected invalid_justification denial');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'invalid_justification');
}

// Reopening an already open bimester (Bimestre 2) rejected
try {
    $commands->reopen($director, $periodId, 2, 'Justificación válida para bimestre no cerrado');
    throw new RuntimeException('Expected bimester_not_locked denial');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'bimester_not_locked');
}

// Reopening by teacher rejected
try {
    $commands->reopen($teacher, $periodId, 1, 'Docente intenta reabrir sin autorización');
    throw new RuntimeException('Expected teacher reopen denial');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'forbidden');
}

// Director performs authorized reopening with valid justification
$justification = 'Reapertura autorizada por Dirección para regularización de evidencias complementarias';
$reopenResult = $commands->reopen($director, $periodId, 1, $justification);
$assert($reopenResult['state'] === 'open');
$assert($reopenResult['justification'] === $justification);

// Verify query reflects open status with audit tracking
$reopenedView = $query->getForPeriod($director, $periodId);
$b1Reopened = $reopenedView['bimesters'][0];
$assert($b1Reopened['state'] === 'open');
$assert($b1Reopened['reopened_by'] === $director->identityId);
$assert($b1Reopened['justification'] === $justification);

// 8. Append-only ledger has recorded both lifecycle events
$closedEvents = $db->table('academic_lifecycle_events')
    ->where('period_id', $periodId)
    ->where('event_type', 'bimester_closed')
    ->count();
$assert($closedEvents > 0);

$reopenedEvents = $db->table('academic_lifecycle_events')
    ->where('period_id', $periodId)
    ->where('event_type', 'bimester_reopened')
    ->count();
$assert($reopenedEvents > 0);

echo json_encode([
    'checks' => $checks,
    'authorization' => true,
    'bimesterClosure' => true,
    'gradeLocking' => true,
    'authorizedReopening' => true,
    'auditLedgerEvidence' => true,
]) . PHP_EOL;
} catch (Throwable $error) {
    while ($error) {
        fwrite(STDERR, get_class($error).' at '.basename($error->getFile()).':'.$error->getLine().': '.$error->getMessage().PHP_EOL);
        $error = $error->getPrevious();
    }
    exit(2);
}
