import uuid
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PermisosMixin(BaseModel):
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
    perm_gestionar_gruas: bool
    perm_ver_auditoria: bool
    perm_configuracion: bool


class UsuarioMe(PermisosMixin):
    """Respuesta de GET /auth/me — incluye datos del usuario y sus permisos aplanados."""
    id: uuid.UUID
    empresa_id: uuid.UUID
    empresa_nombre: str
    nombre: str
    email: str
    rol_nombre: str
    rol_nivel: int

    model_config = {"from_attributes": True}
