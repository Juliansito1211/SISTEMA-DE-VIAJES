import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class Grua(Base):
    __tablename__ = "gruas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=False
    )
    placa: Mapped[str] = mapped_column(String(20), nullable=False)
    marca: Mapped[str] = mapped_column(String(80), nullable=False)
    modelo: Mapped[str | None] = mapped_column(String(80))
    color: Mapped[str | None] = mapped_column(String(40))
    foto_filename: Mapped[str | None] = mapped_column(Text)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    conductor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True
    )
    observacion_desasignacion: Mapped[str | None] = mapped_column(Text)
    tecno_inicio: Mapped[date | None] = mapped_column(Date)
    tecno_vence: Mapped[date | None] = mapped_column(Date)
    soat_inicio: Mapped[date | None] = mapped_column(Date)
    soat_vence: Mapped[date | None] = mapped_column(Date)
    creado_en: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relaciones
    conductor: Mapped[Optional["Usuario"]] = relationship(
        "Usuario", foreign_keys=[conductor_id]
    )
