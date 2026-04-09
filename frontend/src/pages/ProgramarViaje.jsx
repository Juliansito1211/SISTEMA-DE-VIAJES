import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { viajesApi } from '../api/viajes'
import { usuariosApi } from '../api/usuarios'

export default function ProgramarViaje() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ origen: '', destino: '', programado_para: '', conductor_id: '' })
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    usuariosApi.activos().then(setUsuarios).catch(() => {})
  }, [])

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

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
    <div className="min-h-screen bg-gray-50">
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="text-blue-600 font-medium text-sm">
          ← Volver
        </button>
        <h1 className="font-bold text-gray-900 text-lg">Programar Viaje</h1>
      </header>

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
