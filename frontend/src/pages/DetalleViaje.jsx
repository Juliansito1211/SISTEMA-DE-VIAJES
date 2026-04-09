import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { viajesApi } from '../api/viajes'
import { vehiculosApi } from '../api/vehiculos'
import { solicitudesApi } from '../api/solicitudes'
import ModalGrua from '../components/ModalGrua'
import FormVehiculo from '../components/FormVehiculo'
import ValidacionFinalizar from '../components/ValidacionFinalizar'
import BadgeEstado from '../components/BadgeEstado'
import FotoUploader from '../components/FotoUploader'
import Timeline from '../components/Timeline'
import { formatMonto } from '../utils/formato'
import { usuariosApi } from '../api/usuarios'

function formatFecha(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DetalleViaje() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [viaje, setViaje] = useState(null)
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [auditoria, setAuditoria] = useState([])

  // Modales
  const [showModalGrua, setShowModalGrua] = useState(false)
  const [showFormVehiculo, setShowFormVehiculo] = useState(false)
  const [vehiculoEditar, setVehiculoEditar] = useState(null)
  const [showFinalizar, setShowFinalizar] = useState(false)
  const [reabriendo, setReabriendo] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [aceptando, setAceptando] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const [conductorSeleccionado, setConductorSeleccionado] = useState('')
  const [asignando, setAsignando] = useState(false)
  const [errorAsignar, setErrorAsignar] = useState('')

  // Modal fotos de vehículo
  const [vehiculoParaFotos, setVehiculoParaFotos] = useState(null)

  // Solicitar reapertura
  const [showSolicitar, setShowSolicitar] = useState(false)
  const [notaSolicitud, setNotaSolicitud] = useState('')
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)

  const cargar = (silencioso = false) => {
    if (!silencioso) setLoading(true)
    viajesApi.obtener(id)
      .then((v) => {
        setViaje(v)
        setVehiculos(v.vehiculos || [])
        setConductorSeleccionado(v.conductor_id || '')
      })
      .catch(() => setError('Error al cargar el viaje'))
      .finally(() => { if (!silencioso) setLoading(false) })
  }

  const cargarAuditoria = () => {
    viajesApi.auditoria(id).then(setAuditoria).catch(() => {})
  }

  const handleAsignarOperador = async () => {
    setErrorAsignar('')
    setAsignando(true)
    try {
      const v = await viajesApi.asignarOperador(id, conductorSeleccionado || null)
      setViaje(v)
      cargarAuditoria()
    } catch (err) {
      setErrorAsignar(err.response?.data?.detail || 'Error al asignar operador')
    } finally {
      setAsignando(false)
    }
  }

  useEffect(() => {
    cargar()
    cargarAuditoria()
    if (user?.perm_ver_todos_viajes) {
      usuariosApi.activos().then(setUsuarios).catch(() => {})
    }
  }, [id])

  const handleAceptar = async () => {
    if (!window.confirm('¿Aceptar este viaje y ponerlo en curso?')) return
    setAceptando(true)
    try {
      const actualizado = await viajesApi.aceptar(id)
      setViaje(actualizado)
      cargarAuditoria()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al aceptar el viaje')
    } finally {
      setAceptando(false)
    }
  }

  const handleReabrir = async () => {
    if (!window.confirm('¿Reabrir este viaje?')) return
    setReabriendo(true)
    try {
      const actualizado = await viajesApi.reabrir(id)
      setViaje(actualizado)
      cargarAuditoria()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al reabrir')
    } finally {
      setReabriendo(false)
    }
  }

  const handleCancelar = async () => {
    if (!window.confirm('¿Cancelar este viaje? Quedará marcado como cancelado.')) return
    setCancelando(true)
    try {
      await viajesApi.cancelar(id)
      navigate('/viajes')
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al cancelar el viaje')
      setCancelando(false)
    }
  }

  const handleSolicitar = async () => {
    setEnviandoSolicitud(true)
    try {
      await solicitudesApi.solicitar(id, notaSolicitud.trim() || null)
      setShowSolicitar(false)
      setNotaSolicitud('')
      cargarAuditoria()
      alert('Solicitud enviada. El administrador recibirá la notificación.')
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al enviar la solicitud')
    } finally {
      setEnviandoSolicitud(false)
    }
  }

  const handleEliminarVehiculo = async (vid) => {
    if (!window.confirm('¿Eliminar este vehículo del viaje?')) return
    try {
      await vehiculosApi.eliminar(id, vid)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
    </div>
  )

  if (error || !viaje) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="page-header">
        <button onClick={() => navigate('/viajes')} className="text-blue-600 font-medium text-sm">← Volver</button>
      </header>
      <p className="text-center text-red-600 py-16">{error || 'Viaje no encontrado'}</p>
    </div>
  )

  const noIniciado = viaje.estado === 'NO_INICIADO'
  const programado = viaje.estado === 'PROGRAMADO'
  const pendienteAceptar = viaje.estado === 'PENDIENTE_ACEPTAR'
  const enCurso = viaje.estado === 'EN_CURSO'
  const finalizado = viaje.estado === 'FINALIZADO'
  const editable = noIniciado || programado || pendienteAceptar || enCurso
  const esConductorAsignado = viaje.conductor_id && String(viaje.conductor_id) === String(user?.id)
  const total = vehiculos.reduce((s, v) => s + (v.monto ? parseFloat(v.monto) : 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="page-header">
        <button onClick={() => navigate('/viajes')} className="text-blue-600 font-medium text-sm shrink-0">← Volver</button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">{viaje.origen} → {viaje.destino}</h1>
          {viaje.codigo && (
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              {viaje.codigo}
            </span>
          )}
        </div>
        <BadgeEstado estado={viaje.estado} />
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto pb-6 space-y-4">

        {/* Alerta PENDIENTE_ACEPTAR */}
        {pendienteAceptar && (
          <div className={`rounded-2xl px-4 py-3 border ${
            esConductorAsignado
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-purple-50 border-purple-200'
          }`}>
            {esConductorAsignado ? (
              <>
                <p className="font-semibold text-yellow-800">Tienes un viaje pendiente de aceptar</p>
                <p className="text-sm text-yellow-700 mt-0.5">El administrador te asignó este viaje. Acéptalo para comenzar.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-purple-800">Esperando aceptación del conductor</p>
                <p className="text-sm text-purple-700 mt-0.5">
                  {viaje.conductor_nombre ? `${viaje.conductor_nombre} debe aceptar este viaje.` : 'El conductor asignado debe aceptar este viaje.'}
                </p>
              </>
            )}
          </div>
        )}

        {/* Info del viaje */}
        <div className="card space-y-3">
          <InfoRow label="Creado" value={formatFecha(viaje.creado_en)} />
          {viaje.programado_para && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-gray-500 shrink-0">Programado para</span>
              <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                📅 {formatFecha(viaje.programado_para)}
              </span>
            </div>
          )}
          {viaje.iniciado_en && <InfoRow label="Iniciado" value={formatFecha(viaje.iniciado_en)} />}
          {viaje.finalizado_en && <InfoRow label="Finalizado" value={formatFecha(viaje.finalizado_en)} />}
          {viaje.conductor_nombre && (
            <InfoRow label="Conductor" value={viaje.conductor_nombre} />
          )}
          {viaje.placa_grua && (
            <InfoRow label="Grúa" value={`${viaje.placa_grua} · ${viaje.marca_grua}`} />
          )}
          {viaje.observacion_grua && (
            <InfoRow label="Obs. grúa" value={viaje.observacion_grua} />
          )}
          {viaje.monto_total != null && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="font-semibold text-gray-700">Total cobrado</span>
              <span className="font-bold text-lg text-gray-900">{formatMonto(viaje.monto_total)}</span>
            </div>
          )}
          {viaje.metodo_pago && <InfoRow label="Método de pago" value={viaje.metodo_pago} />}
        </div>

        {/* Fotos de la grúa (solo cuando hay grúa asignada) */}
        {viaje.placa_grua && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Fotos de la grúa</h2>
            <FotoUploader tipo="grua" entidadId={id} editable={enCurso && (!!user?.perm_iniciar_viaje || esConductorAsignado)} />
          </div>
        )}

        {/* Vehículos transportados */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Vehículos ({vehiculos.length})</h2>
            {editable && user?.perm_agregar_vehiculo && (
              <button
                onClick={() => { setVehiculoEditar(null); setShowFormVehiculo(true) }}
                className="text-sm text-blue-600 font-medium"
              >
                + Agregar
              </button>
            )}
          </div>

          {vehiculos.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Sin vehículos aún</p>
          )}

          <div className="space-y-4">
            {vehiculos.map((v) => (
              <div key={v.id} className="py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-sm">{v.placa}</p>
                    {(v.marca || v.modelo) && (
                      <p className="text-xs text-gray-500">{[v.marca, v.modelo].filter(Boolean).join(' ')}</p>
                    )}
                    {v.color && <p className="text-xs text-gray-400">{v.color}</p>}
                    <p className={`text-sm mt-1 font-medium ${v.monto != null ? 'text-gray-900' : 'text-orange-500'}`}>
                      {v.monto != null ? formatMonto(v.monto) : 'Sin monto'}
                    </p>
                    {v.observacion && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">"{v.observacion}"</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {(editable ? user?.perm_editar_viaje_activo : user?.perm_editar_viaje_finalizado) && (
                      <>
                        <button
                          onClick={() => { setVehiculoEditar(v); setShowFormVehiculo(true) }}
                          className="text-xs text-blue-600 font-medium px-2 py-1"
                        >
                          Editar
                        </button>
                        {editable && (
                          <button
                            onClick={() => handleEliminarVehiculo(v.id)}
                            className="text-xs text-red-500 font-medium px-2 py-1"
                          >
                            Eliminar
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setVehiculoParaFotos(v)}
                      className="text-xs text-gray-500 font-medium px-2 py-1"
                    >
                      Fotos
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {vehiculos.some((v) => v.monto != null) && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">Total parcial</span>
              <span className="font-bold text-gray-900">{formatMonto(total)}</span>
            </div>
          )}
        </div>

        {/* Asignar / cambiar operador — admin en viajes NO_INICIADO */}
        {(noIniciado || programado) && user?.perm_ver_todos_viajes && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Operador asignado</h2>
              {viaje.conductor_nombre && (
                <span className="text-xs text-blue-600 font-medium">{viaje.conductor_nombre}</span>
              )}
            </div>

            {usuarios.length === 0 ? (
              <p className="text-sm text-gray-400">Cargando operadores...</p>
            ) : (
              <>
                <select
                  value={conductorSeleccionado}
                  onChange={(e) => setConductorSeleccionado(e.target.value)}
                  className="input"
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} — {u.rol_nombre}
                    </option>
                  ))}
                </select>

                {errorAsignar && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorAsignar}</p>
                )}

                <button
                  onClick={handleAsignarOperador}
                  disabled={asignando}
                  className="btn-primary"
                >
                  {asignando ? 'Guardando...' : conductorSeleccionado ? 'Guardar asignación' : 'Quitar operador'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-3">
          {/* Conductor acepta el viaje asignado */}
          {pendienteAceptar && esConductorAsignado && (
            <button onClick={handleAceptar} disabled={aceptando} className="btn-primary">
              {aceptando ? 'Aceptando...' : 'Aceptar viaje'}
            </button>
          )}
          {(noIniciado || programado) && user?.perm_iniciar_viaje && (
            <button onClick={() => setShowModalGrua(true)} className="btn-primary">
              Iniciar viaje
            </button>
          )}
          {(noIniciado || programado) && (
            <button onClick={handleCancelar} disabled={cancelando} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
              {cancelando ? 'Cancelando...' : 'Cancelar viaje'}
            </button>
          )}
          {enCurso && user?.perm_finalizar_viaje && (
            <button onClick={() => setShowFinalizar(true)} className="btn-primary">
              Finalizar viaje
            </button>
          )}
          {finalizado && user?.perm_reabrir_viaje && (
            <button onClick={handleReabrir} disabled={reabriendo} className="btn-secondary">
              {reabriendo ? 'Reabriendo...' : 'Reabrir viaje'}
            </button>
          )}
          {finalizado && !user?.perm_reabrir_viaje && (
            <button onClick={() => setShowSolicitar(true)} className="btn-secondary">
              Solicitar reapertura
            </button>
          )}
        </div>

        {/* Historial / Línea de tiempo */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Historial del viaje</h2>
          <Timeline registros={auditoria} />
        </div>

      </main>

      {/* Modales */}
      {showModalGrua && (
        <ModalGrua
          viajeId={id}
          onClose={() => setShowModalGrua(false)}
          onSuccess={(v) => {
            setViaje(v)
            setShowModalGrua(false)
            cargarAuditoria()
          }}
        />
      )}

      {showFormVehiculo && (
        <FormVehiculo
          viajeId={id}
          vehiculo={vehiculoEditar}
          onSuccess={(resultado) => {
            setShowFormVehiculo(false)
            setVehiculoEditar(null)
            // Abrir fotos primero, luego recargar en silencio para no cerrar el modal
            if (resultado?.id) setVehiculoParaFotos(resultado)
            cargar(true)
          }}
          onClose={() => { setShowFormVehiculo(false); setVehiculoEditar(null) }}
        />
      )}

      {showFinalizar && (
        <ValidacionFinalizar
          viaje={viaje}
          vehiculos={vehiculos}
          fotoObligatoria={false}
          onSuccess={(v) => { setViaje(v); setShowFinalizar(false); cargar(); cargarAuditoria() }}
          onClose={() => setShowFinalizar(false)}
        />
      )}

      {/* Modal fotos de vehículo */}
      {vehiculoParaFotos && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Fotos del vehículo</h2>
                <p className="text-sm text-gray-500 font-mono">{vehiculoParaFotos.placa}</p>
              </div>
              <button onClick={() => setVehiculoParaFotos(null)} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>
            <FotoUploader
              tipo="vehiculo"
              entidadId={vehiculoParaFotos.id}
              editable={editable}
            />
            <button onClick={() => setVehiculoParaFotos(null)} className="btn-secondary mt-4">
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Modal solicitar reapertura */}
      {showSolicitar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Solicitar reapertura</h2>
            <p className="text-sm text-gray-500 mb-4">El administrador recibirá tu solicitud para reabrir este viaje.</p>
            <div className="mb-4">
              <label className="label">Nota (opcional)</label>
              <textarea
                value={notaSolicitud}
                onChange={(e) => setNotaSolicitud(e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="¿Por qué necesitas reabrir este viaje?"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowSolicitar(false); setNotaSolicitud('') }} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleSolicitar} disabled={enviandoSolicitud} className="btn-primary">
                {enviandoSolicitud ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  )
}
