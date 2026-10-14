<?php

declare(strict_types=1);

$stage = 'binding';
try {
    require __DIR__.'/config.php';
    if (!evalDevBinding(getenv()) || getenv('EVAL_DB_ROLE') !== 'migration') {
        throw new RuntimeException();
    }
    $stage = 'connection';
    $capsule = require dirname(__DIR__).'/scripts/database.php';
    $row = $capsule->getConnection()->selectOne('SELECT 1 AS ready');
    if ((int) ($row->ready ?? 0) !== 1) {
        throw new RuntimeException();
    }
    echo "ready\n";
} catch (Throwable $error) {
    $diagnostic='';
    if($error instanceof Illuminate\Database\QueryException){
        $sqlState=(string)($error->errorInfo[0]??'unknown');
        $driverCode=(string)($error->errorInfo[1]??'unknown');
        if(!preg_match('/^[A-Z0-9]{5}$/',$sqlState))$sqlState='unknown';
        if(!preg_match('/^[0-9]{1,5}$/',$driverCode))$driverCode='unknown';
        $diagnostic="; sqlstate=$sqlState; driver=$driverCode";
    }
    fwrite(STDERR, "Development database is not query-ready at $stage$diagnostic.\n");
    exit(2);
}
