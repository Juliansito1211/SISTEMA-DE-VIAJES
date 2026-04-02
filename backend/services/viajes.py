from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from models.auditoria import Auditoria
from models.configuracion import Configuracion
from models.viaje import Viaje
from models.vehiculo import ViajeVehiculo


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_viaje_o_404(viaje_id: str, empresa_id: str, db: Session) -> Viaje:
    """Carga el viaje con sus vehículos. Lanza 404 si no pertenece a la empresa."""
    viaje = (
        db.query(Viaje)
        .options(joinedload(Viaje.vehiculos).joinedload(ViajeVehiculo.vehiculo))
        .filter(Viaje.id == viaje_id, Viaje.empresa_id == empresa_id)
        .first()
    )
    if not viaje:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Viaje no encontrado")
    return viaje


def calcular_monto_total(vehiculos: list[ViajeVehiculo]) -> Decimal:
    """Suma los montos != None de los vehículos del viaje."""
    return sum((vv.monto for vv in vehiculos if vv.monto is not None), Decimal("0"))


def viaje_a_dict(viaje: Viaje) -> dict[str, Any]:
    """Snapshot del viaje para auditoría (solo campos de la tabla viajes)."""
    return {
        "id": str(viaje.id),
        "origen": viaje.origen,
        "destino": viaje.destino,
        "estado": viaje.estado,
        "placa_grua": viaje.placa_grua,
        "marca_grua": viaje.marca_grua,
        "monto_total": str(viaje.monto_total) if viaje.monto_total is not None else None,
        "metodo_pago": viaje.metodo_pago,
        "foto_recibo_url": viaje.foto_recibo_url,
        "iniciado_en": viaje.iniciado_en.isoformat() if viaje.iniciado_en else None,
        "finalizado_en": viaje.finalizado_en.isoformat() if viaje.finalizado_en else None,
    }


def registrar_auditoria(
    db: Session,
    empresa_id: str,
    viaje_id: str,
    usuario_id: str,
    accion: str,
    datos_antes: dict | None,
    datos_despues: dict | None,
) -> None:
    """Inserta un registro en auditoria. Append-only: nunca se modifica."""
    entrada = Auditoria(
        empresa_id=empresa_id,
        viaje_id=viaje_id,
        usuario_id=usuario_id,
        accion=accion,
        datos_antes=datos_antes,
        datos_despues=datos_despues,
        realizado_en=datetime.now(timezone.utc),
    )
    db.add(entrada)
    # No se hace commit aquí; el caller lo hace junto al resto de cambios.


# ── Validaciones de finalización (en cascada) ──────────────────────────────────

class ErrorFinalizacion(HTTPException):
    """Excepción tipada para distinguir cada validación fallida."""
    def __init__(self, code: str, detail: Any):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={
            "code": code,
            "message": detail,
        })


def validar_finalizar(viaje: Viaje, db: Session) -> None:
    """
    Ejecuta las 3 validaciones en cascada del flujo Finalizar.
    Lanza ErrorFinalizacion en la primera que falle.
    """
    vehiculos = viaje.vehiculos

    # Validación 1: el viaje debe tener al menos 1 vehículo
    if not vehiculos:
        raise ErrorFinalizacion(
            code="SIN_VEHICULOS",
            detail="El viaje no tiene vehículos. Debe agregar al menos uno.",
        )

    # Validación 2: todos los vehículos deben tener monto
    sin_monto = [vv.vehiculo.placa for vv in vehiculos if vv.monto is None]
    if sin_monto:
        raise ErrorFinalizacion(
            code="VEHICULOS_SIN_MONTO",
            detail={
                "mensaje": "Los siguientes vehículos no tienen monto asignado:",
                "placas": sin_monto,
            },
        )

    # Validación 3: el monto total debe ser mayor a 0
    total = calcular_monto_total(vehiculos)
    if total <= 0:
        raise ErrorFinalizacion(
            code="MONTO_INVALIDO",
            detail="El monto total debe ser mayor a 0.",
        )


def get_configuracion(empresa_id: str, db: Session) -> Configuracion | None:
    return db.query(Configuracion).filter(Configuracion.empresa_id == empresa_id).first()
