import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { gruasApi, API_BASE_URL } from '../api/gruas'
import client from '../api/client'
import MARCAS from '../data/marcasCarros'
import COLORES from '../data/coloresCarros'
import { normalizarPlaca, placaValida } from '../utils/formato'
import AppHeader from '../components/AppHeader'
import Watermark from '../components/Watermark'

// ── Helpers ───────────────────────────────────────────────────────────────────

function diasParaVencer(fecha) {
  if (!fecha) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const vence = new Date(fecha)
  return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
}

function AlertaVencimiento({ label, vence }) {
  const dias = diasParaVencer(vence)
  if (dias === null) return null
  if (dias < 0) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1">
        <span className="text-red-500 text-lg">⚠️</span>
        <p className="text-sm text-red-700 font-medium">{label} VENCIDO hace {Math.abs(dias)} día(s)</p>
      </div>
    )
  }
  if (dias <= 30) {
    return (
      <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mt-1">
        <span className="text-orange-500 text-lg">⚠️</span>
        <p className="text-sm text-orange-700 font-medium">{label} vence en {dias} día(s)</p>
      </div>
    )
  }
  return null
}

function InfoDoc({ label, inicio, vence }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
        <span>Inicio: {inicio || '—'}</span>
        <span>Vence: {vence || '—'}</span>
      </div>
      <AlertaVencimiento label={label} vence={vence} />
    </div>
  )
}

// ── Página nueva (sin ID) ─────────────────────────────────────────────────────

// ── Subcomponente reutilizable: input de marca con autocomplete ───────────────
function MarcaInput({ value, onChange }) {
  const [sugerencias, setSugerencias] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handleInput = (e) => {
    const val = e.target.value
    onChange(val)
    if (val.length >= 1) {
      setSugerencias(MARCAS.filter((m) => m.toLowerCase().includes(val.toLowerCase())).slice(0, 8))
      setOpen(true)
    } else {
      setSugerencias([])
      setOpen(false)
    }
  }

  const seleccionar = (m) => { onChange(m); setSugerencias([]); setOpen(false) }

  return (
    <div className="relative" ref={ref}>
      <input
        value={value}
        onChange={handleInput}
        onFocus={() => { if (value.length >= 1) setOpen(true) }}
        className="input"
        placeholder="Buscar marca..."
        autoComplete="off"
      />
      {open && sugerencias.length > 0 && (
        <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden max-h-44 overflow-y-auto">
          {sugerencias.map((m) => (
            <li key={m} onMouseDown={() => seleccionar(m)}
              className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0">
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Página nueva grúa ────────────────────────────────────────────────────────
export function NuevaGrua() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({
    placa: '', marca: '', modelo: '', color: '',
    tecno_inicio: '', tecno_vence: '', soat_inicio: '', soat_vence: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user?.perm_gestionar_gruas) {
    navigate('/gruas')
    return null
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'placa') {
      setForm((f) => ({ ...f, placa: normalizarPlaca(value) }))
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.placa.trim()) { setError('La placa es obligatoria'); return }
    if (!placaValida(form.placa)) { setError('La placa debe tener exactamente 6 caracteres (ej: DQN228)'); return }
    if (!form.marca.trim()) { setError('La marca es obligatoria'); return }
    setLoading(true)
    try {
      const grua = await gruasApi.crear({
        placa: form.placa.trim().toUpperCase(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim() || null,
        color: form.color || null,
        tecno_inicio: form.tecno_inicio || null,
        tecno_vence: form.tecno_vence || null,
        soat_inicio: form.soat_inicio || null,
        soat_vence: form.soat_vence || null,
      })
      navigate(`/gruas/${grua.id}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la grúa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Watermark />
      <AppHeader title="Nueva grúa" back={() => navigate('/gruas')} />

      <main className="px-4 py-4 max-w-lg mx-auto pb-8 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Datos del vehículo</h2>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Placa *</label>
                <span className={`text-xs font-mono font-bold ${form.placa.length === 6 ? 'text-green-600' : 'text-gray-400'}`}>
                  {form.placa.length}/6
                </span>
              </div>
              <input name="placa" value={form.placa} onChange={handleChange}
                className={`input uppercase font-mono tracking-widest text-lg ${form.placa.length > 0 && form.placa.length < 6 ? 'border-orange-300' : ''}`}
                placeholder="DQN228" maxLength={6} />
            </div>
            <div>
              <label className="label">Marca *</label>
              <MarcaInput value={form.marca} onChange={(v) => setForm((f) => ({ ...f, marca: v }))} />
            </div>
            <div>
              <label className="label">Modelo</label>
              <input name="modelo" value={form.modelo} onChange={handleChange}
                className="input" placeholder="Ej: F-350, 2022" />
            </div>
            <div>
              <label className="label">Color</label>
              <select name="color" value={form.color} onChange={handleChange} className="input">
                <option value="">Seleccionar...</option>
                {COLORES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Tecnomecánica</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha inicio</label>
                <input type="date" name="tecno_inicio" value={form.tecno_inicio}
                  onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="label">Fecha vencimiento</label>
                <input type="date" name="tecno_vence" value={form.tecno_vence}
                  onChange={handleChange} className="input" />
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">SOAT</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha inicio</label>
                <input type="date" name="soat_inicio" value={form.soat_inicio}
                  onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="label">Fecha vencimiento</label>
                <input type="date" name="soat_vence" value={form.soat_vence}
                  onChange={handleChange} className="input" />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creando...' : 'Crear grúa'}
          </button>
        </form>
      </main>
    </div>
  )
}

// ── Página detalle (con ID) ────────────────────────────────────────────────────

export default function DetalleGrua() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fotoInputRef = useRef()

  const [grua, setGrua] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edición info básica
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  // Conductor
  const [usuarios, setUsuarios] = useState([])
  const [showAsignar, setShowAsignar] = useState(false)
  const [conductorSeleccionado, setConductorSeleccionado] = useState('')
  const [showDesasignar, setShowDesasignar] = useState(false)
  const [obsDesasignacion, setObsDesasignacion] = useState('')
  const [guardandoConductor, setGuardandoConductor] = useState(false)

  // Foto
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [fotoTs, setFotoTs] = useState(Date.now())

  // Toggle
  const [toggling, setToggling] = useState(false)

  const cargar = () => {
    setLoading(true)
    gruasApi.obtener(id)
      .then((g) => {
        setGrua(g)
        setForm({
          placa: g.placa,
          marca: g.marca,
          modelo: g.modelo || '',
          color: g.color || '',
          tecno_inicio: g.tecno_inicio || '',
          tecno_vence: g.tecno_vence || '',
          soat_inicio: g.soat_inicio || '',
          soat_vence: g.soat_vence || '',
        })
      })
      .catch(() => setError('Error al cargar la grúa'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [id])

  useEffect(() => {
    if (user?.perm_gestionar_gruas) {
      client.get('/usuarios').then((r) => setUsuarios(r.data)).catch(() => {})
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'placa') {
      setForm((f) => ({ ...f, placa: normalizarPlaca(value) }))
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  const handleGuardar = async () => {
    setErrorForm('')
    if (!form.placa.trim()) { setErrorForm('La placa es obligatoria'); return }
    if (!placaValida(form.placa)) { setErrorForm('La placa debe tener exactamente 6 caracteres (ej: DQN228)'); return }
    if (!form.marca.trim()) { setErrorForm('La marca es obligatoria'); return }
    setGuardando(true)
    try {
      const actualizado = await gruasApi.editar(id, {
        placa: form.placa.trim().toUpperCase(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim() || null,
        color: form.color || null,
        tecno_inicio: form.tecno_inicio || null,
        tecno_vence: form.tecno_vence || null,
        soat_inicio: form.soat_inicio || null,
        soat_vence: form.soat_vence || null,
      })
      setGrua(actualizado)
      setEditando(false)
    } catch (err) {
      setErrorForm(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleToggle = async () => {
    setToggling(true)
    try {
      const actualizado = await gruasApi.toggle(id)
      setGrua(actualizado)
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al cambiar estado')
    } finally {
      setToggling(false)
    }
  }

  const handleAsignar = async () => {
    if (!conductorSeleccionado) return
    setGuardandoConductor(true)
    try {
      const actualizado = await gruasApi.asignar(id, conductorSeleccionado)
      setGrua(actualizado)
      setShowAsignar(false)
      setConductorSeleccionado('')
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al asignar')
    } finally {
      setGuardandoConductor(false)
    }
  }

  const handleDesasignar = async () => {
    if (!obsDesasignacion.trim()) return
    setGuardandoConductor(true)
    try {
      const actualizado = await gruasApi.desasignar(id, obsDesasignacion.trim())
      setGrua(actualizado)
      setShowDesasignar(false)
      setObsDesasignacion('')
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al desasignar')
    } finally {
      setGuardandoConductor(false)
    }
  }

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFoto(true)
    try {
      const actualizado = await gruasApi.subirFoto(id, file)
      setGrua(actualizado)
      setFotoTs(Date.now())   // rompe el caché del navegador
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al subir foto')
    } finally {
      setSubiendoFoto(false)
      e.target.value = ''
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
    </div>
  )

  if (error || !grua) return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col">
      <Watermark />
      <AppHeader title="Detalle de grúa" back={() => navigate('/gruas')} />
      <p className="text-center text-red-600 py-16">{error || 'Grúa no encontrada'}</p>
    </div>
  )

  const esAdmin = !!user?.perm_gestionar_gruas

  const gruaHeaderRight = (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
      grua.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {grua.activa ? 'Activa' : 'Inactiva'}
    </span>
  )

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Watermark />
      <AppHeader
        title={grua.placa}
        back={() => navigate('/gruas')}
        right={gruaHeaderRight}
      />

      <main className="px-4 py-4 max-w-lg mx-auto pb-8 space-y-4">

        {/* Foto de perfil */}
        <div className="card flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
            {grua.foto_url ? (
              <img
                src={`${API_BASE_URL}${grua.foto_url}?t=${fotoTs}`}
                alt={grua.placa}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl">🚛</span>
            )}
          </div>
          <div className="flex-1">
            {esAdmin && (
              <>
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFoto}
                />
                <button
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={subiendoFoto}
                  className="btn-secondary text-sm"
                >
                  {subiendoFoto ? 'Subiendo...' : grua.foto_url ? 'Cambiar foto' : 'Agregar foto'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Estado: toggle activa/inactiva */}
        {esAdmin && (
          <div className="card flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Estado</p>
              <p className="text-sm text-gray-500">
                {grua.activa ? 'La grúa está disponible para operar' : 'La grúa está fuera de servicio'}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                grua.activa ? 'bg-green-500' : 'bg-gray-300'
              } ${toggling ? 'opacity-50' : ''}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                grua.activa ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        )}

        {/* Info básica */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Datos del vehículo</h2>
            {esAdmin && !editando && (
              <button onClick={() => setEditando(true)} className="text-sm text-blue-600 font-medium">
                Editar
              </button>
            )}
            {editando && (
              <div className="flex gap-2">
                <button onClick={() => { setEditando(false); setErrorForm('') }} className="text-sm text-gray-500">
                  Cancelar
                </button>
                <button onClick={handleGuardar} disabled={guardando} className="text-sm text-blue-600 font-medium">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>

          {editando ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Placa *</label>
                  <span className={`text-xs font-mono font-bold ${form.placa.length === 6 ? 'text-green-600' : 'text-gray-400'}`}>
                    {form.placa.length}/6
                  </span>
                </div>
                <input name="placa" value={form.placa} onChange={handleChange}
                  className={`input uppercase font-mono tracking-widest text-lg ${form.placa.length > 0 && form.placa.length < 6 ? 'border-orange-300' : ''}`}
                  placeholder="DQN228" maxLength={6} />
              </div>
              <div>
                <label className="label">Marca *</label>
                <MarcaInput value={form.marca} onChange={(v) => setForm((f) => ({ ...f, marca: v }))} />
              </div>
              <div>
                <label className="label">Modelo</label>
                <input name="modelo" value={form.modelo} onChange={handleChange}
                  className="input" placeholder="Ej: F-350, 2022" />
              </div>
              <div>
                <label className="label">Color</label>
                <select name="color" value={form.color} onChange={handleChange} className="input">
                  <option value="">Seleccionar...</option>
                  {COLORES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {errorForm && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorForm}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <InfoRow label="Placa" value={<span className="font-mono font-bold">{grua.placa}</span>} />
              <InfoRow label="Marca" value={grua.marca} />
              {grua.modelo && <InfoRow label="Modelo" value={grua.modelo} />}
              {grua.color && <InfoRow label="Color" value={grua.color} />}
            </div>
          )}
        </div>

        {/* Conductor */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Conductor</h2>
          {grua.conductor_nombre ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{grua.conductor_nombre}</p>
                <p className="text-xs text-green-600">Asignado</p>
              </div>
              {esAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAsignar(true)}
                    className="text-xs text-blue-600 font-medium px-2 py-1"
                  >
                    Cambiar
                  </button>
                  <button
                    onClick={() => setShowDesasignar(true)}
                    className="text-xs text-red-500 font-medium px-2 py-1"
                  >
                    Desasignar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-orange-500">Sin conductor asignado</p>
              {esAdmin && (
                <button
                  onClick={() => setShowAsignar(true)}
                  className="text-sm text-blue-600 font-medium"
                >
                  Asignar
                </button>
              )}
            </div>
          )}
          {grua.observacion_desasignacion && (
            <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">
              Obs. desasignación: "{grua.observacion_desasignacion}"
            </p>
          )}
        </div>

        {/* Tecnomecánica */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Tecnomecánica</h2>
            {esAdmin && !editando && (
              <button onClick={() => setEditando(true)} className="text-sm text-blue-600 font-medium">
                Editar fechas
              </button>
            )}
          </div>
          {editando ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha inicio</label>
                <input type="date" name="tecno_inicio" value={form.tecno_inicio}
                  onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="label">Fecha vencimiento</label>
                <input type="date" name="tecno_vence" value={form.tecno_vence}
                  onChange={handleChange} className="input" />
              </div>
            </div>
          ) : (
            <InfoDoc label="Tecnomecánica" inicio={grua.tecno_inicio} vence={grua.tecno_vence} />
          )}
        </div>

        {/* SOAT */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">SOAT</h2>
          </div>
          {editando ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha inicio</label>
                <input type="date" name="soat_inicio" value={form.soat_inicio}
                  onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="label">Fecha vencimiento</label>
                <input type="date" name="soat_vence" value={form.soat_vence}
                  onChange={handleChange} className="input" />
              </div>
            </div>
          ) : (
            <InfoDoc label="SOAT" inicio={grua.soat_inicio} vence={grua.soat_vence} />
          )}
        </div>

      </main>

      {/* Modal asignar conductor */}
      {showAsignar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Asignar conductor</h2>
            <select
              value={conductorSeleccionado}
              onChange={(e) => setConductorSeleccionado(e.target.value)}
              className="input mb-4"
            >
              <option value="">Seleccionar conductor...</option>
              {usuarios.filter((u) => u.activo).map((u) => (
                <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setShowAsignar(false); setConductorSeleccionado('') }} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleAsignar}
                disabled={!conductorSeleccionado || guardandoConductor}
                className="btn-primary"
              >
                {guardandoConductor ? 'Asignando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal desasignar conductor */}
      {showDesasignar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Desasignar conductor</h2>
            <p className="text-sm text-gray-500 mb-4">Se requiere una observación obligatoria.</p>
            <div className="mb-4">
              <label className="label">Observación *</label>
              <textarea
                value={obsDesasignacion}
                onChange={(e) => setObsDesasignacion(e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="¿Por qué se desasigna el conductor?"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDesasignar(false); setObsDesasignacion('') }} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleDesasignar}
                disabled={!obsDesasignacion.trim() || guardandoConductor}
                className="btn-primary"
              >
                {guardandoConductor ? 'Desasignando...' : 'Confirmar'}
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
