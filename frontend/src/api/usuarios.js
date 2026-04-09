import client from './client'

export const usuariosApi = {
  listar: () =>
    client.get('/usuarios').then((r) => r.data),

  activos: () =>
    client.get('/usuarios/activos').then((r) => r.data),

  crear: (data) =>
    client.post('/usuarios', data).then((r) => r.data),

  editar: (id, data) =>
    client.put(`/usuarios/${id}`, data).then((r) => r.data),

  cambiarRol: (id, rol_id) =>
    client.patch(`/usuarios/${id}/rol`, { rol_id }).then((r) => r.data),

  eliminar: (id) =>
    client.delete(`/usuarios/${id}`).then((r) => r.data),
}
