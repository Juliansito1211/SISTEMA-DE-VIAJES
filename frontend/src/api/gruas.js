import client from './client'
import { API_BASE_URL } from './client'

export const gruasApi = {
  listar: (params) =>
    client.get('/gruas', { params }).then((r) => r.data),

  obtener: (id) =>
    client.get(`/gruas/${id}`).then((r) => r.data),

  crear: (data) =>
    client.post('/gruas', data).then((r) => r.data),

  editar: (id, data) =>
    client.put(`/gruas/${id}`, data).then((r) => r.data),

  toggle: (id) =>
    client.patch(`/gruas/${id}/toggle`).then((r) => r.data),

  asignar: (id, conductor_id) =>
    client.patch(`/gruas/${id}/asignar`, { conductor_id }).then((r) => r.data),

  desasignar: (id, observacion) =>
    client.patch(`/gruas/${id}/desasignar`, { observacion }).then((r) => r.data),

  subirFoto: async (id, file) => {
    const fd = new FormData()
    fd.append('foto', file)
    const r = await client.post(`/gruas/${id}/foto`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return r.data
  },

  misGruas: () =>
    client.get('/gruas', { params: { solo_mias: true } }).then((r) => r.data),
}

export { API_BASE_URL }
