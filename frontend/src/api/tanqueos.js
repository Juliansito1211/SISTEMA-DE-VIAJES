import client from './client'

export const tanqueosApi = {
  listar: (viajeId) =>
    client.get(`/viajes/${viajeId}/tanqueos`).then((r) => r.data),

  registrar: (viajeId, { monto, observacion, foto }) => {
    const fd = new FormData()
    fd.append('monto', monto)
    if (observacion) fd.append('observacion', observacion)
    if (foto) fd.append('foto', foto)
    return client.post(`/viajes/${viajeId}/tanqueos`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  eliminar: (viajeId, tanqueoId) =>
    client.delete(`/viajes/${viajeId}/tanqueos/${tanqueoId}`),
}
