export default function BadgeEstado({ estado }) {
  const clases = {
    NO_INICIADO:        'badge-no-iniciado',
    PROGRAMADO:         'bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded-full',
    PENDIENTE_ACEPTAR:  'bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full',
    EN_CURSO:           'badge-en-curso',
    FINALIZADO:         'badge-finalizado',
    CANCELADO:          'bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full',
  }
  const etiquetas = {
    NO_INICIADO:       'No iniciado',
    PROGRAMADO:        '📅 Programado',
    PENDIENTE_ACEPTAR: 'Pendiente aceptar',
    EN_CURSO:          'En curso',
    FINALIZADO:        'Finalizado',
    CANCELADO:         'Cancelado',
  }
  return (
    <span className={clases[estado] || 'badge-no-iniciado'}>
      {etiquetas[estado] || estado}
    </span>
  )
}
