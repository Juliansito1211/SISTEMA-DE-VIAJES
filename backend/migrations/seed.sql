-- Sistema de Gestión de Viajes — Seed inicial
-- Inserta: empresa de ejemplo, 3 roles por defecto y configuración inicial.
-- El usuario Admin se crea desde la app usando las variables ADMIN_EMAIL / ADMIN_PASSWORD.

-- ─────────────────────────────────────────────
-- Empresa inicial
-- ─────────────────────────────────────────────
INSERT INTO empresas (id, nombre, ruc, activa)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Mi Empresa de Grúas',
    NULL,
    TRUE
);

-- ─────────────────────────────────────────────
-- Configuración inicial de la empresa
-- ─────────────────────────────────────────────
INSERT INTO configuracion (empresa_id, foto_recibo_obligatoria, metodos_pago_habilitados)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    FALSE,
    'EFECTIVO,TRANSFERENCIA,TARJETA,OTRO'
);

-- ─────────────────────────────────────────────
-- Roles por defecto
-- ─────────────────────────────────────────────

-- Nivel 1: Operador
-- Puede crear, iniciar, editar (activo) y finalizar viajes; agregar y editar vehículos.
-- No puede ver viajes de otros, ni editar/reabrir finalizados, ni gestionar usuarios/sistema.
INSERT INTO roles (
    empresa_id, nombre, nivel,
    perm_crear_viaje,
    perm_iniciar_viaje,
    perm_editar_viaje_activo,
    perm_finalizar_viaje,
    perm_editar_viaje_finalizado,
    perm_reabrir_viaje,
    perm_ver_todos_viajes,
    perm_agregar_vehiculo,
    perm_editar_vehiculo,
    perm_crear_usuarios,
    perm_gestionar_roles,
    perm_gestionar_gruas,
    perm_ver_auditoria,
    perm_configuracion
) VALUES (
    '00000000-0000-0000-0000-000000000001', 'Operador', 1,
    TRUE,   -- perm_crear_viaje
    TRUE,   -- perm_iniciar_viaje
    TRUE,   -- perm_editar_viaje_activo
    TRUE,   -- perm_finalizar_viaje
    FALSE,  -- perm_editar_viaje_finalizado
    FALSE,  -- perm_reabrir_viaje
    FALSE,  -- perm_ver_todos_viajes
    TRUE,   -- perm_agregar_vehiculo
    TRUE,   -- perm_editar_vehiculo
    FALSE,  -- perm_crear_usuarios
    FALSE,  -- perm_gestionar_roles
    FALSE,  -- perm_gestionar_gruas
    FALSE,  -- perm_ver_auditoria
    FALSE   -- perm_configuracion
);

-- Nivel 2: Supervisor
-- Todo lo del Operador, más: ver todos los viajes, editar/reabrir finalizados, ver auditoría.
INSERT INTO roles (
    empresa_id, nombre, nivel,
    perm_crear_viaje,
    perm_iniciar_viaje,
    perm_editar_viaje_activo,
    perm_finalizar_viaje,
    perm_editar_viaje_finalizado,
    perm_reabrir_viaje,
    perm_ver_todos_viajes,
    perm_agregar_vehiculo,
    perm_editar_vehiculo,
    perm_crear_usuarios,
    perm_gestionar_roles,
    perm_gestionar_gruas,
    perm_ver_auditoria,
    perm_configuracion
) VALUES (
    '00000000-0000-0000-0000-000000000001', 'Supervisor', 2,
    TRUE,   -- perm_crear_viaje
    TRUE,   -- perm_iniciar_viaje
    TRUE,   -- perm_editar_viaje_activo
    TRUE,   -- perm_finalizar_viaje
    TRUE,   -- perm_editar_viaje_finalizado
    TRUE,   -- perm_reabrir_viaje
    TRUE,   -- perm_ver_todos_viajes
    TRUE,   -- perm_agregar_vehiculo
    TRUE,   -- perm_editar_vehiculo
    FALSE,  -- perm_crear_usuarios
    FALSE,  -- perm_gestionar_roles
    FALSE,  -- perm_gestionar_gruas
    TRUE,   -- perm_ver_auditoria
    FALSE   -- perm_configuracion
);

-- Nivel 3: Admin
-- Acceso total a todos los módulos.
INSERT INTO roles (
    empresa_id, nombre, nivel,
    perm_crear_viaje,
    perm_iniciar_viaje,
    perm_editar_viaje_activo,
    perm_finalizar_viaje,
    perm_editar_viaje_finalizado,
    perm_reabrir_viaje,
    perm_ver_todos_viajes,
    perm_agregar_vehiculo,
    perm_editar_vehiculo,
    perm_crear_usuarios,
    perm_gestionar_roles,
    perm_gestionar_gruas,
    perm_ver_auditoria,
    perm_configuracion
) VALUES (
    '00000000-0000-0000-0000-000000000001', 'Admin', 3,
    TRUE,   -- perm_crear_viaje
    TRUE,   -- perm_iniciar_viaje
    TRUE,   -- perm_editar_viaje_activo
    TRUE,   -- perm_finalizar_viaje
    TRUE,   -- perm_editar_viaje_finalizado
    TRUE,   -- perm_reabrir_viaje
    TRUE,   -- perm_ver_todos_viajes
    TRUE,   -- perm_agregar_vehiculo
    TRUE,   -- perm_editar_vehiculo
    TRUE,   -- perm_crear_usuarios
    TRUE,   -- perm_gestionar_roles
    TRUE,   -- perm_gestionar_gruas
    TRUE,   -- perm_ver_auditoria
    TRUE    -- perm_configuracion
);
