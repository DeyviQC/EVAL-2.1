import {type CourseClassroom,type CourseClassroomSelection} from './course-classrooms.js';

export function isCleanSecondaryGrade(name: string): boolean {
  const clean = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/verificaci|test|prueba|synthetic|nota|actividad|file|report|maintenance|observation|library|notification/i.test(clean)) {
    return false;
  }
  const isNumbered = /^[1-5](\.?[°º]|ero|do|ro|to)?(\s*(de\s+)?secundaria)?$/i.test(clean);
  const isNamed = /^(primero|segundo|tercero|cuarto|quinto)(\s*(de\s+)?secundaria)?$/i.test(clean);
  return isNumbered || isNamed;
}

const secondaryRank: Record<string, number> = {
  '1': 1, '1.º': 1, '1.°': 1, '1°': 1, 'primero': 1, '1ero': 1,
  '2': 2, '2.º': 2, '2.°': 2, '2°': 2, 'segundo': 2, '2do': 2,
  '3': 3, '3.º': 3, '3.°': 3, '3°': 3, 'tercero': 3, '3ro': 3,
  '4': 4, '4.º': 4, '4.°': 4, '4°': 4, 'cuarto': 4, '4to': 4,
  '5': 5, '5.º': 5, '5.°': 5, '5°': 5, 'quinto': 5, '5to': 5,
};

function getGradeRank(name: string): number {
  const clean = name.trim().toLowerCase().replace(/\s+de\s+secundaria/g, '');
  return secondaryRank[clean] ?? 99;
}

export function CourseClassroomButtons({rows,value,onChange,disabled=false}:{rows:CourseClassroom[];value:CourseClassroomSelection;onChange:(value:CourseClassroomSelection)=>void;disabled?:boolean}){
  const cleanRows = rows.filter(r => isCleanSecondaryGrade(r.grade));
  const effectiveRows = cleanRows.length > 0 ? cleanRows : rows;

  const grades = [...new Map(effectiveRows.map(row => [row.grade_id, { id: row.grade_id, name: row.grade }])).values()]
    .sort((a, b) => {
      const rankDiff = getGradeRank(a.name) - getGradeRank(b.name);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, 'es', { numeric: true });
    });

  const sections = effectiveRows
    .filter(row => row.grade_id === value.gradeId)
    .sort((a, b) => a.section.localeCompare(b.section, 'es', { numeric: true }));

  return (
    <section className="eval-classroom-filters space-y-3" aria-label="Seleccionar aula de mis cursos">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-text text-sm sm:text-base">Elige tu aula</h4>
        <span className="text-[11px] font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded border border-border">
          Nivel Secundaria
        </span>
      </div>
      <fieldset className="mt-2">
        <legend className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Grado</legend>
        <div className="eval-classroom-buttons flex flex-wrap gap-2">
          {grades.map(grade => (
            <button
              type="button"
              key={grade.id}
              disabled={disabled}
              aria-pressed={grade.id === value.gradeId}
              onClick={() => onChange({ gradeId: grade.id, sectionId: '' })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                grade.id === value.gradeId
                  ? 'bg-primary text-white shadow-xs font-semibold ring-2 ring-primary/30'
                  : 'bg-surface-2 text-text border border-border hover:bg-surface-3'
              }`}
            >
              {grade.name}
            </button>
          ))}
        </div>
      </fieldset>
      {value.gradeId && (
        <fieldset className="mt-3 pt-3 border-t border-border/60">
          <legend className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Sección</legend>
          <div className="eval-classroom-buttons flex flex-wrap gap-2">
            {sections.map(section => (
              <button
                type="button"
                key={section.section_id}
                disabled={disabled}
                aria-pressed={section.section_id === value.sectionId}
                onClick={() => onChange({ gradeId: value.gradeId, sectionId: section.section_id })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  section.section_id === value.sectionId
                    ? 'bg-primary text-white shadow-xs font-semibold ring-2 ring-primary/30'
                    : 'bg-surface-2 text-text border border-border hover:bg-surface-3'
                }`}
              >
                Sección {section.section}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {!value.sectionId && (
        <p className="mt-3 text-xs text-text-muted flex items-center gap-1.5">
          <span>ℹ️</span>
          <span>{value.gradeId ? 'Selecciona una sección para mostrar sus cursos.' : 'Selecciona primero un grado y luego una sección.'}</span>
        </p>
      )}
    </section>
  );
}
