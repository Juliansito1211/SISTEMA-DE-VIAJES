import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UsuarioCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol_id: int


class UsuarioUpdate(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None
    password: str | None = None


class UsuarioCambiarRol(BaseModel):
    rol_id: int


class UsuarioOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    rol_id: int
    nombre: str
    email: str
    activo: bool
    creado_en: datetime
    ultimo_login: datetime | None

    model_config = {"from_attributes": True}
