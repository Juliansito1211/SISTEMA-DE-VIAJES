import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import InputPassword from '../components/InputPassword'
import BottomNav from '../components/BottomNav'
import AppHeader from '../components/AppHeader'
import Watermark from '../components/Watermark'

export default function Usuarios() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [usuarioEditar, setUsuarioEditar] = useState(null)

  const cargar = () => {
    setLoading(true)
    Promise.all([
      client.get('/usuarios').then((r) => r.data),
      client.get('/roles').then((r) => r.data),
    ])
      .then(([u, r]) => { setUsuarios(u); setRoles(r) })
      .catch(() => setError('Error al cargar usuarios'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const desactivar = async (id) => {
    if (!window.confirm('¿Desactivar este usuario?')) return
    try {
      await client.delete(`/usuarios/${id}`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al desactivar')
    }
  }

  const nombreRol = (rol_id) => roles.find((r) => r.id === rol_id)?.nombre || `Rol ${rol_id}`

  const headerRight = user?.perm_crear_usuarios ? (
    <button
      onClick={() => { setUsuarioEditar(null); setShowForm(true) }}
      className="text-sm text-blue-600 font-semibold"
    >
      + Nuevo
    </button>
  ) : null

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Watermark />
      <AppHeader title="Usuarios" right={headerRight} />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-3 pb-24">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        )}
        {error && <p className="text-center text-red-600 py-8 text-sm">{error}</p>}

        {usuarios.map((u) => (
          <div key={u.id} className={`card ${!u.activo ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{u.nombre}</p>
                <p className="text-sm text-gray-500 truncate">{u.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {nombreRol(u.rol_id)}
                  </span>
                  {!u.activo && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inactivo</span>
                  )}
                  {String(u.id) === String(user?.id) && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Tú</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                {/* Editar siempre disponible para usuarios activos o para el propio usuario */}
                {(user?.perm_crear_usuarios || String(u.id) === String(user?.id)) && u.activo && (
                  <button
                    onClick={() => { setUsuarioEditar(u); setShowForm(true) }}
                    className="text-xs text-blue-600 font-medium px-2 py-1"
                  >
                    Editar
                  </button>
                )}
                {user?.perm_crear_usuarios && u.activo && String(u.id) !== String(user?.id) && (
                  <button
                    onClick={() => desactivar(u.id)}
                    className="text-xs text-red-500 font-medium px-2 py-1"
                  >
                    Desactivar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>

      {showForm && (
        <FormUsuario
          usuario={usuarioEditar}
          roles={roles}
          puedeGestionarRoles={user?.perm_gestionar_roles}
          onSuccess={() => { setShowForm(false); setUsuarioEditar(null); cargar() }}
          onClose={() => { setShowForm(false); setUsuarioEditar(null) }}
        />
      )}
      <BottomNav />
    </div>
  )
}

function FormUsuario({ usuario, roles, puedeGestionarRoles, onSuccess, onClose }) {
  const esEdicion = !!usuario
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    password: '',
    rol_id: usuario?.rol_id ? String(usuario.rol_id) : '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    setLoading(true)
    try {
      if (esEdicion) {
        const payload = {}
        if (form.nombre !== usuario.nombre) payload.nombre = form.nombre
        if (form.email !== usuario.email) payload.email = form.email
        if (form.password) payload.password = form.password

        if (Object.keys(payload).length > 0) {
          await client.put(`/usuarios/${usuario.id}`, payload)
        }

        // Cambiar rol si cambió y tiene permiso
        if (puedeGestionarRoles && form.rol_id && parseInt(form.rol_id) !== usuario.rol_id) {
          await client.patch(`/usuarios/${usuario.id}/rol`, { rol_id: parseInt(form.rol_id) })
        }
      } else {
        if (!form.rol_id) { setError('Selecciona un rol'); setLoading(false); return }
        await client.post('/usuarios', { ...form, rol_id: parseInt(form.rol_id) })
      }
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">
              {esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre completo *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">
                {esEdicion ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
              </label>
              <InputPassword
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={esEdicion ? '••••••••' : ''}
              />
            </div>
            {(!esEdicion || puedeGestionarRoles) && (
              <div>
                <label className="label">Rol {!esEdicion ? '*' : ''}</label>
                <select name="rol_id" value={form.rol_id} onChange={handleChange} className="input">
                  <option value="">Seleccionar...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
