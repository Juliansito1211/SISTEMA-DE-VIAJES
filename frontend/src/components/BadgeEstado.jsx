const CONFIG = {
  NO_INICIADO:       { label: 'No iniciado',       icon: '🕐', cls: 'bg-amber-100   text-amber-800'   },
  PROGRAMADO:        { label: 'Programado',         icon: '📅', cls: 'bg-indigo-100  text-indigo-800'  },
  PENDIENTE_ACEPTAR: { label: 'Pendiente aceptar',  icon: '⏳', cls: 'bg-orange-100  text-orange-800'  },
  EN_CURSO:          { label: 'En curso',            icon: '🟢', cls: 'bg-emerald-100 text-emerald-800' },
  FINALIZADO:        { label: 'Finalizado',          icon: '✅', cls: 'bg-slate-100   text-slate-600'   },
  CANCELADO:         { label: 'Cancelado',           icon: '❌', cls: 'bg-red-50      text-red-500'     },
}

export default function BadgeEstado({ estado, size = 'sm' }) {
  const c = CONFIG[estado] || { label: estado, icon: '•', cls: 'bg-gray-100 text-gray-600' }
  const pad = size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold shrink-0 ${pad} ${c.cls}`}>
      <span>{c.icon}</span>
      {c.label}
    </span>
  )
}
