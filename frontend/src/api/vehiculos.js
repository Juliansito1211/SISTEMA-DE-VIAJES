import client from './client'

export const vehiculosApi = {
  listar: (viajeId) =>
    client.get(`/viajes/${viajeId}/vehiculos`).then((r) => r.data),

  agregar: (viajeId, data) =>
    client.post(`/viajes/${viajeId}/vehiculos`, data).then((r) => r.data),

  editar: (viajeId, vid, data) =>
    client.put(`/viajes/${viajeId}/vehiculos/${vid}`, data).then((r) => r.data),

  eliminar: (viajeId, vid) =>
    client.delete(`/viajes/${viajeId}/vehiculos/${vid}`),

  actualizarMontos: (viajeId, montos) =>
    client
      .patch(`/viajes/${viajeId}/vehiculos/montos`, { montos })
      .then((r) => r.data),

  buscar: (placa) =>
    client.get('/vehiculos/buscar', { params: { placa } }).then((r) => r.data),
}
