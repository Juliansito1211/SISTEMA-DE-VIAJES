from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.rol import Rol
from models.usuario import Usuario
from schemas.rol import RolOut, RolUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RolOut])
def listar_roles(
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Rol).filter(Rol.empresa_id == user.empresa_id).all()


@router.put("/{rol_id}", response_model=RolOut)
def editar_rol(
    rol_id: int,
    body: RolUpdate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException, status
    from dependencies import _403

    if not user.rol.perm_gestionar_roles:
        raise _403

    rol = db.query(Rol).filter(
        Rol.id == rol_id,
        Rol.empresa_id == user.empresa_id,
    ).first()
    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")

    for campo, valor in body.model_dump(exclude_none=True).items():
        setattr(rol, campo, valor)

    db.commit()
    db.refresh(rol)
    return rol
