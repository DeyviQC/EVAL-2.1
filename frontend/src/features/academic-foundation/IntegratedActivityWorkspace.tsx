import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ActivityCard} from './ActivityWorkspace.js';
import {AcademicApiError} from './api.js';
import {type Activity,type ActivityClient,type EducationCourse} from './activities.js';
import {CourseClassroomButtons} from './CourseClassroomButtons.js';
import {emptyClassroom,selectedClassroom,type CourseClassroom,type CourseClassroomSelection} from './course-classrooms.js';

const button='inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const field='mt-1.5 block w-full rounded-xl border border-border bg-surface text-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';

export function IntegratedActivityWorkspace({
  client,
  onExpired,
  teacherMode=false,
  classroom,
  onClassroomChange,
  initialFilter='all',
}: {
  client:ActivityClient;
  mode:'activities'|'deliveries'|'grades';
  onExpired:()=>void;
  teacherMode?:boolean;
  classroom?:CourseClassroomSelection;
  onClassroomChange?:(value:CourseClassroomSelection)=>void;
  initialFilter?:'all'|'pending'|'submitted';
}){
  const [local,setLocal]=useState(emptyClassroom()),
    [classrooms,setClassrooms]=useState<CourseClassroom[]>([]),
    [courses,setCourses]=useState<EducationCourse[]>([]),
    [courseAfter,setCourseAfter]=useState<string|null>(null),
    [selected,setSelected]=useState(''),
    [rows,setRows]=useState<Activity[]>([]),
    [after,setAfter]=useState<string|null>(null),
    [busy,setBusy]=useState(false),
    [notice,setNotice]=useState(''),
    [confirmed,setConfirmed]=useState(false),
    [creating,setCreating]=useState(false),
    [blocked,setBlocked]=useState(client.isUncertain()),
    [tabFilter,setTabFilter]=useState<'all'|'pending'|'closed'>(initialFilter==='pending'?'pending':'all');

  const scope=classroom??local,generation=useRef(0),writing=useRef(false);

  function fail(e:unknown){
    if(e instanceof AcademicApiError&&[401,419].includes(e.status??0)){onExpired();return;}
    setNotice(e instanceof AcademicApiError&&e.outcomeUnknown?'No se pudo confirmar la operación. Consulta el resultado antes de continuar.':'No se pudo completar la operación. Revisa los datos y vuelve a consultar.');
    setBlocked(client.isUncertain());
  }

  async function load(id=selected,append=false){
    const token=++generation.current;
    setBusy(true);
    setConfirmed(false);
    try{
      const page=await client.activities(id,append?after:null);
      if(token!==generation.current)return;
      setRows(old=>append?[...old,...page.items]:page.items);
      setAfter(page.next_after);
      setConfirmed(true);
      setBlocked(client.isUncertain());
    }catch(e){
      if(token===generation.current){setRows([]);setAfter(null);fail(e);}
    }finally{
      if(token===generation.current)setBusy(false);
    }
  }

  useEffect(()=>{
    const token=++generation.current;
    setCourses([]);
    setSelected('');
    setRows([]);
    setAfter(null);
    setCourseAfter(null);
    setConfirmed(false);
    setCreating(false);
    setBusy(true);

    void(async()=>{
      try{
        if(teacherMode){
          const metadata=await client.classrooms();
          if(token!==generation.current)return;
          setClassrooms(metadata);
          if(!selectedClassroom(metadata,scope))return;
        }
        const page=await client.courses(null,teacherMode?scope:undefined);
        if(token===generation.current){
          setCourses(page.items);
          setCourseAfter(page.next_after);
          // Auto-seleccionar primer curso para evitar pantallas vacías
          if(page.items.length>0){
            const first=page.items[0];
            if(first){
              setSelected(first.id);
              void load(first.id);
            }
          }
        }
      }catch(e){
        if(token===generation.current)fail(e);
      }finally{
        if(token===generation.current)setBusy(false);
      }
    })();
    return()=>{generation.current++;};
  },[client,teacherMode,scope.gradeId,scope.sectionId]);

  async function moreCourses(){
    const token=generation.current;
    setBusy(true);
    try{
      const page=await client.courses(courseAfter,teacherMode?scope:undefined);
      if(token===generation.current){
        setCourses(old=>[...old,...page.items]);
        setCourseAfter(page.next_after);
      }
    }catch(e){
      if(token===generation.current)fail(e);
    }finally{
      if(token===generation.current)setBusy(false);
    }
  }

  async function publish(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(writing.current||client.isUncertain())return;
    const form=e.currentTarget,data=new FormData(form);
    writing.current=true;
    setBusy(true);
    setNotice('');
    try{
      await client.publish(selected,String(data.get('title')),String(data.get('instructions')),String(data.get('due_on'))||null);
      form.reset();
      setCreating(false);
      setNotice('Actividad publicada correctamente.');
      await load();
    }catch(error){
      fail(error);
    }finally{
      writing.current=false;
      setBusy(false);
    }
  }

  const course=courses.find(c=>c.id===selected);
  const filteredRows=rows.filter(r=>{
    if(tabFilter==='pending')return r.state==='open';
    if(tabFilter==='closed')return r.state==='closed';
    return true;
  });

  return (
    <section aria-label="Actividades" aria-busy={busy} className="space-y-6">
      <header className="border-b border-border/80 pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
            TAREAS Y SEGUIMIENTO
          </span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-normal text-text tracking-tight">Actividades</h2>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          {teacherMode
            ? 'Gestiona tareas, recibe entregas y califica el aprendizaje de tus estudiantes.'
            : 'Consulta tus tareas pendientes, envía tus evidencias y revisa las calificaciones de tus docentes.'}
        </p>
      </header>

      {notice && (
        <div className="p-3.5 rounded-xl bg-surface-2 border border-border text-xs text-text">
          <p role="status">{notice}</p>
        </div>
      )}

      {teacherMode && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <CourseClassroomButtons
            rows={classrooms}
            value={scope}
            disabled={busy}
            onChange={(value)=>{
              setSelected('');
              setRows([]);
              if(onClassroomChange)onClassroomChange(value);
              else setLocal(value);
            }}
          />
        </div>
      )}

      {/* Selector visual de cursos mediante tarjetas interactivas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text uppercase tracking-wider">
            {teacherMode ? 'Cursos asignados' : 'Tus cursos matriculados'}
          </span>
          {courses.length > 0 && (
            <span className="text-xs text-text-muted">
              {courses.length} {courses.length === 1 ? 'curso disponible' : 'cursos disponibles'}
            </span>
          )}
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {courses.map((c) => {
              const isCurrent = c.id === selected;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (c.id !== selected) {
                      setSelected(c.id);
                      setRows([]);
                      setAfter(null);
                      setCreating(false);
                      void load(c.id);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-primary/5 dark:bg-primary/10 border-primary text-text shadow-xs ring-1 ring-primary'
                      : 'bg-surface hover:bg-surface-2 text-text border-border hover:border-primary/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isCurrent ? 'bg-primary animate-pulse' : 'bg-text-muted/40'
                        }`}
                      />
                      <h4 className="font-bold text-xs sm:text-sm text-text truncate">
                        {c.label}
                      </h4>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1 truncate">
                      {isCurrent ? 'Curso activo' : 'Clic para ver tareas'}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-surface-2 text-text-muted border border-border'
                    }`}
                  >
                    {isCurrent ? 'Activo' : 'Ver'}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          !busy && (
            <div className="p-6 bg-surface border border-border rounded-xl text-center">
              <p className="text-xs text-text-muted">No tienes cursos asignados en este período.</p>
            </div>
          )
        )}

        {courseAfter && (
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => void moreCourses()}
          >
            + Más cursos
          </button>
        )}

        {/* Selector HTML accesible para compatibilidad y pruebas */}
        <div className="sr-only">
          <label>
            Curso
            <select
              aria-label="Curso"
              className={field}
              value={selected}
              disabled={busy}
              onChange={(e) => {
                setSelected(e.target.value);
                setRows([]);
                setAfter(null);
                setCreating(false);
                if (e.target.value) void load(e.target.value);
                else {
                  generation.current++;
                  setConfirmed(false);
                }
              }}
            >
              <option value="">Selecciona tu curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Pestañas de filtrado (Todas, Pendientes, Cerradas) y acciones */}
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-border/70 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setTabFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tabFilter === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Todas ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tabFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Pendientes ({rows.filter((r) => r.state === 'open').length})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('closed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tabFilter === 'closed'
                  ? 'bg-surface-2 text-text shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Cerradas ({rows.filter((r) => r.state === 'closed').length})
            </button>
          </div>

          <div className="eval-activity-actions flex flex-wrap gap-2">
            <button className={button} disabled={busy} onClick={() => void load()}>
              Actualizar actividades
            </button>
            {course?.can_publish && (
              <button
                className={button + ' bg-accent text-navy-950 font-bold border-transparent hover:bg-accent-hover'}
                disabled={busy || blocked}
                aria-expanded={creating}
                onClick={() => setCreating(!creating)}
              >
                {creating ? 'Cancelar creación' : '+ Nueva actividad'}
              </button>
            )}
          </div>
        </div>
      )}

      {blocked && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2">
          <p>No repitas la operación. Consulta el curso o la entrega antes de revisar el resultado.</p>
          <button
            className={button}
            disabled={busy || !client.canReview()}
            onClick={() => {
              client.review();
              setBlocked(false);
            }}
          >
            He revisado el resultado
          </button>
        </div>
      )}

      {creating && course?.can_publish && (
        <form
          aria-label="Crear actividad"
          onSubmit={(e) => void publish(e)}
          className="my-5 rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
          <fieldset disabled={busy || blocked} className="space-y-4">
            <legend className="text-base font-bold text-text">Crear actividad</legend>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider">
              Título
              <input name="title" className={field} required maxLength={200} />
            </label>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider">
              Instrucciones
              <textarea name="instructions" className={field} required rows={4} maxLength={10000} />
            </label>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider">
              Fecha límite (opcional)
              <input name="due_on" className={field} type="date" />
            </label>
            <p className="text-xs text-text-muted">La fecha límite no cierra automáticamente las entregas.</p>
            <button className={button + ' bg-primary text-white hover:bg-primary-hover border-transparent'}>
              Publicar actividad
            </button>
          </fieldset>
        </form>
      )}

      {filteredRows.map((row) => (
        <ActivityCard
          key={selected + ':' + row.id}
          activity={row}
          client={client}
          mode="deliveries"
          teacherMode={teacherMode}
          initialPanel={initialFilter === 'submitted' ? 'deliveries' : null}
          onExpired={onExpired}
        />
      ))}

      {selected && confirmed && !busy && rows.length > 0 && filteredRows.length === 0 && (
        <div className="p-8 text-center bg-surface border border-border rounded-xl">
          <p className="text-sm font-semibold text-text">
            {tabFilter === 'pending'
              ? '¡Excelente trabajo! No tienes actividades pendientes en este curso.'
              : 'No hay actividades en esta sección.'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Puedes cambiar de pestaña o seleccionar otro curso para revisar tus trabajos.
          </p>
        </div>
      )}

      {selected && confirmed && !busy && rows.length === 0 && (
        <div className="p-8 text-center bg-surface border border-border rounded-xl">
          <p className="text-sm text-text-muted">No hay actividades publicadas para este curso.</p>
        </div>
      )}

      {after && (
        <button className={button} disabled={busy} onClick={() => void load(selected, true)}>
          Más actividades
        </button>
      )}
    </section>
  );
}
