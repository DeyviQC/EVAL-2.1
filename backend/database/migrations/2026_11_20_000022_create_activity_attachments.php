<?php
declare(strict_types=1);
use Illuminate\Database\Capsule\Manager as DB;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration {
    public function up(): void
    {
        if (!DB::schema()->hasTable('activity_attachments')) {
            DB::schema()->create('activity_attachments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('activity_id')->constrained('activity_references')->restrictOnDelete()->restrictOnUpdate();
                $table->foreignId('author_id')->constrained('retained_identities')->restrictOnDelete()->restrictOnUpdate();
                $table->string('filename', 255);
                $table->char('storage_key', 64)->unique();
                $table->string('mime', 128);
                $table->unsignedBigInteger('bytes');
                $table->char('sha256', 64);
                $table->unsignedBigInteger('operation_key')->unique();
                $table->dateTime('created_at', 6);
                $table->index(['activity_id', 'id']);
            });
            DB::connection()->statement('ALTER TABLE activity_attachments ADD CONSTRAINT activity_attachment_bounds CHECK (bytes BETWEEN 1 AND 157286400 AND CHAR_LENGTH(filename) BETWEEN 1 AND 255 AND operation_key BETWEEN 1 AND 9223372036854775807)');
            foreach (['UPDATE', 'DELETE'] as $op) {
                DB::connection()->unprepared("CREATE TRIGGER activity_attachments_no_" . strtolower($op) . " BEFORE $op ON activity_attachments FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Retain activity attachments'");
            }
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Retain activity attachments; forward repair only.');
    }
};
