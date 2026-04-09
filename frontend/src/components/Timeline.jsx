const ACCIONES = {
  CREAR_VIAJE:           { label: 'Viaje creado',           dot: 'bg-blue-500' },
  ASIGNAR_VIAJE:         { label: 'Viaje asignado a conductor', dot: 'bg-purple-500' },
  ASIGNAR_OPERADOR:      { label: 'Operador asignado',          dot: 'bg-indigo-500' },
  ACEPTAR_VIAJE:         { label: 'Viaje aceptado por conductor', dot: 'bg-green-500' },
  INICIAR_VIAJE:         { label: 'Viaje iniciado',          dot: 'bg-green-500' },
  FINALIZAR_VIAJE:       { label: 'Viaje finalizado',        dot: 'bg-gray-500' },
  REABRIR_VIAJE:         { label: 'Viaje reabierto',         dot: 'bg-orange-500' },
  EDITAR_VIAJE_FINALIZADO: { label: 'Viaje editado tras cierre', dot: 'bg-orange-400' },
  CANCELAR_VIAJE:        { label: 'Viaje cancelado',         dot: 'bg-red-400' },
  SOLICITAR_REAPERTURA:  { label: 'Reapertura solicitada',   dot: 'bg-yellow-500' },
  RECHAZAR_REAPERTURA:   { label: 'Reapertura rechazada',    dot: 'bg-red-500' },
}

function formatFecha(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Timeline({ registros }) {
  if (!registros || registros.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Sin historial aún</p>
  }

  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {registros.map((r, i) => {
          const cfg = ACCIONES[r.accion] || { label: r.accion, dot: 'bg-gray-400' }
          const nota = r.datos_despues?.nota || r.datos_antes?.nota || null

          return (
            <div key={r.id || i} className="flex gap-3 relative">
              {/* Punto */}
              <div className={`w-6 h-6 rounded-full ${cfg.dot} shrink-0 flex items-center justify-center z-10`} />

              {/* Contenido */}
              <div className="flex-1 pb-1">
                <p className="text-sm font-semibold text-gray-900">{cfg.label}</p>
                <p className="text-xs text-gray-500">{r.usuario_nombre} · {formatFecha(r.realizado_en)}</p>
                {nota && (
                  <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg px-2 py-1 italic">
                    "{nota}"
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
