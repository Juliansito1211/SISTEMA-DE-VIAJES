import pathlib
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import SessionLocal, settings
from models.usuario import Usuario
from services.auth import hash_password
from routers import auth as auth_router
from routers import viajes as viajes_router
from routers import vehiculos as vehiculos_router
from routers import usuarios as usuarios_router
from routers import roles as roles_router
from routers import auditoria as auditoria_router
from routers import configuracion as configuracion_router
from routers import solicitudes as solicitudes_router
from routers import fotos as fotos_router
from routers import gruas as gruas_router

UPLOADS_DIR = pathlib.Path("/app/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# UUID fijo de la empresa inicial (mismo que seed.sql)
_EMPRESA_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
# rol_id=3 → Admin (tercer INSERT en seed.sql)
_ADMIN_ROL_ID = 3


def _create_initial_admin(db: Session) -> None:
    """Crea el usuario Admin si no existe. Se ejecuta una sola vez en el startup."""
    exists = db.query(Usuario).filter(Usuario.email == settings.ADMIN_EMAIL).first()
    if exists:
        return

    admin = Usuario(
        empresa_id=_EMPRESA_ID,
        rol_id=_ADMIN_ROL_ID,
        nombre="Admin",
        email=settings.ADMIN_EMAIL,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
    )
    db.add(admin)
    db.commit()
    print(f"[startup] Usuario admin creado: {settings.ADMIN_EMAIL}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db: Session = SessionLocal()
    try:
        _create_initial_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Sistema de Gestión de Viajes",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restringir en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(viajes_router.router)
app.include_router(vehiculos_router.router)
app.include_router(vehiculos_router.router_catalogo)
app.include_router(usuarios_router.router)
app.include_router(roles_router.router)
app.include_router(auditoria_router.router)
app.include_router(configuracion_router.router)
app.include_router(solicitudes_router.router)
app.include_router(fotos_router.router)
app.include_router(gruas_router.router)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}
