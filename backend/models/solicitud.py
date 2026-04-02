import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class SolicitudReabrir(Base):
    __tablename__ = "solicitudes_reabrir"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=False)
    viaje_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("viajes.id"), nullable=False)
    solicitado_por: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="PENDIENTE")
    nota: Mapped[str | None] = mapped_column(Text, nullable=True)
    resuelto_por: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    resuelto_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relaciones
    viaje: Mapped["Viaje"] = relationship("Viaje")
    solicitante: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[solicitado_por])
    resolvente: Mapped["Usuario | None"] = relationship("Usuario", foreign_keys=[resuelto_por])
