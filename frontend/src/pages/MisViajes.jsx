import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { viajesApi } from '../api/viajes'
import BadgeEstado from '../components/BadgeEstado'
import Campana from '../components/Campana'
import BottomNav from '../components/BottomNav'
import AppHeader from '../components/AppHeader'
import Watermark from '../components/Watermark'
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

  // Color de borde izquierdo por estado
  const borderColor = {
    NO_INICIADO:       'border-l-amber-400',
    PROGRAMADO:        'border-l-indigo-400',
    PENDIENTE_ACEPTAR: 'border-l-orange-400',
    EN_CURSO:          'border-l-emerald-500',
    FINALIZADO:        'border-l-slate-300',
    CANCELADO:         'border-l-red-300',
  }
  const bgTint = {
    EN_CURSO:          'bg-emerald-50/30',
    PENDIENTE_ACEPTAR: 'bg-orange-50/30',
    PROGRAMADO:        'bg-indigo-50/30',
  }

  const headerRight = (
    <div className="flex items-center gap-2">
      {user?.perm_reabrir_viaje && <Campana />}
      <button
        onClick={() => setShowBuscar(true)}
        className={`relative w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${
          hayFiltros ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-600'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        {hayFiltros && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Watermark />
      <AppHeader
        title={user?.perm_ver_todos_viajes ? 'Viajes' : 'Mis Viajes'}
        right={headerRight}
      />

      {/* Lista principal */}
      <main className="px-4 py-4 max-w-lg mx-auto pb-32">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
          </div>
        )}
        {error && <p className="text-center text-red-600 py-8 text-sm">{error}</p>}
        {!loading && !error && viajes.filter(v => v.estado !== 'CANCELADO').length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚗</div>
            <p className="font-bold text-gray-700 text-lg">No hay viajes aún</p>
            <p className="text-sm text-gray-400 mt-1">
              {user?.perm_crear_viaje ? 'Toca el botón + para crear el primero' : 'No hay viajes registrados'}
            </p>
          </div>
        )}
        <div className="space-y-3">
          {viajes.filter((v) => v.estado !== 'CANCELADO').slice(0, 6).map((v) => (
            <Link key={v.id} to={`/viajes/${v.id}`} className="block">
              <div className={`card-trip border-l-4 ${borderColor[v.estado] || 'border-l-gray-200'} ${bgTint[v.estado] || ''}`}>

                {/* Fila superior: código + badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {v.codigo && (
                      <span className="text-xs font-mono font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg">
                        {v.codigo}
                      </span>
                    )}
                    {v.estado === 'PROGRAMADO' && v.programado_para && (
                      <span className="text-xs text-indigo-600 font-semibold">
                        📅 {formatFecha(v.programado_para)}
                      </span>
                    )}
                  </div>
                  <BadgeEstado estado={v.estado} />
                </div>

                {/* Ruta */}
                <div className="mb-2">
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
                    <span>🔴 Origen</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm leading-tight truncate">{v.origen}</p>
                  <div className="flex items-center gap-1 my-1">
                    <div className="w-0.5 h-3 bg-gray-300 ml-1.5 rounded" />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
                    <span>🟢 Destino</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm leading-tight truncate">{v.destino}</p>
                </div>

                {/* Fila inferior: conductor + fecha + monto */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">👤</span>
                    <span className="text-xs text-gray-500 font-medium truncate max-w-[130px]">
                      {v.conductor_nombre || v.creado_por_nombre || 'Sin asignar'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.placa_grua && (
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        🚛 {v.placa_grua}
                      </span>
                    )}
                    {v.estado === 'FINALIZADO' && v.monto_total != null && (
                      <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                        {formatMonto(v.monto_total)}
                      </span>
                    )}
                    {v.estado !== 'FINALIZADO' && (
                      <span className="text-xs text-gray-400">{formatFecha(v.creado_en)}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {viajes.filter((v) => v.estado !== 'CANCELADO').length > 6 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Mostrando los 6 más recientes.{' '}
            <button onClick={() => setShowBuscar(true)} className="text-blue-600 font-semibold">
              Ver más →
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

          <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-3">
            {/* Opciones del menú */}
            {showFabMenu && (
              <div className="flex flex-col items-end gap-2 mb-1">
                <button
                  onClick={() => { setShowFabMenu(false); navigate('/viajes/programar') }}
                  className="flex items-center gap-3 bg-white text-gray-800 font-semibold text-sm
                             px-4 py-3 rounded-2xl shadow-xl border border-gray-100 whitespace-nowrap"
                >
                  <span>Programar viaje</span>
                  <span className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-lg shrink-0">📅</span>
                </button>
                <button
                  onClick={() => { setShowFabMenu(false); navigate('/viajes/nuevo') }}
                  className="flex items-center gap-3 bg-white text-gray-800 font-semibold text-sm
                             px-4 py-3 rounded-2xl shadow-xl border border-gray-100 whitespace-nowrap"
                >
                  <span>Nuevo viaje</span>
                  <span className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white text-lg shrink-0">🚗</span>
                </button>
              </div>
            )}

            {/* Botón principal FAB */}
            <button
              onClick={() => setShowFabMenu((v) => !v)}
              className={`w-14 h-14 text-white rounded-2xl shadow-xl flex items-center justify-center
                         text-2xl font-bold transition-all duration-200 ${
                           showFabMenu
                             ? 'bg-gray-700 rotate-45 scale-90'
                             : 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-300 active:scale-95'
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

      <BottomNav />
    </div>
  )
}
