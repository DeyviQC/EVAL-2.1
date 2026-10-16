<?php
declare(strict_types=1);

/**
 * EVAL Migration Runner for All Database Migrations
 * Executes all 20 migrations in sequence using Illuminate Database Migrator.
 */

$stage = 'init';
try {
    require_once dirname(__DIR__).'/bootstrap.php';
    require_once __DIR__.'/config.php';

    if (!evalDevBinding(getenv())) {
        throw new RuntimeException('Invalid dev environment binding. Check EVAL_UNIT, host, port, user.');
    }
    if (getenv('EVAL_DB_ROLE') !== 'migration') {
        throw new RuntimeException('Migration execution requires EVAL_DB_ROLE=migration.');
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

    $stage = 'run';
    $migrator->run($files);

    // Count tables and migrations
    $tables = $db->select('SHOW TABLES');
    $migrationRows = $db->table('migrations')->count();

    echo json_encode([
        'status' => 'OK',
        'tables_count' => count($tables),
        'migrations_count' => $migrationRows,
        'files_found' => count($files),
    ]) . PHP_EOL;

} catch (Throwable $e) {
    fwrite(STDERR, "Migration failed at stage '$stage': " . $e->getMessage() . PHP_EOL);
    exit(1);
}
