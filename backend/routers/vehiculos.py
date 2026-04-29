import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_user, require
from models.grua import Grua
from models.usuario import Usuario
from models.vehiculo import VehiculoCatalogo, ViajeVehiculo
from models.viaje import Viaje as ViajeModel
from schemas.vehiculo import (
    VehiculoAgregar,
    VehiculoUpdate,
    MontosUpdate,
    ViajeVehiculoOut,
    VehiculoCatalogoOut,
)
from services.vehiculos import get_or_create_vehiculo
from services.viajes import (
    calcular_monto_total,
    get_viaje_o_404,
    registrar_auditoria,
    viaje_a_dict,
)

ESTADOS_BLOQUEANTES = ["NO_INICIADO", "PROGRAMADO", "PENDIENTE_ACEPTAR", "EN_CURSO"]

ESTADO_LABEL = {
    "NO_INICIADO":       "pendiente / sin iniciar",
    "PROGRAMADO":        "programado",
    "PENDIENTE_ACEPTAR": "pendiente de aceptar",
    "EN_CURSO":          "en curso",
}


import re

_PLACA_RE = re.compile(r'^[A-Z0-9]{6}$')

def _validar_formato_placa(placa: str) -> None:
    """Lanza 400 si la placa no tiene exactamente 6 caracteres alfanuméricos."""
    if not _PLACA_RE.match(placa.upper()):
        raise HTTPException(
            status_code=400,
            detail="La placa debe tener exactamente 6 caracteres alfanuméricos sin espacios ni símbolos (ej: DQN228).",
        )


def _validar_no_es_grua(placa: str, empresa_id, db: Session) -> None:
    """Lanza 409 si la placa corresponde a una grúa registrada en la empresa."""
    grua = db.query(Grua).filter(
        Grua.empresa_id == empresa_id,
        Grua.placa == placa.upper(),
    ).first()
    if grua:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "placa_es_grua",
                "mensaje": f"La placa {placa.upper()} pertenece a una grúa y no puede registrarse como vehículo transportado.",
            },
        )


def _validar_vehiculo_libre(
    vehiculo_id: uuid.UUID,
    placa: str,
    viaje_id_actual: uuid.UUID,
    empresa_id: uuid.UUID,
    db: Session,
) -> None:
    """Lanza 409 si el vehículo ya está en otro viaje activo o pendiente."""
    viaje_conflicto = (
        db.query(ViajeModel)
        .join(ViajeVehiculo, ViajeVehiculo.viaje_id == ViajeModel.id)
        .filter(
            ViajeVehiculo.vehiculo_id == vehiculo_id,
            ViajeModel.estado.in_(ESTADOS_BLOQUEANTES),
            ViajeModel.id != viaje_id_actual,
            ViajeModel.empresa_id == empresa_id,
        )
        .first()
    )
    if viaje_conflicto:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "vehiculo_en_viaje_activo",
                "mensaje": "Este vehículo ya está en un viaje activo",
                "viaje_id": str(viaje_conflicto.id),
                "viaje_origen": viaje_conflicto.origen,
                "viaje_destino": viaje_conflicto.destino,
            },
        )


# ── Router anidado bajo /viajes ────────────────────────────────────────────────
router = APIRouter(prefix="/viajes/{viaje_id}/vehiculos", tags=["vehículos"])

# ── Router para el catálogo ────────────────────────────────────────────────────
router_catalogo = APIRouter(prefix="/vehiculos", tags=["vehículos"])


# ── Helper ─────────────────────────────────────────────────────────────────────

def _vv_out(vv: ViajeVehiculo) -> ViajeVehiculoOut:
    return ViajeVehiculoOut(
        id=str(vv.id),
        viaje_id=str(vv.viaje_id),
        vehiculo_id=str(vv.vehiculo_id),
        placa=vv.vehiculo.placa,
        marca=vv.vehiculo.marca,
        modelo=vv.vehiculo.modelo,
        color=vv.vehiculo.color,
        monto=vv.monto,
        orden=vv.orden,
        observacion=vv.observacion,
        agregado_en=vv.agregado_en,
    )


def _get_vv_o_404(viaje_vehiculo_id: str, viaje_id: str, db: Session) -> ViajeVehiculo:
    vv = (
        db.query(ViajeVehiculo)
        .options(joinedload(ViajeVehiculo.vehiculo))
        .filter(ViajeVehiculo.id == viaje_vehiculo_id, ViajeVehiculo.viaje_id == viaje_id)
        .first()
    )
    if not vv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehículo no encontrado en el viaje")
    return vv


# ── GET /viajes/{id}/vehiculos ─────────────────────────────────────────────────

@router.get("", response_model=list[ViajeVehiculoOut])
def listar_vehiculos(
    viaje_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if not user.rol.perm_ver_todos_viajes and viaje.creado_por != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

    return [_vv_out(vv) for vv in sorted(viaje.vehiculos, key=lambda v: v.orden)]


# ── POST /viajes/{id}/vehiculos ────────────────────────────────────────────────

@router.post("", response_model=ViajeVehiculoOut, status_code=status.HTTP_201_CREATED)
def agregar_vehiculo(
    viaje_id: uuid.UUID,
    body: VehiculoAgregar,
    user: Usuario = Depends(require("perm_agregar_vehiculo")),
    db: Session = Depends(get_db),
):
    if not body.placa or not body.placa.strip():
        raise HTTPException(status_code=400, detail="Placa obligatoria")

    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado == "FINALIZADO":
        raise HTTPException(status_code=400, detail="No se pueden agregar vehículos a un viaje FINALIZADO")

    # Validar formato de placa (6 alfanuméricos, sin símbolos)
    _validar_formato_placa(body.placa.strip())
    # Validar: la placa no puede ser de una grúa
    _validar_no_es_grua(body.placa.strip(), user.empresa_id, db)

    # Buscar o crear en catálogo — silencioso, sin notificar
    vehiculo = get_or_create_vehiculo(
        placa=body.placa.strip(),
        empresa_id=str(user.empresa_id),
        db=db,
        marca=body.marca,
        modelo=body.modelo,
        color=body.color,
    )

    # Validar: el vehículo no puede estar ya en ESTE mismo viaje
    ya_en_viaje = db.query(ViajeVehiculo).filter(
        ViajeVehiculo.viaje_id == viaje.id,
        ViajeVehiculo.vehiculo_id == vehiculo.id,
    ).first()
    if ya_en_viaje:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "vehiculo_duplicado",
                "mensaje": f"El vehículo {vehiculo.placa} ya está agregado a este viaje.",
                "viaje_id": str(viaje.id),
                "viaje_origen": viaje.origen,
                "viaje_destino": viaje.destino,
            },
        )

    # Validar: el vehículo no puede estar en otro viaje activo o pendiente
    _validar_vehiculo_libre(vehiculo.id, vehiculo.placa, viaje.id, user.empresa_id, db)

    # Siguiente número de orden
    siguiente_orden = (
        db.query(ViajeVehiculo)
        .filter(ViajeVehiculo.viaje_id == viaje.id)
        .count()
    ) + 1

    vv = ViajeVehiculo(
        viaje_id=viaje.id,
        vehiculo_id=vehiculo.id,
        monto=body.monto,
        orden=siguiente_orden,
        observacion=body.observacion,
    )
    db.add(vv)

    # Recalcular monto_total del viaje
    db.flush()
    db.refresh(viaje)
    viaje.monto_total = calcular_monto_total(viaje.vehiculos)

    db.commit()
    db.refresh(vv)
    db.refresh(vv.vehiculo)
    return _vv_out(vv)


# ── PUT /viajes/{id}/vehiculos/{vid} ───────────────────────────────────────────

@router.put("/{viaje_vehiculo_id}", response_model=ViajeVehiculoOut)
def editar_vehiculo(
    viaje_id: uuid.UUID,
    viaje_vehiculo_id: uuid.UUID,
    body: VehiculoUpdate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado == "ACTIVO":
        if not user.rol.perm_editar_viaje_activo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso para editar viajes activos")
    elif viaje.estado == "FINALIZADO":
        if not user.rol.perm_editar_viaje_finalizado:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso para editar viajes finalizados")

    vv = _get_vv_o_404(str(viaje_vehiculo_id), str(viaje_id), db)
    snapshot_antes = viaje_a_dict(viaje) if viaje.estado == "FINALIZADO" else None

    # Actualizar datos del catálogo si se enviaron
    vehiculo = vv.vehiculo
    if body.placa is not None:
        if not body.placa.strip():
            raise HTTPException(status_code=400, detail="Placa obligatoria")
        # Si cambia la placa, buscar o crear el nuevo vehículo en catálogo
        if body.placa.strip().upper() != vehiculo.placa:
            # Validar formato y que no sea placa de grúa
            _validar_formato_placa(body.placa.strip())
            _validar_no_es_grua(body.placa.strip(), user.empresa_id, db)
            nuevo_vehiculo = get_or_create_vehiculo(
                placa=body.placa.strip(),
                empresa_id=str(user.empresa_id),
                db=db,
                marca=body.marca,
                modelo=body.modelo,
                color=body.color,
            )
            # Validar que el nuevo vehículo no esté en otro viaje activo o pendiente
            _validar_vehiculo_libre(nuevo_vehiculo.id, nuevo_vehiculo.placa, viaje.id, user.empresa_id, db)
            vv.vehiculo_id = nuevo_vehiculo.id
            vehiculo = nuevo_vehiculo

    if body.marca is not None:
        vehiculo.marca = body.marca
    if body.modelo is not None:
        vehiculo.modelo = body.modelo
    if body.color is not None:
        vehiculo.color = body.color
    if body.monto is not None:
        vv.monto = body.monto
    if body.observacion is not None:
        vv.observacion = body.observacion

    # Recalcular monto_total
    db.flush()
    db.refresh(viaje)
    viaje.monto_total = calcular_monto_total(viaje.vehiculos)

    # Auditoría si el viaje estaba FINALIZADO
    if viaje.estado == "FINALIZADO":
        registrar_auditoria(
            db=db,
            empresa_id=str(user.empresa_id),
            viaje_id=str(viaje.id),
            usuario_id=str(user.id),
            accion="EDITAR_VIAJE_FINALIZADO",
            datos_antes=snapshot_antes,
            datos_despues=viaje_a_dict(viaje),
        )

    db.commit()
    db.refresh(vv)
    db.refresh(vv.vehiculo)
    return _vv_out(vv)


# ── DELETE /viajes/{id}/vehiculos/{vid} ────────────────────────────────────────

@router.delete("/{viaje_vehiculo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_vehiculo(
    viaje_id: uuid.UUID,
    viaje_vehiculo_id: uuid.UUID,
    user: Usuario = Depends(require("perm_editar_viaje_activo")),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado == "FINALIZADO":
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar vehículos de viajes ACTIVOS")

    vv = _get_vv_o_404(str(viaje_vehiculo_id), str(viaje_id), db)

    db.delete(vv)
    db.flush()

    # Recalcular monto_total tras eliminar
    db.refresh(viaje)
    viaje.monto_total = calcular_monto_total(viaje.vehiculos)

    db.commit()
    return None


# ── PATCH /viajes/{id}/vehiculos/montos ────────────────────────────────────────
# Ruta fija — debe declararse ANTES de cualquier ruta con {viaje_vehiculo_id}
# pero como usa PATCH (distinto a PUT/DELETE) no hay conflicto de matching.

@router.patch("/montos", response_model=list[ViajeVehiculoOut])
def actualizar_montos(
    viaje_id: uuid.UUID,
    body: MontosUpdate,
    user: Usuario = Depends(require("perm_editar_viaje_activo")),
    db: Session = Depends(get_db),
):
    """
    Guarda montos en bloque. Usado en la Validación 2 del flujo Finalizar:
    el operador llena los montos de vehículos que aún no los tenían.
    """
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado == "FINALIZADO":
        raise HTTPException(status_code=400, detail="Solo se pueden editar montos de viajes ACTIVOS")

    for item in body.montos:
        vv = _get_vv_o_404(item.viaje_vehiculo_id, str(viaje_id), db)
        vv.monto = item.monto

    # Recalcular monto_total
    db.flush()
    db.refresh(viaje)
    viaje.monto_total = calcular_monto_total(viaje.vehiculos)

    db.commit()
    db.refresh(viaje)

    return [
        _vv_out(vv)
        for vv in sorted(viaje.vehiculos, key=lambda v: v.orden)
    ]


# ── GET /vehiculos/buscar?placa=ABC123 ─────────────────────────────────────────

@router_catalogo.get("/buscar", response_model=list[VehiculoCatalogoOut])
def buscar_vehiculo(
    placa: str = Query(..., min_length=1, description="Placa a buscar (parcial o completa)"),
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Autocompletado de placas. Busca en vehiculos_catalogo de la empresa.
    Solo devuelve vehículos de la empresa del usuario autenticado.
    """
    resultados = (
        db.query(VehiculoCatalogo)
        .filter(
            VehiculoCatalogo.empresa_id == user.empresa_id,
            VehiculoCatalogo.placa.ilike(f"%{placa.upper()}%"),
        )
        .limit(10)
        .all()
    )
    return [
        VehiculoCatalogoOut(
            id=str(v.id),
            empresa_id=str(v.empresa_id),
            placa=v.placa,
            marca=v.marca,
            modelo=v.modelo,
            color=v.color,
        )
        for v in resultados
    ]
