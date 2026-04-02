from sqlalchemy.orm import Session
from models.vehiculo import VehiculoCatalogo


def get_or_create_vehiculo(
    placa: str,
    empresa_id: str,
    db: Session,
    marca: str | None = None,
    modelo: str | None = None,
    color: str | None = None,
) -> VehiculoCatalogo:
    """
    Busca la placa en vehiculos_catalogo.
    Si no existe, la crea automáticamente SIN notificar al usuario (regla de negocio).
    Si ya existe y se pasaron datos nuevos, los actualiza solo si el campo estaba vacío.
    """
    vehiculo = (
        db.query(VehiculoCatalogo)
        .filter(
            VehiculoCatalogo.empresa_id == empresa_id,
            VehiculoCatalogo.placa == placa.upper(),
        )
        .first()
    )

    if not vehiculo:
        vehiculo = VehiculoCatalogo(
            empresa_id=empresa_id,
            placa=placa.upper(),
            marca=marca,
            modelo=modelo,
            color=color,
        )
        db.add(vehiculo)
        db.flush()  # obtener el id sin hacer commit todavía
    else:
        # Completar campos vacíos si se proporcionaron datos nuevos
        if marca and not vehiculo.marca:
            vehiculo.marca = marca
        if modelo and not vehiculo.modelo:
            vehiculo.modelo = modelo
        if color and not vehiculo.color:
            vehiculo.color = color

    return vehiculo
