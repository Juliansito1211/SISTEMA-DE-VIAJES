import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class VehiculoCatalogo(Base):
    __tablename__ = "vehiculos_catalogo"
    __table_args__ = (
        UniqueConstraint("empresa_id", "placa", name="uq_vehiculos_empresa_placa"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=False
    )
    placa: Mapped[str] = mapped_column(String(20), nullable=False)
    marca: Mapped[str | None] = mapped_column(String(80), nullable=True)
    modelo: Mapped[str | None] = mapped_column(String(80), nullable=True)
    color: Mapped[str | None] = mapped_column(String(40), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relaciones
    viaje_vehiculos: Mapped[list["ViajeVehiculo"]] = relationship(
        "ViajeVehiculo", back_populates="vehiculo"
    )


class ViajeVehiculo(Base):
    __tablename__ = "viaje_vehiculos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    viaje_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("viajes.id", ondelete="CASCADE"), nullable=False
    )
    vehiculo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehiculos_catalogo.id"), nullable=False
    )
    monto: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    agregado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relaciones
    viaje: Mapped["Viaje"] = relationship("Viaje", back_populates="vehiculos")
    vehiculo: Mapped["VehiculoCatalogo"] = relationship(
        "VehiculoCatalogo", back_populates="viaje_vehiculos"
    )
