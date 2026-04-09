import uuid
from sqlalchemy import Boolean, Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class Rol(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=False
    )
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    nivel: Mapped[int] = mapped_column(Integer, nullable=False)

    # Módulo: Viajes
    perm_crear_viaje: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_iniciar_viaje: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_editar_viaje_activo: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_finalizar_viaje: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_editar_viaje_finalizado: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_reabrir_viaje: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_ver_todos_viajes: Mapped[bool] = mapped_column(Boolean, default=False)

    # Módulo: Vehículos
    perm_agregar_vehiculo: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_editar_vehiculo: Mapped[bool] = mapped_column(Boolean, default=False)

    # Módulo: Usuarios
    perm_crear_usuarios: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_gestionar_roles: Mapped[bool] = mapped_column(Boolean, default=False)

    # Módulo: Grúas
    perm_gestionar_gruas: Mapped[bool] = mapped_column(Boolean, default=False)

    # Módulo: Sistema
    perm_ver_auditoria: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_configuracion: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relaciones
    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="roles")
    usuarios: Mapped[list["Usuario"]] = relationship("Usuario", back_populates="rol")
