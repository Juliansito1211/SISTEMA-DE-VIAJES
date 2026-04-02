import uuid
from pydantic import BaseModel


class RolOut(BaseModel):
    id: int
    empresa_id: uuid.UUID
    nombre: str
    nivel: int
    perm_crear_viaje: bool
    perm_iniciar_viaje: bool
    perm_editar_viaje_activo: bool
    perm_finalizar_viaje: bool
    perm_editar_viaje_finalizado: bool
    perm_reabrir_viaje: bool
    perm_ver_todos_viajes: bool
    perm_agregar_vehiculo: bool
    perm_editar_vehiculo: bool
    perm_crear_usuarios: bool
    perm_gestionar_roles: bool
    perm_ver_auditoria: bool
    perm_configuracion: bool

    model_config = {"from_attributes": True}


class RolUpdate(BaseModel):
    nombre: str | None = None
    perm_crear_viaje: bool | None = None
    perm_iniciar_viaje: bool | None = None
    perm_editar_viaje_activo: bool | None = None
    perm_finalizar_viaje: bool | None = None
    perm_editar_viaje_finalizado: bool | None = None
    perm_reabrir_viaje: bool | None = None
    perm_ver_todos_viajes: bool | None = None
    perm_agregar_vehiculo: bool | None = None
    perm_editar_vehiculo: bool | None = None
    perm_crear_usuarios: bool | None = None
    perm_gestionar_roles: bool | None = None
    perm_ver_auditoria: bool | None = None
    perm_configuracion: bool | None = None
