import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_user, require
from models.auditoria import Auditoria
from models.usuario import Usuario
from models.grua import Grua
from models.viaje import Viaje
from models.vehiculo import ViajeVehiculo, VehiculoCatalogo
from schemas.viaje import (
    AuditoriaViajeOut,
    ViajeCreate,
    ViajeUpdate,
    ViajeIniciar,
    ViajeOut,
    ViajeDetalle,
    ViajeFinalizar,
)
from schemas.vehiculo import ViajeVehiculoOut
from services.viajes import (
    generar_codigo_viaje,
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
        observacion=vv.observacion,
        agregado_en=vv.agregado_en,
    )


def _viaje_out(viaje: Viaje, conductor_nombre: str | None = None) -> ViajeOut:
    # Si no viene el nombre explícito, intentar desde la relación ORM
    if conductor_nombre is None and viaje.conductor_id:
        try:
            conductor_nombre = viaje.conductor.nombre if viaje.conductor else None
        except Exception:
            conductor_nombre = None
    return ViajeOut(
        id=viaje.id,
        empresa_id=viaje.empresa_id,
        creado_por=viaje.creado_por,
        creado_por_nombre=viaje.creador.nombre,
        iniciado_por=viaje.iniciado_por,
        conductor_id=viaje.conductor_id,
        conductor_nombre=conductor_nombre,
        codigo=viaje.codigo,
        observacion_grua=viaje.observacion_grua,
        placa_grua=viaje.placa_grua,
        marca_grua=viaje.marca_grua,
        tipo_viaje=viaje.tipo_viaje,
        origen=viaje.origen,
        destino=viaje.destino,
        estado=viaje.estado,
        monto_total=viaje.monto_total,
        metodo_pago=viaje.metodo_pago,
        foto_recibo_url=viaje.foto_recibo_url,
        creado_en=viaje.creado_en,
        programado_para=viaje.programado_para,
        iniciado_en=viaje.iniciado_en,
        finalizado_en=viaje.finalizado_en,
    )


def _viaje_detalle(viaje: Viaje, conductor_nombre: str | None = None) -> ViajeDetalle:
    base = _viaje_out(viaje, conductor_nombre=conductor_nombre)
    return ViajeDetalle(
        **base.model_dump(),
        vehiculos=[_vv_out(vv) for vv in sorted(viaje.vehiculos, key=lambda v: v.orden)],
    )


def _query_viajes(db: Session):
    return db.query(Viaje).options(
        joinedload(Viaje.creador),
        joinedload(Viaje.conductor),
        joinedload(Viaje.vehiculos).joinedload(ViajeVehiculo.vehiculo),
    )


# ── GET /viajes ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ViajeOut])
def listar_viajes(
    placa_vehiculo: str | None = Query(None),
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy import or_
    from sqlalchemy.orm import aliased
    ConductorAlias = aliased(Usuario)

    # JOIN explícito con la tabla de usuarios para obtener el nombre del conductor en una sola query
    q_join = (
        db.query(Viaje, ConductorAlias.nombre)
        .outerjoin(ConductorAlias, Viaje.conductor_id == ConductorAlias.id)
        .options(
            joinedload(Viaje.creador),
            joinedload(Viaje.vehiculos).joinedload(ViajeVehiculo.vehiculo),
        )
        .filter(Viaje.empresa_id == user.empresa_id)
    )

    if not user.rol.perm_ver_todos_viajes:
        q_join = q_join.filter(
            or_(Viaje.creado_por == user.id, Viaje.conductor_id == user.id)
        )

    if placa_vehiculo:
        viaje_ids = db.execute(
            select(ViajeVehiculo.viaje_id)
            .join(VehiculoCatalogo, VehiculoCatalogo.id == ViajeVehiculo.vehiculo_id)
            .filter(VehiculoCatalogo.empresa_id == user.empresa_id)
            .filter(VehiculoCatalogo.placa.ilike(f"%{placa_vehiculo.strip()}%"))
        ).scalars().all()
        q_join = q_join.filter(Viaje.id.in_(viaje_ids))

    resultados = q_join.order_by(Viaje.creado_en.desc()).all()
    return [_viaje_out(viaje, conductor_nombre=nombre) for viaje, nombre in resultados]


# ── GET /viajes/{id} ───────────────────────────────────────────────────────────

@router.get("/{viaje_id}", response_model=ViajeDetalle)
def obtener_viaje(
    viaje_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)
    es_conductor = viaje.conductor_id and viaje.conductor_id == user.id
    if not user.rol.perm_ver_todos_viajes and viaje.creado_por != user.id and not es_conductor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")
    # Cargar nombre del conductor explícitamente
    conductor_nombre = None
    if viaje.conductor_id:
        conductor = db.query(Usuario).filter(Usuario.id == viaje.conductor_id).first()
        conductor_nombre = conductor.nombre if conductor else None
    return _viaje_detalle(viaje, conductor_nombre=conductor_nombre)


# ── GET /viajes/{id}/auditoria ─────────────────────────────────────────────────

@router.get("/{viaje_id}/auditoria", response_model=list[AuditoriaViajeOut])
def auditoria_viaje(
    viaje_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)
    es_involucrado = viaje.creado_por == user.id or viaje.conductor_id == user.id
    if not user.rol.perm_ver_todos_viajes and not es_involucrado:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

    registros = (
        db.query(Auditoria)
        .options(joinedload(Auditoria.usuario))
        .filter(Auditoria.viaje_id == viaje_id)
        .order_by(Auditoria.realizado_en.asc())
        .all()
    )
    return [
        AuditoriaViajeOut(
            id=r.id,
            accion=r.accion,
            usuario_nombre=r.usuario.nombre,
            datos_antes=r.datos_antes,
            datos_despues=r.datos_despues,
            realizado_en=r.realizado_en,
        )
        for r in registros
    ]


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

    # Bloquear si el usuario (no admin) ya tiene un viaje EN_CURSO o PENDIENTE_ACEPTAR.
    # Los admins pueden crear y asignar múltiples viajes a distintos conductores sin restricción.
    if not user.rol.perm_gestionar_gruas:
        from sqlalchemy import or_
        viaje_activo = db.query(Viaje).filter(
            Viaje.empresa_id == user.empresa_id,
            or_(Viaje.creado_por == user.id, Viaje.conductor_id == user.id),
            Viaje.estado.in_(["EN_CURSO", "PENDIENTE_ACEPTAR"]),
        ).first()
        if viaje_activo:
            raise HTTPException(
                status_code=400,
                detail=f"Ya tienes un viaje activo ({viaje_activo.codigo or str(viaje_activo.id)[:8]}). Finalízalo o acéptalo antes de crear uno nuevo.",
            )

    # Bloquear si el usuario no tiene una grúa activa asignada (excepto admins)
    if not user.rol.perm_gestionar_gruas:
        grua_asignada = db.query(Grua).filter(
            Grua.empresa_id == user.empresa_id,
            Grua.conductor_id == user.id,
            Grua.activa.is_(True),
        ).first()
        if not grua_asignada:
            raise HTTPException(
                status_code=400,
                detail="No tienes una grúa activa asignada. Contacta al administrador.",
            )

    codigo = generar_codigo_viaje(body.destino.strip(), user.empresa_id, db)

    tipo_viaje = body.tipo_viaje if body.tipo_viaje in ("URBANO", "NACIONAL") else "NACIONAL"

    viaje = Viaje(
        empresa_id=user.empresa_id,
        creado_por=user.id,
        tipo_viaje=tipo_viaje,
        origen=body.origen.strip(),
        destino=body.destino.strip(),
        codigo=codigo,
        estado="PROGRAMADO" if body.programado_para else "NO_INICIADO",
        programado_para=body.programado_para,
        conductor_id=body.conductor_id,
        creado_en=datetime.now(timezone.utc),
    )
    db.add(viaje)
    db.flush()

    registrar_auditoria(
        db=db,
        empresa_id=str(user.empresa_id),
        viaje_id=str(viaje.id),
        usuario_id=str(user.id),
        accion="CREAR_VIAJE",
        datos_antes=None,
        datos_despues={"origen": viaje.origen, "destino": viaje.destino, "codigo": viaje.codigo},
    )
    db.commit()
    db.refresh(viaje)
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

    if viaje.estado not in ("NO_INICIADO", "PROGRAMADO"):
        raise HTTPException(status_code=400, detail="Solo se puede iniciar un viaje NO INICIADO o PROGRAMADO")

    grua = db.query(Grua).filter(
        Grua.id == body.grua_id,
        Grua.empresa_id == user.empresa_id,
        Grua.activa.is_(True),
    ).first()
    if not grua:
        raise HTTPException(status_code=400, detail="Grúa no encontrada o inactiva")

    # Si la grúa tiene conductor asignado distinto al usuario actual,
    # verificar que ese conductor no tenga ya un viaje activo.
    if grua.conductor_id and grua.conductor_id != user.id:
        from sqlalchemy import or_
        viaje_activo_conductor = db.query(Viaje).filter(
            Viaje.empresa_id == user.empresa_id,
            or_(Viaje.creado_por == grua.conductor_id, Viaje.conductor_id == grua.conductor_id),
            Viaje.estado.in_(["EN_CURSO", "PENDIENTE_ACEPTAR"]),
        ).first()
        if viaje_activo_conductor:
            # Cargar nombre del conductor para el mensaje
            conductor = db.query(Usuario).filter(Usuario.id == grua.conductor_id).first()
            nombre = conductor.nombre if conductor else "El conductor"
            raise HTTPException(
                status_code=400,
                detail=f"{nombre} ya tiene un viaje activo ({viaje_activo_conductor.codigo or str(viaje_activo_conductor.id)[:8]}). Debe finalizarlo antes de recibir uno nuevo.",
            )

    snapshot_antes = viaje_a_dict(viaje)
    viaje.placa_grua = grua.placa
    viaje.marca_grua = grua.marca
    viaje.observacion_grua = body.observacion_grua.strip() if body.observacion_grua else None
    viaje.iniciado_por = user.id
    viaje.iniciado_en = datetime.now(timezone.utc)

    # Si la grúa tiene conductor asignado distinto al usuario actual →
    # el viaje queda PENDIENTE_ACEPTAR hasta que el conductor lo acepte.
    # Si el propio conductor inicia su viaje → EN_CURSO directo.
    if grua.conductor_id and grua.conductor_id != user.id:
        viaje.conductor_id = grua.conductor_id
        viaje.estado = "PENDIENTE_ACEPTAR"
        accion_audit = "ASIGNAR_VIAJE"
    else:
        viaje.conductor_id = grua.conductor_id  # puede ser None si no tiene conductor
        viaje.estado = "EN_CURSO"
        accion_audit = "INICIAR_VIAJE"

    db.flush()

    registrar_auditoria(
        db=db,
        empresa_id=str(user.empresa_id),
        viaje_id=str(viaje.id),
        usuario_id=str(user.id),
        accion=accion_audit,
        datos_antes=snapshot_antes,
        datos_despues=viaje_a_dict(viaje),
    )
    db.commit()

    viaje = _query_viajes(db).filter(Viaje.id == viaje.id).first()
    conductor_nombre = None
    if viaje.conductor_id:
        c = db.query(Usuario).filter(Usuario.id == viaje.conductor_id).first()
        conductor_nombre = c.nombre if c else None
    return _viaje_out(viaje, conductor_nombre=conductor_nombre)


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
        raise HTTPException(status_code=400, detail=f"Método de pago inválido: {', '.join(metodos_validos)}")

    config = get_configuracion(str(user.empresa_id), db)
    if config and config.foto_recibo_obligatoria and not body.foto_recibo_url:
        raise HTTPException(status_code=400, detail="La foto del recibo es obligatoria")

    snapshot_antes = viaje_a_dict(viaje)
    viaje.estado = "FINALIZADO"
    viaje.monto_total = calcular_monto_total(viaje.vehiculos)
    viaje.metodo_pago = body.metodo_pago
    viaje.foto_recibo_url = body.foto_recibo_url
    viaje.finalizado_en = datetime.now(timezone.utc)
    db.flush()

    registrar_auditoria(
        db=db,
        empresa_id=str(user.empresa_id),
        viaje_id=str(viaje.id),
        usuario_id=str(user.id),
        accion="FINALIZAR_VIAJE",
        datos_antes=snapshot_antes,
        datos_despues=viaje_a_dict(viaje),
    )
    db.commit()

    viaje = _query_viajes(db).filter(Viaje.id == viaje.id).first()
    return _viaje_out(viaje)


# ── DELETE /viajes/{id} ───────────────────────────────────────────────────────

@router.delete("/{viaje_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_viaje(
    viaje_id: uuid.UUID,
    user: Usuario = Depends(require("perm_crear_viaje")),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado not in ("NO_INICIADO", "PROGRAMADO"):
        raise HTTPException(status_code=400, detail="Solo se pueden cancelar viajes que aún no han iniciado")

    if not user.rol.perm_ver_todos_viajes and viaje.creado_por != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

    # Marcar como CANCELADO (no borrar físicamente — la auditoria tiene FK sin CASCADE)
    snapshot_antes = viaje_a_dict(viaje)
    viaje.estado = "CANCELADO"
    db.flush()
    registrar_auditoria(
        db=db,
        empresa_id=str(user.empresa_id),
        viaje_id=str(viaje.id),
        usuario_id=str(user.id),
        accion="CANCELAR_VIAJE",
        datos_antes=snapshot_antes,
        datos_despues={"estado": "CANCELADO"},
    )
    db.commit()


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


# ── POST /viajes/{id}/aceptar ──────────────────────────────────────────────────

@router.post("/{viaje_id}/aceptar", response_model=ViajeOut)
def aceptar_viaje(
    viaje_id: uuid.UUID,
    user: Usuario = Depends(require("perm_iniciar_viaje")),
    db: Session = Depends(get_db),
):
    """El conductor acepta un viaje que le fue asignado. Pasa de PENDIENTE_ACEPTAR a EN_CURSO."""
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado != "PENDIENTE_ACEPTAR":
        raise HTTPException(status_code=400, detail="Solo se pueden aceptar viajes PENDIENTE_ACEPTAR")

    if viaje.conductor_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el conductor asignado puede aceptar este viaje")

    snapshot_antes = viaje_a_dict(viaje)
    viaje.estado = "EN_CURSO"
    db.flush()

    registrar_auditoria(
        db=db,
        empresa_id=str(user.empresa_id),
        viaje_id=str(viaje.id),
        usuario_id=str(user.id),
        accion="ACEPTAR_VIAJE",
        datos_antes=snapshot_antes,
        datos_despues=viaje_a_dict(viaje),
    )
    db.commit()

    viaje = _query_viajes(db).filter(Viaje.id == viaje.id).first()
    return _viaje_out(viaje)


# ── PATCH /viajes/{id}/asignar-operador ───────────────────────────────────────

from pydantic import BaseModel as _BaseModel

class _AsignarOperadorBody(_BaseModel):
    conductor_id: uuid.UUID | None

@router.patch("/{viaje_id}/asignar-operador", response_model=ViajeOut)
def asignar_operador(
    viaje_id: uuid.UUID,
    body: _AsignarOperadorBody,
    user: Usuario = Depends(require("perm_ver_todos_viajes")),
    db: Session = Depends(get_db),
):
    """Admin asigna (o quita) el operador de un viaje NO_INICIADO."""
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado not in ("NO_INICIADO", "PROGRAMADO"):
        raise HTTPException(status_code=400, detail="Solo se puede asignar operador a viajes que aún no han iniciado")

    conductor_nombre = None
    if body.conductor_id:
        conductor = db.query(Usuario).filter(
            Usuario.id == body.conductor_id,
            Usuario.empresa_id == user.empresa_id,
            Usuario.activo.is_(True),
        ).first()
        if not conductor:
            raise HTTPException(status_code=404, detail="Operador no encontrado o inactivo")
        conductor_nombre = conductor.nombre

    snapshot_antes = viaje_a_dict(viaje)
    viaje.conductor_id = body.conductor_id
    db.flush()

    registrar_auditoria(
        db=db,
        empresa_id=str(user.empresa_id),
        viaje_id=str(viaje.id),
        usuario_id=str(user.id),
        accion="ASIGNAR_OPERADOR",
        datos_antes=snapshot_antes,
        datos_despues={**viaje_a_dict(viaje), "conductor_nombre": conductor_nombre},
    )
    db.commit()

    viaje = _query_viajes(db).filter(Viaje.id == viaje.id).first()
    conductor_nombre_final = None
    if viaje.conductor_id:
        c = db.query(Usuario).filter(Usuario.id == viaje.conductor_id).first()
        conductor_nombre_final = c.nombre if c else None
    return _viaje_out(viaje, conductor_nombre=conductor_nombre_final)
