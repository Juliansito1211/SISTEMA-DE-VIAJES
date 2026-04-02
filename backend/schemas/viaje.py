import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from schemas.vehiculo import ViajeVehiculoOut


class ViajeCreate(BaseModel):
    origen: str
    destino: str


class ViajeIniciar(BaseModel):
    placa_grua: str
    marca_grua: str


class ViajeOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    creado_por: uuid.UUID
    creado_por_nombre: str
    iniciado_por: uuid.UUID | None
    placa_grua: str | None
    marca_grua: str | None
    origen: str
    destino: str
    estado: str
    monto_total: Decimal | None
    metodo_pago: str | None
    foto_recibo_url: str | None
    creado_en: datetime
    iniciado_en: datetime | None
    finalizado_en: datetime | None

    model_config = {"from_attributes": True}


class ViajeUpdate(BaseModel):
    origen: str | None = None
    destino: str | None = None


class ViajeFinalizar(BaseModel):
    metodo_pago: str
    foto_recibo_url: str | None = None


class ViajeDetalle(ViajeOut):
    vehiculos: list[ViajeVehiculoOut] = []


ViajeDetalle.model_rebuild()
