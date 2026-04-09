import { useState } from 'react'
import { vehiculosApi } from '../api/vehiculos'
import { viajesApi } from '../api/viajes'
import { formatMonto } from '../utils/formato'

const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO']

export default function ValidacionFinalizar({ viaje, vehiculos, fotoObligatoria, onSuccess, onClose }) {
  // Montos editables para la validación 2
  const [montos, setMontos] = useState(() =>
    Object.fromEntries(vehiculos.map((v) => [v.id, v.monto != null ? String(v.monto) : '']))
  )
  const [metodoPago, setMetodoPago] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // ── Determinar en qué paso estamos ─────────────────────────────────────────
  const sinVehiculos = vehiculos.length === 0
  const sinMonto = vehiculos.filter((v) => v.monto == null)
  const hayVehiculosSinMonto = sinMonto.length > 0
  const totalActual = vehiculos.reduce((sum, v) => sum + (v.monto ? parseFloat(v.monto) : 0), 0)

  // Paso 1 — sin vehículos
  if (sinVehiculos) {
    return (
      <Overlay onClose={onClose}>
        <h2 className="text-lg font-bold text-gray-900 mb-3">No se puede finalizar</h2>
        <div className="bg-red-50 rounded-xl p-4 mb-5">
          <p className="text-red-700 text-sm">El viaje no tiene vehículos. Debe agregar al menos uno antes de finalizar.</p>
        </div>
        <button onClick={onClose} className="btn-secondary">Volver</button>
      </Overlay>
    )
  }

  // Paso 2 — vehículos sin monto
  const guardarMontos = async () => {
    setError(null)
    const items = sinMonto.map((v) => ({
      viaje_vehiculo_id: v.id,
      monto: parseFloat(montos[v.id]),
    }))

    if (items.some((i) => isNaN(i.monto) || i.monto <= 0)) {
      setError('Todos los montos deben ser mayores a 0 (ej: 600000)')
      return
    }

    setLoading(true)
    try {
      await vehiculosApi.actualizarMontos(viaje.id, items)
      // Recargar página para reflejar los nuevos montos
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar los montos')
    } finally {
      setLoading(false)
    }
  }

  if (hayVehiculosSinMonto) {
    return (
      <Overlay onClose={onClose}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Montos faltantes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Los siguientes vehículos no tienen monto. Completa para continuar.
        </p>

        <div className="space-y-3 mb-4">
          {sinMonto.map((v) => (
            <div key={v.id} className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-gray-800 w-24 shrink-0">{v.placa}</span>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="Ej: 600000"
                value={montos[v.id]}
                onChange={(e) => setMontos((m) => ({ ...m, [v.id]: e.target.value }))}
                className="input"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={guardarMontos} disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar montos'}
          </button>
        </div>
      </Overlay>
    )
  }

  // Paso 3 — formulario de cierre
  const finalizar = async () => {
    setError(null)
    if (!metodoPago) { setError('Selecciona el método de pago'); return }
    if (fotoObligatoria && !fotoUrl.trim()) { setError('La foto del recibo es obligatoria'); return }
    if (totalActual <= 0) { setError('El monto total debe ser mayor a 0'); return }

    setLoading(true)
    try {
      const viajeFinalizado = await viajesApi.finalizar(viaje.id, {
        metodo_pago: metodoPago,
        foto_recibo_url: fotoUrl.trim() || null,
      })
      onSuccess(viajeFinalizado)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail?.code === 'VEHICULOS_SIN_MONTO') {
        window.location.reload()
      } else {
        setError(typeof detail === 'string' ? detail : detail?.message || 'Error al finalizar')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Finalizar viaje</h2>
      <p className="text-sm text-gray-500 mb-5">
        Monto total: <span className="font-bold text-gray-900">{formatMonto(totalActual)}</span>
      </p>

      <div className="space-y-4 mb-5">
        <div>
          <label className="label">Método de pago *</label>
          <div className="grid grid-cols-2 gap-2">
            {METODOS_PAGO.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetodoPago(m)}
                className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                  metodoPago === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">
            URL foto del recibo {fotoObligatoria ? '*' : '(opcional)'}
          </label>
          <input
            type="url"
            value={fotoUrl}
            onChange={(e) => setFotoUrl(e.target.value)}
            className="input"
            placeholder="https://..."
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={finalizar} disabled={loading} className="btn-primary">
          {loading ? 'Finalizando...' : 'Finalizar viaje'}
        </button>
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
