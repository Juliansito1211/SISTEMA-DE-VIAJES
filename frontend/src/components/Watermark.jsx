import { useAuth } from '../context/AuthContext'

export default function Watermark() {
  const { user } = useAuth()
  const nombre = user?.empresa_nombre || ''

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Texto diagonal grande — marca de agua */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          style={{
            transform: 'rotate(-30deg)',
            opacity: 0.035,
            fontSize: 'clamp(3rem, 12vw, 7rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: '#1e40af',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          🚛<br />{nombre}
        </div>
      </div>

      {/* Patrón repetido arriba y abajo (más sutil) */}
      {['-55%', '55%'].map((top) => (
        <div
          key={top}
          className="absolute left-1/2"
          style={{
            top,
            transform: 'translateX(-50%) rotate(-30deg)',
            opacity: 0.018,
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            fontWeight: 900,
            color: '#1e40af',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          🚛 {nombre}
        </div>
      ))}
    </div>
  )
}
