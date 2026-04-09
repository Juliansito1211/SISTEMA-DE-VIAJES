import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from schemas.vehiculo import ViajeVehiculoOut


class ViajeCreate(BaseModel):
    origen: str
    destino: str
    programado_para: datetime | None = None
    conductor_id: uuid.UUID | None = None


class ViajeIniciar(BaseModel):
    grua_id: uuid.UUID
    observacion_grua: str | None = None


class ViajeOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    creado_por: uuid.UUID
    creado_por_nombre: str
    iniciado_por: uuid.UUID | None
    conductor_id: uuid.UUID | None
    conductor_nombre: str | None
    codigo: str | None
    observacion_grua: str | None
    placa_grua: str | None
    marca_grua: str | None
    origen: str
    destino: str
    estado: str
    monto_total: Decimal | None
    metodo_pago: str | None
    foto_recibo_url: str | None
    creado_en: datetime
    programado_para: datetime | None = None
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


class AuditoriaViajeOut(BaseModel):
    id: uuid.UUID
    accion: str
    usuario_nombre: str
    datos_antes: dict | None
    datos_despues: dict | None
    realizado_en: datetime

    model_config = {"from_attributes": True}


ViajeDetalle.model_rebuild()
