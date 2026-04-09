import client from './client'

export const fotosApi = {
  subirVehiculo: async (viajeVehiculoId, files) => {
    const formData = new FormData()
    for (const file of files) formData.append('files', file)
    return client.post(`/fotos/vehiculo/${viajeVehiculoId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  listarVehiculo: (viajeVehiculoId) =>
    client.get(`/fotos/vehiculo/${viajeVehiculoId}`).then((r) => r.data),

  subirGrua: async (viajeId, files) => {
    const formData = new FormData()
    for (const file of files) formData.append('files', file)
    return client.post(`/fotos/grua/${viajeId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  listarGrua: (viajeId) =>
    client.get(`/fotos/grua/${viajeId}`).then((r) => r.data),

  eliminar: (fotoId) =>
    client.delete(`/fotos/${fotoId}`).then((r) => r.data),
}
