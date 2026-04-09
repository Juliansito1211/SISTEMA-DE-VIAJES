import client from './client'

export const viajesApi = {
  listar: (params) =>
    client.get('/viajes', { params }).then((r) => r.data),

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

  auditoria: (id) =>
    client.get(`/viajes/${id}/auditoria`).then((r) => r.data),

  cancelar: (id) =>
    client.delete(`/viajes/${id}`).then((r) => r.data),

  aceptar: (id) =>
    client.post(`/viajes/${id}/aceptar`).then((r) => r.data),

  asignarOperador: (id, conductor_id) =>
    client.patch(`/viajes/${id}/asignar-operador`, { conductor_id }).then((r) => r.data),
}
