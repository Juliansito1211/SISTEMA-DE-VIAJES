import uuid
from datetime import datetime
from pydantic import BaseModel


class ConfiguracionOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    foto_recibo_obligatoria: bool
    metodos_pago_habilitados: str
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class ConfiguracionUpdate(BaseModel):
    foto_recibo_obligatoria: bool | None = None
    metodos_pago_habilitados: str | None = None
