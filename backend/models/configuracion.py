import uuid
from datetime import datetime
from sqlalchemy import Boolean, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class Configuracion(Base):
    __tablename__ = "configuracion"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=False, unique=True
    )
    foto_recibo_obligatoria: Mapped[bool] = mapped_column(Boolean, default=False)
    metodos_pago_habilitados: Mapped[str] = mapped_column(
        String, default="EFECTIVO,TRANSFERENCIA,TARJETA,OTRO"
    )
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relaciones
    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="configuracion")
