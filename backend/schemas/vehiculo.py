import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class VehiculoAgregar(BaseModel):
    placa: str
    marca: str | None = None
    modelo: str | None = None
    color: str | None = None
    monto: Decimal | None = None
    observacion: str | None = None


class VehiculoUpdate(BaseModel):
    placa: str | None = None
    marca: str | None = None
    modelo: str | None = None
    color: str | None = None
    monto: Decimal | None = None
    observacion: str | None = None


class MontoItem(BaseModel):
    viaje_vehiculo_id: str
    monto: Decimal


class MontosUpdate(BaseModel):
    montos: list[MontoItem]


class ViajeVehiculoOut(BaseModel):
    id: uuid.UUID
    viaje_id: uuid.UUID
    vehiculo_id: uuid.UUID
    placa: str
    marca: str | None
    modelo: str | None
    color: str | None
    monto: Decimal | None
    orden: int
    observacion: str | None
    agregado_en: datetime

    model_config = {"from_attributes": True}


class VehiculoCatalogoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    placa: str
    marca: str | None
    modelo: str | None
    color: str | None

    model_config = {"from_attributes": True}
