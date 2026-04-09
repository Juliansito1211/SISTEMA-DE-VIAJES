import uuid
from datetime import date, datetime
from pydantic import BaseModel


class GruaCreate(BaseModel):
    placa: str
    marca: str
    modelo: str | None = None
    color: str | None = None
    tecno_inicio: date | None = None
    tecno_vence: date | None = None
    soat_inicio: date | None = None
    soat_vence: date | None = None


class GruaUpdate(BaseModel):
    placa: str | None = None
    marca: str | None = None
    modelo: str | None = None
    color: str | None = None
    tecno_inicio: date | None = None
    tecno_vence: date | None = None
    soat_inicio: date | None = None
    soat_vence: date | None = None


class GruaAsignar(BaseModel):
    conductor_id: uuid.UUID


class GruaDesasignar(BaseModel):
    observacion: str


class GruaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    placa: str
    marca: str
    modelo: str | None
    color: str | None
    foto_url: str | None
    activa: bool
    disponible: bool = True          # False si está en un viaje EN_CURSO o PENDIENTE_ACEPTAR
    conductor_id: uuid.UUID | None
    conductor_nombre: str | None
    observacion_desasignacion: str | None
    tecno_inicio: date | None
    tecno_vence: date | None
    soat_inicio: date | None
    soat_vence: date | None
    creado_en: datetime

    model_config = {"from_attributes": True}
