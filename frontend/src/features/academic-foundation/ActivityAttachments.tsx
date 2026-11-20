import { useRef } from 'react';
import { CheckCircle2, AlertTriangle, Paperclip, X, ExternalLink, Download, Film, UploadCloud } from 'lucide-react';
import { activityAttachmentUrl, type ActivityAttachment } from './activities.js';
import { isInlineMime, isVideoMime, materialAccept, materialLimit } from './materials.js';

export const maxActivityAttachments = 10;
const allowedExtPattern = /\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|mp4|webm|mov|ogv)$/i;

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.ceil(bytes / 1024))} KiB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

export function attachmentBadge(filename: string, mime = '') {
  const ext = filename.split('.').pop()?.toUpperCase() ?? 'DOC';
  if (ext === 'PDF' || mime === 'application/pdf') {
    return { ext: 'PDF', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' };
  }
  if (['DOC', 'DOCX'].includes(ext) || mime.includes('word')) {
    return { ext, cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
  }
  if (['PPT', 'PPTX'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    return { ext, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' };
  }
  if (['XLS', 'XLSX'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) {
    return { ext, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' };
  }
  if (['JPG', 'JPEG', 'PNG'].includes(ext) || mime.startsWith('image/')) {
    return { ext, cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' };
  }
  if (['MP4', 'WEBM', 'MOV', 'OGV'].includes(ext) || mime.startsWith('video/')) {
    return { ext, cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800' };
  }
  return { ext, cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
}

export function validateAttachmentSelection(
  incoming: File[],
  existing: File[]
): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  let total = existing.length;

  for (const file of incoming) {
    if (total >= maxActivityAttachments) {
      errors.push(`Máximo ${maxActivityAttachments} archivos por actividad.`);
      break;
    }
    if (/[\x00-\x1f\x7f\\/]/.test(file.name) || file.name.length > 255) {
      errors.push(`"${file.name}": nombre de archivo no permitido.`);
      continue;
    }
    if (!allowedExtPattern.test(file.name)) {
      errors.push(`"${file.name}": formato no permitido (usa PDF, Word, PowerPoint, Excel, JPG/PNG o video MP4/WebM/MOV/OGV).`);
      continue;
    }
    if (file.size < 1) {
      errors.push(`"${file.name}": el archivo está vacío.`);
      continue;
    }
    if (file.size > materialLimit) {
      errors.push(`"${file.name}": supera el límite de 150 MiB.`);
      continue;
    }
    if (existing.some(f => f.name === file.name && f.size === file.size) || accepted.some(f => f.name === file.name && f.size === file.size)) {
      continue;
    }
    accepted.push(file);
    total++;
  }
  return { accepted, errors };
}

export type UploadProgressState = {
  currentIndex: number;
  totalFiles: number;
  filename: string;
  percent: number;
};

export function NoticeBanner({
  tone,
  text,
}: {
  tone: 'success' | 'error';
  text: string;
}) {
  if (tone === 'success') {
    return (
      <div
        role="status"
        className="eval-inline-notice flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 p-3.5 text-xs font-medium text-emerald-900 dark:text-emerald-200 animate-in fade-in"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span>{text}</span>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="eval-inline-notice flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 p-3.5 text-xs text-amber-900 dark:text-amber-200"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export function ActivityAttachmentPicker({
  id,
  files,
  onChange,
  error,
  onError,
  disabled = false,
  progress = null,
}: {
  id: string;
  files: File[];
  onChange: (next: File[]) => void;
  error: string;
  onError: (message: string) => void;
  disabled?: boolean;
  progress?: UploadProgressState | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(list: FileList | null) {
    if (!list || list.length === 0) return;
    const { accepted, errors } = validateAttachmentSelection(Array.from(list), files);
    if (accepted.length > 0) {
      onChange([...files, ...accepted]);
    }
    onError(errors.join(' '));
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
        Materiales adjuntos (opcional)
      </label>
      <div className="rounded-xl border border-dashed border-border bg-surface-2/60 p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <UploadCloud className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>Adjunta guías, fichas, imágenes o videos directamente a esta actividad.</span>
          </div>
          <span className="text-[11px] font-medium text-text-muted">
            {files.length}/{maxActivityAttachments} archivos
          </span>
        </div>

        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          disabled={disabled || files.length >= maxActivityAttachments}
          accept={materialAccept}
          onChange={event => handleSelect(event.target.files)}
          className="block w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer cursor-pointer border border-border rounded-lg bg-surface p-1.5 disabled:opacity-50"
        />

        <p className="text-[11px] text-text-muted">
          Formatos permitidos: PDF, Word, PowerPoint, Excel, JPG/PNG o Video (MP4/WebM/MOV/OGV) · Hasta 150 MiB por archivo · Sin macros
        </p>

        {error && (
          <p role="alert" className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-2.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {files.length > 0 && (
          <ul className="space-y-1.5 pt-1" aria-label="Archivos seleccionados para adjuntar">
            {files.map((file, idx) => {
              const badge = attachmentBadge(file.name, file.type);
              return (
                <li
                  key={`${file.name}-${file.size}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.cls}`}>
                      {badge.ext}
                    </span>
                    <span className="truncate font-medium text-text">{file.name}</span>
                    <span className="shrink-0 text-[11px] text-text-muted">({formatAttachmentSize(file.size)})</span>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Quitar ${file.name}`}
                    onClick={() => {
                      onChange(files.filter((_, i) => i !== idx));
                      onError('');
                    }}
                    className="p-1 rounded text-text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {progress && (
          <div role="status" aria-live="polite" className="rounded-lg border border-emerald-300/70 dark:border-emerald-700/70 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-emerald-900 dark:text-emerald-200">
              <span className="truncate">
                Subiendo archivo {progress.currentIndex} de {progress.totalFiles}: {progress.filename}
              </span>
              <span className="shrink-0 font-bold">{progress.percent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface border border-border overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-150"
                style={{ width: `${Math.max(4, progress.percent)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivityAttachmentsList({
  attachments,
  compact = false,
}: {
  attachments?: ActivityAttachment[] | undefined;
  compact?: boolean;
}) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <section
      aria-label="Materiales adjuntos de la actividad"
      className={compact ? 'mt-2.5 space-y-2' : 'my-3 rounded-xl border border-border bg-surface-2/70 p-3.5 space-y-2.5'}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
        <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
        <span>
          {attachments.length === 1 ? 'Material adjunto (1)' : `Materiales adjuntos (${attachments.length})`}
        </span>
      </div>

      <ul className="space-y-2">
        {attachments.map(att => {
          const badge = attachmentBadge(att.filename, att.mime);
          const video = isVideoMime(att.mime);
          const inline = isInlineMime(att.mime);
          return (
            <li
              key={att.id}
              className="rounded-lg border border-border bg-surface p-2.5 space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.cls}`}>
                    {badge.ext}
                  </span>
                  <span className="font-medium text-text break-all">{att.filename}</span>
                  <span className="shrink-0 text-[11px] text-text-muted">· {formatAttachmentSize(att.bytes)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {inline && (
                    <a
                      href={activityAttachmentUrl(att.id, 'inline')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-surface-2 hover:bg-surface-3 text-text font-semibold text-[11px] transition-colors"
                    >
                      {video ? <Film className="w-3 h-3 text-primary" aria-hidden="true" /> : <ExternalLink className="w-3 h-3 text-primary" aria-hidden="true" />}
                      <span>{video ? 'Abrir video' : 'Abrir material'}</span>
                    </a>
                  )}
                  <a
                    href={activityAttachmentUrl(att.id, 'attachment')}
                    download
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold text-[11px] shadow-2xs transition-colors"
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    <span>Descargar material</span>
                  </a>
                </div>
              </div>

              {video && (
                <video
                  controls
                  preload="metadata"
                  src={activityAttachmentUrl(att.id, 'inline')}
                  className="w-full max-h-56 rounded-lg bg-black border border-border"
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
