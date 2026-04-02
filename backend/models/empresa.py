import uuid
from datetime import datetime
from sqlalchemy import Boolean, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class Empresa(Base):
    __tablename__ = "empresas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    ruc: Mapped[str | None] = mapped_column(String(20), nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relaciones
    roles: Mapped[list["Rol"]] = relationship("Rol", back_populates="empresa")
    usuarios: Mapped[list["Usuario"]] = relationship("Usuario", back_populates="empresa")
    configuracion: Mapped["Configuracion"] = relationship(
        "Configuracion", back_populates="empresa", uselist=False
    )
    viajes: Mapped[list["Viaje"]] = relationship("Viaje", back_populates="empresa")
