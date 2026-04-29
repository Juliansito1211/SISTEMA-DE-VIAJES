import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { viajesApi } from '../api/viajes'
import { vehiculosApi } from '../api/vehiculos'
import SelectorCiudad from '../components/SelectorCiudad'
import MARCAS from '../data/marcasCarros'
import COLORES from '../data/coloresCarros'
import { normalizarPlaca, placaValida } from '../utils/formato'
import AppHeader from '../components/AppHeader'
import Watermark from '../components/Watermark'

export default function NuevoViaje() {
  const navigate = useNavigate()
  const [tipoViaje, setTipoViaje] = useState('NACIONAL')
  const [form, setForm] = useState({ origen: '', destino: '' })
  const [vehiculo, setVehiculo] = useState({ placa: '', marca: '', modelo: '', color: '', monto: '' })
  const [sugerenciasMarca, setSugerenciasMarca] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleVehChange = (e) => {
    const { name, value } = e.target
    // Normalizar placa automáticamente
    if (name === 'placa') {
      setVehiculo((v) => ({ ...v, placa: normalizarPlaca(value) }))
      return
    }
    setVehiculo((v) => ({ ...v, [name]: value }))
    if (name === 'marca') {
      if (value.length >= 1) {
        const filtradas = MARCAS.filter((m) =>
          m.toLowerCase().startsWith(value.toLowerCase())
        ).slice(0, 6)
        setSugerenciasMarca(filtradas)
      } else {
        setSugerenciasMarca([])
      }
    }
  }

  const seleccionarMarca = (marca) => {
    setVehiculo((v) => ({ ...v, marca }))
    setSugerenciasMarca([])
  }

  const cambiarTipo = (tipo) => {
    setTipoViaje(tipo)
    setForm({ origen: '', destino: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!vehiculo.placa.trim()) { setError('Debe ingresar la placa'); return }
    if (!placaValida(vehiculo.placa)) { setError('La placa debe tener exactamente 6 caracteres (ej: DQN228)'); return }
    if (!form.origen.trim()) { setError('Debe ingresar el origen'); return }
    if (!form.destino.trim()) { setError('Debe ingresar el destino'); return }

    setLoading(true)
    try {
      const viaje = await viajesApi.crear({
        origen: form.origen.trim(),
        destino: form.destino.trim(),
        tipo_viaje: tipoViaje,
      })

      await vehiculosApi.agregar(viaje.id, {
        placa: vehiculo.placa.trim(),
        marca: vehiculo.marca.trim() || null,
        modelo: vehiculo.modelo.trim() || null,
        color: vehiculo.color || null,
        monto: vehiculo.monto !== '' ? parseFloat(vehiculo.monto) : null,
      })

      navigate(`/viajes/${viaje.id}`, { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail?.error === 'placa_es_grua') {
        setError('🚛 Esa placa pertenece a una grúa y no puede usarse como vehículo transportado.')
      } else {
        setError(typeof detail === 'string' ? detail : 'Error al crear el viaje')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Watermark />
      <AppHeader title="Nuevo Viaje" back={() => navigate(-1)} />

      <main className="px-4 py-5 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Tipo de viaje */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-900">Tipo de viaje</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cambiarTipo('URBANO')}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                  tipoViaje === 'URBANO'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                🏙️ Urbano
              </button>
              <button
                type="button"
                onClick={() => cambiarTipo('NACIONAL')}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                  tipoViaje === 'NACIONAL'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                🗺️ Nacional
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {tipoViaje === 'URBANO'
                ? 'Viaje dentro de la ciudad. Ingresa la dirección de recogida y entrega.'
                : 'Viaje entre ciudades de Colombia.'}
            </p>
          </div>

          {/* Origen y destino */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Datos del viaje</h2>

            {tipoViaje === 'URBANO' ? (
              <>
                <div>
                  <label className="label">Dirección de origen *</label>
                  <input
                    name="origen"
                    value={form.origen}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ej: Cra 15 # 80-20, Bogotá"
                  />
                </div>
                <div>
                  <label className="label">Dirección de destino *</label>
                  <input
                    name="destino"
                    value={form.destino}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ej: Av. Boyacá # 100-50, Bogotá"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">Ciudad de origen *</label>
                  <SelectorCiudad
                    value={form.origen}
                    onChange={(val) => setForm((f) => ({ ...f, origen: val }))}
                    placeholder="Buscar ciudad de origen..."
                  />
                </div>
                <div>
                  <label className="label">Ciudad de destino *</label>
                  <SelectorCiudad
                    value={form.destino}
                    onChange={(val) => setForm((f) => ({ ...f, destino: val }))}
                    placeholder="Buscar ciudad de destino..."
                  />
                </div>
              </>
            )}
          </div>

          {/* Primer vehículo */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Primer vehículo transportado</h2>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Placa *</label>
                <span className={`text-xs font-mono font-bold ${vehiculo.placa.length === 6 ? 'text-green-600' : 'text-gray-400'}`}>
                  {vehiculo.placa.length}/6
                </span>
              </div>
              <input
                name="placa"
                value={vehiculo.placa}
                onChange={handleVehChange}
                className={`input uppercase font-mono tracking-widest text-lg ${vehiculo.placa.length > 0 && vehiculo.placa.length < 6 ? 'border-orange-300' : ''}`}
                placeholder="DQN228"
                maxLength={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Marca con autocompletado */}
              <div className="relative">
                <label className="label">Marca</label>
                <input
                  name="marca"
                  value={vehiculo.marca}
                  onChange={handleVehChange}
                  className="input"
                  placeholder="Buscar marca..."
                  autoComplete="off"
                />
                {sugerenciasMarca.length > 0 && (
                  <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden max-h-44 overflow-y-auto">
                    {sugerenciasMarca.map((m) => (
                      <li
                        key={m}
                        onMouseDown={() => seleccionarMarca(m)}
                        className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="label">Modelo</label>
                <input
                  name="modelo"
                  value={vehiculo.modelo}
                  onChange={handleVehChange}
                  className="input"
                  placeholder="Ej: 2022"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Color</label>
                <select
                  name="color"
                  value={vehiculo.color}
                  onChange={handleVehChange}
                  className="input"
                >
                  <option value="">Seleccionar...</option>
                  {COLORES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Monto</label>
                <input
                  name="monto"
                  type="number"
                  step="1"
                  min="0"
                  value={vehiculo.monto}
                  onChange={handleVehChange}
                  className="input"
                  placeholder="Ej: 150000"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creando viaje...' : 'Crear viaje'}
          </button>
        </form>
      </main>
    </div>
  )
}
