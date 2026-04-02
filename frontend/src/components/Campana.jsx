import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { solicitudesApi } from '../api/solicitudes'

export default function Campana() {
  const [solicitudes, setSolicitudes] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [resolviendo, setResolviendo] = useState(null)
  const navigate = useNavigate()

  const cargar = () => {
    solicitudesApi.listar().then(setSolicitudes).catch(() => {})
  }

  useEffect(() => {
    cargar()
    const intervalo = setInterval(cargar, 30000)
    return () => clearInterval(intervalo)
  }, [])

  const resolver = async (id, accion) => {
    setResolviendo(id)
    try {
      await solicitudesApi.resolver(id, accion)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al resolver')
    } finally {
      setResolviendo(null)
    }
  }

  const pendientes = solicitudes.length

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((a) => !a)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        {/* Icono campana */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {pendientes > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {pendientes}
          </span>
        )}
      </button>

      {abierto && (
        <>
          {/* Overlay para cerrar */}
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />

          <div className="absolute right-0 top-10 z-40 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Solicitudes de reapertura</h3>
              <span className="text-xs text-gray-500">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>
            </div>

            {solicitudes.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                Sin solicitudes pendientes
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {solicitudes.map((s) => (
                  <li key={s.id} className="p-4">
                    <p className="font-medium text-gray-900 text-sm">
                      {s.solicitado_por_nombre}
                    </p>
                    <p className="text-xs text-gray-500 mb-1">
                      Viaje: {s.viaje_origen} → {s.viaje_destino}
                    </p>
                    {s.nota && (
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1 mb-2 italic">
                        "{s.nota}"
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        disabled={resolviendo === s.id}
                        onClick={() => resolver(s.id, 'APROBAR')}
                        className="flex-1 bg-green-600 text-white text-xs font-semibold py-2 rounded-xl active:bg-green-700 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        disabled={resolviendo === s.id}
                        onClick={() => resolver(s.id, 'RECHAZAR')}
                        className="flex-1 bg-red-100 text-red-700 text-xs font-semibold py-2 rounded-xl active:bg-red-200 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => { setAbierto(false); navigate(`/viajes/${s.viaje_id}`) }}
                        className="flex-1 bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded-xl active:bg-gray-200"
                      >
                        Ver viaje
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
