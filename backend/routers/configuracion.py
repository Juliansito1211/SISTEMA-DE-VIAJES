from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require
from models.configuracion import Configuracion
from models.usuario import Usuario
from schemas.configuracion import ConfiguracionOut, ConfiguracionUpdate

router = APIRouter(prefix="/configuracion", tags=["configuración"])


def _get_config(empresa_id: str, db: Session) -> Configuracion:
    cfg = db.query(Configuracion).filter(Configuracion.empresa_id == empresa_id).first()
    if not cfg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuración no encontrada para esta empresa",
        )
    return cfg


@router.get("", response_model=ConfiguracionOut)
def obtener_configuracion(
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_config(str(user.empresa_id), db)


@router.put("", response_model=ConfiguracionOut)
def actualizar_configuracion(
    body: ConfiguracionUpdate,
    user: Usuario = Depends(require("perm_configuracion")),
    db: Session = Depends(get_db),
):
    cfg = _get_config(str(user.empresa_id), db)

    if body.foto_recibo_obligatoria is not None:
        cfg.foto_recibo_obligatoria = body.foto_recibo_obligatoria

    if body.metodos_pago_habilitados is not None:
        # Validar que solo contenga métodos permitidos
        validos = {"EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"}
        ingresados = {m.strip() for m in body.metodos_pago_habilitados.split(",")}
        invalidos = ingresados - validos
        if invalidos:
            raise HTTPException(
                status_code=400,
                detail=f"Métodos de pago inválidos: {', '.join(invalidos)}",
            )
        cfg.metodos_pago_habilitados = ",".join(sorted(ingresados))

    cfg.actualizado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(cfg)
    return cfg
