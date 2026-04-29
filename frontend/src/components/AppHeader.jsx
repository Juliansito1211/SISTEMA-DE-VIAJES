import { useAuth } from '../context/AuthContext'

/**
 * Header principal de las páginas con sección de empresa.
 * Props:
 *  - title: string — título de la página
 *  - right: ReactNode — botones/iconos a la derecha
 *  - back: fn — si se pasa, muestra botón ← Volver
 */
export default function AppHeader({ title, right, back }) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur shadow-sm border-b border-gray-100">
      {/* Franja de empresa */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-1.5 flex items-center gap-2">
        <span className="text-base">🚛</span>
        <span className="text-white text-xs font-bold tracking-wide truncate">
          {user?.empresa_nombre || 'Sistema de Viajes'}
        </span>
      </div>

      {/* Fila de navegación */}
      <div className="px-4 py-2.5 flex items-center gap-3">
        {back && (
          <button
            onClick={back}
            className="text-blue-600 font-semibold text-sm shrink-0 flex items-center gap-1"
          >
            ← Volver
          </button>
        )}
        <h1 className="font-black text-gray-900 text-lg flex-1 tracking-tight">{title}</h1>
        {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
      </div>
    </header>
  )
}
