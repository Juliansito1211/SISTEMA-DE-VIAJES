import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const IconViajes = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)
const IconGruas = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M3 17h2l1-4h12l1 4h2M5 13l2-6h10l2 6M9 17v2m6-2v2" />
  </svg>
)
const IconUsuarios = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0zM3 10a3 3 0 116 0 3 3 0 01-6 0z" />
  </svg>
)
const IconSalir = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
  </svg>
)

export default function BottomNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tabs = [
    { key: 'viajes',   label: 'Viajes',   path: '/viajes',   Icon: IconViajes,   show: true,                          action: null   },
    { key: 'gruas',    label: 'Grúas',    path: '/gruas',    Icon: IconGruas,    show: !!user?.perm_gestionar_gruas,  action: null   },
    { key: 'usuarios', label: 'Usuarios', path: '/usuarios', Icon: IconUsuarios, show: !!user?.perm_crear_usuarios,   action: null   },
    { key: 'salir',    label: 'Salir',    path: null,        Icon: IconSalir,    show: true,                          action: logout },
  ].filter((t) => t.show)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = tab.path && pathname.startsWith(tab.path)
          return (
            <button
              key={tab.key}
              onClick={() => tab.action ? tab.action() : navigate(tab.path)}
              className="flex-1 flex flex-col items-center justify-center py-2 relative"
            >
              {/* Pill activa detrás del icono */}
              {active && (
                <span className="absolute top-1.5 w-12 h-8 bg-blue-100 rounded-2xl" />
              )}
              <span className={`relative z-10 transition-colors ${
                tab.key === 'salir'
                  ? 'text-gray-400'
                  : active ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <tab.Icon />
              </span>
              <span className={`text-[10px] font-bold mt-0.5 transition-colors ${
                tab.key === 'salir'
                  ? 'text-gray-400'
                  : active ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
