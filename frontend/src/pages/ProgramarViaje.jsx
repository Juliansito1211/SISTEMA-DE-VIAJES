import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { viajesApi } from '../api/viajes'
import { usuariosApi } from '../api/usuarios'
import SelectorCiudad from '../components/SelectorCiudad'
import AppHeader from '../components/AppHeader'
import Watermark from '../components/Watermark'

export default function ProgramarViaje() {
  const navigate = useNavigate()
  const [tipoViaje, setTipoViaje] = useState('NACIONAL')
  const [form, setForm] = useState({ origen: '', destino: '', programado_para: '', conductor_id: '' })
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    usuariosApi.activos().then(setUsuarios).catch(() => {})
  }, [])

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const cambiarTipo = (tipo) => {
    setTipoViaje(tipo)
    setForm((f) => ({ ...f, origen: '', destino: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.programado_para) { setError('Debe seleccionar la fecha y hora programada'); return }
    if (!form.origen.trim()) { setError('Debe ingresar el origen'); return }
    if (!form.destino.trim()) { setError('Debe ingresar el destino'); return }

    const fechaProgramada = new Date(form.programado_para)
    if (fechaProgramada <= new Date()) {
      setError('La fecha programada debe ser futura')
      return
    }

    setLoading(true)
    try {
      const viaje = await viajesApi.crear({
        origen: form.origen.trim(),
        destino: form.destino.trim(),
        tipo_viaje: tipoViaje,
        programado_para: fechaProgramada.toISOString(),
        conductor_id: form.conductor_id || null,
      })
      navigate(`/viajes/${viaje.id}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al programar el viaje')
    } finally {
      setLoading(false)
    }
  }

  // Fecha mínima: ahora (formato datetime-local)
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
  const minDatetime = ahora.toISOString().slice(0, 16)

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Watermark />
      <AppHeader title="Programar Viaje" back={() => navigate(-1)} />

      <main className="px-4 py-5 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Fecha programada */}
          <div className="card space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Fecha y hora programada</h2>
              <p className="text-xs text-gray-500 mb-3">
                El viaje quedará agendado. Los vehículos se agregan al momento de iniciarlo.
              </p>
              <label className="label">Fecha y hora *</label>
              <input
                type="datetime-local"
                name="programado_para"
                value={form.programado_para}
                onChange={handleChange}
                min={minDatetime}
                className="input"
              />
            </div>
          </div>

          {/* Operador asignado */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Operador asignado</h2>
            <div>
              <label className="label">Seleccionar operador (opcional)</label>
              <select
                name="conductor_id"
                value={form.conductor_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">Sin asignar</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} — {u.rol_nombre}
                  </option>
                ))}
              </select>
              {form.conductor_id && (
                <p className="text-xs text-blue-600 mt-1.5">
                  ✓ El viaje aparecerá en la pantalla del operador seleccionado.
                </p>
              )}
            </div>
          </div>

          {/* Tipo de viaje */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-900">Tipo de viaje</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cambiarTipo('URBANO')}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                  tipoViaje === 'URBANO'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                🏙️ Urbano
              </button>
              <button
                type="button"
                onClick={() => cambiarTipo('NACIONAL')}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                  tipoViaje === 'NACIONAL'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                🗺️ Nacional
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {tipoViaje === 'URBANO'
                ? 'Viaje dentro de la ciudad. Ingresa la dirección de recogida y entrega.'
                : 'Viaje entre ciudades de Colombia.'}
            </p>
          </div>

          {/* Datos del viaje */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Datos del viaje</h2>

            {tipoViaje === 'URBANO' ? (
              <>
                <div>
                  <label className="label">Dirección de origen *</label>
                  <input
                    name="origen"
                    value={form.origen}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ej: Cra 15 # 80-20, Bogotá"
                  />
                </div>
                <div>
                  <label className="label">Dirección de destino *</label>
                  <input
                    name="destino"
                    value={form.destino}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ej: Av. Boyacá # 100-50, Bogotá"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">Ciudad de origen *</label>
                  <SelectorCiudad
                    value={form.origen}
                    onChange={(val) => setForm((f) => ({ ...f, origen: val }))}
                    placeholder="Buscar ciudad de origen..."
                  />
                </div>
                <div>
                  <label className="label">Ciudad de destino *</label>
                  <SelectorCiudad
                    value={form.destino}
                    onChange={(val) => setForm((f) => ({ ...f, destino: val }))}
                    placeholder="Buscar ciudad de destino..."
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Programando viaje...' : 'Programar viaje'}
          </button>
        </form>
      </main>
    </div>
  )
}
