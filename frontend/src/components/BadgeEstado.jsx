export default function BadgeEstado({ estado }) {
  const clases = {
    NO_INICIADO: 'badge-no-iniciado',
    EN_CURSO: 'badge-en-curso',
    FINALIZADO: 'badge-finalizado',
  }
  const etiquetas = {
    NO_INICIADO: 'No iniciado',
    EN_CURSO: 'En curso',
    FINALIZADO: 'Finalizado',
  }
  return (
    <span className={clases[estado] || 'badge-no-iniciado'}>
      {etiquetas[estado] || estado}
    </span>
  )
}
