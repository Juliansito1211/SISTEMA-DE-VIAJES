import uuid
from datetime import datetime
from pydantic import BaseModel


class SolicitudCreate(BaseModel):
    nota: str | None = None


class SolicitudOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    viaje_id: uuid.UUID
    solicitado_por: uuid.UUID
    solicitado_por_nombre: str
    viaje_origen: str
    viaje_destino: str
    estado: str
    nota: str | None
    resuelto_por: uuid.UUID | None
    creado_en: datetime
    resuelto_en: datetime | None

    model_config = {"from_attributes": True}


class SolicitudResolver(BaseModel):
    accion: str  # 'APROBAR' o 'RECHAZAR'
