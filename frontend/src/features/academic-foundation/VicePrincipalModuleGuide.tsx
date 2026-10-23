type Guide = { title: string; description: string; steps: string[]; note?: string };

const guides: Record<string, Guide> = {
  periods: {
    title: 'Períodos académicos',
    description: 'Define los períodos que organizan el trabajo escolar. Cada período tiene un nombre, una fecha de inicio, una fecha de fin y un estado.',
    steps: ['Consulta los períodos existentes.', 'Crea uno nuevo indicando nombre y fechas.', 'Solicita su activación o cierre y revisa el estado confirmado.'],
    note: 'Al cerrar un período, se conserva el historial y se bloquea nuevo trabajo dentro de ese período.',
  },
  catalog: {
    title: 'Grados, secciones y áreas',
    description: 'Mantén la estructura que después se usa para matricular estudiantes y asignar docentes a las aulas.',
    steps: ['Elige si vas a consultar materias y áreas, grados o secciones.', 'Crea o cambia el nombre del registro.', 'Activa o desactiva solo el registro que corresponda.'],
    note: 'Cada sección debe pertenecer al grado correcto.',
  },
  enrollments: {
    title: 'Matrículas',
    description: 'Registra en qué período, grado y sección estudiará cada alumno. También puedes consultar su situación actual y su trayectoria.',
    steps: ['Selecciona período, grado y sección.', 'Busca al estudiante o revisa la lista.', 'Matricula, traslada o cierra una matrícula; después consulta el aula y el historial.'],
    note: 'Un traslado y un cierre conservan el registro anterior para consulta.',
  },
  assignments: {
    title: 'Asignaciones docentes',
    description: 'Indica qué docente atenderá una materia o área en un aula durante un período académico.',
    steps: ['Selecciona período, grado y sección.', 'Consulta las asignaciones del aula.', 'Planifica, activa, reemplaza o cierra la asignación según su estado.'],
    note: 'Al reemplazar a un docente, la asignación anterior queda conservada en el historial.',
  },
  users: {
    title: 'Usuarios',
    description: 'Administra las cuentas que permiten ingresar a EVAL a estudiantes y docentes.',
    steps: ['Busca por nombre o usuario y filtra por tipo o estado.', 'Crea la cuenta individual o revisa una carga masiva.', 'Cuando corresponda, activa, desactiva o restablece el acceso.'],
    note: 'Crear una cuenta no matricula al estudiante ni asigna cursos al docente.',
  },
  calendar: {
    title: 'Calendario institucional',
    description: 'Consulta y prepara las fechas del período, con bimestres, semanas lectivas y bloques de gestión académica.',
    steps: ['Selecciona un período y consulta su calendario actual.', 'Prepara un borrador y revisa bloques y fechas.', 'Guarda el borrador; publica solo después de confirmar la referencia aprobada.'],
    note: 'Las semanas organizan el contenido académico; no cambian fechas límite ni cierran períodos.',
  },
  supervision: {
    title: 'Supervisión de materiales',
    description: 'Revisa los recursos que un docente publicó en sus cursos y comunícate con el autor mediante observaciones privadas.',
    steps: ['Elige año, grado, sección y curso.', 'Abre el material que deseas revisar.', 'Envía una observación al docente y consulta su respuesta.'],
    note: 'La observación acompaña al docente; no es una aprobación necesaria para publicar.',
  },
  reports: {
    title: 'Reportes académicos',
    description: 'Resume la actividad de un aula para que puedas revisar entregas recibidas, pendientes y calificaciones registradas.',
    steps: ['Selecciona período, grado y sección.', 'Consulta el reporte y revisa totales y resultados por estudiante.', 'Usa las opciones de impresión o descarga disponibles en pantalla.'],
    note: 'El reporte refleja los datos registrados; no crea ni cambia calificaciones.',
  },
  history: {
    title: 'Historial académico',
    description: 'Permite consultar los antecedentes de matrículas y asignaciones docentes que se conservaron al hacer cambios.',
    steps: ['Elige el tipo de historial.', 'Consulta los registros y revisa período, aula, estado y fechas.', 'Carga la página siguiente si necesitas más resultados.'],
    note: 'Esta pantalla es de consulta: no modifica los registros anteriores.',
  },
  audit: {
    title: 'Bitácora de auditoría',
    description: 'Muestra los eventos académicos registrados para que puedas ubicar qué operación ocurrió y revisar sus detalles.',
    steps: ['Filtra por tipo de entidad o escribe una búsqueda.', 'Consulta los eventos coincidentes en orden.', 'Abre los detalles y continúa a la página siguiente si aparece.'],
    note: 'La bitácora sirve como evidencia de consulta; no es un formulario para cambiar los datos.',
  },
  notifications: {
    title: 'Notificaciones',
    description: 'Reúne avisos relacionados con tu cuenta y permite identificar cuáles todavía no has leído.',
    steps: ['Consulta los avisos recientes.', 'Lee el mensaje y su fecha.', 'Marca como leídos los avisos que ya revisaste o consulta avisos anteriores.'],
  },
  account: {
    title: 'Mi cuenta',
    description: 'Muestra tu perfil y las opciones personales disponibles para mantener seguro tu acceso a EVAL.',
    steps: ['Revisa el nombre y usuario de tu cuenta.', 'Sigue las indicaciones si se solicita un cambio de contraseña.', 'Cierra sesión al terminar y vuelve a ingresar para comprobar el acceso.'],
  },
};

export function VicePrincipalModuleGuide({ section }: { section: string }) {
  const guide = guides[section];
  if (!guide) return null;
  return (
    <details key={section} className="vp-guide-disclosure" aria-label={`Guía de ${guide.title}`}>
      <summary>Ayuda para este apartado</summary>
      <div className="vp-module-guide">
      <div className="vp-module-guide-copy">
        <p>{guide.description}</p>
        {guide.note && <p className="vp-module-guide-note"><strong>Ten en cuenta:</strong> {guide.note}</p>}
      </div>
      <div className="vp-module-guide-steps">
        <h3>Pasos habituales</h3>
        <ol>{guide.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
      </div>
      </div>
    </details>
  );
}
