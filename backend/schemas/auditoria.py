import uuid
from datetime import datetime
from pydantic import BaseModel


class AuditoriaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    viaje_id: uuid.UUID
    usuario_id: uuid.UUID
    accion: str
    datos_antes: dict | None
    datos_despues: dict | None
    realizado_en: datetime

    model_config = {"from_attributes": True}
