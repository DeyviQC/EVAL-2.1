<?php
declare(strict_types=1);
$stage = 'binding';
try {
    require __DIR__.'/config.php';
    if (!evalDevBinding(getenv()) || getenv('EVAL_DB_ROLE') !== 'migration') {
        throw new RuntimeException();
    }
    $capsule = require dirname(__DIR__).'/scripts/database.php';
    $db = $capsule->getConnection();
    $stage = 'bimester_migration';

    $repository = new Illuminate\Database\Migrations\DatabaseMigrationRepository($capsule->getDatabaseManager(), 'migrations');
    if (!$repository->repositoryExists()) {
        throw new RuntimeException();
    }
    $migrator = new Illuminate\Database\Migrations\Migrator($repository, $capsule->getDatabaseManager(), new Illuminate\Filesystem\Filesystem, $capsule->getEventDispatcher());
    $migrator->run([dirname(__DIR__).'/database/migrations/2026_10_16_000020_create_bimester_grade_closures.php']);

    $stage = 'bimester_grants';
    $db->unprepared("GRANT SELECT, INSERT(period_id,bimester_number,state,closed_by,closed_at,reopened_by,reopened_at,justification,operation_key,recorded_at,created_at,updated_at), UPDATE(state,closed_by,closed_at,reopened_by,reopened_at,justification,operation_key,recorded_at,updated_at) ON eval_dev.bimester_grade_closures TO 'eval_dev_runtime'@'127.0.0.1'");

    echo json_encode([
        'bimester_migration' => true,
        'runtime_grants' => 'bimester-closures DML',
        'reseed' => false,
        'reset' => false
    ]) . PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, 'Bimester maintenance failed at ' . $stage . ': ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
