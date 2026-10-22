<?php
declare(strict_types=1);

/**
 * EVAL CI Database Preparation Runner
 * Runs all 20 migrations and sets up initial development fixtures for automated server verification.
 */

$stage = 'init';
try {
    require_once dirname(__DIR__).'/bootstrap.php';
    require_once __DIR__.'/config.php';

    if (!evalDevBinding(getenv())) {
        throw new RuntimeException('Invalid dev environment binding. Check EVAL_UNIT, host, port, user.');
    }
    if (getenv('EVAL_DB_ROLE') !== 'migration') {
        throw new RuntimeException('Preparation requires EVAL_DB_ROLE=migration.');
    }

    $stage = 'connect';
    $capsule = require dirname(__DIR__).'/scripts/database.php';
    $db = $capsule->getConnection();

    $stage = 'repository';
    $repository = new \Illuminate\Database\Migrations\DatabaseMigrationRepository($capsule->getDatabaseManager(), 'migrations');
    if (!$repository->repositoryExists()) {
        $repository->createRepository();
    }

    $stage = 'migrator';
    $migrator = new \Illuminate\Database\Migrations\Migrator(
        $repository,
        $capsule->getDatabaseManager(),
        new \Illuminate\Filesystem\Filesystem(),
        $capsule->getEventDispatcher()
    );

    $migrationDir = dirname(__DIR__).'/database/migrations';
    $files = glob($migrationDir.'/*.php');
    sort($files);
    
    $stage = 'migrations_run';
    $db->getPdo()->exec("SET GLOBAL log_bin_trust_function_creators = 1;");
    $migrator->run($files);

    $stage = 'seed_accounts';
    $hasher = new \Illuminate\Hashing\BcryptHasher(['rounds' => 12]);
    $defaultPassword = getenv('EVAL_SEED_PASSWORD') ?: 'DefaultDevPassword2026!';
    $hashedPassword = $hasher->make($defaultPassword);

    $accounts = [
        ['role' => 'director_admin', 'login' => 'director', 'name' => 'Director de desarrollo'],
        ['role' => 'vice_principal', 'login' => 'subdirector', 'name' => 'Subdirector de desarrollo'],
        ['role' => 'teacher', 'login' => 'docente', 'name' => 'Docente de desarrollo'],
        ['role' => 'student', 'login' => 'estudiante', 'name' => 'Estudiante de desarrollo'],
    ];

    $actors = [];
    foreach ($accounts as $acc) {
        $login = $acc['login'];
        $role = $acc['role'];
        $name = $acc['name'];

        $existing = $db->table('local_credentials')->where('login', $login)->first();
        if (!$existing) {
            $id = (string)$db->table('retained_identities')->insertGetId(['credential_status' => 'active']);
            $db->table('local_credentials')->insert(['id' => $id, 'login' => $login, 'password' => $hashedPassword]);
            $db->table('local_role_grants')->insert(['identity_id' => $id, 'role' => $role]);
            $db->table('retained_identity_profiles')->insert(['identity_id' => $id, 'display_name' => $name]);
            $storedHash = $hashedPassword;
        } else {
            $id = (string)$existing->id;
            $storedHash = (string)$existing->password;
        }
        $actors[$role] = new \App\Infrastructure\Authentication\AuthenticatedActor($id, [$role], hash('sha256', $storedHash));
    }

    $stage = 'academic_seed';
    $vice = $actors['vice_principal'];
    $periodCmd = new \App\Application\Academic\Commands\AcademicPeriodCommands($db);
    $catalog = new \App\Application\Academic\Commands\AcademicCatalogCommands($db);

    $period = $db->table('academic_periods')->where('name', 'EVAL desarrollo 2026')->value('id');
    if ($period === null) {
        $period = $periodCmd->create($vice, ['name' => 'EVAL desarrollo 2026', 'start_on' => '2026-01-01', 'end_on' => '2026-12-31']);
        $periodCmd->activate($vice, $period);
    }

    $grade = $db->table('grades')->where('name', '2.º')->value('id');
    if ($grade === null) {
        $grade = $catalog->create($vice, 'grade', ['name' => '2.º']);
    }

    $section = $db->table('sections')->where('grade_id', $grade)->where('name', 'B')->value('id');
    if ($section === null) {
        $section = $catalog->create($vice, 'section', ['name' => 'B', 'grade_id' => (string)$grade]);
    }

    $entry = $db->table('instructional_entries')->where('name', 'Matemática')->where('kind', 'subject')->value('id');
    if ($entry === null) {
        $entry = $catalog->create($vice, 'entry', ['name' => 'Matemática', 'kind' => 'subject']);
    }

    $tables = $db->select('SHOW TABLES');
    $migrationRows = $db->table('migrations')->count();

    echo json_encode([
        'status' => 'OK',
        'tables_count' => count($tables),
        'migrations_count' => $migrationRows,
        'accounts_seeded' => count($actors),
        'period_id' => (string)$period,
    ]) . PHP_EOL;

} catch (\Throwable $e) {
    fwrite(STDERR, "CI prepare failed at stage '$stage': " . $e->getMessage() . PHP_EOL);
    exit(1);
}
