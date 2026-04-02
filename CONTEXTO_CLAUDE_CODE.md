# Sistema de Gestión de Viajes — Contexto para Claude Code

> Pega este archivo completo al inicio de cada sesión de Claude Code.
> Última actualización: 2025

---

## 1. Descripción del proyecto

Web app mobile-first para operadores de transporte (grúas). Permite crear viajes, registrar vehículos transportados, controlar montos y cerrar operaciones con validaciones en cascada. Los conductores la usan desde el celular en cualquier navegador.

**Stack definido:**
- Frontend: React + Vite (mobile-first, sin app store)
- Backend: FastAPI (Python)
- Base de datos: PostgreSQL
- Autenticación: JWT + bcrypt
- Infraestructura: Docker Compose
- Deploy: Railway o Render.com

---

## 2. Modelo de base de datos — 8 tablas

### 2.1 `empresas`
```sql
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    ruc VARCHAR(20),
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW()
);
```
> Permite crecer a multi-empresa en el futuro sin rehacer el esquema.

---

### 2.2 `roles`
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    nombre VARCHAR(80) NOT NULL,
    nivel INT NOT NULL, -- 1=Operador, 2=Supervisor, 3=Admin

    -- Módulo: Viajes
    perm_crear_viaje            BOOLEAN DEFAULT FALSE,
    perm_iniciar_viaje          BOOLEAN DEFAULT FALSE,
    perm_editar_viaje_activo    BOOLEAN DEFAULT FALSE,
    perm_finalizar_viaje        BOOLEAN DEFAULT FALSE,
    perm_editar_viaje_finalizado BOOLEAN DEFAULT FALSE,
    perm_reabrir_viaje          BOOLEAN DEFAULT FALSE,
    perm_ver_todos_viajes       BOOLEAN DEFAULT FALSE,

    -- Módulo: Vehículos
    perm_agregar_vehiculo       BOOLEAN DEFAULT FALSE,
    perm_editar_vehiculo        BOOLEAN DEFAULT FALSE,

    -- Módulo: Usuarios
    perm_crear_usuarios         BOOLEAN DEFAULT FALSE,
    perm_gestionar_roles        BOOLEAN DEFAULT FALSE,

    -- Módulo: Sistema
    perm_ver_auditoria          BOOLEAN DEFAULT FALSE,
    perm_configuracion          BOOLEAN DEFAULT FALSE
);
```

**Roles por defecto (insertar con seed):**

| Permiso | Operador (nivel 1) | Supervisor (nivel 2) | Admin (nivel 3) |
|---|---|---|---|
| perm_crear_viaje | ✓ | ✓ | ✓ |
| perm_iniciar_viaje | ✓ | ✓ | ✓ |
| perm_editar_viaje_activo | ✓ | ✓ | ✓ |
| perm_finalizar_viaje | ✓ | ✓ | ✓ |
| perm_editar_viaje_finalizado | ✗ | ✓ | ✓ |
| perm_reabrir_viaje | ✗ | ✓ | ✓ |
| perm_ver_todos_viajes | ✗ | ✓ | ✓ |
| perm_agregar_vehiculo | ✓ | ✓ | ✓ |
| perm_editar_vehiculo | ✓ | ✓ | ✓ |
| perm_crear_usuarios | ✗ | ✗ | ✓ |
| perm_gestionar_roles | ✗ | ✗ | ✓ |
| perm_ver_auditoria | ✗ | ✓ | ✓ |
| perm_configuracion | ✗ | ✗ | ✓ |

---

### 2.3 `usuarios`
```sql
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    rol_id INT NOT NULL REFERENCES roles(id),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW(),
    ultimo_login TIMESTAMP
);
```
> Los usuarios NO se registran solos. Solo el Admin los crea manualmente.

---

### 2.4 `configuracion`
```sql
CREATE TABLE configuracion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL UNIQUE REFERENCES empresas(id),
    foto_recibo_obligatoria BOOLEAN DEFAULT FALSE,
    metodos_pago_habilitados TEXT DEFAULT 'EFECTIVO,TRANSFERENCIA,TARJETA,OTRO',
    actualizado_en TIMESTAMP DEFAULT NOW()
);
```

---

### 2.5 `viajes`
```sql
CREATE TABLE viajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    creado_por UUID NOT NULL REFERENCES usuarios(id),
    iniciado_por UUID REFERENCES usuarios(id),

    -- Datos de la grúa (vehículo transportador) — obligatorios al iniciar
    placa_grua VARCHAR(20),
    marca_grua VARCHAR(80),

    -- Datos del viaje — obligatorios al crear
    origen VARCHAR(200) NOT NULL,
    destino VARCHAR(200) NOT NULL,

    -- Estado
    estado VARCHAR(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'FINALIZADO')),

    -- Datos de cierre — se llenan al finalizar
    monto_total DECIMAL(12,2),
    metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('EFECTIVO','TRANSFERENCIA','TARJETA','OTRO')),
    foto_recibo_url TEXT,

    -- Timestamps automáticos — NUNCA editables por el usuario
    creado_en TIMESTAMP DEFAULT NOW(),
    iniciado_en TIMESTAMP,
    finalizado_en TIMESTAMP
);
```

---

### 2.6 `vehiculos_catalogo`
```sql
CREATE TABLE vehiculos_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    placa VARCHAR(20) NOT NULL,
    marca VARCHAR(80),
    modelo VARCHAR(80),
    color VARCHAR(40),
    creado_en TIMESTAMP DEFAULT NOW(),
    UNIQUE(empresa_id, placa)
);
```
> Si se ingresa una placa que no existe, se crea automáticamente SIN notificar al usuario.

---

### 2.7 `viaje_vehiculos`
```sql
CREATE TABLE viaje_vehiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_id UUID NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
    vehiculo_id UUID NOT NULL REFERENCES vehiculos_catalogo(id),
    monto DECIMAL(12,2),        -- NULL si no se ingresó monto
    orden INT NOT NULL,         -- orden en que fue agregado
    agregado_en TIMESTAMP DEFAULT NOW()
);
```
> Solo los registros con monto != NULL suman al total parcial del viaje.

---

### 2.8 `auditoria`
```sql
CREATE TABLE auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    viaje_id UUID NOT NULL REFERENCES viajes(id),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    accion VARCHAR(80) NOT NULL,      -- ej: 'EDITAR_VIAJE_FINALIZADO', 'REABRIR_VIAJE'
    datos_antes JSONB,                -- snapshot del registro antes del cambio
    datos_despues JSONB,              -- snapshot después del cambio
    realizado_en TIMESTAMP DEFAULT NOW() NOT NULL
);
```
> La auditoría es automática e irrevocable. Ningún usuario puede borrarla ni desactivarla.

---

## 3. Reglas de negocio — 13 reglas críticas

### Flujo 1: Crear viaje
1. **Placa obligatoria** — sin placa no avanza. Mensaje: "Debe ingresar la placa".
2. **Placa no existe en BD** — se crea en `vehiculos_catalogo` automáticamente, sin notificar.
3. **Origen obligatorio** — bloquea si está vacío. Mensaje: "Debe ingresar el origen".
4. **Destino obligatorio** — bloquea si está vacío. Mensaje: "Debe ingresar el destino".
5. **Monto NO se ingresa aquí** — el monto es exclusivo del proceso de finalización.
6. El viaje se guarda con `estado = 'ACTIVO'`.

### Flujo 2: Iniciar viaje y agregar vehículos
7. **Modal obligatorio al iniciar** — al pulsar "Iniciar Viaje" aparece un modal que NO puede cerrarse ni omitirse. Solicita:
   - `placa_grua` — OBLIGATORIO. Mensaje si falta: "Placa de la grúa obligatoria".
   - `marca_grua` — OBLIGATORIO. Mensaje si falta: "Marca de la grúa obligatoria".
8. **Registro automático al confirmar el modal** — el sistema guarda sin intervención del usuario:
   - `iniciado_por` = usuario logueado (del JWT)
   - `iniciado_en` = timestamp del servidor (NUNCA del cliente)
9. **Vehículos transportados** (distintos a la grúa):
   - `placa` — OBLIGATORIO. Mensaje: "Placa obligatoria".
   - `marca`, `modelo`, `color`, `monto` — todos OPCIONALES.
   - Solo los vehículos con `monto != NULL` suman al total parcial.
10. El operador puede agregar N vehículos en bucle. Al terminar, confirma con "¿Seguro que desea iniciar el viaje?".

### Flujo 3: Editar viaje (solo estado ACTIVO)
11. Se pueden editar placa, marca, modelo, color y monto de cada vehículo.
12. Cambiar el monto recalcula el `monto_total` del viaje automáticamente.
13. Solo disponible si `estado = 'ACTIVO'`. Usuarios sin `perm_editar_viaje_activo` no ven el botón.

### Flujo 4: Finalizar viaje — 3 validaciones en cascada
Las validaciones se ejecutan en orden. Si una falla, se detiene hasta que el operador corrija.

**Validación 1:** ¿El viaje tiene al menos 1 vehículo?
- Si no: alerta y bloquea. No puede continuar.

**Validación 2:** ¿Todos los vehículos tienen monto?
- Si hay vehículos sin monto: mostrar lista de placas con campo inline para ingresar el monto ahí mismo, sin ir a editar.
- El operador llena los montos y pulsa guardar. El sistema re-valida.

**Validación 3:** ¿El monto total es mayor a 0?
- Si suma 0 o negativo: alerta y bloquea.

**Tras pasar las 3 validaciones:**
- `metodo_pago` — OBLIGATORIO. Opciones: EFECTIVO, TRANSFERENCIA, TARJETA, OTRO.
- `foto_recibo_url` — OPCIONAL (configurable en `configuracion.foto_recibo_obligatoria`).
- El sistema guarda `estado = 'FINALIZADO'` y `finalizado_en = NOW()`.
- Mensaje de éxito: "Viaje finalizado correctamente".

### Control de acceso por rol
- **Operador:** solo ve sus propios viajes. No puede tocar viajes FINALIZADOS.
- **Supervisor:** ve todos los viajes. Puede editar y reabrir viajes FINALIZADOS (genera auditoría).
- **Admin:** acceso total. Único que crea usuarios y gestiona roles.
- Viajes FINALIZADOS: botones "Editar" y "Finalizar" ocultos para Operador. Visibles para Supervisor y Admin.
- Toda modificación a un viaje FINALIZADO genera un registro en `auditoria` automáticamente.

---

## 4. Endpoints de API necesarios

### Autenticación
```
POST   /auth/login              → recibe email+password, devuelve JWT
POST   /auth/logout
GET    /auth/me                 → datos del usuario logueado + permisos
```

### Usuarios (solo Admin)
```
GET    /usuarios                → lista todos los usuarios de la empresa
POST   /usuarios                → crear usuario nuevo
PUT    /usuarios/{id}           → editar usuario
PATCH  /usuarios/{id}/rol       → cambiar rol
DELETE /usuarios/{id}           → desactivar (soft delete: activo=false)
```

### Viajes
```
GET    /viajes                  → lista (Operador: solo suyos / Supervisor+Admin: todos)
GET    /viajes/{id}             → detalle de un viaje
POST   /viajes                  → crear viaje nuevo
PATCH  /viajes/{id}/iniciar     → iniciar viaje (guarda modal grúa + timestamp servidor)
PUT    /viajes/{id}             → editar viaje activo
POST   /viajes/{id}/finalizar   → ejecutar las 3 validaciones y cerrar
POST   /viajes/{id}/reabrir     → reabrir viaje finalizado (solo Supervisor/Admin)
```

### Vehículos del viaje
```
GET    /viajes/{id}/vehiculos          → lista de vehículos del viaje
POST   /viajes/{id}/vehiculos          → agregar vehículo al viaje
PUT    /viajes/{id}/vehiculos/{vid}    → editar vehículo
DELETE /viajes/{id}/vehiculos/{vid}    → eliminar vehículo del viaje
PATCH  /viajes/{id}/vehiculos/montos   → guardar montos en bloque (validación 2)
```

### Catálogo de vehículos
```
GET    /vehiculos/buscar?placa=ABC123  → buscar placa (para autocompletar)
```

### Auditoría
```
GET    /auditoria?viaje_id={id}        → historial de cambios de un viaje
```

### Configuración
```
GET    /configuracion                  → obtener config de la empresa
PUT    /configuracion                  → actualizar config (solo Admin)
```

---

## 5. Reglas de seguridad para el backend

- **Nunca confiar en el frontend.** Cada endpoint valida permisos desde el JWT.
- Los timestamps (`iniciado_en`, `finalizado_en`, `realizado_en`) siempre los pone el servidor con `NOW()`. Nunca aceptar timestamps del cliente.
- El `empresa_id` siempre viene del JWT, nunca del body del request. Evita que un usuario de empresa A acceda a datos de empresa B.
- Soft delete en usuarios: nunca borrar físicamente, solo `activo = false`.
- La tabla `auditoria` es append-only. Nunca permitir UPDATE ni DELETE sobre ella.
- Contraseñas: siempre bcrypt, mínimo 12 rounds. Nunca guardar en texto plano.

---

## 6. Estructura de carpetas sugerida

```
sistema-viajes/
├── docker-compose.yml
├── .env.example
├── CONTEXTO_CLAUDE_CODE.md     ← este archivo
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── database.py
│   ├── models/
│   │   ├── usuario.py
│   │   ├── viaje.py
│   │   ├── vehiculo.py
│   │   └── auditoria.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── usuarios.py
│   │   ├── viajes.py
│   │   └── vehiculos.py
│   ├── schemas/             ← Pydantic models (validación de entrada/salida)
│   ├── services/            ← lógica de negocio (validaciones en cascada, etc.)
│   └── migrations/
│       └── schema.sql
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/             ← funciones para llamar al backend
        ├── context/         ← AuthContext (JWT, permisos)
        ├── pages/
        │   ├── Login.jsx
        │   ├── MisViajes.jsx
        │   ├── NuevoViaje.jsx
        │   ├── DetalleViaje.jsx
        │   └── Usuarios.jsx
        └── components/
            ├── ModalGrua.jsx
            ├── FormVehiculo.jsx
            ├── ValidacionFinalizar.jsx
            └── ProtectedRoute.jsx
```

---

## 7. Variables de entorno (.env)

```env
# PostgreSQL
POSTGRES_DB=sistema_viajes
POSTGRES_USER=postgres
POSTGRES_PASSWORD=cambia_esto_en_produccion
POSTGRES_HOST=db
POSTGRES_PORT=5432

# FastAPI
SECRET_KEY=cambia_esto_por_una_clave_larga_y_aleatoria
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Empresa inicial (seed)
EMPRESA_NOMBRE=Mi Empresa de Grúas
ADMIN_EMAIL=admin@miempresa.com
ADMIN_PASSWORD=cambia_esto
```

---

## 8. Prompt de inicio para Claude Code

Copia esto exactamente al empezar una sesión nueva:

```
Lee el archivo CONTEXTO_CLAUDE_CODE.md que está en la raíz del proyecto.
Ese archivo contiene el modelo de base de datos completo, las reglas de negocio,
los endpoints necesarios y la estructura de carpetas.

Tarea actual: [DESCRIBE AQUÍ LO QUE QUIERES HACER EN ESTA SESIÓN]

Recuerda:
- Stack: React + Vite / FastAPI / PostgreSQL / JWT / Docker Compose
- Los timestamps siempre los genera el servidor, nunca el cliente
- El empresa_id siempre viene del JWT, nunca del body
- La tabla auditoria es append-only
```

---

## 9. Orden de desarrollo recomendado

1. `docker-compose.yml` + `schema.sql` + seed de roles y empresa inicial
2. Backend: modelos SQLAlchemy + Pydantic schemas
3. Backend: `/auth/login` y middleware de permisos
4. Backend: endpoints de viajes (crear, iniciar, editar, finalizar)
5. Backend: endpoints de vehículos
6. Frontend: Login + AuthContext + ProtectedRoute
7. Frontend: pantalla "Mis Viajes" (lista)
8. Frontend: flujo "Nuevo Viaje"
9. Frontend: flujo "Iniciar Viaje" (modal grúa + agregar vehículos)
10. Frontend: flujo "Finalizar Viaje" (3 validaciones)
11. Frontend: pantalla de Usuarios (solo Admin)
12. Deploy en Railway o Render

---

*Fin del contexto — Sistema de Gestión de Viajes v1.0*
