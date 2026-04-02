import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_user, require
from models.usuario import Usuario
from models.viaje import Viaje
from models.vehiculo import ViajeVehiculo
from schemas.viaje import (
    ViajeCreate,
    ViajeUpdate,
    ViajeIniciar,
    ViajeOut,
    ViajeDetalle,
    ViajeFinalizar,
)
from schemas.vehiculo import ViajeVehiculoOut
from services.viajes import (
    get_viaje_o_404,
    calcular_monto_total,
    viaje_a_dict,
    registrar_auditoria,
    validar_finalizar,
    get_configuracion,
)

router = APIRouter(prefix="/viajes", tags=["viajes"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _vv_out(vv: ViajeVehiculo) -> ViajeVehiculoOut:
    return ViajeVehiculoOut(
        id=vv.id,
        viaje_id=vv.viaje_id,
        vehiculo_id=vv.vehiculo_id,
        placa=vv.vehiculo.placa,
        marca=vv.vehiculo.marca,
        modelo=vv.vehiculo.modelo,
        color=vv.vehiculo.color,
        monto=vv.monto,
        orden=vv.orden,
        agregado_en=vv.agregado_en,
    )


def _viaje_out(viaje: Viaje) -> ViajeOut:
    return ViajeOut(
        id=viaje.id,
        empresa_id=viaje.empresa_id,
        creado_por=viaje.creado_por,
        creado_por_nombre=viaje.creador.nombre,
        iniciado_por=viaje.iniciado_por,
        placa_grua=viaje.placa_grua,
        marca_grua=viaje.marca_grua,
        origen=viaje.origen,
        destino=viaje.destino,
        estado=viaje.estado,
        monto_total=viaje.monto_total,
        metodo_pago=viaje.metodo_pago,
        foto_recibo_url=viaje.foto_recibo_url,
        creado_en=viaje.creado_en,
        iniciado_en=viaje.iniciado_en,
        finalizado_en=viaje.finalizado_en,
    )


def _viaje_detalle(viaje: Viaje) -> ViajeDetalle:
    base = _viaje_out(viaje)
    return ViajeDetalle(
        **base.model_dump(),
        vehiculos=[_vv_out(vv) for vv in sorted(viaje.vehiculos, key=lambda v: v.orden)],
    )


def _query_viajes(db: Session):
    """Query base con joinedload del creador para tener el nombre disponible."""
    return db.query(Viaje).options(
        joinedload(Viaje.creador),
        joinedload(Viaje.vehiculos).joinedload(ViajeVehiculo.vehiculo),
    )


# ── GET /viajes ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ViajeOut])
def listar_viajes(
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = _query_viajes(db).filter(Viaje.empresa_id == user.empresa_id)
    if not user.rol.perm_ver_todos_viajes:
        q = q.filter(Viaje.creado_por == user.id)
    viajes = q.order_by(Viaje.creado_en.desc()).all()
    return [_viaje_out(v) for v in viajes]


# ── GET /viajes/{id} ───────────────────────────────────────────────────────────

@router.get("/{viaje_id}", response_model=ViajeDetalle)
def obtener_viaje(
    viaje_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if not user.rol.perm_ver_todos_viajes and viaje.creado_por != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

    return _viaje_detalle(viaje)


# ── POST /viajes ───────────────────────────────────────────────────────────────

@router.post("", response_model=ViajeOut, status_code=status.HTTP_201_CREATED)
def crear_viaje(
    body: ViajeCreate,
    user: Usuario = Depends(require("perm_crear_viaje")),
    db: Session = Depends(get_db),
):
    if not body.origen.strip():
        raise HTTPException(status_code=400, detail="Debe ingresar el origen")
    if not body.destino.strip():
        raise HTTPException(status_code=400, detail="Debe ingresar el destino")

    viaje = Viaje(
        empresa_id=user.empresa_id,
        creado_por=user.id,
        origen=body.origen.strip(),
        destino=body.destino.strip(),
        estado="NO_INICIADO",
        creado_en=datetime.now(timezone.utc),
    )
    db.add(viaje)
    db.commit()
    db.refresh(viaje)
    # Recargar con relaciones
    viaje = _query_viajes(db).filter(Viaje.id == viaje.id).first()
    return _viaje_out(viaje)


# ── PATCH /viajes/{id}/iniciar ─────────────────────────────────────────────────

@router.patch("/{viaje_id}/iniciar", response_model=ViajeOut)
def iniciar_viaje(
    viaje_id: uuid.UUID,
    body: ViajeIniciar,
    user: Usuario = Depends(require("perm_iniciar_viaje")),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado != "NO_INICIADO":
        raise HTTPException(status_code=400, detail="Solo se puede iniciar un viaje NO INICIADO")
    if not body.placa_grua.strip():
        raise HTTPException(status_code=400, detail="Placa de la grúa obligatoria")
    if not body.marca_grua.strip():
        raise HTTPException(status_code=400, detail="Marca de la grúa obligatoria")

    viaje.placa_grua = body.placa_grua.strip().upper()
    viaje.marca_grua = body.marca_grua.strip()
    viaje.iniciado_por = user.id
    viaje.iniciado_en = datetime.now(timezone.utc)
    viaje.estado = "EN_CURSO"
    db.commit()

    viaje = _query_viajes(db).filter(Viaje.id == viaje.id).first()
    return _viaje_out(viaje)


# ── PUT /viajes/{id} ───────────────────────────────────────────────────────────

@router.put("/{viaje_id}", response_model=ViajeOut)
def editar_viaje(
    viaje_id: uuid.UUID,
    body: ViajeUpdate,
    user: Usuario = Depends(require("perm_editar_viaje_activo")),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado == "FINALIZADO":
        raise HTTPException(status_code=400, detail="No se puede editar un viaje FINALIZADO desde aquí")

    if body.origen is not None:
        if not body.origen.strip():
            raise HTTPException(status_code=400, detail="Debe ingresar el origen")
        viaje.origen = body.origen.strip()
    if body.destino is not None:
        if not body.destino.strip():
            raise HTTPException(status_code=400, detail="Debe ingresar el destino")
        viaje.destino = body.destino.strip()

    db.commit()
    viaje = _query_viajes(db).filter(Viaje.id == viaje.id).first()
    return _viaje_out(viaje)


# ── POST /viajes/{id}/finalizar ────────────────────────────────────────────────

@router.post("/{viaje_id}/finalizar", response_model=ViajeOut)
def finalizar_viaje(
    viaje_id: uuid.UUID,
    body: ViajeFinalizar,
    user: Usuario = Depends(require("perm_finalizar_viaje")),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado == "FINALIZADO":
        raise HTTPException(status_code=400, detail="El viaje ya está FINALIZADO")
    if viaje.estado == "NO_INICIADO":
        raise HTTPException(status_code=400, detail="Debes iniciar el viaje antes de finalizar")

    validar_finalizar(viaje, db)

    metodos_validos = {"EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"}
    if body.metodo_pago not in metodos_validos:
        raise HTTPException(status_code=400, detail=f"Método de pago inválido. Opciones: {', '.join(metodos_validos)}")

    config = get_configuracion(str(user.empresa_id), db)
    if config and config.foto_recibo_obligatoria and not body.foto_recibo_url:
        raise HTTPException(status_code=400, detail="La foto del recibo es obligatoria")

    viaje.estado = "FINALIZADO"
    viaje.monto_total = calcular_monto_total(viaje.vehiculos)
    viaje.metodo_pago = body.metodo_pago
    viaje.foto_recibo_url = body.foto_recibo_url
    viaje.finalizado_en = datetime.now(timezone.utc)
    db.commit()

    viaje = _query_viajes(db).filter(Viaje.id == viaje.id).first()
    return _viaje_out(viaje)


# ── POST /viajes/{id}/reabrir ──────────────────────────────────────────────────

@router.post("/{viaje_id}/reabrir", response_model=ViajeOut)
def reabrir_viaje(
    viaje_id: uuid.UUID,
    user: Usuario = Depends(require("perm_reabrir_viaje")),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado != "FINALIZADO":
        raise HTTPException(status_code=400, detail="Solo se pueden reabrir viajes FINALIZADOS")

    snapshot_antes = viaje_a_dict(viaje)
    viaje.estado = "EN_CURSO"
    viaje.finalizado_en = None
    db.flush()

    registrar_auditoria(
        db=db,
        empresa_id=str(user.empresa_id),
        viaje_id=str(viaje.id),
        usuario_id=str(user.id),
        accion="REABRIR_VIAJE",
        datos_antes=snapshot_antes,
        datos_despues=viaje_a_dict(viaje),
    )
    db.commit()

    viaje = _query_viajes(db).filter(Viaje.id == viaje.id).first()
    return _viaje_out(viaje)
