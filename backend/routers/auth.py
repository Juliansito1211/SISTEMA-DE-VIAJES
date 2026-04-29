from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.empresa import Empresa
from models.usuario import Usuario
from schemas.auth import LoginRequest, Token, UsuarioMe
from services.auth import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(Usuario)
        .options(joinedload(Usuario.rol))
        .filter(Usuario.email == body.email, Usuario.activo.is_(True))
        .first()
    )

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    # Actualizar último login — timestamp del servidor, nunca del cliente
    user.ultimo_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(
        user_id=str(user.id),
        empresa_id=str(user.empresa_id),
    )
    return Token(access_token=token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    # JWT es stateless; el cliente simplemente descarta el token.
    return None


@router.get("/me", response_model=UsuarioMe)
def me(user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    rol = user.rol
    empresa = db.query(Empresa).filter(Empresa.id == user.empresa_id).first()
    return UsuarioMe(
        id=user.id,
        empresa_id=user.empresa_id,
        empresa_nombre=empresa.nombre if empresa else "Mi Empresa",
        nombre=user.nombre,
        email=user.email,
        rol_nombre=rol.nombre,
        rol_nivel=rol.nivel,
        # Permisos aplanados — el frontend no necesita otro request
        perm_crear_viaje=rol.perm_crear_viaje,
        perm_iniciar_viaje=rol.perm_iniciar_viaje,
        perm_editar_viaje_activo=rol.perm_editar_viaje_activo,
        perm_finalizar_viaje=rol.perm_finalizar_viaje,
        perm_editar_viaje_finalizado=rol.perm_editar_viaje_finalizado,
        perm_reabrir_viaje=rol.perm_reabrir_viaje,
        perm_ver_todos_viajes=rol.perm_ver_todos_viajes,
        perm_agregar_vehiculo=rol.perm_agregar_vehiculo,
        perm_editar_vehiculo=rol.perm_editar_vehiculo,
        perm_crear_usuarios=rol.perm_crear_usuarios,
        perm_gestionar_roles=rol.perm_gestionar_roles,
        perm_gestionar_gruas=rol.perm_gestionar_gruas,
        perm_ver_auditoria=rol.perm_ver_auditoria,
        perm_configuracion=rol.perm_configuracion,
    )
