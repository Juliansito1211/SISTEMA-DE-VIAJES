// v2 — con botón Cancelar
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { viajesApi } from '../api/viajes'
import { gruasApi } from '../api/gruas'
import FotoUploader from './FotoUploader'

export default function ModalGrua({ viajeId, onSuccess, onClose }) {
  const { user } = useAuth()
  const [gruas, setGruas] = useState([])
  const [loadingGruas, setLoadingGruas] = useState(true)
  const [form, setForm] = useState({ grua_id: '', observacion_grua: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [viajeFinalizado, setViajeFinalizado] = useState(null)

  useEffect(() => {
    // Admins ven todas las grúas activas disponibles; operadores solo las suyas
    const params = user?.perm_gestionar_gruas
      ? { solo_disponibles: true }
      : { solo_mias: true, solo_disponibles: true }
    gruasApi.listar(params)
      .then((lista) => {
        const activas = lista.filter((g) => g.activa)
        setGruas(activas)
        if (activas.length === 1) {
          setForm((f) => ({ ...f, grua_id: activas[0].id }))
        }
      })
      .catch(() => setError('Error al cargar las grúas'))
      .finally(() => setLoadingGruas(false))
  }, [])

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.grua_id) { setError('Selecciona una grúa'); return }
    setLoading(true)
    try {
      const viaje = await viajesApi.iniciar(viajeId, {
        grua_id: form.grua_id,
        observacion_grua: form.observacion_grua.trim() || null,
      })
      setViajeFinalizado(viaje)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar el viaje')
    } finally {
      setLoading(false)
    }
  }

  // ── Paso 2: éxito + fotos de grúa ─────────────────────────────────────────
  if (viajeFinalizado) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">🚛</div>
            <h2 className="text-xl font-bold text-green-700">¡Viaje iniciado!</h2>
            {viajeFinalizado.codigo && (
              <p className="mt-1 text-lg font-mono font-bold text-blue-700 bg-blue-50 inline-block px-3 py-1 rounded-lg">
                Código: {viajeFinalizado.codigo}
              </p>
            )}
            {viajeFinalizado.placa_grua && (
              <p className="text-sm text-gray-500 mt-1">
                Grúa: <span className="font-mono font-semibold">{viajeFinalizado.placa_grua}</span>
                {viajeFinalizado.marca_grua ? ` · ${viajeFinalizado.marca_grua}` : ''}
              </p>
            )}
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Fotos de la grúa (opcional)</p>
            <FotoUploader tipo="grua" entidadId={viajeId} editable={true} />
          </div>

          <button onClick={() => onSuccess(viajeFinalizado)} className="btn-primary">
            Continuar
          </button>
        </div>
      </div>
    )
  }

  // ── Paso 1: seleccionar grúa ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Iniciar Viaje</h2>
          <p className="text-sm text-gray-500 mb-6">
            Selecciona la grúa con la que realizarás el viaje.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Grúa *</label>
              {loadingGruas ? (
                <div className="input flex items-center text-gray-400 text-sm">Cargando grúas...</div>
              ) : gruas.length === 0 ? (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  No hay grúas disponibles en este momento. Todas están en viaje o sin asignar.
                </div>
              ) : (
                <select
                  name="grua_id"
                  value={form.grua_id}
                  onChange={handleChange}
                  className="input"
                  autoFocus
                >
                  <option value="">Seleccionar grúa...</option>
                  {gruas.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.placa} · {g.marca}{g.modelo ? ` ${g.modelo}` : ''}
                      {g.conductor_nombre ? ` (${g.conductor_nombre})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="label">Observación (opcional)</label>
              <textarea
                name="observacion_grua"
                value={form.observacion_grua}
                onChange={handleChange}
                className="input resize-none"
                rows={2}
                placeholder="Ej: grúa con carga previa, sin gancho trasero..."
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || loadingGruas || gruas.length === 0}
              className="btn-primary mt-2"
            >
              {loading ? 'Iniciando...' : 'Confirmar e Iniciar'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
