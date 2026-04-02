from typing import Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.usuario import Usuario
from services.auth import decode_token

_bearer = HTTPBearer()

_401 = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No autenticado",
    headers={"WWW-Authenticate": "Bearer"},
)
_403 = HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """
    Extrae y valida el JWT. Carga el usuario con su rol en un solo query.
    Inyecta la dependencia en cualquier endpoint que requiera autenticación.
    """
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            raise _401
    except JWTError:
        raise _401

    user = (
        db.query(Usuario)
        .options(joinedload(Usuario.rol))
        .filter(Usuario.id == user_id, Usuario.activo.is_(True))
        .first()
    )
    if not user:
        raise _401

    return user


def require(perm: str) -> Callable:
    """
    Factoría de dependencias de permisos.

    Uso:
        @router.get("/...", dependencies=[Depends(require("perm_crear_viaje"))])

    O como dependencia con usuario:
        @router.post("/...")
        def endpoint(user = Depends(require("perm_crear_viaje"))): ...
    """
    def checker(user: Usuario = Depends(get_current_user)) -> Usuario:
        if not getattr(user.rol, perm, False):
            raise _403
        return user

    # Nombre descriptivo para que OpenAPI lo muestre correctamente
    checker.__name__ = f"require_{perm}"
    return checker
