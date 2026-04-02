import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { viajesApi } from '../api/viajes'
import BadgeEstado from '../components/BadgeEstado'
import Campana from '../components/Campana'

function formatFecha(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMonto(m) {
  if (m == null) return null
  return `$ ${parseFloat(m).toFixed(2)}`
}

export default function MisViajes() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    viajesApi.listar()
      .then(setViajes)
      .catch(() => setError('Error al cargar los viajes'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900 text-lg">Mis Viajes</h1>
          <p className="text-xs text-gray-500">{user?.nombre} · {user?.rol_nombre}</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.perm_crear_usuarios && (
            <button
              onClick={() => navigate('/usuarios')}
              className="text-sm text-blue-600 font-medium hover:text-blue-800"
            >
              Usuarios
            </button>
          )}
          {user?.perm_reabrir_viaje && <Campana />}
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
            Salir
          </button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto pb-24">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        )}

        {error && (
          <p className="text-center text-red-600 py-8 text-sm">{error}</p>
        )}

        {!loading && !error && viajes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-medium">No hay viajes aún</p>
            <p className="text-sm mt-1">Crea el primero con el botón +</p>
          </div>
        )}

        <div className="space-y-3">
          {viajes.map((v) => (
            <Link key={v.id} to={`/viajes/${v.id}`} className="block">
              <div className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-blue-600 font-medium mb-0.5">{v.creado_por_nombre}</p>
                    <p className="font-semibold text-gray-900 truncate">
                      {v.origen} → {v.destino}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatFecha(v.creado_en)}</p>
                  </div>
                  <BadgeEstado estado={v.estado} />
                </div>

                {v.estado === 'FINALIZADO' && v.monto_total != null && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="font-bold text-gray-900">{formatMonto(v.monto_total)}</span>
                  </div>
                )}

                {v.placa_grua && (
                  <p className="text-xs text-gray-400 mt-1">Grúa: {v.placa_grua}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* FAB */}
      {user?.perm_crear_viaje && (
        <button
          onClick={() => navigate('/viajes/nuevo')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg
                     flex items-center justify-center text-3xl active:bg-blue-700 transition-colors"
        >
          +
        </button>
      )}
    </div>
  )
}
