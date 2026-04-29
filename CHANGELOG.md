# CHANGELOG — Sistema de Gestión de Viajes

---

## [2026.0.1] — 2026-04-29

### Resumen
Versión de mejoras mayores: módulo de tanqueos integrado en el detalle de viaje, tipos de viaje (Urbano/Nacional), validación estricta de placas, prevención de placas de grúa en vehículos transportados, autocomplete de marcas y selector de colores en todos los formularios, rediseño visual completo con identidad de empresa.

---

### BACKEND

#### 🆕 Nuevo: Módulo de Tanqueos (`backend/models/tanqueo.py`, `backend/routers/tanqueos.py`)
- Modelo `Tanqueo` con campos: `id`, `empresa_id`, `viaje_id` (FK con CASCADE), `registrado_por`, `monto` (DECIMAL, obligatorio), `foto_filename`, `observacion`, `creado_en`.
- Endpoint `GET /viajes/{id}/tanqueos` — lista los tanqueos del viaje.
- Endpoint `POST /viajes/{id}/tanqueos` — registra un tanqueo con foto (multipart/form-data).
  - La **foto del recibo es obligatoria** (devuelve 400 si no se envía).
  - Solo se puede registrar si el viaje está en estado `EN_CURSO` o `PENDIENTE_ACEPTAR`.
- Endpoint `DELETE /viajes/{id}/tanqueos/{tanqueo_id}` — elimina un registro. Solo puede eliminar el propio registrador o usuarios con `perm_ver_todos_viajes`.
- Tabla `tanqueos` añadida al schema de migraciones (`backend/migrations/schema.sql`).

#### 🔒 Validación de Placas (`backend/routers/vehiculos.py`, `backend/routers/gruas.py`)
- Formato estándar obligatorio: **exactamente 6 caracteres alfanuméricos, sin guiones ni símbolos** (ejemplo: `DQN228`).
- Validación aplicada en backend para vehículos Y grúas con regex `^[A-Z0-9]{6}$`.
- Nueva validación: **no se puede usar la placa de una grúa como vehículo transportado**. Si se intenta, el backend devuelve error `409` con tipo `placa_es_grua`.

#### 👤 Empresa en sesión de usuario (`backend/routers/auth.py`, `backend/schemas/auth.py`)
- El endpoint `GET /auth/me` ahora carga y devuelve el campo `empresa_nombre` desde la tabla `empresas`.
- Añadido campo `empresa_nombre: str` al schema `UsuarioMe`.

#### 🗺️ Tipos de Viaje (`backend/schemas/viaje.py`, `backend/models/viaje.py`, `backend/routers/viajes.py`)
- Soporte completo para `tipo_viaje`: valores `URBANO` y `NACIONAL`.
- El campo se expone en la respuesta del viaje y se persiste en base de datos.

---

### FRONTEND

#### 🆕 Componentes nuevos

| Componente | Descripción |
|---|---|
| `AppHeader.jsx` | Header reutilizable con franja de identidad de empresa (gradiente azul + nombre + emoji 🚛) y fila de navegación con soporte para botón "← Volver" y acciones a la derecha. |
| `Watermark.jsx` | Marca de agua fija sobre toda la pantalla con el nombre de la empresa rotado en diagonal. Tres capas: central grande + dos secundarias arriba/abajo. `pointer-events-none`, no interfiere con la UI. |
| `BottomNav.jsx` | Barra de navegación inferior fija (estilo móvil). Tabs: **Viajes** · **Grúas** (si tiene permiso) · **Usuarios** (si tiene permiso) · **Salir**. Resalta la pestaña activa con fondo azul. Reemplaza los iconos del header para evitar saturación en móvil. |
| `SelectorCiudad.jsx` | Autocomplete de ciudades colombianas para viajes tipo Nacional. Búsqueda por nombre con dropdown de sugerencias. |

#### 🎨 Rediseño visual completo (`frontend/src/index.css`)
- **Botones** (`btn-primary`, `btn-secondary`): gradiente azul, `rounded-2xl`, sombra azul suave.
- **Inputs** (`input`): borde 2px gris, `rounded-2xl`, transición a borde azul en foco.
- **Cards** (`card`): `rounded-3xl`, sombra suave, fondo blanco.
- **Cards de viaje** (`card-trip`): borde izquierdo de color según estado, hover/active con escala suave.
- **Badges** actualizados con colores y bordes redondeados.

#### 🏷️ BadgeEstado rediseñado (`frontend/src/components/BadgeEstado.jsx`)
Cada estado del viaje tiene ícono y color diferenciado:

| Estado | Ícono | Color |
|---|---|---|
| NO_INICIADO | 🕐 | Ámbar |
| PROGRAMADO | 📅 | Índigo |
| PENDIENTE_ACEPTAR | ⏳ | Naranja |
| EN_CURSO | 🟢 | Esmeralda |
| FINALIZADO | ✅ | Gris azulado |
| CANCELADO | ❌ | Rojo suave |

#### 🚗 FormVehiculo mejorado (`frontend/src/components/FormVehiculo.jsx`)
- Autocomplete de **marcas** con lista de ~80 marcas colombianas más comunes.
- Selector **dropdown de colores** estandarizados (15 colores).
- Contador de placa **X/6** con color verde al completar y naranja si incompleto.
- Detección del error `placa_es_grua` con mensaje amigable al usuario.

#### 📋 Páginas actualizadas con branding de empresa

Todas las páginas del sistema ahora incluyen `<AppHeader>` y `<Watermark>`:

| Página | Cambios |
|---|---|
| **Viajes (MisViajes)** | Título dinámico "Viajes" para admin / "Mis Viajes" para operadores. Cards rediseñadas con borde de color por estado, iconos de origen/destino, FAB reposicionado sobre BottomNav. |
| **Grúas** | AppHeader + Watermark + BottomNav. |
| **Usuarios** | AppHeader + Watermark + BottomNav. |
| **Detalle de Viaje** | AppHeader con código de viaje y badge de estado. Sección de tanqueos integrada (ver abajo). Badge de tipo de viaje (🏙️ Urbano / 🗺️ Nacional). |
| **Detalle de Grúa** | AppHeader con placa como título y badge activa/inactiva. Formulario con MarcaInput + selector de color. |
| **Nueva Grúa** | AppHeader + Watermark. Campos con autocomplete de marca y dropdown de color. |
| **Nuevo Viaje** | AppHeader + Watermark. Selector de tipo de viaje (toggle Urbano/Nacional). Origen/destino dinámico: texto libre (Urbano) o SelectorCiudad (Nacional). |
| **Programar Viaje** | AppHeader + Watermark. Mismo selector de tipo + SelectorCiudad. |

#### ⛽ Tanqueos integrados en Detalle de Viaje (`frontend/src/pages/DetalleViaje.jsx`)
- Sección "⛽ Tanqueos" visible cuando el viaje está `EN_CURSO`, `PENDIENTE_ACEPTAR` o `FINALIZADO`.
- Modal para registrar tanqueo con campos: monto (obligatorio), observación y foto del recibo (**foto obligatoria**).
- Preview de foto antes de guardar, con botón para eliminar y re-seleccionar.
- Lista de tanqueos con foto miniatura (enlace a imagen completa), monto en bold, observación, nombre del registrador y fecha.
- Total acumulado de tanqueos mostrado en el encabezado de la sección.
- Botón eliminar tanqueo disponible solo para administradores (`perm_ver_todos_viajes`) mientras el viaje esté activo.
- Cliente API correspondiente: `frontend/src/api/tanqueos.js`.

#### 🔡 Utilidades de placa (`frontend/src/utils/formato.js`)
- `normalizarPlaca(val)` — convierte a mayúsculas, elimina caracteres inválidos, limita a 6 chars.
- `placaValida(val)` — valida formato `^[A-Z0-9]{6}$`.
- Aplicado en tiempo real al escribir en todos los campos de placa del sistema.

#### 📁 Datos estáticos nuevos (`frontend/src/data/`)
- `marcasCarros.js` — lista de marcas de vehículos comunes en Colombia.
- `coloresCarros.js` — lista de colores estandarizados para vehículos.
- `ciudadesColombia.js` — lista de ciudades de Colombia para el SelectorCiudad.

---

### Archivos creados
```
backend/models/tanqueo.py
backend/routers/tanqueos.py
frontend/src/api/tanqueos.js
frontend/src/components/AppHeader.jsx
frontend/src/components/BottomNav.jsx
frontend/src/components/SelectorCiudad.jsx
frontend/src/components/Watermark.jsx
frontend/src/data/marcasCarros.js
frontend/src/data/coloresCarros.js
frontend/src/data/ciudadesColombia.js
CHANGELOG.md
```

### Archivos modificados
```
backend/main.py
backend/migrations/schema.sql
backend/models/viaje.py
backend/routers/auth.py
backend/routers/gruas.py
backend/routers/vehiculos.py
backend/routers/viajes.py
backend/schemas/auth.py
backend/schemas/viaje.py
frontend/src/components/BadgeEstado.jsx
frontend/src/components/FormVehiculo.jsx
frontend/src/index.css
frontend/src/pages/DetalleGrua.jsx
frontend/src/pages/DetalleViaje.jsx
frontend/src/pages/Gruas.jsx
frontend/src/pages/MisViajes.jsx
frontend/src/pages/NuevoViaje.jsx
frontend/src/pages/ProgramarViaje.jsx
frontend/src/pages/Usuarios.jsx
frontend/src/utils/formato.js
```

---

## [2026.0.0] — versión base

- Sistema inicial de gestión de viajes.
- Módulo de grúas, viajes, usuarios y roles.
- Viajes programados, validaciones base y flujo completo de estados.
