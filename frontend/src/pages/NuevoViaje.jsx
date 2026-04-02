import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { viajesApi } from '../api/viajes'
import { vehiculosApi } from '../api/vehiculos'
import { useAuth } from '../context/AuthContext'

export default function NuevoViaje() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({ origen: '', destino: '' })
  const [vehiculo, setVehiculo] = useState({ placa: '', marca: '', modelo: '', color: '', monto: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleVehChange = (e) =>
    setVehiculo((v) => ({ ...v, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!vehiculo.placa.trim()) { setError('Debe ingresar la placa'); return }
    if (!form.origen.trim()) { setError('Debe ingresar el origen'); return }
    if (!form.destino.trim()) { setError('Debe ingresar el destino'); return }

    setLoading(true)
    try {
      // 1. Crear el viaje
      const viaje = await viajesApi.crear({ origen: form.origen.trim(), destino: form.destino.trim() })

      // 2. Agregar el primer vehículo
      await vehiculosApi.agregar(viaje.id, {
        placa: vehiculo.placa.trim(),
        marca: vehiculo.marca.trim() || null,
        modelo: vehiculo.modelo.trim() || null,
        color: vehiculo.color.trim() || null,
        monto: vehiculo.monto !== '' ? parseFloat(vehiculo.monto) : null,
      })

      navigate(`/viajes/${viaje.id}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear el viaje')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="text-blue-600 font-medium text-sm">
          ← Volver
        </button>
        <h1 className="font-bold text-gray-900 text-lg">Nuevo Viaje</h1>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del viaje */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Datos del viaje</h2>
            <div>
              <label className="label">Origen *</label>
              <input
                name="origen"
                value={form.origen}
                onChange={handleChange}
                className="input"
                placeholder="Ciudad o dirección de origen"
              />
            </div>
            <div>
              <label className="label">Destino *</label>
              <input
                name="destino"
                value={form.destino}
                onChange={handleChange}
                className="input"
                placeholder="Ciudad o dirección de destino"
              />
            </div>
          </div>

          {/* Primer vehículo */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Primer vehículo transportado</h2>
            <div>
              <label className="label">Placa *</label>
              <input
                name="placa"
                value={vehiculo.placa}
                onChange={handleVehChange}
                className="input uppercase"
                placeholder="Ej: XYZ-789"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Marca</label>
                <input name="marca" value={vehiculo.marca} onChange={handleVehChange} className="input" placeholder="Opcional" />
              </div>
              <div>
                <label className="label">Modelo</label>
                <input name="modelo" value={vehiculo.modelo} onChange={handleVehChange} className="input" placeholder="Opcional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Color</label>
                <input name="color" value={vehiculo.color} onChange={handleVehChange} className="input" placeholder="Opcional" />
              </div>
              <div>
                <label className="label">Monto</label>
                <input
                  name="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={vehiculo.monto}
                  onChange={handleVehChange}
                  className="input"
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creando viaje...' : 'Crear viaje'}
          </button>
        </form>
      </main>
    </div>
  )
}
