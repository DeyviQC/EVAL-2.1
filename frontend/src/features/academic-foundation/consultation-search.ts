/** Accent-insensitive page-local matching; never implies server-wide results. */
export function consultationMatch(query:string,...values:string[]):boolean{
 const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
 return normalize(query).split(/\s+/).every(word=>normalize(values.join(' ')).includes(word));
}
