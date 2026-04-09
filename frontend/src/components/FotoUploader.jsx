import { useEffect, useRef, useState } from 'react'
import { fotosApi } from '../api/fotos'
import { API_BASE_URL } from '../api/client'

/**
 * Props:
 *  - tipo: 'vehiculo' | 'grua'
 *  - entidadId: viaje_vehiculo_id (vehiculo) o viaje_id (grua)
 *  - editable: bool — si false solo muestra las fotos, no permite subir/eliminar
 */
export default function FotoUploader({ tipo, entidadId, editable = true }) {
  const [fotos, setFotos] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const inputRef = useRef(null)

  const cargar = () => {
    const fn = tipo === 'vehiculo'
      ? fotosApi.listarVehiculo(entidadId)
      : fotosApi.listarGrua(entidadId)
    fn.then(setFotos).catch(() => {})
  }

  useEffect(() => {
    if (entidadId) cargar()
  }, [entidadId])

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setSubiendo(true)
    try {
      const nuevas = tipo === 'vehiculo'
        ? await fotosApi.subirVehiculo(entidadId, files)
        : await fotosApi.subirGrua(entidadId, files)
      setFotos((prev) => [...prev, ...nuevas])
    } catch {
      alert('Error al subir las fotos')
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  const handleEliminar = async (fotoId) => {
    try {
      await fotosApi.eliminar(fotoId)
      setFotos((prev) => prev.filter((f) => f.id !== fotoId))
    } catch {
      alert('Error al eliminar la foto')
    }
  }

  return (
    <div className="space-y-2">
      {fotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((foto) => (
            <div key={foto.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={`${API_BASE_URL}${foto.url}`}
                alt="foto"
                className="w-full h-full object-cover"
              />
              {editable && (
                <button
                  onClick={() => handleEliminar(foto.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {subiendo ? 'Subiendo...' : fotos.length > 0 ? '+ Agregar más fotos' : '📷 Agregar fotos'}
          </button>
        </>
      )}
    </div>
  )
}
