import { useEffect, useRef, useState } from 'react'
import { vehiculosApi } from '../api/vehiculos'
import MARCAS from '../data/marcasCarros'
import COLORES from '../data/coloresCarros'
import { normalizarPlaca, placaValida } from '../utils/formato'

export default function FormVehiculo({ viajeId, vehiculo, onSuccess, onClose }) {
  const esEdicion = !!vehiculo
  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    color: '',
    monto: '',
    observacion: '',
  })
  const [sugerencias, setSugerencias] = useState([])       // autocompletado placa
  const [sugerenciasMarca, setSugerenciasMarca] = useState([]) // autocompletado marca
  const [marcaOpen, setMarcaOpen] = useState(false)
  const marcaRef = useRef(null)
  const [error, setError] = useState('')
  const [errorConflicto, setErrorConflicto] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (vehiculo) {
      setForm({
        placa: vehiculo.placa || '',
        marca: vehiculo.marca || '',
        modelo: vehiculo.modelo || '',
        color: vehiculo.color || '',
        monto: vehiculo.monto != null ? String(vehiculo.monto) : '',
        observacion: vehiculo.observacion || '',
      })
    }
  }, [vehiculo])

  // Cerrar dropdown de marca al hacer click fuera
  useEffect(() => {
    const fn = (e) => { if (marcaRef.current && !marcaRef.current.contains(e.target)) setMarcaOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))

    // Normalizar placa: solo alfanuméricos, máx 6, mayúsculas
    if (name === 'placa') {
      const normalizada = normalizarPlaca(value)
      setForm((f) => ({ ...f, placa: normalizada }))
      setErrorConflicto(null)
      if (normalizada.length >= 2) {
        vehiculosApi.buscar(normalizada).then(setSugerencias).catch(() => {})
      } else {
        setSugerencias([])
      }
      return // ya actualizamos el estado arriba
    }

    // Filtrar marcas
    if (name === 'marca') {
      if (value.length >= 1) {
        const filtradas = MARCAS.filter((m) =>
          m.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 8)
        setSugerenciasMarca(filtradas)
        setMarcaOpen(true)
      } else {
        setSugerenciasMarca([])
        setMarcaOpen(false)
      }
    }
  }

  const seleccionarSugerencia = (v) => {
    setForm({ placa: v.placa, marca: v.marca || '', modelo: v.modelo || '', color: v.color || '', monto: '', observacion: '' })
    setSugerencias([])
    setSugerenciasMarca([])
  }

  const seleccionarMarca = (marca) => {
    setForm((f) => ({ ...f, marca }))
    setSugerenciasMarca([])
    setMarcaOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.placa.trim()) { setError('Placa obligatoria'); return }
    if (!placaValida(form.placa)) { setError('La placa debe tener exactamente 6 caracteres (ej: DQN228)'); return }

    const payload = {
      placa: form.placa.trim(),
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      color: form.color || null,
      monto: form.monto !== '' ? parseFloat(form.monto) : null,
      observacion: form.observacion.trim() || null,
    }

    setLoading(true)
    try {
      let result
      if (esEdicion) {
        result = await vehiculosApi.editar(viajeId, vehiculo.id, payload)
      } else {
        result = await vehiculosApi.agregar(viajeId, payload)
      }
      onSuccess(result)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 409 && detail?.error === 'vehiculo_duplicado') {
        setErrorConflicto({ tipo: 'duplicado' })
        setError('')
      } else if (err.response?.status === 409 && detail?.error === 'vehiculo_en_viaje_activo') {
        setErrorConflicto({ tipo: 'otro_viaje', origen: detail.viaje_origen, destino: detail.viaje_destino })
        setError('')
      } else if (err.response?.status === 409 && detail?.error === 'placa_es_grua') {
        setErrorConflicto({ tipo: 'es_grua' })
        setError('')
      } else {
        setError(typeof detail === 'string' ? detail : 'Error al guardar el vehículo')
        setErrorConflicto(null)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">
              {esEdicion ? 'Editar vehículo' : 'Agregar vehículo'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Placa con autocompletado del catálogo */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Placa *</label>
                <span className={`text-xs font-mono font-bold ${form.placa.length === 6 ? 'text-green-600' : 'text-gray-400'}`}>
                  {form.placa.length}/6
                </span>
              </div>
              <input
                name="placa"
                value={form.placa}
                onChange={handleChange}
                className={`input uppercase font-mono tracking-widest text-lg ${form.placa.length > 0 && form.placa.length < 6 ? 'border-orange-300 focus:ring-orange-400' : ''}`}
                placeholder="DQN228"
                maxLength={6}
                autoFocus={!esEdicion}
              />
              {sugerencias.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
                  {sugerencias.map((v) => (
                    <li
                      key={v.id}
                      onClick={() => seleccionarSugerencia(v)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0"
                    >
                      <span className="font-semibold">{v.placa}</span>
                      {v.marca && <span className="text-gray-500 ml-2">{v.marca} {v.modelo}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Marca con autocompletado de lista */}
              <div className="relative" ref={marcaRef}>
                <label className="label">Marca</label>
                <input
                  name="marca"
                  value={form.marca}
                  onChange={handleChange}
                  onFocus={() => {
                    if (form.marca.length >= 1) setMarcaOpen(true)
                  }}
                  className="input"
                  placeholder="Buscar marca..."
                  autoComplete="off"
                />
                {marcaOpen && sugerenciasMarca.length > 0 && (
                  <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden max-h-44 overflow-y-auto">
                    {sugerenciasMarca.map((m) => (
                      <li
                        key={m}
                        onMouseDown={() => seleccionarMarca(m)}
                        className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="label">Modelo</label>
                <input
                  name="modelo"
                  value={form.modelo}
                  onChange={handleChange}
                  className="input"
                  placeholder="Ej: 2022"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Color</label>
                <select
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Seleccionar...</option>
                  {COLORES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Monto</label>
                <input
                  name="monto"
                  type="number"
                  step="1"
                  min="0"
                  value={form.monto}
                  onChange={handleChange}
                  className="input"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div>
              <label className="label">Observación</label>
              <textarea
                name="observacion"
                value={form.observacion}
                onChange={handleChange}
                className="input resize-none"
                rows={2}
                placeholder="Ej: rayón en puerta derecha, sin espejo..."
              />
            </div>

            {errorConflicto?.tipo === 'es_grua' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-red-800">🚛 Placa pertenece a una grúa</p>
                <p className="text-sm text-red-700">
                  Esta placa está registrada como grúa. No se puede agregar como vehículo transportado.
                </p>
              </div>
            )}
            {errorConflicto?.tipo === 'duplicado' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-orange-800">⚠️ Vehículo ya agregado</p>
                <p className="text-sm text-orange-700">
                  Este vehículo ya está en este viaje. No puedes agregarlo dos veces.
                </p>
              </div>
            )}
            {errorConflicto?.tipo === 'otro_viaje' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-orange-800">⚠️ Vehículo en otro viaje activo</p>
                <p className="text-sm text-orange-700">
                  Este vehículo ya está asignado al viaje{' '}
                  <span className="font-semibold">{errorConflicto.origen} → {errorConflicto.destino}</span>.
                  No se puede agregar hasta que ese viaje finalice o se cancele.
                </p>
              </div>
            )}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Guardando...' : esEdicion ? 'Guardar' : 'Agregar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
