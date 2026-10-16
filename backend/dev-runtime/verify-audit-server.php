<?php
declare(strict_types=1);
require __DIR__.'/config.php';
if (!evalDevBinding(getenv()) || getenv('EVAL_DB_ROLE') !== 'runtime') {
    throw new RuntimeException('Invalid verification binding');
}
require dirname(__DIR__).'/bootstrap.php';

$db = Illuminate\Database\Capsule\Manager::connection();
$checks = 0;
$assert = function(bool $condition) use (&$checks) {
    if (!$condition) throw new RuntimeException('Audit verification assertion failed');
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

$query = new App\Application\Academic\Queries\AuditLedgerQuery($db);

// 1. Authorization: Director can access audit ledger
$director = $actor('director');
$directorPage = $query->page($director);
$assert(is_array($directorPage['items']));
$assert(count($directorPage['items']) > 0);
$assert(array_key_exists('next_after', $directorPage));

// Validate item schema
$first = $directorPage['items'][0];
$assert(isset($first['id'], $first['entity_type'], $first['event_type'], $first['target_id']));
$assert(isset($first['actor_id'], $first['actor_name'], $first['effective_on'], $first['operation_key'], $first['correlation_id'], $first['recorded_at']));

// 2. Authorization: Subdirector can access audit ledger
$subdirector = $actor('subdirector');
$subPage = $query->page($subdirector);
$assert(is_array($subPage['items']));
$assert(count($subPage['items']) > 0);

// 3. Role denial: Docente (teacher) must be forbidden
$teacher = $actor('docente');
try {
    $query->page($teacher);
    throw new RuntimeException('Expected teacher denial');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'forbidden');
}

// 4. Role denial: Estudiante (student) must be forbidden
$student = $actor('estudiante');
try {
    $query->page($student);
    throw new RuntimeException('Expected student denial');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'forbidden');
}

// 5. Entity filter: filtering by enrollment returns only enrollment events
$enrollmentPage = $query->page($director, null, 'enrollment');
$assert(is_array($enrollmentPage['items']));
foreach ($enrollmentPage['items'] as $item) {
    $assert($item['entity_type'] === 'enrollment');
}

// 6. Entity filter: filtering by assignment returns only assignment events
$assignmentPage = $query->page($director, null, 'assignment');
$assert(is_array($assignmentPage['items']));
foreach ($assignmentPage['items'] as $item) {
    $assert($item['entity_type'] === 'assignment');
}

// 7. Invalid entity filter rejection
try {
    $query->page($director, null, 'invalid_entity_type');
    throw new RuntimeException('Expected invalid entity type denial');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'invalid_input');
}

// 8. Cursor pagination: querying after id yields sequential records
if (count($directorPage['items']) >= 2) {
    $pivotId = $directorPage['items'][0]['id'];
    $cursorPage = $query->page($director, $pivotId);
    $assert(is_array($cursorPage['items']));
    foreach ($cursorPage['items'] as $cursorItem) {
        $assert((int)$cursorItem['id'] > (int)$pivotId);
    }
}

// 9. Server-side global search across ledger records
$firstActorName = $directorPage['items'][0]['actor_name'] ?? null;
if ($firstActorName !== null) {
    $searchPage = $query->page($director, null, null, substr($firstActorName, 0, 4));
    $assert(is_array($searchPage['items']));
    $assert(count($searchPage['items']) > 0);
}

$firstCorrelationId = $directorPage['items'][0]['correlation_id'] ?? null;
if ($firstCorrelationId !== null) {
    $corrSearch = $query->page($director, null, null, $firstCorrelationId);
    $assert(is_array($corrSearch['items']));
    $assert(count($corrSearch['items']) > 0);
    foreach ($corrSearch['items'] as $item) {
        $assert($item['correlation_id'] === $firstCorrelationId);
    }
}

// Search by event type
$eventTypeSearch = $query->page($director, null, null, 'created');
$assert(is_array($eventTypeSearch['items']));

// Overlength search (>100 chars) must fail with invalid_input
try {
    $query->page($director, null, null, str_repeat('a', 101));
    throw new RuntimeException('Expected overlength search failure');
} catch (App\Application\Academic\AcademicCommandFailure $e) {
    $assert($e->category === 'invalid_input');
}

// 10. Append-only trigger enforcement on academic_lifecycle_events
$firstEventId = $db->table('academic_lifecycle_events')->value('id');
if ($firstEventId) {
    try {
        $db->table('academic_lifecycle_events')->where('id', $firstEventId)->update(['event_type' => 'tampered']);
        throw new RuntimeException('Expected ledger_no_update trigger failure');
    } catch (\Illuminate\Database\QueryException) {
        $assert(true);
    }

    try {
        $db->table('academic_lifecycle_events')->where('id', $firstEventId)->delete();
        throw new RuntimeException('Expected ledger_no_delete trigger failure');
    } catch (\Illuminate\Database\QueryException) {
        $assert(true);
    }
}

echo json_encode([
    'checks' => $checks,
    'authorization' => true,
    'roleGuard' => true,
    'filtering' => true,
    'pagination' => true,
    'globalSearch' => true,
    'appendOnlyLedger' => true
]) . PHP_EOL;
