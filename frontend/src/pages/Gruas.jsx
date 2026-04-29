import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { gruasApi, API_BASE_URL } from '../api/gruas'
import BottomNav from '../components/BottomNav'
import AppHeader from '../components/AppHeader'
import Watermark from '../components/Watermark'

function diasParaVencer(fecha) {
  if (!fecha) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const vence = new Date(fecha)
  return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
}

function AlertaDocumento({ label, vence }) {
  const dias = diasParaVencer(vence)
  if (dias === null) return null
  if (dias < 0) {
    return (
      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
        {label} VENCIDO
      </span>
    )
  }
  if (dias <= 30) {
    return (
      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
        {label} vence en {dias}d
      </span>
    )
  }
  return null
}

export default function Gruas() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [gruas, setGruas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = () => {
    setLoading(true)
    gruasApi.listar()
      .then(setGruas)
      .catch(() => setError('Error al cargar las grúas'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const headerRight = user?.perm_gestionar_gruas ? (
    <button
      onClick={() => navigate('/gruas/nueva')}
      className="text-sm text-blue-600 font-semibold"
    >
      + Nueva
    </button>
  ) : null

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Watermark />
      <AppHeader title="Grúas" right={headerRight} />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-3 pb-24">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        )}
        {error && <p className="text-center text-red-600 py-8 text-sm">{error}</p>}
        {!loading && !error && gruas.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🚛</div>
            <p className="font-medium">No hay grúas registradas</p>
            {user?.perm_gestionar_gruas && (
              <p className="text-sm mt-1">Crea la primera con el botón +</p>
            )}
          </div>
        )}

        {gruas.map((g) => (
          <button
            key={g.id}
            onClick={() => navigate(`/gruas/${g.id}`)}
            className="w-full text-left"
          >
            <div className={`card hover:shadow-md transition-shadow ${!g.activa ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                {/* Foto o placeholder */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                  {g.foto_url ? (
                    <img
                      src={`${API_BASE_URL}${g.foto_url}`}
                      alt={g.placa}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🚛</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono font-bold text-gray-900">{g.placa}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      g.activa
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {g.activa ? 'Activa' : 'Inactiva'}
                    </span>
                    {g.activa && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        g.disponible
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {g.disponible ? 'Disponible' : 'En viaje'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{g.marca}{g.modelo ? ` · ${g.modelo}` : ''}</p>
                  {g.conductor_nombre ? (
                    <p className="text-xs text-blue-600 font-medium mt-0.5">{g.conductor_nombre}</p>
                  ) : (
                    <p className="text-xs text-orange-500 mt-0.5">Sin conductor</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <AlertaDocumento label="Tecno" vence={g.tecno_vence} />
                    <AlertaDocumento label="SOAT" vence={g.soat_vence} />
                  </div>
                </div>

                <span className="text-gray-300 text-lg shrink-0">›</span>
              </div>
            </div>
          </button>
        ))}
      </main>
      <BottomNav />
    </div>
  )
}
