import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class Viaje(Base):
    __tablename__ = "viajes"
    __table_args__ = (
        CheckConstraint("estado IN ('NO_INICIADO', 'EN_CURSO', 'FINALIZADO')", name="ck_viajes_estado"),
        CheckConstraint(
            "metodo_pago IN ('EFECTIVO','TRANSFERENCIA','TARJETA','OTRO')",
            name="ck_viajes_metodo_pago",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=False
    )
    creado_por: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    iniciado_por: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True
    )

    placa_grua: Mapped[str | None] = mapped_column(String(20), nullable=True)
    marca_grua: Mapped[str | None] = mapped_column(String(80), nullable=True)

    origen: Mapped[str] = mapped_column(String(200), nullable=False)
    destino: Mapped[str] = mapped_column(String(200), nullable=False)

    estado: Mapped[str] = mapped_column(String(20), default="NO_INICIADO")

    monto_total: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    metodo_pago: Mapped[str | None] = mapped_column(String(20), nullable=True)
    foto_recibo_url: Mapped[str | None] = mapped_column(String, nullable=True)

    # Timestamps — siempre asignados por el servidor
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    iniciado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finalizado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relaciones
    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="viajes")
    creador: Mapped["Usuario"] = relationship(
        "Usuario", back_populates="viajes_creados", foreign_keys=[creado_por]
    )
    iniciador: Mapped["Usuario | None"] = relationship(
        "Usuario", back_populates="viajes_iniciados", foreign_keys=[iniciado_por]
    )
    vehiculos: Mapped[list["ViajeVehiculo"]] = relationship(
        "ViajeVehiculo", back_populates="viaje", cascade="all, delete-orphan"
    )
    auditorias: Mapped[list["Auditoria"]] = relationship(
        "Auditoria", back_populates="viaje"
    )
