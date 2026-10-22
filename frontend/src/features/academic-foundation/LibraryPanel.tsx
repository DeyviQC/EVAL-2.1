import { RecordedTime } from './RecordedTime.js';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AcademicApiError } from './api.js';
import { materialFileUrl, type Material, type createMaterialClient } from './materials.js';
import type { Course } from './courses.js';
import { MaterialsPanel } from './MaterialsPanel.js';
import { Search, Download, ExternalLink, FileText, ArrowLeft, RefreshCw, UploadCloud, BookOpen } from 'lucide-react';

function getFileBadge(filename: string) {
  const ext = filename.split('.').pop()?.toUpperCase() ?? 'DOC';
  if (['PDF'].includes(ext)) return { ext, color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
  if (['DOC', 'DOCX'].includes(ext)) return { ext, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
  if (['PPT', 'PPTX'].includes(ext)) return { ext, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
  if (['XLS', 'XLSX'].includes(ext)) return { ext, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
  if (['JPG', 'JPEG', 'PNG'].includes(ext)) return { ext, color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
  return { ext, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
}

export function LibraryPanel({client,course,onExpired,teacherMode=false,initialPosition,onPosition}:{client:ReturnType<typeof createMaterialClient>;course:Course;onExpired:()=>void;teacherMode?:boolean;initialPosition?:{query:string;cursor:string|null}|undefined;onPosition?:((position:{query:string;cursor:string|null})=>void)|undefined}){
  const [term,setTerm]=useState(initialPosition?.query??''),[searched,setSearched]=useState(''),[rows,setRows]=useState<Material[]>([]),[after,setAfter]=useState<string|null>(null),[busy,setBusy]=useState(true),[confirmed,setConfirmed]=useState(false),[error,setError]=useState(''),[publication,setPublication]=useState(false);
  const generation=useRef(0);

  async function load(query:string,cursor:string|null=null){
    const current=++generation.current;setBusy(true);setError('');setConfirmed(false);setRows([]);setAfter(null);
    try{
      const page=await client.search(course.id,query,cursor);
      if(current!==generation.current)return;
       setRows(page.items);setAfter(page.next_after);setSearched(query.trim());setConfirmed(true);onPosition?.({query:query.trim(),cursor});
    }catch(e){
      if(current!==generation.current)return;
      if(e instanceof AcademicApiError&&[401,419].includes(e.status??0)){onExpired();return;}
      setError('No se pudo consultar la biblioteca. Revisa la búsqueda y vuelve a consultar.');
    }finally{
      if(current===generation.current)setBusy(false);
    }
  }

  useEffect(()=>{void load(initialPosition?.query??'',initialPosition?.cursor??null);return ()=>{generation.current++;};},[course.id,client]);

  function search(event:FormEvent){event.preventDefault();void load(term);}

  if(publication)return <MaterialsPanel teacherMode={teacherMode} course={course} client={client} onExpired={onExpired} onBack={()=>{setPublication(false);void load(term);}}/>;

  return (
    <section aria-label="Biblioteca del curso" aria-busy={busy} className="my-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-soft/60 px-2.5 py-0.5 rounded-full">
              RECURSOS DIGITALES
            </span>
          </div>
          <h4 className="font-serif text-2xl sm:text-3xl font-normal text-text tracking-tight">
            Biblioteca
          </h4>
          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl">
            Busca en los materiales disponibles de este curso por título, descripción o nombre de archivo.
          </p>
        </div>
        {course.can_publish && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shadow-xs"
            disabled={busy}
            onClick={() => setPublication(true)}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Publicar o consultar materiales</span>
          </button>
        )}
      </div>

      {/* Buscador moderno */}
      <form onSubmit={search} className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <label htmlFor="library-search" className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
          Buscar materiales
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="library-search"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface-2 text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              placeholder="Buscar por título, contenido o nombre de archivo..."
              value={term}
              disabled={busy}
              maxLength={100}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 shadow-xs"
            disabled={busy}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar</span>
          </button>
        </div>
        <p className="text-[11px] text-text-muted">
          Hasta 100 caracteres. Deja la búsqueda vacía para consultar los materiales disponibles.
        </p>
      </form>

      {busy && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-surface border border-border text-xs text-text-muted">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p role="status">Consultando biblioteca…</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs">
          <p role="alert">{error}</p>
        </div>
      )}

      {confirmed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <p role="status">{rows.length} resultados en esta página.</p>
            {searched && (
              <span className="bg-surface-2 border border-border px-2.5 py-0.5 rounded-full text-[11px]">
                Filtro: &ldquo;{searched}&rdquo;
              </span>
            )}
          </div>

          {rows.length === 0 && (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-surface/50">
              <BookOpen className="w-10 h-10 mx-auto text-text-muted opacity-40 mb-3" />
              <p className="text-sm font-medium text-text">No hay materiales que coincidan con esta búsqueda.</p>
              <p className="text-xs text-text-muted mt-1">Intenta con otros términos o limpia el buscador.</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => {
              const badge = getFileBadge(r.filename);
              return (
                <article
                  key={r.id}
                  aria-label={r.title}
                  className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}>
                        {badge.ext}
                      </span>
                      <p className="text-[11px] text-text-muted">
                        <RecordedTime value={r.published_at} />
                      </p>
                    </div>

                    <h5 className="font-serif text-lg font-medium text-text leading-snug tracking-tight">
                      {r.title}
                    </h5>

                    {r.description && (
                      <p className="my-2.5 text-xs text-text-muted line-clamp-3 whitespace-pre-wrap leading-relaxed">
                        {r.description}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-border/60 text-[11px] text-text-muted space-y-1">
                      <p>
                        Publicado por <strong className="text-text font-medium">{r.author_name}</strong>
                      </p>
                      <p className="break-words font-mono text-[10px] text-text-muted/80">
                        {r.filename}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 flex flex-wrap gap-2.5 border-t border-border/60">
                    <a
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 text-text hover:bg-surface-3 text-xs font-medium transition-all"
                      href={materialFileUrl(r.id, 'inline')}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                      <span>Abrir</span>
                    </a>
                    <a
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark text-xs font-medium transition-all shadow-xs"
                      href={materialFileUrl(r.id, 'attachment')}
                      download
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="my-6 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface text-text hover:bg-surface-2 text-xs font-medium transition-all"
              disabled={busy}
              onClick={() => void load(term)}
            >
              <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
              <span>Volver al inicio de la búsqueda</span>
            </button>
            {after && (
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark text-xs font-semibold transition-all shadow-xs"
                disabled={busy || term.trim() !== searched}
                onClick={() => void load(searched, after)}
              >
                <span>Página siguiente de materiales</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
