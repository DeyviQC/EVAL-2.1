const ordinalNames=['primero','segundo','tercero','cuarto','quinto','sexto'];
function gradeRank(name:string){
 const clean=name.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const named=ordinalNames.findIndex(word=>new RegExp('^'+word+'(?:\\s|$)').test(clean));
 if(named>=0)return named+1;
 const numbered=clean.match(/^(\d+)(?=$|\s|[.°ºª]|ero|do|ro|to)/);
 return numbered?Number(numbered[1]):Number.POSITIVE_INFINITY;
}
export function compareGrades(a:{name:string},b:{name:string}){
 const first=gradeRank(a.name),second=gradeRank(b.name);
 return first===second?a.name.localeCompare(b.name,'es',{numeric:true,sensitivity:'base'}):first<second?-1:1;
}
export function compareSections(a:{name:string},b:{name:string}){return a.name.localeCompare(b.name,'es',{numeric:true,sensitivity:'base'});}
