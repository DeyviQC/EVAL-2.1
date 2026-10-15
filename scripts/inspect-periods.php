<?php
require __DIR__ . '/../backend/dev-runtime/config.php';
require __DIR__ . '/../backend/bootstrap.php';
$db = Illuminate\Database\Capsule\Manager::connection();
$periods = $db->table('academic_periods')->get();
echo "PERIODS:\n";
foreach ($periods as $p) {
    echo "- ID: {$p->id}, Name: '{$p->name}', State: {$p->state}, Start: {$p->start_on}, End: {$p->end_on}\n";
}
$assignments = $db->table('teaching_assignments')->count();
echo "Teaching assignments count: $assignments\n";
$enrollments = $db->table('student_enrollments')->count();
echo "Student enrollments count: $enrollments\n";
$materials = $db->table('course_materials')->count();
echo "Course materials count: $materials\n";
$activities = $db->table('activity_references')->count();
echo "Activities count: $activities\n";
