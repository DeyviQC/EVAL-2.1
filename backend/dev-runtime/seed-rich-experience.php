<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
if (!evalDevBinding(getenv()) || getenv('EVAL_DB_ROLE') !== 'runtime') {
    fwrite(STDERR, "Invalid environment for rich experience seeding\n");
    exit(2);
}
require dirname(__DIR__) . '/bootstrap.php';

use App\Application\Academic\Commands\{CourseMaterials, ActivityDelivery, DeliveryAssessment};
use App\Infrastructure\Persistence\Academic\LocalMaterialStorage;

try {
    $db = Illuminate\Database\Capsule\Manager::connection();

    $actor = function (string $login) use ($db) {
        $c = $db->table('local_credentials')->where('login', $login)->first();
        if (!$c) throw new RuntimeException("Missing actor: $login");
        return new App\Infrastructure\Authentication\AuthenticatedActor(
            (string)$c->id,
            $db->table('local_role_grants')->where('identity_id', $c->id)->pluck('role')->all(),
            App\Infrastructure\Authentication\CredentialRevision::current($db, (string)$c->id, $c->password)
        );
    };

    $student = $actor('estudiante');
    $mainTeacher = $actor('docente');
    $subdirector = $actor('subdirector');

    $period = $db->table('academic_periods')->where('state', 'active')->first();
    if (!$period) throw new RuntimeException('Active period required');

    $todayDt = new DateTimeImmutable('today', new DateTimeZone('America/Lima'));
    $today = $todayDt->format('Y-m-d');
    $tomorrow = $todayDt->modify('+1 day')->format('Y-m-d');
    $in3Days = $todayDt->modify('+3 days')->format('Y-m-d');
    $in4Days = $todayDt->modify('+4 days')->format('Y-m-d');
    $in7Days = $todayDt->modify('+7 days')->format('Y-m-d');
    $in10Days = $todayDt->modify('+10 days')->format('Y-m-d');

    $root = dirname(__DIR__, 2) . '/.local/eval-dev';
    $materials = new CourseMaterials($db, new LocalMaterialStorage($root . '/materials'));
    $activities = new ActivityDelivery($db, new LocalMaterialStorage($root . '/deliveries'));
    $assessments = new DeliveryAssessment($db);

    // Find student's enrollment and classroom
    $enrollment = $db->table('student_enrollments')
        ->where('student_id', $student->identityId)
        ->where('academic_period_id', $period->id)
        ->where('state', 'active')
        ->first();
    if (!$enrollment) throw new RuntimeException('Student not enrolled');

    $gradeId = $enrollment->grade_id;
    $sectionId = $enrollment->section_id;

    // Helper for PDF generation
    $pdf = function (array $lines): string {
        $content = "BT /F1 12 Tf 50 790 Td ";
        foreach ($lines as $i => $line) {
            if ($i) $content .= "0 -22 Td ";
            $line = iconv('UTF-8', 'Windows-1252//TRANSLIT', $line);
            $content .= '(' . str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line) . ") Tj ";
        }
        $content .= 'ET';
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            "<< /Length " . strlen($content) . " >>\nstream\n" . $content . "\nendstream"
        ];
        $result = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $i => $object) {
            $offsets[] = strlen($result);
            $result .= ($i + 1) . " 0 obj\n" . $object . "\nendobj\n";
        }
        $xref = strlen($result);
        $result .= "xref\n0 6\n0000000000 65535 f \n";
        foreach (array_slice($offsets, 1) as $offset) {
            $result .= sprintf('%010d 00000 n ', $offset) . "\n";
        }
        return $result . "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF\n";
    };

    // Get courses in 2.º B
    $courses = $db->table('teaching_assignments as a')
        ->join('instructional_entries as e', 'e.id', '=', 'a.instructional_entry_id')
        ->where('a.grade_id', $gradeId)
        ->where('a.section_id', $sectionId)
        ->where('a.academic_period_id', $period->id)
        ->where('a.state', 'active')
        ->select('a.id', 'e.name as area_name', 'a.teacher_id')
        ->get()
        ->keyBy('area_name');

    // Get other students in 2.º B for teacher grading practice
    $otherStudents = $db->table('student_enrollments as e')
        ->join('local_credentials as c', 'c.id', '=', 'e.student_id')
        ->where('e.grade_id', $gradeId)
        ->where('e.section_id', $sectionId)
        ->where('e.academic_period_id', $period->id)
        ->where('e.student_id', '!=', $student->identityId)
        ->select('c.login', 'e.student_id')
        ->limit(6)
        ->get();

    $otherActors = [];
    foreach ($otherStudents as $os) {
        $otherActors[] = $actor($os->login);
    }

    $inputTemp = tempnam($root, 'rich-data-');
    $createdCount = ['materials' => 0, 'activities' => 0, 'deliveries' => 0, 'assessments' => 0];

    try {
        // =====================================================================
        // 1. EXTRA MATERIALS ACROSS SUBJECTS
        // =====================================================================
        $newMaterials = [
            'Matemática' => [
                'title' => 'Guía de Aprendizaje N° 4: Ecuaciones y Presupuesto Familiar',
                'description' => 'Ficha teórica y práctica para modelar situaciones financieras cotidianas con ecuaciones de primer grado.',
                'filename' => 'guia-04-ecuaciones-presupuesto.pdf',
                'lines' => [
                    'I.E. Nuestra Señora de las Mercedes - EVAL 2026',
                    'Área: Matemática - Segundo Grado',
                    'Tema: Ecuaciones lineales aplicadas a la economía doméstica',
                    '1. Concepto de variable e igualdad matemática.',
                    '2. Pasos para plantear una ecuación a partir de un problema verbal.',
                    '3. Caso de estudio: Presupuesto semanal de la feria dominical.',
                    '4. Actividades de autoevaluación y meta-cognición.'
                ]
            ],
            'Comunicación' => [
                'title' => 'Módulo de Lectura Crítica: José María Arguedas y la Narrativa Andina',
                'description' => 'Antología de textos seleccionados y guía de análisis discursivo sobre la identidad pluricultural.',
                'filename' => 'modulo-arguedas-narrativa-andina.pdf',
                'lines' => [
                    'I.E. Nuestra Señora de las Mercedes - EVAL 2026',
                    'Área: Comunicación - Segundo Grado',
                    'Lectura: Los ríos profundos (fragmento)',
                    '1. Contexto sociocultural de la literatura indigenista.',
                    '2. Identificación de la tesis y los argumentos del autor.',
                    '3. Glosario de términos quechuas y su significado simbólico.',
                    '4. Preguntas para el debate en el aula.'
                ]
            ],
            'Ciencia y Tecnología' => [
                'title' => 'Manual de Laboratorio: Propiedades Fisicoquímicas del Agua',
                'description' => 'Procedimientos experimentales para medir pH, turbidez y presencia de sales en muestras locales.',
                'filename' => 'manual-lab-analisis-agua.pdf',
                'lines' => [
                    'I.E. Nuestra Señora de las Mercedes - EVAL 2026',
                    'Área: Ciencia y Tecnología - Segundo Grado',
                    'Práctica de Laboratorio N° 2: Calidad del recurso hídrico',
                    '1. Medidas de bioseguridad en el laboratorio escolar.',
                    '2. Métodos de separación de mezclas y filtración por gravedad.',
                    '3. Registro de observaciones cualitativas y cuantitativas.',
                    '4. Elaboración de conclusiones fundamentadas.'
                ]
            ],
            'Ciencias Sociales' => [
                'title' => 'Compendio Histórico: Rutas de los Libertadores y Huamanga Virreinal',
                'description' => 'Fuentes documentales primarias y secundarias sobre la participación regional en la Independencia.',
                'filename' => 'compendio-huamanga-virreinal.pdf',
                'lines' => [
                    'I.E. Nuestra Señora de las Mercedes - EVAL 2026',
                    'Área: Ciencias Sociales - Segundo Grado',
                    'Módulo 3: Huamanga en los siglos XVIII y XIX',
                    '1. Organización social y circuitos comerciales coloniales.',
                    '2. El rol de María Parado de Bellido y las heroínas ayacuchanas.',
                    '3. Análisis de fuentes iconográficas y mapas de la época.',
                    '4. Línea de tiempo interactiva.'
                ]
            ],
            'Desarrollo Personal, Ciudadanía y Cívica' => [
                'title' => 'Guía de Trabajo: Convivencia Democrática y Cultura de Paz',
                'description' => 'Casos prácticos de resolución no violenta de conflictos y construcción de acuerdos institucionales.',
                'filename' => 'guia-dpcc-cultura-paz.pdf',
                'lines' => [
                    'I.E. Nuestra Señora de las Mercedes - EVAL 2026',
                    'Área: DPCC - Segundo Grado',
                    'Unidad 2: Construyendo espacios seguros en la escuela',
                    '1. La empatía y la asertividad como herramientas de diálogo.',
                    '2. Mecanismos escolares de mediación y conciliación.',
                    '3. Nuestros derechos y deberes en el reglamento institucional.',
                    '4. Propuesta de acuerdos de convivencia para 2.º B.'
                ]
            ],
            'Arte y Cultura' => [
                'title' => 'Catálogo de Arte Popular: Tablas de Sarhua y Retablos Ayacuchanos',
                'description' => 'Reseña de maestros artesanos, técnicas pictóricas tradicionales y simbolismo andino.',
                'filename' => 'catalogo-arte-popular-sarhua.pdf',
                'lines' => [
                    'I.E. Nuestra Señora de las Mercedes - EVAL 2026',
                    'Área: Arte y Cultura - Segundo Grado',
                    'Módulo: Tradición e innovación en el arte ayacuchano',
                    '1. Historia y proceso de elaboración de las Tablas de Sarhua.',
                    '2. Estructura y composición narrativa del retablo tradicional.',
                    '3. Preparación de pigmentos naturales y soportes de madera.',
                    '4. Bocetado guiado paso a paso.'
                ]
            ],
        ];

        foreach ($newMaterials as $area => $mat) {
            if (!isset($courses[$area])) continue;
            $course = $courses[$area];
            $tActor = $course->teacher_id === $mainTeacher->identityId ? $mainTeacher : $actor($db->table('local_credentials')->where('id', $course->teacher_id)->value('login'));

            $exists = $db->table('course_materials')
                ->where('assignment_id', $course->id)
                ->where('title', $mat['title'])
                ->exists();

            if (!$exists) {
                file_put_contents($inputTemp, $pdf($mat['lines']));
                $materials->publish(
                    $tActor,
                    (string)$course->id,
                    ['title' => $mat['title'], 'description' => $mat['description']],
                    $inputTemp,
                    $mat['filename']
                );
                $createdCount['materials']++;
            }
        }

        // =====================================================================
        // 2. NEW REALISTIC ACTIVITIES WITH TARGETED DUE DATES & STATUSES
        // =====================================================================
        $activitiesToCreate = [
            // A) DUE TODAY -> Student PENDING (shows red badge "Vence hoy")
            [
                'area' => 'Ciencia y Tecnología',
                'title' => 'Informe de indagación: Métodos de filtración y purificación de agua',
                'instructions' => "Estimadas estudiantes de 2.º B:\n\nPara esta sesión de laboratorio, deben presentar su informe breve sobre el experimento de purificación de agua.\n\nEstructura solicitada:\n1. Pregunta de indagación e hipótesis formulada.\n2. Materiales utilizados (arena fina, carbón vegetal, algodón, grava).\n3. Registro gráfico o fotográfico del proceso.\n4. Conclusión: ¿Qué porcentaje de turbidez se logró reducir?\n\nRecuerden que la entrega debe ser clara, concisa y basada en datos observados.",
                'due_on' => $today,
                'student_action' => 'pending', // Do NOT submit -> pending
            ],

            // B) DUE TOMORROW -> Student PENDING (shows amber badge "Vence mañana")
            [
                'area' => 'Comunicación',
                'title' => 'Texto argumentativo: El impacto de las tradiciones orales en Ayacucho',
                'instructions' => "Estimada estudiante:\n\nRedacta un texto de tres a cuatro párrafos argumentando cómo las leyendas y mitos transmitidos por nuestros abuelos fortalecen la identidad comunitaria y el sentido de pertenencia en nuestra región.\n\nCriterios de evaluación:\n• Tesis clara en el párrafo introductorio.\n• Dos argumentos sólidos respaldados por ejemplos reales.\n• Conclusión que sintetice las ideas principales.\n• Uso correcto de conectores lógicos y ortografía cuidada.",
                'due_on' => $tomorrow,
                'student_action' => 'pending', // Do NOT submit -> pending
            ],

            // C) DUE IN 4 DAYS -> Student PENDING (shows neutral badge)
            [
                'area' => 'Matemática',
                'title' => 'Taller práctico: Ecuaciones lineales aplicadas a presupuestos familiares',
                'instructions' => "Resuelve los cinco problemas de la ficha adjunta y redacta una breve justificación de tu procedimiento.\n\nSituaciones planteadas:\n1. Cálculo de ganancia y costo en la venta de paltas y chirimoyas.\n2. Distribución proporcional del presupuesto escolar mensual.\n3. Modelo lineal de ahorro para el viaje de estudios.\n\nPuedes escribir tus respuestas directamente en el campo de texto o adjuntar una foto legible de tu cuaderno de trabajo.",
                'due_on' => $in4Days,
                'student_action' => 'pending', // Do NOT submit -> pending
            ],

            // D) DUE IN 7 DAYS -> Student SUBMITTED, AWAITING TEACHER REVIEW (shows "Entregada")
            [
                'area' => 'Desarrollo Personal, Ciudadanía y Cívica',
                'title' => 'Plan de acción: Propuestas para la convivencia democrática en el aula',
                'instructions' => "Identifica una situación de conflicto recurrente en los espacios compartidos (patios, biblioteca o aulas) y elabora tres acuerdos de convivencia concretos para prevenirlo y resolverlo mediante el diálogo asertivo.",
                'due_on' => $in7Days,
                'student_action' => 'submit_only', // Submit but DO NOT grade -> Awaiting review
                'student_answer' => "He observado que durante los recreos a veces surgen discusiones por el uso de la losa deportiva.\n\nMis propuestas son:\n1. Elaborar un cronograma semanal equitativo por grados y secciones para el uso de la cancha.\n2. Nombrar dos mediadoras de paz por cada sección de 2.º grado encargadas de recordar los acuerdos.\n3. Implementar un buzón de sugerencias en el aula para dialogar durante la hora de tutoría.",
            ],

            // E) DUE IN 10 DAYS -> Student SUBMITTED AND GRADED 'AD' with encouraging feedback
            [
                'area' => 'Arte y Cultura',
                'title' => 'Proyecto visual: Boceto de retablo con iconografía ayacuchana',
                'instructions' => "Diseña en una hoja bond o cartulina el boceto de un retablo tradicional de dos niveles que represente una festividad o tradición de Ayacucho (por ejemplo, Semana Santa, Carnaval o la fiesta de la Virgen de las Mercedes).\n\nDescribe en tu entrega los colores seleccionados y el significado de los personajes.",
                'due_on' => $in10Days,
                'student_action' => 'submit_and_grade',
                'student_answer' => "Adjunto la descripción de mi boceto del Retablo Mercedesino:\n\nNivel superior: La Virgen de las Mercedes rodeada de flores andinas (cantutas y retamas) con detalles dorados.\nNivel inferior: Estudiantes de nuestra institución rindiendo homenaje con trajes típicos de marinera ayacuchana.\nColores: Azul marino institucional, dorado ceremonial y rojo cálido para las vestimentas.",
                'grade' => 'AD',
                'feedback' => "¡Extraordinario trabajo! Tu boceto tiene un balance compositivo impecable y una sensibilidad profunda hacia la identidad mercedesina. La distribución de los niveles respeta la tradición del retablo huamanguino mientras incorpora elementos propios de nuestro colegio. ¡Felicitaciones por tu creatividad y dedicación!",
            ],

            // F) INGLÉS -> Student SUBMITTED AND GRADED 'A'
            [
                'area' => 'Inglés como Lengua Extranjera',
                'title' => 'Short essay: Traditional festivities and celebrations in Ayacucho',
                'instructions' => "Write a short composition (between 80 and 120 words) describing your favorite festivity in Ayacucho.\n\nUse present simple, frequency adverbs (always, usually, sometimes), and adjectives to describe the food, costumes, and music.",
                'due_on' => $in7Days,
                'student_action' => 'submit_and_grade',
                'student_answer' => "My favorite celebration in Ayacucho is the Carnival. It usually takes place in February. During this festivity, people wear colorful traditional clothes and dance in the main square. We always listen to beautiful huaynos and eat delicious typical dishes like puchero. It is a wonderful celebration of our culture and unity.",
                'grade' => 'A',
                'feedback' => "Great job! Your composition is well-organized and uses the vocabulary and grammatical structures studied in class accurately. Watch out for punctuation marks between compound clauses. Keep up the excellent work!",
            ],
        ];

        foreach ($activitiesToCreate as $item) {
            $area = $item['area'];
            if (!isset($courses[$area])) continue;
            $course = $courses[$area];
            $tActor = $course->teacher_id === $mainTeacher->identityId ? $mainTeacher : $actor($db->table('local_credentials')->where('id', $course->teacher_id)->value('login'));

            // Check if activity already exists
            $actId = $db->table('activity_references as r')
                ->join('activity_contents as c', 'c.activity_id', '=', 'r.id')
                ->where('r.teaching_assignment_id', $course->id)
                ->where('c.title', $item['title'])
                ->value('r.id');

            if ($actId === null) {
                $created = $activities->write($tActor, 'publish', (string)$course->id, [
                    'title' => $item['title'],
                    'instructions' => $item['instructions'],
                    'due_on' => $item['due_on'],
                ]);
                $actId = (string)$created['id'];
                $createdCount['activities']++;
            }

            // Student action
            if ($item['student_action'] === 'submit_only' || $item['student_action'] === 'submit_and_grade') {
                $delivery = $db->table('activity_deliveries')
                    ->where('activity_id', $actId)
                    ->where('student_id', $student->identityId)
                    ->first();

                if (!$delivery) {
                    $subResult = $activities->write($student, 'submit', (string)$actId, [
                        'answer' => $item['student_answer'] ?? 'Respuesta de prueba',
                    ]);
                    $createdCount['deliveries']++;
                    $delivery = $db->table('activity_deliveries')->where('submission_id', $subResult['id'])->first();
                }

                if ($item['student_action'] === 'submit_and_grade' && $delivery && $delivery->current_assessment_id === null) {
                    $assessments->assess($tActor, (string)$delivery->submission_id, [
                        'grade' => $item['grade'],
                        'feedback' => $item['feedback'],
                        'expected_version_id' => (string)$delivery->current_version_id,
                        'expected_assessment_id' => null,
                    ]);
                    $createdCount['assessments']++;
                }
            }

            // Also have 2 or 3 other students submit work so the teacher has items to grade!
            if ($course->teacher_id === $mainTeacher->identityId) {
                foreach (array_slice($otherActors, 0, 3) as $idx => $otherAct) {
                    $otherDel = $db->table('activity_deliveries')
                        ->where('activity_id', $actId)
                        ->where('student_id', $otherAct->identityId)
                        ->first();

                    if (!$otherDel) {
                        $otherSub = $activities->write($otherAct, 'submit', (string)$actId, [
                            'answer' => "Respuesta presentada por la estudiante: He desarrollado los puntos solicitados para {$item['title']} aplicando los conceptos revisados en clase.",
                        ]);
                        $createdCount['deliveries']++;
                        $otherDel = $db->table('activity_deliveries')->where('submission_id', $otherSub['id'])->first();
                    }

                    // Leave student 1 unassessed, grade student 2 with 'A'
                    if ($idx === 1 && $otherDel && $otherDel->current_assessment_id === null) {
                        $assessments->assess($tActor, (string)$otherDel->submission_id, [
                            'grade' => 'A',
                            'feedback' => 'Buen trabajo. Has estructurado la información de forma coherente.',
                            'expected_version_id' => (string)$otherDel->current_version_id,
                            'expected_assessment_id' => null,
                        ]);
                        $createdCount['assessments']++;
                    }
                }
            }
        }

    } finally {
        if (is_file($inputTemp)) unlink($inputTemp);
    }

    echo json_encode([
        'status' => 'success',
        'created' => $createdCount,
        'message' => 'Rich experience data successfully seeded'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;

} catch (Throwable $e) {
    fwrite(STDERR, "Seeding failed: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n");
    exit(2);
}
