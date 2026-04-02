import uuid
from datetime import datetime
from sqlalchemy import Boolean, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=False
    )
    rol_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ultimo_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relaciones
    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="usuarios")
    rol: Mapped["Rol"] = relationship("Rol", back_populates="usuarios")
    viajes_creados: Mapped[list["Viaje"]] = relationship(
        "Viaje", back_populates="creador", foreign_keys="Viaje.creado_por"
    )
    viajes_iniciados: Mapped[list["Viaje"]] = relationship(
        "Viaje", back_populates="iniciador", foreign_keys="Viaje.iniciado_por"
    )
    auditorias: Mapped[list["Auditoria"]] = relationship(
        "Auditoria", back_populates="usuario"
    )
