import {useEffect,useRef,useState} from 'react';
import {date} from './contracts.js';
export function validDateOrder(start:string,end:string){try{date(start);if(end)date(end);return !end||end>=start;}catch{return false;}}
export function useFormGate(scope:readonly unknown[]=[]){
 const form=useRef<HTMLFormElement>(null);const [complete,setComplete]=useState(false);
 const inspect=()=>{const elements=Array.from(form.current?.elements??[]);setComplete(elements.length>0&&elements.every(element=>{if(!(element instanceof HTMLInputElement||element instanceof HTMLSelectElement||element instanceof HTMLTextAreaElement))return true;return element.validity.valid&&(!element.required||element.value.trim()!=='');}));};
 useEffect(inspect,scope);
 return {form,complete,inspect};
}

export function todayInLima(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
