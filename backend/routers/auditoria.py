from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require
from models.auditoria import Auditoria
from models.usuario import Usuario
from schemas.auditoria import AuditoriaOut

router = APIRouter(prefix="/auditoria", tags=["auditoría"])


@router.get("", response_model=list[AuditoriaOut])
def listar_auditoria(
    viaje_id: str = Query(..., description="ID del viaje"),
    user: Usuario = Depends(require("perm_ver_auditoria")),
    db: Session = Depends(get_db),
):
    return (
        db.query(Auditoria)
        .filter(
            Auditoria.empresa_id == user.empresa_id,
            Auditoria.viaje_id == viaje_id,
        )
        .order_by(Auditoria.realizado_en.desc())
        .all()
    )
