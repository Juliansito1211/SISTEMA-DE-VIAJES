import pathlib
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.tanqueo import Tanqueo
from models.usuario import Usuario
from services.viajes import get_viaje_o_404

router = APIRouter(prefix="/viajes/{viaje_id}/tanqueos", tags=["tanqueos"])

UPLOADS_DIR = pathlib.Path("/app/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
EXTENSIONES = {"jpg", "jpeg", "png", "webp", "heic", "heif"}


def _foto_url(filename: str | None) -> str | None:
    return f"/uploads/{filename}" if filename else None


def _tanqueo_out(t: Tanqueo) -> dict:
    return {
        "id": str(t.id),
        "monto": float(t.monto),
        "observacion": t.observacion,
        "foto_url": _foto_url(t.foto_filename),
        "registrado_por_nombre": t.usuario.nombre if t.usuario else "—",
        "creado_en": t.creado_en.isoformat(),
    }


# ── GET /viajes/{id}/tanqueos ─────────────────────────────────────────────────

@router.get("")
def listar_tanqueos(
    viaje_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)
    tanqueos = (
        db.query(Tanqueo)
        .filter(Tanqueo.viaje_id == viaje_id, Tanqueo.empresa_id == user.empresa_id)
        .order_by(Tanqueo.creado_en.asc())
        .all()
    )
    # Eager-load usuarios
    ids = list({t.registrado_por for t in tanqueos})
    usuarios = {u.id: u for u in db.query(Usuario).filter(Usuario.id.in_(ids)).all()}
    for t in tanqueos:
        t.usuario = usuarios.get(t.registrado_por)
    return [_tanqueo_out(t) for t in tanqueos]


# ── POST /viajes/{id}/tanqueos ────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def registrar_tanqueo(
    viaje_id: uuid.UUID,
    monto: float = Form(...),
    observacion: str = Form(None),
    foto: UploadFile = File(None),
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    viaje = get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)

    if viaje.estado not in ("EN_CURSO", "PENDIENTE_ACEPTAR"):
        raise HTTPException(status_code=400, detail="Solo se puede tanquear en viajes en curso")

    if monto <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

    if not foto or not foto.filename:
        raise HTTPException(status_code=400, detail="La foto del recibo es obligatoria")

    # Subir foto
    foto_filename = None
    if foto and foto.filename:
        ext = foto.filename.rsplit(".", 1)[-1].lower() if "." in foto.filename else "jpg"
        if ext not in EXTENSIONES:
            ext = "jpg"
        contenido = await foto.read()
        foto_filename = f"{uuid.uuid4().hex}.{ext}"
        (UPLOADS_DIR / foto_filename).write_bytes(contenido)

    t = Tanqueo(
        empresa_id=user.empresa_id,
        viaje_id=viaje_id,
        registrado_por=user.id,
        monto=monto,
        observacion=observacion.strip() if observacion else None,
        foto_filename=foto_filename,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    t.usuario = db.query(Usuario).filter(Usuario.id == t.registrado_por).first()
    return _tanqueo_out(t)


# ── DELETE /viajes/{id}/tanqueos/{tanqueo_id} ─────────────────────────────────

@router.delete("/{tanqueo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_tanqueo(
    viaje_id: uuid.UUID,
    tanqueo_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_viaje_o_404(str(viaje_id), str(user.empresa_id), db)
    t = db.query(Tanqueo).filter(
        Tanqueo.id == tanqueo_id,
        Tanqueo.viaje_id == viaje_id,
        Tanqueo.empresa_id == user.empresa_id,
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    # Solo el que lo registró o un admin puede eliminar
    if t.registrado_por != user.id and not user.rol.perm_ver_todos_viajes:
        raise HTTPException(status_code=403, detail="Sin permiso")
    db.delete(t)
    db.commit()
