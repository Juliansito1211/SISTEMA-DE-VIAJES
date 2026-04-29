import { useState, useRef, useEffect } from 'react'
import CIUDADES from '../data/ciudadesColombia'

export default function SelectorCiudad({ value, onChange, placeholder = 'Buscar ciudad...', name }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Sincronizar si el valor externo cambia
  useEffect(() => { setQuery(value || '') }, [value])

  // Cerrar al hacer click fuera
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const filtradas = query.length >= 1
    ? CIUDADES.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  const seleccionar = (ciudad) => {
    setQuery(ciudad.label)
    onChange(ciudad.label)
    setOpen(false)
  }

  const handleInput = (e) => {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  return (
    <div className="relative" ref={ref}>
      <input
        name={name}
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        className="input uppercase"
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filtradas.length > 0 && (
        <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {filtradas.map((c) => (
            <li
              key={c.label}
              onMouseDown={() => seleccionar(c)}
              className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0"
            >
              <span className="font-semibold">{c.label.split(',')[0]}</span>
              <span className="text-gray-500 text-xs ml-1">{c.label.split(',')[1]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
