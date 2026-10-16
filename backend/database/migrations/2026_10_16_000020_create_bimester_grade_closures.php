<?php

declare(strict_types=1);

use Illuminate\Database\Capsule\Manager as DB;
use Illuminate\Database\Connection;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration {
    public function up(?Connection $connection = null): void
    {
        $db = $connection ?? DB::connection();
        $schema = $db->getSchemaBuilder();

        $schema->create('bimester_grade_closures', function (Blueprint $t) {
            $t->id();
            $t->foreignId('period_id')->constrained('academic_periods')->restrictOnDelete()->restrictOnUpdate();
            $t->unsignedTinyInteger('bimester_number');
            $t->string('state', 16)->default('open');
            $t->foreignId('closed_by')->nullable()->constrained('retained_identities')->restrictOnDelete()->restrictOnUpdate();
            $t->dateTime('closed_at', 6)->nullable();
            $t->foreignId('reopened_by')->nullable()->constrained('retained_identities')->restrictOnDelete()->restrictOnUpdate();
            $t->dateTime('reopened_at', 6)->nullable();
            $t->string('justification', 500)->nullable();
            $t->unsignedBigInteger('operation_key');
            $t->dateTime('recorded_at', 6);
            $t->timestamps();
            $t->unique(['period_id', 'bimester_number'], 'uq_period_bimester');
        });

        $db->statement('ALTER TABLE bimester_grade_closures ADD CONSTRAINT chk_bimester_number CHECK (bimester_number BETWEEN 1 AND 4)');
        $db->statement("ALTER TABLE bimester_grade_closures ADD CONSTRAINT chk_bimester_state CHECK (state IN ('open', 'locked'))");
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve bimester closure history; forward repair only.');
    }
};
