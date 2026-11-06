import { useState } from 'react';

type Person = { id: string; name: string };

export function SearchablePersonSelect({ label, name, people, excludedId, defaultValue = '', className }: {
  label: string;
  name: string;
  people: Person[];
  excludedId?: string;
  defaultValue?: string;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(defaultValue);
  const candidates = people.filter(person => person.id !== excludedId);
  const selectedPerson = candidates.find(person => person.id === selected);
  const matches = query.trim()
    ? candidates.filter(person => person.name.toLocaleLowerCase('es-PE').includes(query.trim().toLocaleLowerCase('es-PE')))
    : candidates;

  return <div className="vp-person-search">
    <label htmlFor={`${name}-search`}>{label}</label>
    <input id={`${name}-search`} type="search" autoComplete="off" className={className} value={query}
      placeholder={`Buscar ${label.toLocaleLowerCase('es-PE')} por nombre…`}
      onChange={event => setQuery(event.target.value)} />
    <label htmlFor={`${name}-select`} className="sr-only">Seleccionar {label}</label>
    <select id={`${name}-select`} name={name} required className={className} value={selected}
      onChange={event => setSelected(event.target.value)}>
      <option value="">Selecciona {label === 'Estudiante' ? 'un estudiante' : `un ${label.toLocaleLowerCase('es-PE')}`}</option>
      {selectedPerson && !matches.some(person => person.id === selectedPerson.id) &&
        <option value={selectedPerson.id}>{selectedPerson.name}</option>}
      {matches.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>
    <small role="status">{matches.length} resultado{matches.length === 1 ? '' : 's'}; escribe para reducir la lista.</small>
  </div>;
}
