/**
 * EVAL - Importación Administrativa Masiva de Estudiantes y Docentes
 * I.E. Nuestra Señora de las Mercedes - Ayacucho
 * Procesa archivos CSV/Excel con validación previa sin guardar,
 * reporte de errores por fila y generación de credenciales iniciales.
 */

export type ImportError = {
  row: number;
  field: string;
  value: string;
  message: string;
};

export type ValidStudentRow = {
  row: number;
  dni: string;
  name: string;
  username: string;
  gradeId?: string | undefined;
  gradeName?: string | undefined;
  sectionId?: string | undefined;
  sectionName?: string | undefined;
};

export type ValidTeacherRow = {
  row: number;
  dni: string;
  name: string;
  username: string;
};

export type StudentValidationResult = {
  total: number;
  valid: ValidStudentRow[];
  errors: ImportError[];
};

export type TeacherValidationResult = {
  total: number;
  valid: ValidTeacherRow[];
  errors: ImportError[];
};

export type ImportedCredential = {
  name: string;
  username: string;
  password: string;
  role: 'student' | 'teacher';
  gradeName?: string | undefined;
  sectionName?: string | undefined;
  enrollmentStatus?: 'enrolled' | 'skipped' | 'failed' | undefined;
};

/** Normaliza texto removiendo tildes para comparaciones flexibles de grados y secciones */
export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Parsea un texto CSV delimitado por comas, punto y coma o tabulaciones */
export function parseCsv(raw: string): { headers: string[]; rows: string[][] } {
  const content = raw.replace(/^\uFEFF/, '').trim();
  if (!content) return { headers: [], rows: [] };

  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0 || !lines[0]) return { headers: [], rows: [] };

  // Detectar delimitador inspeccionando la primera línea
  const firstLine = lines[0];
  const countComma = (firstLine.match(/,/g) || []).length;
  const countSemi = (firstLine.match(/;/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;

  const delimiter = countTab > countComma && countTab > countSemi ? '\t' : countSemi > countComma ? ';' : ',';

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const rawHeaders = splitLine(firstLine).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1).map(splitLine);

  return { headers: rawHeaders, rows };
}

/** Valida el archivo CSV de estudiantes contra el catálogo institucional */
export function validateStudentImport(
  rawHeaders: string[],
  rawRows: string[][],
  catalogGrades: { id: string; name: string }[] = [],
  catalogSections: { id: string; name: string; grade_id?: string }[] = []
): StudentValidationResult {
  const errors: ImportError[] = [];
  const valid: ValidStudentRow[] = [];
  const seenDnis = new Set<string>();
  const seenUsernames = new Set<string>();

  // Normalizar encabezados para encontrar índices de columnas
  const headers = rawHeaders.map(normalizeText);
  let colDni = headers.findIndex(h => h.includes('dni') || h.includes('documento'));
  let colName = headers.findIndex(h => h.includes('nombre') || h.includes('apellido') || h.includes('estudiante'));
  let colGrade = headers.findIndex(h => h.includes('grado') || h.includes('año'));
  let colSection = headers.findIndex(h => h.includes('seccion') || h.includes('aula'));
  let colUser = headers.findIndex(h => h.includes('usuario') || h.includes('username') || h.includes('login'));

  // Si no se detectaron nombres estándar, usar posiciones predeterminadas
  if (colDni === -1 && rawHeaders.length >= 2) colDni = 0;
  if (colName === -1 && rawHeaders.length >= 2) colName = 1;
  if (colGrade === -1 && rawHeaders.length >= 3) colGrade = 2;
  if (colSection === -1 && rawHeaders.length >= 4) colSection = 3;

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // Fila 1 es el encabezado
    if (row.length === 0 || row.every(cell => !cell.trim())) return;

    const rawDni = (row[colDni] ?? '').replace(/["']/g, '').trim();
    const rawName = (row[colName] ?? '').replace(/["']/g, '').trim();
    const rawGrade = colGrade !== -1 ? (row[colGrade] ?? '').replace(/["']/g, '').trim() : '';
    const rawSection = colSection !== -1 ? (row[colSection] ?? '').replace(/["']/g, '').trim() : '';
    const rawUser = colUser !== -1 ? (row[colUser] ?? '').replace(/["']/g, '').trim() : '';

    let rowValid = true;

    // 1. Validar DNI (8 dígitos)
    const cleanDni = rawDni.replace(/\D/g, '');
    if (!/^\d{8}$/.test(cleanDni)) {
      errors.push({
        row: rowNum,
        field: 'DNI',
        value: rawDni,
        message: 'El DNI debe tener exactamente 8 dígitos numéricos.',
      });
      rowValid = false;
    } else if (seenDnis.has(cleanDni)) {
      errors.push({
        row: rowNum,
        field: 'DNI',
        value: cleanDni,
        message: 'DNI duplicado dentro del mismo archivo.',
      });
      rowValid = false;
    } else {
      seenDnis.add(cleanDni);
    }

    // 2. Validar Nombre
    if (rawName.length < 2 || rawName.length > 255) {
      errors.push({
        row: rowNum,
        field: 'Nombre',
        value: rawName,
        message: 'El nombre completo debe tener entre 2 y 255 caracteres.',
      });
      rowValid = false;
    }

    // 3. Determinar y validar Nombre de usuario (DNI de 8 dígitos para estudiantes)
    const username = rawUser
      ? rawUser.toLowerCase().trim()
      : cleanDni;

    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username)) {
      errors.push({
        row: rowNum,
        field: 'Usuario',
        value: username,
        message: 'El usuario debe tener de 3 a 64 caracteres válidos (DNI numérico o letras, números, punto o guion).',
      });
      rowValid = false;
    } else if (seenUsernames.has(username)) {
      errors.push({
        row: rowNum,
        field: 'Usuario',
        value: username,
        message: 'Nombre de usuario duplicado dentro del archivo.',
      });
      rowValid = false;
    } else {
      seenUsernames.add(username);
    }

    // Grado y sección son obligatorios: nunca crear una cuenta de estudiante sin aula.
    if (!rawGrade) { errors.push({row:rowNum,field:'Grado',value:'',message:'Indica el grado de la estudiante.'}); rowValid=false; }
    if (!rawSection) { errors.push({row:rowNum,field:'Sección',value:'',message:'Indica la sección de la estudiante.'}); rowValid=false; }
    if (!catalogGrades.length || !catalogSections.length) { errors.push({row:rowNum,field:'Aula',value:'',message:'El catálogo de grados y secciones no está disponible.'}); rowValid=false; }
    let matchedGrade: { id: string; name: string } | undefined;
    if (rawGrade && catalogGrades.length > 0) {
      const normGrade = normalizeText(rawGrade);
      matchedGrade = catalogGrades.find(g => {
        const normG = normalizeText(g.name);
        return normG === normGrade || normG.startsWith(normGrade) || normGrade.startsWith(normG.charAt(0));
      });
      if (!matchedGrade) {
        errors.push({
          row: rowNum,
          field: 'Grado',
          value: rawGrade,
          message: `El grado "${rawGrade}" no existe en el catálogo institucional.`,
        });
        rowValid = false;
      }
    }

    let matchedSection: { id: string; name: string; grade_id?: string } | undefined;
    if (rawSection && catalogSections.length > 0) {
      const normSection = normalizeText(rawSection);
      matchedSection = catalogSections.find(s => (!s.grade_id || s.grade_id === matchedGrade?.id) && (() => {
        const normS = normalizeText(s.name);
        return normS === normSection || normS.includes(normSection) || normSection.includes(normS);
      })());
      if (!matchedSection) {
        errors.push({
          row: rowNum,
          field: 'Sección',
          value: rawSection,
          message: `La sección "${rawSection}" no existe en el catálogo institucional.`,
        });
        rowValid = false;
      }
    }

    if (rowValid) {
      valid.push({
        row: rowNum,
        dni: cleanDni,
        name: rawName,
        username,
        gradeId: matchedGrade?.id,
        gradeName: matchedGrade?.name,
        sectionId: matchedSection?.id,
        sectionName: matchedSection?.name,
      });
    }
  });

  return { total: rawRows.length, valid, errors };
}

/** Valida el archivo CSV de docentes */
export function validateTeacherImport(rawHeaders: string[], rawRows: string[][]): TeacherValidationResult {
  const errors: ImportError[] = [];
  const valid: ValidTeacherRow[] = [];
  const seenDnis = new Set<string>();
  const seenUsernames = new Set<string>();

  const headers = rawHeaders.map(normalizeText);
  let colDni = headers.findIndex(h => h.includes('dni') || h.includes('documento'));
  let colName = headers.findIndex(h => h.includes('nombre') || h.includes('apellido') || h.includes('docente'));
  let colUser = headers.findIndex(h => h.includes('usuario') || h.includes('username') || h.includes('login'));

  if (colDni === -1 && rawHeaders.length >= 2) colDni = 0;
  if (colName === -1 && rawHeaders.length >= 2) colName = 1;
  if (colUser === -1 && rawHeaders.length >= 3) colUser = 2;

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (row.length === 0 || row.every(cell => !cell.trim())) return;

    const rawDni = (row[colDni] ?? '').replace(/["']/g, '').trim();
    const rawName = (row[colName] ?? '').replace(/["']/g, '').trim();
    const rawUser = colUser !== -1 ? (row[colUser] ?? '').replace(/["']/g, '').trim() : '';

    let rowValid = true;

    const cleanDni = rawDni.replace(/\D/g, '');
    if (!/^\d{8}$/.test(cleanDni)) {
      errors.push({
        row: rowNum,
        field: 'DNI',
        value: rawDni,
        message: 'El DNI debe tener exactamente 8 dígitos numéricos.',
      });
      rowValid = false;
    } else if (seenDnis.has(cleanDni)) {
      errors.push({
        row: rowNum,
        field: 'DNI',
        value: cleanDni,
        message: 'DNI duplicado en el archivo.',
      });
      rowValid = false;
    } else {
      seenDnis.add(cleanDni);
    }

    if (rawName.length < 2 || rawName.length > 255) {
      errors.push({
        row: rowNum,
        field: 'Nombre',
        value: rawName,
        message: 'El nombre debe tener entre 2 y 255 caracteres.',
      });
      rowValid = false;
    }

    const username = rawUser
      ? rawUser.toLowerCase().trim()
      : `docente.${cleanDni}`;

    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username)) {
      errors.push({
        row: rowNum,
        field: 'Usuario',
        value: username,
        message: 'El nombre de usuario no es válido (3–64 caracteres alfanuméricos).',
      });
      rowValid = false;
    } else if (seenUsernames.has(username)) {
      errors.push({
        row: rowNum,
        field: 'Usuario',
        value: username,
        message: 'Nombre de usuario duplicado en el archivo.',
      });
      rowValid = false;
    } else {
      seenUsernames.add(username);
    }

    if (rowValid) {
      valid.push({
        row: rowNum,
        dni: cleanDni,
        name: rawName,
        username,
      });
    }
  });

  return { total: rawRows.length, valid, errors };
}

/** Genera la plantilla CSV de estudiantes para descargar */
export function generateStudentCsvTemplate(): string {
  return '\uFEFF' + [
    'DNI,APELLIDOS_Y_NOMBRES,GRADO,SECCION',
    '71234567,"QUISPE FLORES, MARIA ELENA",1,A',
    '72345678,"MENDOZA ROJAS, LUCIA BEATRIZ",1,A',
    '73456789,"HUAMAN CORDOVA, ANA ROSA",1,B',
  ].join('\r\n') + '\r\n';
}

/** Genera la plantilla CSV de docentes para descargar */
export function generateTeacherCsvTemplate(): string {
  return '\uFEFF' + [
    'DNI,APELLIDOS_Y_NOMBRES,USUARIO',
    '41234567,"SALAZAR MEDINA, JORGE ANTONIO",jorge.salazar',
    '42345678,"CARDENAS HUAMAN, ROSA ELENA",rosa.cardenas',
    '43456789,"QUISPE ROJAS, MARIA ISABEL",maria.quispe',
  ].join('\r\n') + '\r\n';
}

/** Exporta las credenciales generadas a un archivo CSV institucional */
export function exportCredentialsCsv(items: ImportedCredential[], exportedBy = 'Subdirección'): string {
  const dateStr = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const lines: string[] = [
    'I.E. NUESTRA SEÑORA DE LAS MERCEDES - AYACUCHO',
    'PLATAFORMA EDUCATIVA EVAL v2.1',
    `REPORTE OFICIAL DE CREDENCIALES INICIALES · Emitido: ${dateStr} · Por: ${exportedBy}`,
    'CONFIDENCIAL: Entregar a cada estudiante/docente. Exige cambio obligatorio en primer inicio.',
    '',
    'TIPO,NOMBRE_COMPLETO,USUARIO,CONTRASENA_PROVISIONAL,GRADO,SECCION,ESTADO_MATRICULA',
  ];

  for (const item of items) {
    const roleLabel = item.role === 'student' ? 'Estudiante' : 'Docente';
    const grade = item.gradeName ?? '-';
    const section = item.sectionName ?? '-';
    const status = item.enrollmentStatus === 'enrolled' ? 'Matriculada' : item.enrollmentStatus === 'failed' ? 'Error matrícula' : 'Sin matrícula';

    lines.push([
      `"${roleLabel}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.username}"`,
      `"${item.password}"`,
      `"${grade}"`,
      `"${section}"`,
      `"${status}"`,
    ].join(','));
  }

  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

/** Descarga un archivo en el navegador del usuario */
export function downloadFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
