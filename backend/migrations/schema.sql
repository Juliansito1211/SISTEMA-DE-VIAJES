-- Sistema de Gestión de Viajes — Schema v1.0
-- Ejecutar en orden; las FK exigen que las tablas padre existan primero.

-- Extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. empresas
-- ─────────────────────────────────────────────
CREATE TABLE empresas (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     VARCHAR(150) NOT NULL,
    ruc        VARCHAR(20),
    activa     BOOLEAN DEFAULT TRUE,
    creado_en  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. roles
-- ─────────────────────────────────────────────
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    empresa_id  UUID NOT NULL REFERENCES empresas(id),
    nombre      VARCHAR(80) NOT NULL,
    nivel       INT NOT NULL,   -- 1=Operador, 2=Supervisor, 3=Admin

    -- Módulo: Viajes
    perm_crear_viaje              BOOLEAN DEFAULT FALSE,
    perm_iniciar_viaje            BOOLEAN DEFAULT FALSE,
    perm_editar_viaje_activo      BOOLEAN DEFAULT FALSE,
    perm_finalizar_viaje          BOOLEAN DEFAULT FALSE,
    perm_editar_viaje_finalizado  BOOLEAN DEFAULT FALSE,
    perm_reabrir_viaje            BOOLEAN DEFAULT FALSE,
    perm_ver_todos_viajes         BOOLEAN DEFAULT FALSE,

    -- Módulo: Vehículos
    perm_agregar_vehiculo         BOOLEAN DEFAULT FALSE,
    perm_editar_vehiculo          BOOLEAN DEFAULT FALSE,

    -- Módulo: Usuarios
    perm_crear_usuarios           BOOLEAN DEFAULT FALSE,
    perm_gestionar_roles          BOOLEAN DEFAULT FALSE,

    -- Módulo: Grúas
    perm_gestionar_gruas          BOOLEAN DEFAULT FALSE,

    -- Módulo: Sistema
    perm_ver_auditoria            BOOLEAN DEFAULT FALSE,
    perm_configuracion            BOOLEAN DEFAULT FALSE
);

-- ─────────────────────────────────────────────
-- 3. usuarios
-- ─────────────────────────────────────────────
CREATE TABLE usuarios (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id     UUID NOT NULL REFERENCES empresas(id),
    rol_id         INT NOT NULL REFERENCES roles(id),
    nombre         VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    activo         BOOLEAN DEFAULT TRUE,
    creado_en      TIMESTAMP DEFAULT NOW(),
    ultimo_login   TIMESTAMP
);

-- ─────────────────────────────────────────────
-- 4. configuracion
-- ─────────────────────────────────────────────
CREATE TABLE configuracion (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id                UUID NOT NULL UNIQUE REFERENCES empresas(id),
    foto_recibo_obligatoria   BOOLEAN DEFAULT FALSE,
    metodos_pago_habilitados  TEXT DEFAULT 'EFECTIVO,TRANSFERENCIA,TARJETA,OTRO',
    actualizado_en            TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 5. viajes
-- ─────────────────────────────────────────────
CREATE TABLE viajes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID NOT NULL REFERENCES empresas(id),
    creado_por    UUID NOT NULL REFERENCES usuarios(id),
    iniciado_por  UUID REFERENCES usuarios(id),

    -- Código legible (ej: CAL1, BOG3)
    codigo           VARCHAR(20) UNIQUE,
    observacion_grua TEXT,         -- observación al momento de iniciar (sobre la grúa)

    -- Datos de la grúa (vehículo transportador) — obligatorios al iniciar
    placa_grua    VARCHAR(20),
    marca_grua    VARCHAR(80),

    -- Datos del viaje — obligatorios al crear
    tipo_viaje    VARCHAR(10) DEFAULT 'NACIONAL'
                  CHECK (tipo_viaje IN ('URBANO', 'NACIONAL')),
    origen        VARCHAR(200) NOT NULL,
    destino       VARCHAR(200) NOT NULL,

    -- Conductor asignado al viaje (conductor de la grúa al momento de iniciar)
    conductor_id  UUID REFERENCES usuarios(id),

    -- Estado
    estado        VARCHAR(20) DEFAULT 'NO_INICIADO'
                  CHECK (estado IN ('NO_INICIADO', 'PROGRAMADO', 'PENDIENTE_ACEPTAR', 'EN_CURSO', 'FINALIZADO', 'CANCELADO')),

    -- Datos de cierre — se llenan al finalizar
    monto_total      DECIMAL(12,2),
    metodo_pago      VARCHAR(20)
                     CHECK (metodo_pago IN ('EFECTIVO','TRANSFERENCIA','TARJETA','OTRO')),
    foto_recibo_url  TEXT,

    -- Timestamps — NUNCA editables por el usuario; siempre los asigna el servidor
    creado_en       TIMESTAMP DEFAULT NOW(),
    programado_para TIMESTAMP,          -- fecha/hora programada (viajes agendados)
    iniciado_en     TIMESTAMP,
    finalizado_en   TIMESTAMP
);

-- ─────────────────────────────────────────────
-- 6. vehiculos_catalogo
-- ─────────────────────────────────────────────
CREATE TABLE vehiculos_catalogo (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id  UUID NOT NULL REFERENCES empresas(id),
    placa       VARCHAR(20) NOT NULL,
    marca       VARCHAR(80),
    modelo      VARCHAR(80),
    color       VARCHAR(40),
    creado_en   TIMESTAMP DEFAULT NOW(),
    UNIQUE (empresa_id, placa)
);

-- ─────────────────────────────────────────────
-- 7. viaje_vehiculos
-- ─────────────────────────────────────────────
CREATE TABLE viaje_vehiculos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_id     UUID NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
    vehiculo_id  UUID NOT NULL REFERENCES vehiculos_catalogo(id),
    monto        DECIMAL(12,2),   -- NULL si no se ingresó monto
    orden        INT NOT NULL,    -- orden en que fue agregado
    observacion  TEXT,            -- observación opcional sobre el vehículo
    agregado_en  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 8. auditoria  (append-only — nunca UPDATE/DELETE)
-- ─────────────────────────────────────────────
CREATE TABLE auditoria (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id     UUID NOT NULL REFERENCES empresas(id),
    viaje_id       UUID NOT NULL REFERENCES viajes(id),
    usuario_id     UUID NOT NULL REFERENCES usuarios(id),
    accion         VARCHAR(80) NOT NULL,   -- ej: 'EDITAR_VIAJE_FINALIZADO', 'REABRIR_VIAJE'
    datos_antes    JSONB,
    datos_despues  JSONB,
    realizado_en   TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Regla de base de datos que refuerza append-only en auditoria
CREATE RULE auditoria_no_update AS ON UPDATE TO auditoria DO INSTEAD NOTHING;
CREATE RULE auditoria_no_delete AS ON DELETE TO auditoria DO INSTEAD NOTHING;

-- ─────────────────────────────────────────────
-- 9. solicitudes_reabrir
-- ─────────────────────────────────────────────
CREATE TABLE solicitudes_reabrir (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID NOT NULL REFERENCES empresas(id),
    viaje_id        UUID NOT NULL REFERENCES viajes(id),
    solicitado_por  UUID NOT NULL REFERENCES usuarios(id),
    estado          VARCHAR(20) DEFAULT 'PENDIENTE'
                    CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    nota            TEXT,                           -- mensaje opcional del operador
    resuelto_por    UUID REFERENCES usuarios(id),
    creado_en       TIMESTAMP DEFAULT NOW() NOT NULL,
    resuelto_en     TIMESTAMP
);

CREATE INDEX idx_solicitudes_empresa_estado ON solicitudes_reabrir (empresa_id, estado);
CREATE INDEX idx_solicitudes_viaje          ON solicitudes_reabrir (viaje_id);

-- ─────────────────────────────────────────────
-- 10. gruas
-- ─────────────────────────────────────────────
CREATE TABLE gruas (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id                UUID NOT NULL REFERENCES empresas(id),
    placa                     VARCHAR(20) NOT NULL,
    marca                     VARCHAR(80) NOT NULL,
    modelo                    VARCHAR(80),
    color                     VARCHAR(40),
    foto_filename             TEXT,
    activa                    BOOLEAN DEFAULT TRUE,
    conductor_id              UUID REFERENCES usuarios(id),
    observacion_desasignacion TEXT,
    tecno_inicio              DATE,
    tecno_vence               DATE,
    soat_inicio               DATE,
    soat_vence                DATE,
    creado_en                 TIMESTAMP DEFAULT NOW(),
    UNIQUE (empresa_id, placa)
);

CREATE INDEX idx_gruas_empresa ON gruas (empresa_id);
CREATE INDEX idx_gruas_conductor ON gruas (conductor_id);

-- ─────────────────────────────────────────────
-- 12. fotos_vehiculo
-- ─────────────────────────────────────────────
CREATE TABLE fotos_vehiculo (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id        UUID NOT NULL REFERENCES empresas(id),
    viaje_vehiculo_id UUID NOT NULL REFERENCES viaje_vehiculos(id) ON DELETE CASCADE,
    filename          TEXT NOT NULL,
    creado_en         TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 13. fotos_grua
-- ─────────────────────────────────────────────
CREATE TABLE fotos_grua (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    viaje_id   UUID NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    creado_en  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 14. tanqueos
-- ─────────────────────────────────────────────
CREATE TABLE tanqueos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id     UUID NOT NULL REFERENCES empresas(id),
    viaje_id       UUID NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
    registrado_por UUID NOT NULL REFERENCES usuarios(id),
    monto          DECIMAL(12,2) NOT NULL,
    foto_filename  TEXT,
    observacion    TEXT,
    creado_en      TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_tanqueos_viaje ON tanqueos (viaje_id);

-- ─────────────────────────────────────────────
-- Índices de rendimiento
-- ─────────────────────────────────────────────
CREATE INDEX idx_viajes_empresa_id       ON viajes (empresa_id);
CREATE INDEX idx_viajes_creado_por       ON viajes (creado_por);
CREATE INDEX idx_viajes_estado           ON viajes (estado);
CREATE INDEX idx_viaje_vehiculos_viaje   ON viaje_vehiculos (viaje_id);
CREATE INDEX idx_auditoria_viaje_id      ON auditoria (viaje_id);
CREATE INDEX idx_auditoria_empresa_id    ON auditoria (empresa_id);
CREATE INDEX idx_vehiculos_empresa_placa ON vehiculos_catalogo (empresa_id, placa);
