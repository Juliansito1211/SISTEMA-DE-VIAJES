import pathlib
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require
from models.grua import Grua
from models.usuario import Usuario
from models.viaje import Viaje
from schemas.grua import GruaAsignar, GruaCreate, GruaDesasignar, GruaOut, GruaUpdate
UPLOADS_DIR = pathlib.Path("/app/uploads")

router = APIRouter(prefix="/gruas", tags=["gruas"])


# ── Helper ─────────────────────────────────────────────────────────────────────

def _foto_url(filename: str | None) -> str | None:
    if not filename:
        return None
    return f"/uploads/{filename}"


def _grua_out(g: Grua, placas_ocupadas: set[str] | None = None) -> GruaOut:
    disponible = True
    if placas_ocupadas is not None:
        disponible = g.placa not in placas_ocupadas
    return GruaOut(
        id=g.id,
        empresa_id=g.empresa_id,
        placa=g.placa,
        marca=g.marca,
        modelo=g.modelo,
        color=g.color,
        foto_url=_foto_url(g.foto_filename),
        activa=g.activa,
        disponible=disponible,
        conductor_id=g.conductor_id,
        conductor_nombre=g.conductor.nombre if g.conductor else None,
        observacion_desasignacion=g.observacion_desasignacion,
        tecno_inicio=g.tecno_inicio,
        tecno_vence=g.tecno_vence,
        soat_inicio=g.soat_inicio,
        soat_vence=g.soat_vence,
        creado_en=g.creado_en,
    )


def _placas_ocupadas(empresa_id: uuid.UUID, db: Session) -> set[str]:
    """Placas de grúas que están en un viaje EN_CURSO o PENDIENTE_ACEPTAR."""
    from sqlalchemy import select
    rows = db.execute(
        select(Viaje.placa_grua).where(
            Viaje.empresa_id == empresa_id,
            Viaje.estado.in_(["EN_CURSO", "PENDIENTE_ACEPTAR"]),
            Viaje.placa_grua.isnot(None),
        )
    ).scalars().all()
    return set(rows)


def _get_grua(grua_id: uuid.UUID, empresa_id: uuid.UUID, db: Session) -> Grua:
    g = db.query(Grua).filter(
        Grua.id == grua_id, Grua.empresa_id == empresa_id
    ).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grúa no encontrada")
    return g


def _load_conductor(g: Grua, db: Session) -> Grua:
    """Eager-load conductor if not already loaded."""
    if g.conductor_id and g.conductor is None:
        g.conductor = db.query(Usuario).filter(Usuario.id == g.conductor_id).first()
    return g


# ── GET /gruas ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[GruaOut])
def listar_gruas(
    solo_mias: bool = Query(False),
    solo_disponibles: bool = Query(False),
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Grua).filter(Grua.empresa_id == user.empresa_id)
    if solo_mias:
        q = q.filter(Grua.conductor_id == user.id, Grua.activa.is_(True))

    gruas = q.order_by(Grua.placa).all()

    # Calcular qué placas están ocupadas (una sola query)
    ocupadas = _placas_ocupadas(user.empresa_id, db)

    # Filtrar solo disponibles si se pidió
    if solo_disponibles:
        gruas = [g for g in gruas if g.placa not in ocupadas]

    # Eager-load conductores
    conductores = {
        u.id: u for u in db.query(Usuario).filter(
            Usuario.id.in_([g.conductor_id for g in gruas if g.conductor_id])
        ).all()
    }
    for g in gruas:
        if g.conductor_id:
            g.conductor = conductores.get(g.conductor_id)

    return [_grua_out(g, placas_ocupadas=ocupadas) for g in gruas]


# ── GET /gruas/{id} ────────────────────────────────────────────────────────────

@router.get("/{grua_id}", response_model=GruaOut)
def obtener_grua(
    grua_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = _get_grua(grua_id, user.empresa_id, db)
    _load_conductor(g, db)
    ocupadas = _placas_ocupadas(user.empresa_id, db)
    return _grua_out(g, placas_ocupadas=ocupadas)


# ── POST /gruas ────────────────────────────────────────────────────────────────

@router.post("", response_model=GruaOut, status_code=status.HTTP_201_CREATED)
def crear_grua(
    body: GruaCreate,
    user: Usuario = Depends(require("perm_gestionar_gruas")),
    db: Session = Depends(get_db),
):
    placa = body.placa.strip().upper()
    if not placa:
        raise HTTPException(400, "La placa es obligatoria")
    if not body.marca.strip():
        raise HTTPException(400, "La marca es obligatoria")

    existe = db.query(Grua).filter(
        Grua.empresa_id == user.empresa_id, Grua.placa == placa
    ).first()
    if existe:
        raise HTTPException(400, f"Ya existe una grúa con placa {placa}")

    g = Grua(
        empresa_id=user.empresa_id,
        placa=placa,
        marca=body.marca.strip(),
        modelo=body.modelo.strip() if body.modelo else None,
        color=body.color.strip() if body.color else None,
        tecno_inicio=body.tecno_inicio,
        tecno_vence=body.tecno_vence,
        soat_inicio=body.soat_inicio,
        soat_vence=body.soat_vence,
        activa=True,
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return _grua_out(g)


# ── PUT /gruas/{id} ────────────────────────────────────────────────────────────

@router.put("/{grua_id}", response_model=GruaOut)
def editar_grua(
    grua_id: uuid.UUID,
    body: GruaUpdate,
    user: Usuario = Depends(require("perm_gestionar_gruas")),
    db: Session = Depends(get_db),
):
    g = _get_grua(grua_id, user.empresa_id, db)

    if body.placa is not None:
        placa = body.placa.strip().upper()
        if not placa:
            raise HTTPException(400, "La placa es obligatoria")
        conflicto = db.query(Grua).filter(
            Grua.empresa_id == user.empresa_id,
            Grua.placa == placa,
            Grua.id != grua_id,
        ).first()
        if conflicto:
            raise HTTPException(400, f"Ya existe otra grúa con placa {placa}")
        g.placa = placa
    if body.marca is not None:
        if not body.marca.strip():
            raise HTTPException(400, "La marca es obligatoria")
        g.marca = body.marca.strip()
    if body.modelo is not None:
        g.modelo = body.modelo.strip() or None
    if body.color is not None:
        g.color = body.color.strip() or None
    if body.tecno_inicio is not None:
        g.tecno_inicio = body.tecno_inicio
    if body.tecno_vence is not None:
        g.tecno_vence = body.tecno_vence
    if body.soat_inicio is not None:
        g.soat_inicio = body.soat_inicio
    if body.soat_vence is not None:
        g.soat_vence = body.soat_vence

    db.commit()
    db.refresh(g)
    _load_conductor(g, db)
    return _grua_out(g)


# ── PATCH /gruas/{id}/toggle ───────────────────────────────────────────────────

@router.patch("/{grua_id}/toggle", response_model=GruaOut)
def toggle_grua(
    grua_id: uuid.UUID,
    user: Usuario = Depends(require("perm_gestionar_gruas")),
    db: Session = Depends(get_db),
):
    g = _get_grua(grua_id, user.empresa_id, db)
    g.activa = not g.activa
    db.commit()
    db.refresh(g)
    _load_conductor(g, db)
    return _grua_out(g)


# ── PATCH /gruas/{id}/asignar ──────────────────────────────────────────────────

@router.patch("/{grua_id}/asignar", response_model=GruaOut)
def asignar_conductor(
    grua_id: uuid.UUID,
    body: GruaAsignar,
    user: Usuario = Depends(require("perm_gestionar_gruas")),
    db: Session = Depends(get_db),
):
    g = _get_grua(grua_id, user.empresa_id, db)

    conductor = db.query(Usuario).filter(
        Usuario.id == body.conductor_id,
        Usuario.empresa_id == user.empresa_id,
        Usuario.activo.is_(True),
    ).first()
    if not conductor:
        raise HTTPException(404, "Conductor no encontrado o inactivo")

    # Validar que el conductor no esté ya asignado a otra grúa
    grua_existente = db.query(Grua).filter(
        Grua.empresa_id == user.empresa_id,
        Grua.conductor_id == body.conductor_id,
        Grua.id != grua_id,
    ).first()
    if grua_existente:
        raise HTTPException(
            400,
            f"{conductor.nombre} ya está asignado a la grúa {grua_existente.placa}. "
            f"Desasígnalo primero antes de asignarlo a otra grúa.",
        )

    g.conductor_id = body.conductor_id
    g.observacion_desasignacion = None
    db.commit()
    db.refresh(g)
    g.conductor = conductor
    return _grua_out(g)


# ── PATCH /gruas/{id}/desasignar ───────────────────────────────────────────────

@router.patch("/{grua_id}/desasignar", response_model=GruaOut)
def desasignar_conductor(
    grua_id: uuid.UUID,
    body: GruaDesasignar,
    user: Usuario = Depends(require("perm_gestionar_gruas")),
    db: Session = Depends(get_db),
):
    g = _get_grua(grua_id, user.empresa_id, db)
    if not g.conductor_id:
        raise HTTPException(400, "La grúa no tiene conductor asignado")
    if not body.observacion.strip():
        raise HTTPException(400, "La observación es obligatoria al desasignar")

    g.conductor_id = None
    g.observacion_desasignacion = body.observacion.strip()
    db.commit()
    db.refresh(g)
    return _grua_out(g)


# ── POST /gruas/{id}/foto ──────────────────────────────────────────────────────

@router.post("/{grua_id}/foto", response_model=GruaOut)
async def subir_foto_grua(
    grua_id: uuid.UUID,
    foto: UploadFile = File(...),
    user: Usuario = Depends(require("perm_gestionar_gruas")),
    db: Session = Depends(get_db),
):
    g = _get_grua(grua_id, user.empresa_id, db)

    ext = pathlib.Path(foto.filename or "foto.jpg").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".heic"}:
        raise HTTPException(400, "Formato de imagen no permitido")

    filename = f"grua_{grua_id}{ext}"
    dest = UPLOADS_DIR / filename
    content = await foto.read()
    dest.write_bytes(content)

    # Eliminar foto antigua si tenía otro nombre (diferente extensión)
    if g.foto_filename and g.foto_filename != filename:
        old = UPLOADS_DIR / g.foto_filename
        if old.exists():
            old.unlink()

    g.foto_filename = filename
    db.commit()
    db.refresh(g)
    _load_conductor(g, db)
    return _grua_out(g)
