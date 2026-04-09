import pathlib
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.foto import FotoGrua, FotoVehiculo
from models.usuario import Usuario
from models.vehiculo import ViajeVehiculo
from models.viaje import Viaje

router = APIRouter(prefix="/fotos", tags=["fotos"])

UPLOADS_DIR = pathlib.Path("/app/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

EXTENSIONES_PERMITIDAS = {"jpg", "jpeg", "png", "webp", "heic", "heif"}


def _guardar_archivo(file: UploadFile, contenido: bytes) -> str:
    ext = ""
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in EXTENSIONES_PERMITIDAS:
        ext = "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    (UPLOADS_DIR / filename).write_bytes(contenido)
    return filename


# ── POST /fotos/vehiculo/{viaje_vehiculo_id} ───────────────────────────────────

@router.post("/vehiculo/{viaje_vehiculo_id}", status_code=status.HTTP_201_CREATED)
async def subir_fotos_vehiculo(
    viaje_vehiculo_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vv = (
        db.query(ViajeVehiculo)
        .join(Viaje, Viaje.id == ViajeVehiculo.viaje_id)
        .filter(ViajeVehiculo.id == viaje_vehiculo_id, Viaje.empresa_id == user.empresa_id)
        .first()
    )
    if not vv:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado en el viaje")

    fotos = []
    for file in files:
        contenido = await file.read()
        filename = _guardar_archivo(file, contenido)
        foto = FotoVehiculo(
            empresa_id=user.empresa_id,
            viaje_vehiculo_id=viaje_vehiculo_id,
            filename=filename,
        )
        db.add(foto)
        fotos.append(foto)

    db.commit()
    for f in fotos:
        db.refresh(f)

    return [{"id": str(f.id), "url": f"/uploads/{f.filename}", "creado_en": f.creado_en} for f in fotos]


# ── GET /fotos/vehiculo/{viaje_vehiculo_id} ────────────────────────────────────

@router.get("/vehiculo/{viaje_vehiculo_id}")
def listar_fotos_vehiculo(
    viaje_vehiculo_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vv = (
        db.query(ViajeVehiculo)
        .join(Viaje, Viaje.id == ViajeVehiculo.viaje_id)
        .filter(ViajeVehiculo.id == viaje_vehiculo_id, Viaje.empresa_id == user.empresa_id)
        .first()
    )
    if not vv:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado en el viaje")

    fotos = db.query(FotoVehiculo).filter(FotoVehiculo.viaje_vehiculo_id == viaje_vehiculo_id).all()
    return [{"id": str(f.id), "url": f"/uploads/{f.filename}", "creado_en": f.creado_en} for f in fotos]


# ── POST /fotos/grua/{viaje_id} ────────────────────────────────────────────────

@router.post("/grua/{viaje_id}", status_code=status.HTTP_201_CREATED)
async def subir_fotos_grua(
    viaje_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    viaje = db.query(Viaje).filter(Viaje.id == viaje_id, Viaje.empresa_id == user.empresa_id).first()
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    fotos = []
    for file in files:
        contenido = await file.read()
        filename = _guardar_archivo(file, contenido)
        foto = FotoGrua(
            empresa_id=user.empresa_id,
            viaje_id=viaje_id,
            filename=filename,
        )
        db.add(foto)
        fotos.append(foto)

    db.commit()
    for f in fotos:
        db.refresh(f)

    return [{"id": str(f.id), "url": f"/uploads/{f.filename}", "creado_en": f.creado_en} for f in fotos]


# ── GET /fotos/grua/{viaje_id} ─────────────────────────────────────────────────

@router.get("/grua/{viaje_id}")
def listar_fotos_grua(
    viaje_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    viaje = db.query(Viaje).filter(Viaje.id == viaje_id, Viaje.empresa_id == user.empresa_id).first()
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    fotos = db.query(FotoGrua).filter(FotoGrua.viaje_id == viaje_id).all()
    return [{"id": str(f.id), "url": f"/uploads/{f.filename}", "creado_en": f.creado_en} for f in fotos]


# ── DELETE /fotos/{foto_id} ────────────────────────────────────────────────────

@router.delete("/{foto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_foto(
    foto_id: uuid.UUID,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    foto = db.query(FotoVehiculo).filter(FotoVehiculo.id == foto_id, FotoVehiculo.empresa_id == user.empresa_id).first()
    if not foto:
        foto = db.query(FotoGrua).filter(FotoGrua.id == foto_id, FotoGrua.empresa_id == user.empresa_id).first()
    if not foto:
        raise HTTPException(status_code=404, detail="Foto no encontrada")

    archivo = UPLOADS_DIR / foto.filename
    if archivo.exists():
        archivo.unlink()

    db.delete(foto)
    db.commit()
