import { useEffect, useId, useRef, useState } from 'react';

type Person = { id: string; name: string };

export function SearchablePersonSelect({ label, name, people, excludedId, defaultValue = '', className }: {
  label: string; name: string; people: Person[]; excludedId?: string; defaultValue?: string; className?: string;
}) {
  const inputId = useId(), listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const candidates = people.filter(person => person.id !== excludedId);
  const selectedPerson = candidates.find(person => person.id === selected);
  const matches = candidates.filter(person => person.name.toLocaleLowerCase('es-PE').includes(query.trim().toLocaleLowerCase('es-PE'))).slice(0, 20);

  useEffect(() => { setSelected(defaultValue); }, [defaultValue]);
  useEffect(() => { root.current?.querySelector<HTMLInputElement>('.vp-person-value')?.dispatchEvent(new Event('input', { bubbles: true })); }, [selected]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  function choose(person: Person) {
    setSelected(person.id); setQuery(person.name); setOpen(false);
    root.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  }

  return <div className="vp-person-search" ref={root}>
    <label htmlFor={inputId}>{label}</label>
    <input id={inputId} type="search" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
      aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].id}` : undefined}
      autoComplete="off" className={className} value={query || (selectedPerson && !open ? selectedPerson.name : '')}
      placeholder={`Buscar ${label.toLocaleLowerCase('es-PE')} por nombre…`}
      onFocus={() => { setOpen(true); setActive(0); }}
      onChange={event => { setQuery(event.target.value); setSelected(''); setActive(0); setOpen(true); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, matches.length - 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
        if (event.key === 'Enter' && open && matches[active]) { event.preventDefault(); choose(matches[active]); }
      }} />
    <input type="text" name={name} required value={selected} className="vp-person-value" tabIndex={-1} aria-label={`${label} seleccionado`} onChange={() => {}} />
    {open && <div id={listId} role="listbox" className="vp-person-options" aria-label={`Resultados de ${label}`}>
      {matches.map((person, index) => <button type="button" role="option" id={`${listId}-${person.id}`} aria-selected={index === active}
        key={person.id} onMouseDown={event => event.preventDefault()} onClick={() => choose(person)}>{person.name}</button>)}
      {!matches.length && <p>No hay coincidencias entre las personas cargadas.</p>}
    </div>}
    <small role="status">{selectedPerson ? `Seleccionado: ${selectedPerson.name}` : query ? `${matches.length} coincidencias entre las personas cargadas` : 'Escribe para buscar y elige una persona de la lista.'}</small>
  </div>;
}
