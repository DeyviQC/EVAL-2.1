<?php
declare(strict_types=1);
require __DIR__.'/config.php';
if (!evalDevBinding(getenv()) || !in_array(getenv('EVAL_DB_ROLE'), ['runtime', 'migration'], true)) {
    exit(2);
}
require dirname(__DIR__).'/bootstrap.php';

try {
    $db = Illuminate\Database\Capsule\Manager::connection();
    $hasher = new Illuminate\Hashing\BcryptHasher(['rounds' => 12]);

    // 1. Limpiar o resetear intentos fallidos de login para evitar bloqueos
    try {
        $db->table('local_login_limits')->delete();
    } catch (\Throwable) {
        $db->table('local_login_limits')->update(['attempts' => 0, 'window_started' => time()]);
    }

    // 2. Período y aula para matriculación
    $period = $db->table('academic_periods')->where('state', 'active')->orWhere('name', 'EVAL desarrollo 2026')->first();
    $grade = $db->table('grades')->where('name', '2.º')->value('id');
    $section = $db->table('sections')->where('grade_id', $grade)->where('name', 'B')->value('id');

    // 3. Cuentas de estudiantes de 6 caracteres (usuario = contraseña)
    $students = [
        ['login' => 'estu01', 'name' => 'Carlos Huamán Quispe'],
        ['login' => 'estu02', 'name' => 'Luciana Paredes Vega'],
        ['login' => 'estu03', 'name' => 'Mateo Cárdenas Soto'],
        ['login' => 'estu04', 'name' => 'Valeria Flores Ruiz'],
    ];

    $created = [];
    foreach ($students as $s) {
        $login = $s['login'];
        $name = $s['name'];
        $id = $db->table('local_credentials')->where('login', $login)->value('id');

        if ($id === null) {
            $id = (string)$db->table('retained_identities')->insertGetId(['credential_status' => 'active']);
            $db->table('retained_identity_profiles')->insert(['identity_id' => $id, 'display_name' => $name]);
            $db->table('local_credentials')->insert([
                'id' => $id,
                'login' => $login,
                'password' => $hasher->make($login) // password = login (ambos de 6 caracteres)
            ]);
            $db->table('local_role_grants')->insert(['identity_id' => $id, 'role' => 'student']);
            $created[] = $login;
        } else {
            // Asegurar que la contraseña sea exactamente el login
            $db->table('local_credentials')->where('id', $id)->update([
                'password' => $hasher->make($login)
            ]);
        }

        // Matricular en 2.º B si existe el aula y no está matriculado
        if ($period && $grade && $section) {
            $alreadyEnrolled = $db->table('student_enrollments')
                ->where('student_id', $id)
                ->where('academic_period_id', $period->id)
                ->exists();

            if (!$alreadyEnrolled) {
                $db->table('student_enrollments')->insert([
                    'student_id' => $id,
                    'academic_period_id' => (string)$period->id,
                    'grade_id' => (string)$grade,
                    'section_id' => (string)$section,
                    'state' => 'active',
                    'effective_from' => '2026-01-01',
                    'operational_start_key' => 1
                ]);
            }
        }
    }

    echo json_encode(['status' => 'success', 'test_students' => ['estu01', 'estu02', 'estu03', 'estu04'], 'new_created' => $created], JSON_THROW_ON_ERROR) . PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, "Error seeding test students: " . $e->getMessage() . PHP_EOL);
    exit(1);
}
