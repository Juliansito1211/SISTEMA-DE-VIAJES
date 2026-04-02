import { useEffect, useState } from 'react'
import { vehiculosApi } from '../api/vehiculos'

export default function FormVehiculo({ viajeId, vehiculo, onSuccess, onClose }) {
  const esEdicion = !!vehiculo
  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    color: '',
    monto: '',
  })
  const [sugerencias, setSugerencias] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (vehiculo) {
      setForm({
        placa: vehiculo.placa || '',
        marca: vehiculo.marca || '',
        modelo: vehiculo.modelo || '',
        color: vehiculo.color || '',
        monto: vehiculo.monto != null ? String(vehiculo.monto) : '',
      })
    }
  }, [vehiculo])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))

    // Autocompletar placa
    if (name === 'placa' && value.length >= 2) {
      vehiculosApi.buscar(value).then(setSugerencias).catch(() => {})
    } else if (name === 'placa') {
      setSugerencias([])
    }
  }

  const seleccionarSugerencia = (v) => {
    setForm({ placa: v.placa, marca: v.marca || '', modelo: v.modelo || '', color: v.color || '', monto: '' })
    setSugerencias([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.placa.trim()) { setError('Placa obligatoria'); return }

    const payload = {
      placa: form.placa.trim(),
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      color: form.color.trim() || null,
      monto: form.monto !== '' ? parseFloat(form.monto) : null,
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
      setError(err.response?.data?.detail || 'Error al guardar el vehículo')
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
            {/* Placa con autocompletado */}
            <div className="relative">
              <label className="label">Placa *</label>
              <input
                name="placa"
                value={form.placa}
                onChange={handleChange}
                className="input uppercase"
                placeholder="Ej: XYZ-789"
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
              <div>
                <label className="label">Marca</label>
                <input name="marca" value={form.marca} onChange={handleChange} className="input" placeholder="Opcional" />
              </div>
              <div>
                <label className="label">Modelo</label>
                <input name="modelo" value={form.modelo} onChange={handleChange} className="input" placeholder="Opcional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Color</label>
                <input name="color" value={form.color} onChange={handleChange} className="input" placeholder="Opcional" />
              </div>
              <div>
                <label className="label">Monto</label>
                <input
                  name="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monto}
                  onChange={handleChange}
                  className="input"
                  placeholder="Opcional"
                />
              </div>
            </div>

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
