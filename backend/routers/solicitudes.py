import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_user, require
from models.solicitud import SolicitudReabrir
from models.usuario import Usuario
from models.viaje import Viaje
from schemas.solicitud import SolicitudCreate, SolicitudOut, SolicitudResolver
from services.viajes import get_viaje_o_404, registrar_auditoria, viaje_a_dict

router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])


def _out(s: SolicitudReabrir) -> SolicitudOut:
    return SolicitudOut(
        id=s.id,
        empresa_id=s.empresa_id,
        viaje_id=s.viaje_id,
        solicitado_por=s.solicitado_por,
        solicitado_por_nombre=s.solicitante.nombre,
        viaje_origen=s.viaje.origen,
        viaje_destino=s.viaje.destino,
        estado=s.estado,
        nota=s.nota,
        resuelto_por=s.resuelto_por,
        creado_en=s.creado_en,
        resuelto_en=s.resuelto_en,
    )


def _query(db: Session):
    return db.query(SolicitudReabrir).options(
        joinedload(SolicitudReabrir.solicitante),
        joinedload(SolicitudReabrir.viaje),
    )


# ── POST /solicitudes/{viaje_id} — operador solicita reapertura ────────────────

@router.post("/{viaje_id}", response_model=SolicitudOut, status_code=status.HTTP_201_CREATED)
def solicitar_reabrir(
    viaje_id: uuid.UUID,
    body: SolicitudCreate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado != "FINALIZADO":
        raise HTTPException(status_code=400, detail="Solo se puede solicitar reapertura de viajes FINALIZADOS")

    # No duplicar solicitudes pendientes para el mismo viaje
    pendiente = db.query(SolicitudReabrir).filter(
        SolicitudReabrir.viaje_id == viaje_id,
        SolicitudReabrir.estado == "PENDIENTE",
    ).first()
    if pendiente:
        raise HTTPException(status_code=400, detail="Ya existe una solicitud pendiente para este viaje")

    solicitud = SolicitudReabrir(
        empresa_id=user.empresa_id,
        viaje_id=viaje.id,
        solicitado_por=user.id,
        nota=body.nota,
    )
    db.add(solicitud)
    db.commit()

    solicitud = _query(db).filter(SolicitudReabrir.id == solicitud.id).first()
    return _out(solicitud)


# ── GET /solicitudes — Admin ve todas las pendientes ──────────────────────────

@router.get("", response_model=list[SolicitudOut])
def listar_solicitudes(
    solo_pendientes: bool = True,
    user: Usuario = Depends(require("perm_reabrir_viaje")),
    db: Session = Depends(get_db),
):
    q = _query(db).filter(SolicitudReabrir.empresa_id == user.empresa_id)
    if solo_pendientes:
        q = q.filter(SolicitudReabrir.estado == "PENDIENTE")
    return [_out(s) for s in q.order_by(SolicitudReabrir.creado_en.desc()).all()]


# ── PATCH /solicitudes/{id}/resolver — Admin aprueba o rechaza ────────────────

@router.patch("/{solicitud_id}/resolver", response_model=SolicitudOut)
def resolver_solicitud(
    solicitud_id: uuid.UUID,
    body: SolicitudResolver,
    user: Usuario = Depends(require("perm_reabrir_viaje")),
    db: Session = Depends(get_db),
):
    if body.accion not in ("APROBAR", "RECHAZAR"):
        raise HTTPException(status_code=400, detail="accion debe ser APROBAR o RECHAZAR")

    solicitud = _query(db).filter(
        SolicitudReabrir.id == solicitud_id,
        SolicitudReabrir.empresa_id == user.empresa_id,
    ).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if solicitud.estado != "PENDIENTE":
        raise HTTPException(status_code=400, detail="La solicitud ya fue resuelta")

    solicitud.estado = "APROBADA" if body.accion == "APROBAR" else "RECHAZADA"
    solicitud.resuelto_por = user.id
    solicitud.resuelto_en = datetime.now(timezone.utc)

    if body.accion == "APROBAR":
        viaje = get_viaje_o_404(str(solicitud.viaje_id), str(user.empresa_id), db)
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
    solicitud = _query(db).filter(SolicitudReabrir.id == solicitud_id).first()
    return _out(solicitud)
