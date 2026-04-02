import client from './client'

export const viajesApi = {
  listar: () =>
    client.get('/viajes').then((r) => r.data),

  obtener: (id) =>
    client.get(`/viajes/${id}`).then((r) => r.data),

  crear: (data) =>
    client.post('/viajes', data).then((r) => r.data),

  iniciar: (id, data) =>
    client.patch(`/viajes/${id}/iniciar`, data).then((r) => r.data),

  editar: (id, data) =>
    client.put(`/viajes/${id}`, data).then((r) => r.data),

  finalizar: (id, data) =>
    client.post(`/viajes/${id}/finalizar`, data).then((r) => r.data),

  reabrir: (id) =>
    client.post(`/viajes/${id}/reabrir`).then((r) => r.data),
}
