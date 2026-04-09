import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { viajesApi } from '../api/viajes'
import BadgeEstado from '../components/BadgeEstado'
import Campana from '../components/Campana'
import { formatMonto } from '../utils/formato'

function formatFecha(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const FILTROS_VACIOS = {
  codigo: '',
  operador: '',
  origen: '',
  destino: '',
  placa_grua: '',
  fecha_desde: '',
  fecha_hasta: '',
  placa_vehiculo: '',
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))].sort()
}

export default function MisViajes() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showBuscar, setShowBuscar] = useState(false)
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [resultadosPlaca, setResultadosPlaca] = useState(null)
  const [buscandoPlaca, setBuscandoPlaca] = useState(false)
  const [showFabMenu, setShowFabMenu] = useState(false)

  useEffect(() => {
    viajesApi.listar()
      .then(setViajes)
      .catch(() => setError('Error al cargar los viajes'))
      .finally(() => setLoading(false))
  }, [])

  // Opciones para los selects — extraídas de los viajes cargados
  const opcionesOperador = useMemo(() => unique(viajes.map((v) => v.creado_por_nombre)), [viajes])
  const opcionesOrigen   = useMemo(() => unique(viajes.map((v) => v.origen)), [viajes])
  const opcionesDestino  = useMemo(() => unique(viajes.map((v) => v.destino)), [viajes])
  const opcionesGrua     = useMemo(() => unique(viajes.map((v) => v.placa_grua)), [viajes])

  const set = (campo, valor) => setFiltros((p) => ({ ...p, [campo]: valor }))

  const limpiar = () => { setFiltros(FILTROS_VACIOS); setResultadosPlaca(null) }

  const hayFiltros = Object.values(filtros).some((v) => v.trim() !== '') || resultadosPlaca !== null

  // Filtrado client-side
  const viajesFiltrados = useMemo(() => {
    if (resultadosPlaca !== null) return resultadosPlaca
    return viajes.filter((v) => {
      const { codigo, operador, origen, destino, placa_grua, fecha_desde, fecha_hasta } = filtros
      if (codigo    && !v.codigo?.toLowerCase().includes(codigo.toLowerCase())) return false
      if (operador  && v.creado_por_nombre !== operador) return false
      if (origen    && v.origen !== origen) return false
      if (destino   && v.destino !== destino) return false
      if (placa_grua && v.placa_grua !== placa_grua) return false
      if (fecha_desde) {
        const desde = new Date(fecha_desde)
        if (new Date(v.creado_en) < desde) return false
      }
      if (fecha_hasta) {
        const hasta = new Date(fecha_hasta)
        hasta.setHours(23, 59, 59)
        if (new Date(v.creado_en) > hasta) return false
      }
      return true
    })
  }, [viajes, filtros, resultadosPlaca])

  const buscarPorPlacaVehiculo = async () => {
    if (!filtros.placa_vehiculo.trim()) return
    setBuscandoPlaca(true)
    setResultadosPlaca(null)
    try {
      const data = await viajesApi.listar({ placa_vehiculo: filtros.placa_vehiculo.trim() })
      setResultadosPlaca(data)
    } catch {
      setResultadosPlaca([])
    } finally {
      setBuscandoPlaca(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900 text-lg">Mis Viajes</h1>
          <p className="text-xs text-gray-500">{user?.nombre} · {user?.rol_nombre}</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.perm_gestionar_gruas && (
            <button onClick={() => navigate('/gruas')} className="text-sm text-blue-600 font-medium">
              Grúas
            </button>
          )}
          {user?.perm_crear_usuarios && (
            <button onClick={() => navigate('/usuarios')} className="text-sm text-blue-600 font-medium">
              Usuarios
            </button>
          )}
          {user?.perm_reabrir_viaje && <Campana />}

          {/* Lupa */}
          <button
            onClick={() => setShowBuscar(true)}
            className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors
              ${hayFiltros ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            {hayFiltros && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>

          <button onClick={logout} className="text-sm text-gray-500">Salir</button>
        </div>
      </header>

      {/* Lista principal */}
      <main className="px-4 py-4 max-w-lg mx-auto pb-24">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        )}
        {error && <p className="text-center text-red-600 py-8 text-sm">{error}</p>}
        {!loading && !error && viajes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-medium">No hay viajes aún</p>
            <p className="text-sm mt-1">Crea el primero con el botón +</p>
          </div>
        )}
        <div className="space-y-3">
          {viajes.filter((v) => v.estado !== 'CANCELADO').slice(0, 6).map((v) => (
            <Link key={v.id} to={`/viajes/${v.id}`} className="block">
              <div className={`card hover:shadow-md transition-shadow ${
                v.estado === 'PROGRAMADO'
                  ? 'border-l-4 border-l-indigo-400 bg-indigo-50/40'
                  : ''
              }`}>
                {/* Encabezado viaje programado */}
                {v.estado === 'PROGRAMADO' && v.programado_para && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      📅 Programado · {formatFecha(v.programado_para)}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {v.codigo && (
                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {v.codigo}
                        </span>
                      )}
                      {(v.conductor_nombre || !['NO_INICIADO', 'PROGRAMADO'].includes(v.estado)) && (
                        <p className="text-xs text-blue-600 font-medium">
                          {v.conductor_nombre || v.creado_por_nombre}
                        </p>
                      )}
                      {!v.conductor_nombre && ['NO_INICIADO', 'PROGRAMADO'].includes(v.estado) && (
                        <p className="text-xs text-orange-500">Sin conductor asignado</p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{v.origen} → {v.destino}</p>
                    {v.estado !== 'PROGRAMADO' && (
                      <p className="text-xs text-gray-500 mt-0.5">{formatFecha(v.creado_en)}</p>
                    )}
                  </div>
                  <BadgeEstado estado={v.estado} />
                </div>
                {v.estado === 'FINALIZADO' && v.monto_total != null && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="font-bold text-gray-900">{formatMonto(v.monto_total)}</span>
                  </div>
                )}
                {v.placa_grua && <p className="text-xs text-gray-400 mt-1">Grúa: {v.placa_grua}</p>}
              </div>
            </Link>
          ))}
        </div>

        {viajes.filter((v) => v.estado !== 'CANCELADO').length > 6 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Mostrando los 6 más recientes.{' '}
            <button onClick={() => setShowBuscar(true)} className="text-blue-600 font-medium underline">
              Buscar viajes anteriores
            </button>
          </p>
        )}
      </main>

      {/* FAB expandible */}
      {user?.perm_crear_viaje && (
        <>
          {/* Overlay para cerrar el menú al tocar fuera */}
          {showFabMenu && (
            <div
              className="fixed inset-0 z-20"
              onClick={() => setShowFabMenu(false)}
            />
          )}

          <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
            {/* Opciones del menú */}
            {showFabMenu && (
              <div className="flex flex-col items-end gap-2 mb-1">
                {/* Programar viaje */}
                <button
                  onClick={() => { setShowFabMenu(false); navigate('/viajes/programar') }}
                  className="flex items-center gap-3 bg-white text-gray-800 font-medium text-sm
                             px-4 py-3 rounded-2xl shadow-lg border border-gray-100
                             hover:bg-gray-50 active:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  <span>Programar viaje</span>
                  <span className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white text-lg shrink-0">📅</span>
                </button>

                {/* Agregar viaje */}
                <button
                  onClick={() => { setShowFabMenu(false); navigate('/viajes/nuevo') }}
                  className="flex items-center gap-3 bg-white text-gray-800 font-medium text-sm
                             px-4 py-3 rounded-2xl shadow-lg border border-gray-100
                             hover:bg-gray-50 active:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  <span>Agregar viaje</span>
                  <span className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg shrink-0">🚗</span>
                </button>
              </div>
            )}

            {/* Botón principal */}
            <button
              onClick={() => setShowFabMenu((v) => !v)}
              className={`w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center
                         text-3xl transition-all duration-200 ${
                           showFabMenu
                             ? 'bg-gray-600 rotate-45'
                             : 'bg-blue-600 active:bg-blue-700'
                         }`}
            >
              +
            </button>
          </div>
        </>
      )}

      {/* Modal de búsqueda */}
      {showBuscar && (
        <div className="fixed inset-0 z-30 flex flex-col bg-gray-50">
          {/* Header del modal */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
            <button onClick={() => setShowBuscar(false)} className="text-blue-600 font-medium text-sm shrink-0">
              ← Volver
            </button>
            <h2 className="font-bold text-gray-900 flex-1">Buscar viajes</h2>
            {hayFiltros && (
              <button onClick={limpiar} className="text-xs text-red-500 font-medium shrink-0">
                Limpiar
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              {/* Código */}
              <div>
                <label className="label text-xs">Código</label>
                <input
                  value={filtros.codigo}
                  onChange={(e) => set('codigo', e.target.value)}
                  placeholder="CAL1, BOG3..."
                  className="input py-1.5 text-sm"
                />
              </div>

              {/* Operador */}
              <div>
                <label className="label text-xs">Operador</label>
                <select value={filtros.operador} onChange={(e) => set('operador', e.target.value)} className="input py-1.5 text-sm">
                  <option value="">Todos</option>
                  {opcionesOperador.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Origen */}
              <div>
                <label className="label text-xs">Origen</label>
                <select value={filtros.origen} onChange={(e) => set('origen', e.target.value)} className="input py-1.5 text-sm">
                  <option value="">Todos</option>
                  {opcionesOrigen.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Destino */}
              <div>
                <label className="label text-xs">Destino</label>
                <select value={filtros.destino} onChange={(e) => set('destino', e.target.value)} className="input py-1.5 text-sm">
                  <option value="">Todos</option>
                  {opcionesDestino.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Grúa */}
              <div>
                <label className="label text-xs">Grúa</label>
                <select value={filtros.placa_grua} onChange={(e) => set('placa_grua', e.target.value)} className="input py-1.5 text-sm">
                  <option value="">Todas</option>
                  {opcionesGrua.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Fecha desde */}
              <div>
                <label className="label text-xs">Desde</label>
                <input type="date" value={filtros.fecha_desde} onChange={(e) => set('fecha_desde', e.target.value)} className="input py-1.5 text-sm" />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="label text-xs">Hasta</label>
                <input type="date" value={filtros.fecha_hasta} onChange={(e) => set('fecha_hasta', e.target.value)} className="input py-1.5 text-sm" />
              </div>
            </div>

            {/* Placa de vehículo */}
            <div>
              <label className="label text-xs">Placa de vehículo transportado</label>
              <div className="flex gap-2">
                <input
                  value={filtros.placa_vehiculo}
                  onChange={(e) => { set('placa_vehiculo', e.target.value.toUpperCase()); setResultadosPlaca(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPorPlacaVehiculo()}
                  placeholder="Ej: ABC123"
                  className="input flex-1 uppercase py-1.5 text-sm"
                />
                <button
                  onClick={buscarPorPlacaVehiculo}
                  disabled={buscandoPlaca || !filtros.placa_vehiculo.trim()}
                  className="btn-primary px-3 text-sm py-1.5 shrink-0"
                >
                  {buscandoPlaca ? '...' : 'Buscar'}
                </button>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="text-xs text-gray-400 mb-2">{viajesFiltrados.length} resultado(s)</p>
            {viajesFiltrados.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Sin resultados</p>
            ) : (
              <div className="space-y-1">
                {viajesFiltrados.map((v) => (
                  <Link
                    key={v.id}
                    to={`/viajes/${v.id}`}
                    onClick={() => setShowBuscar(false)}
                    className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 hover:border-blue-300 transition-colors"
                  >
                    {v.codigo && (
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                        {v.codigo}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{v.origen} → {v.destino}</p>
                      <p className="text-xs text-gray-400">{v.conductor_nombre || v.creado_por_nombre} · {formatFecha(v.creado_en)}</p>
                    </div>
                    <BadgeEstado estado={v.estado} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
