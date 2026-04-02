import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_user, require
from models.usuario import Usuario
from schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioCambiarRol, UsuarioOut
from services.auth import hash_password

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


def _get_usuario_empresa(usuario_id: str, empresa_id: str, db: Session) -> Usuario:
    u = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.empresa_id == empresa_id,
    ).first()
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return u


# ── GET /usuarios ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[UsuarioOut])
def listar_usuarios(
    user: Usuario = Depends(require("perm_crear_usuarios")),
    db: Session = Depends(get_db),
):
    return (
        db.query(Usuario)
        .filter(Usuario.empresa_id == user.empresa_id)
        .order_by(Usuario.creado_en.desc())
        .all()
    )


# ── POST /usuarios ─────────────────────────────────────────────────────────────

@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    body: UsuarioCreate,
    user: Usuario = Depends(require("perm_crear_usuarios")),
    db: Session = Depends(get_db),
):
    # Verificar que el rol pertenece a la misma empresa
    from models.rol import Rol
    rol = db.query(Rol).filter(
        Rol.id == body.rol_id,
        Rol.empresa_id == user.empresa_id,
    ).first()
    if not rol:
        raise HTTPException(status_code=400, detail="Rol no encontrado en esta empresa")

    # Email único
    existe = db.query(Usuario).filter(Usuario.email == body.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    nuevo = Usuario(
        empresa_id=user.empresa_id,   # siempre del JWT
        rol_id=body.rol_id,
        nombre=body.nombre,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


# ── PUT /usuarios/{id} ─────────────────────────────────────────────────────────

@router.put("/{usuario_id}", response_model=UsuarioOut)
def editar_usuario(
    usuario_id: uuid.UUID,
    body: UsuarioUpdate,
    user: Usuario = Depends(require("perm_crear_usuarios")),
    db: Session = Depends(get_db),
):
    objetivo = _get_usuario_empresa(str(usuario_id), str(user.empresa_id), db)

    if body.nombre is not None:
        objetivo.nombre = body.nombre

    if body.email is not None:
        existe = db.query(Usuario).filter(
            Usuario.email == body.email,
            Usuario.id != objetivo.id,
        ).first()
        if existe:
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        objetivo.email = body.email

    if body.password is not None:
        objetivo.password_hash = hash_password(body.password)

    db.commit()
    db.refresh(objetivo)
    return objetivo


# ── PATCH /usuarios/{id}/rol ───────────────────────────────────────────────────

@router.patch("/{usuario_id}/rol", response_model=UsuarioOut)
def cambiar_rol(
    usuario_id: uuid.UUID,
    body: UsuarioCambiarRol,
    user: Usuario = Depends(require("perm_gestionar_roles")),
    db: Session = Depends(get_db),
):
    objetivo = _get_usuario_empresa(str(usuario_id), str(user.empresa_id), db)

    from models.rol import Rol
    rol = db.query(Rol).filter(
        Rol.id == body.rol_id,
        Rol.empresa_id == user.empresa_id,
    ).first()
    if not rol:
        raise HTTPException(status_code=400, detail="Rol no encontrado en esta empresa")

    objetivo.rol_id = body.rol_id
    db.commit()
    db.refresh(objetivo)
    return objetivo


# ── DELETE /usuarios/{id} — soft delete ────────────────────────────────────────

@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def desactivar_usuario(
    usuario_id: uuid.UUID,
    user: Usuario = Depends(require("perm_crear_usuarios")),
    db: Session = Depends(get_db),
):
    objetivo = _get_usuario_empresa(str(usuario_id), str(user.empresa_id), db)

    if objetivo.id == user.id:
        raise HTTPException(status_code=400, detail="No puedes desactivarte a ti mismo")

    objetivo.activo = False
    db.commit()
    return None
