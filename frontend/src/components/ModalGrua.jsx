import { useState } from 'react'
import { viajesApi } from '../api/viajes'

export default function ModalGrua({ viajeId, onSuccess }) {
  const [form, setForm] = useState({ placa_grua: '', marca_grua: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.placa_grua.trim()) { setError('Placa de la grúa obligatoria'); return }
    if (!form.marca_grua.trim()) { setError('Marca de la grúa obligatoria'); return }

    setLoading(true)
    try {
      const viaje = await viajesApi.iniciar(viajeId, form)
      onSuccess(viaje)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar el viaje')
    } finally {
      setLoading(false)
    }
  }

  // El modal NO puede cerrarse — no hay botón de cancelar ni onClose
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Iniciar Viaje</h2>
          <p className="text-sm text-gray-500 mb-6">
            Ingresa los datos de la grúa para continuar. Este paso es obligatorio.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Placa de la grúa *</label>
              <input
                name="placa_grua"
                value={form.placa_grua}
                onChange={handleChange}
                className="input uppercase"
                placeholder="Ej: ABC-123"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Marca de la grúa *</label>
              <input
                name="marca_grua"
                value={form.marca_grua}
                onChange={handleChange}
                className="input"
                placeholder="Ej: Ford, Chevrolet..."
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? 'Iniciando...' : 'Confirmar e Iniciar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
