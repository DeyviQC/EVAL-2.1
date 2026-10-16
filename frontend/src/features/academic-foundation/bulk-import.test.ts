import {
  parseCsv,
  validateStudentImport,
  validateTeacherImport,
  generateStudentCsvTemplate,
  generateTeacherCsvTemplate,
  exportCredentialsCsv,
} from './bulk-import.js';

const assert = {
  equal: (actual: unknown, expected: unknown) => {
    if (actual !== expected) throw new Error(`Equality failed: ${String(actual)} !== ${String(expected)}`);
  },
  deepEqual: (actual: unknown, expected: unknown) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Structure failed: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
    }
  },
};

export const bulkImportCases: [string, () => unknown][] = [
  [
    'parseCsv handles commas, semicolons, tabs, and quoted strings',
    () => {
      // 1. Comma with BOM and quotes
      const csv1 = '\uFEFFDNI,NOMBRE,GRADO\r\n"71234567","QUISPE, MARIA",1\r\n72345678,LUCIA,1';
      const parsed1 = parseCsv(csv1);
      assert.deepEqual(parsed1.headers, ['DNI', 'NOMBRE', 'GRADO']);
      assert.equal(parsed1.rows.length, 2);
      assert.equal(parsed1.rows[0]?.[1], 'QUISPE, MARIA');

      // 2. Semicolon
      const csv2 = 'DNI;NOMBRE;GRADO\n71234567;MARIA;1\n72345678;LUCIA;1';
      const parsed2 = parseCsv(csv2);
      assert.deepEqual(parsed2.headers, ['DNI', 'NOMBRE', 'GRADO']);
      assert.equal(parsed2.rows.length, 2);

      // 3. Tab delimited
      const csv3 = 'DNI\tNOMBRE\r\n71234567\tMARIA';
      const parsed3 = parseCsv(csv3);
      assert.deepEqual(parsed3.headers, ['DNI', 'NOMBRE']);
      assert.equal(parsed3.rows.length, 1);
    },
  ],
  [
    'validateStudentImport correctly identifies valid rows and reports row errors',
    () => {
      const grades = [
        { id: '1', name: '1° de Secundaria' },
        { id: '2', name: '2° de Secundaria' },
      ];
      const sections = [
        { id: '10', name: 'Sección A' },
        { id: '11', name: 'Sección B' },
      ];

      const headers = ['DNI', 'APELLIDOS_Y_NOMBRES', 'GRADO', 'SECCION'];
      const rows = [
        ['71234567', 'QUISPE FLORES, MARIA', '1', 'A'], // Valid
        ['123', 'CORTO', '1', 'A'],                     // Invalid DNI (too short)
        ['71234567', 'DUPLICADA', '1', 'A'],             // Duplicate DNI
        ['72345678', 'X', '1', 'A'],                     // Name too short
        ['73456789', 'MENDOZA, BEATRIZ', '9', 'A'],      // Invalid Grade 9
        ['74567890', 'ROJAS, CARMEN', '1', 'Z'],         // Invalid Section Z
      ];

      const result = validateStudentImport(headers, rows, grades, sections);

      assert.equal(result.valid.length, 1);
      const student = result.valid[0];
      if (!student) throw new Error('Expected student to be defined');
      assert.equal(student.dni, '71234567');
      assert.equal(student.username, 'estudiante.71234567');
      assert.equal(student.gradeId, '1');
      assert.equal(student.sectionId, '10');

      assert.equal(result.errors.length, 6);
      // Row numbers start at 2 (Row 1 is header)
      assert.equal(result.errors[0]?.row, 3); // row index 1 -> fila 3
      assert.equal(result.errors[0]?.field, 'DNI');
      assert.equal(result.errors[1]?.row, 4); // duplicate DNI
      assert.equal(result.errors[2]?.row, 4); // duplicate username
      assert.equal(result.errors[3]?.row, 5); // short name
      assert.equal(result.errors[4]?.row, 6); // invalid grade
      assert.equal(result.errors[5]?.row, 7); // invalid section
    },
  ],
  [
    'validateTeacherImport validates teacher roster and generates usernames',
    () => {
      const headers = ['DNI', 'APELLIDOS_Y_NOMBRES', 'USUARIO'];
      const rows = [
        ['41234567', 'SALAZAR MEDINA, JORGE', 'jorge.salazar'],
        ['42345678', 'CARDENAS HUAMAN, ROSA', ''], // Auto-generates docente.42345678
        ['abc', 'DOCENTE INVALIDO', 'usuario.invalido'], // Invalid DNI
      ];

      const result = validateTeacherImport(headers, rows);
      assert.equal(result.valid.length, 2);
      assert.equal(result.valid[0]?.username, 'jorge.salazar');
      assert.equal(result.valid[1]?.username, 'docente.42345678');
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0]?.field, 'DNI');
    },
  ],
  [
    'templates and credentials export contain institutional headers and UTF-8 BOM',
    () => {
      const studentTpl = generateStudentCsvTemplate();
      assert.equal(studentTpl.startsWith('\uFEFF'), true);
      assert.equal(studentTpl.includes('DNI,APELLIDOS_Y_NOMBRES'), true);

      const teacherTpl = generateTeacherCsvTemplate();
      assert.equal(teacherTpl.startsWith('\uFEFF'), true);
      assert.equal(teacherTpl.includes('DNI,APELLIDOS_Y_NOMBRES,USUARIO'), true);

      const exported = exportCredentialsCsv([
        {
          name: 'QUISPE FLORES, MARIA',
          username: 'estudiante.71234567',
          password: 'XyZ1234567890AbCdEf!',
          role: 'student',
          gradeName: '1° de Secundaria',
          sectionName: 'Sección A',
          enrollmentStatus: 'enrolled',
        },
      ]);
      assert.equal(exported.startsWith('\uFEFF'), true);
      assert.equal(exported.includes('I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO'), true);
      assert.equal(exported.includes('REPORTE OFICIAL DE CREDENCIALES INICIALES'), true);
      assert.equal(exported.includes('"estudiante.71234567"'), true);
      assert.equal(exported.includes('"XyZ1234567890AbCdEf!"'), true);
      assert.equal(exported.includes('"Matriculada"'), true);
    },
  ],
];
