<?php
declare(strict_types=1);
use Illuminate\Database\Capsule\Manager as DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        if (DB::schema()->hasTable('course_materials')) {
            try {
                DB::connection()->statement('ALTER TABLE course_materials DROP CHECK material_bounds');
            } catch (\Throwable) {
                // Constraint may already have been replaced.
            }
            DB::connection()->statement('ALTER TABLE course_materials ADD CONSTRAINT material_bounds CHECK (bytes BETWEEN 1 AND 157286400 AND publication_key BETWEEN 1 AND 9223372036854775807)');
        }
        if (DB::schema()->hasTable('material_file_versions')) {
            try {
                DB::connection()->statement('ALTER TABLE material_file_versions DROP CHECK material_file_bounds');
            } catch (\Throwable) {
                // Constraint may already have been replaced.
            }
            DB::connection()->statement('ALTER TABLE material_file_versions ADD CONSTRAINT material_file_bounds CHECK (bytes BETWEEN 1 AND 157286400 AND CHAR_LENGTH(filename) BETWEEN 1 AND 255)');
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Retain expanded material bounds; forward repair only.');
    }
};
