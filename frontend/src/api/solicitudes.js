import client from './client'

export const solicitudesApi = {
  solicitar: (viajeId, nota) =>
    client.post(`/solicitudes/${viajeId}`, { nota }).then((r) => r.data),

  listar: () =>
    client.get('/solicitudes').then((r) => r.data),

  resolver: (id, accion) =>
    client.patch(`/solicitudes/${id}/resolver`, { accion }).then((r) => r.data),
}
