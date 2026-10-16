<?php
declare(strict_types=1);
/**
 * Master Backend Verification Suite for EVAL
 * Executes all 10 domain server verification suites in isolated processes.
 */
$suites = [
    'users'                => ['script' => 'verify-users-server.php', 'role' => 'runtime'],
    'reports'              => ['script' => 'verify-reports-server.php', 'role' => 'runtime'],
    'assessments'          => ['script' => 'verify-assessments-server.php', 'role' => 'runtime', 'fixture' => 'assessment-rollback-fixture.php'],
    'activities'           => ['script' => 'verify-activities-server.php', 'role' => 'runtime', 'fixture' => 'activity-rollback-fixture.php'],
    'material_maintenance' => ['script' => 'verify-material-maintenance-server.php', 'role' => 'runtime', 'fixture' => 'material-rollback-fixture.php'],
    'observations'         => ['script' => 'verify-observations-server.php', 'role' => 'runtime', 'fixture' => 'observation-rollback-fixture.php'],
    'file_replacement'     => ['script' => 'verify-file-replacement-server.php', 'role' => 'runtime', 'fixture' => 'file-rollback-fixture.php'],
    'notifications'        => ['script' => 'verify-notifications-server.php', 'role' => 'runtime', 'fixture' => 'notification-rollback-fixture.php'],
    'library'              => ['script' => 'verify-library-server.php', 'role' => 'runtime'],
    'audit'                => ['script' => 'verify-audit-server.php', 'role' => 'runtime'],
    'bimesters'            => ['script' => 'verify-bimesters-server.php', 'role' => 'runtime'],
    'role_policy'          => ['script' => 'verify-role-policy-server.php', 'role' => 'migration'],
];

$results = [];
$totalChecks = 0;
$allPassed = true;
$php = PHP_BINARY;
$ini = php_ini_loaded_file();

$runtimeUser = (string)getenv('EVAL_DB_USER');
$runtimePass = (string)getenv('EVAL_RUNTIME_PASSWORD');
$migrationUser = (string)getenv('EVAL_MIGRATION_USER');
$migrationPass = (string)getenv('EVAL_MIGRATION_PASSWORD');

$withRole = function(string $role, callable $fn) use ($runtimeUser, $runtimePass, $migrationUser, $migrationPass) {
    if ($role === 'migration' && $migrationUser !== '') {
        putenv('EVAL_DB_ROLE=migration');
        putenv('EVAL_DB_USER=' . $migrationUser);
        putenv('EVAL_DB_PASSWORD=' . $migrationPass);
    } else {
        putenv('EVAL_DB_ROLE=runtime');
        putenv('EVAL_DB_USER=' . $runtimeUser);
        putenv('EVAL_DB_PASSWORD=' . $runtimePass);
    }
    try {
        return $fn();
    } finally {
        putenv('EVAL_DB_ROLE=runtime');
        putenv('EVAL_DB_USER=' . $runtimeUser);
        putenv('EVAL_DB_PASSWORD=' . $runtimePass);
    }
};

echo "========================================================\n";
echo "  EVAL - Comprehensive Backend Verification Suite\n";
echo "========================================================\n\n";

foreach ($suites as $name => $cfg) {
    $file = $cfg['script'];
    $script = __DIR__ . DIRECTORY_SEPARATOR . $file;
    if (!is_file($script)) {
        $results[$name] = ['status' => 'missing_file'];
        $allPassed = false;
        continue;
    }

    // Prepare fixture if needed (fixtures always require migration role to manage triggers)
    if (!empty($cfg['fixture'])) {
        $fixScript = __DIR__ . DIRECTORY_SEPARATOR . $cfg['fixture'];
        $withRole('migration', function() use ($php, $ini, $fixScript) {
            exec(escapeshellarg($php) . ' -c ' . escapeshellarg($ini) . ' -d display_errors=0 ' . escapeshellarg($fixScript) . ' prepare 2>&1');
        });
    }

    $output = [];
    $exitCode = 0;
    $withRole($cfg['role'], function() use ($php, $ini, $script, &$output, &$exitCode) {
        $cmd = escapeshellarg($php) . ' -c ' . escapeshellarg($ini) . ' -d display_errors=0 ' . escapeshellarg($script);
        exec($cmd, $output, $exitCode);
    });

    // Clean up fixture if needed
    if (!empty($cfg['fixture'])) {
        $fixScript = __DIR__ . DIRECTORY_SEPARATOR . $cfg['fixture'];
        $withRole('migration', function() use ($php, $ini, $fixScript) {
            exec(escapeshellarg($php) . ' -c ' . escapeshellarg($ini) . ' -d display_errors=0 ' . escapeshellarg($fixScript) . ' remove 2>&1');
        });
    }

    $raw = trim(implode("\n", $output));
    $parsed = json_decode($raw, true);

    if ($exitCode === 0 && is_array($parsed)) {
        $checks = $parsed['checks'] ?? ($parsed['rows'] ?? 0);
        $totalChecks += $checks;
        $results[$name] = [
            'status' => 'PASSED',
            'checks' => $checks,
            'details' => $parsed,
        ];
        echo sprintf("  [✓] %-24s PASSED (%d checks)\n", $name, $checks);
    } else {
        $allPassed = false;
        $results[$name] = [
            'status' => 'FAILED',
            'exit_code' => $exitCode,
            'output' => $raw,
        ];
        echo sprintf("  [✗] %-24s FAILED (exit code %d)\n", $name, $exitCode);
        if ($raw) {
            echo "      " . substr($raw, 0, 160) . "\n";
        }
    }
}

echo "\n--------------------------------------------------------\n";
echo sprintf("Summary: %d suites executed | %s | %d total checks\n", count($suites), $allPassed ? 'ALL PASSED (100%)' : 'SOME FAILED', $totalChecks);
echo "--------------------------------------------------------\n";

if (!$allPassed) {
    exit(2);
}
