'use strict';

/**
 * Carga los catalogos del proceso y datos de demostracion.
 * Uso: npm run db:seed   (requiere haber corrido db:init antes)
 *
 * Catalogos sembrados (coherentes con la Fase 1 y Fase 2):
 *   - 4 roles internos (Tabla 11)
 *   - 4 tipos de requerimiento (RF-04)
 *   - 3 niveles de prioridad (RF-05)
 *   - 6 estados del flujo (Tabla 12)
 *   - 6 transiciones permitidas (Tabla 13)
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const ROLES = [
  { codigo: 'registrador', nombre: 'Usuario interno solicitante o registrador', permisos: 'Consultar proyectos, registrar requerimientos y aportar observaciones de seguimiento.' },
  { codigo: 'lider', nombre: 'Lider de desarrollo o responsable de priorizacion', permisos: 'Revisar requerimientos, ajustar prioridad, asignar responsable y aprobar para desarrollo.' },
  { codigo: 'desarrollador', nombre: 'Responsable tecnico o desarrollador', permisos: 'Actualizar estado, registrar observaciones de avance y reportar ajustes.' },
  { codigo: 'validador', nombre: 'Rol de validacion o revision', permisos: 'Registrar validacion funcional, observacion de cierre y evidencia asociada.' },
];

const TIPOS = [
  { codigo: 'incidencia', nombre: 'Incidencia', descripcion: 'Error reportado sobre algo que ya funcionaba.' },
  { codigo: 'ajuste', nombre: 'Ajuste', descripcion: 'Cambio sobre una funcionalidad existente.' },
  { codigo: 'mejora', nombre: 'Mejora', descripcion: 'Optimizacion o valor agregado opcional.' },
  { codigo: 'nueva_funcionalidad', nombre: 'Nueva funcionalidad', descripcion: 'Capacidad nueva no existente antes.' },
];

const PRIORIDADES = [
  { codigo: 'alta', nombre: 'Alta', orden: 1 },
  { codigo: 'media', nombre: 'Media', orden: 2 },
  { codigo: 'baja', nombre: 'Baja', orden: 3 },
];

const ESTADOS = [
  { codigo: 'registrado', nombre: 'Registrado', orden: 1, final: false },
  { codigo: 'en_analisis', nombre: 'En analisis', orden: 2, final: false },
  { codigo: 'aprobado', nombre: 'Aprobado', orden: 3, final: false },
  { codigo: 'en_desarrollo', nombre: 'En desarrollo', orden: 4, final: false },
  { codigo: 'en_pruebas', nombre: 'En pruebas', orden: 5, final: false },
  { codigo: 'cerrado', nombre: 'Cerrado', orden: 6, final: true },
];

// Transiciones permitidas (Tabla 13). roles indica quien puede ejecutarlas.
const TRANSICIONES = [
  { origen: 'registrado', destino: 'en_analisis', condicion: 'La solicitud cuenta con informacion minima para revision.', roles: ['lider', 'registrador'] },
  { origen: 'en_analisis', destino: 'aprobado', condicion: 'El lider confirma que el requerimiento puede atenderse.', roles: ['lider'] },
  { origen: 'aprobado', destino: 'en_desarrollo', condicion: 'Existe un responsable asignado.', roles: ['lider', 'desarrollador'] },
  { origen: 'en_desarrollo', destino: 'en_pruebas', condicion: 'El responsable reporta avance suficiente para revision.', roles: ['lider', 'desarrollador'] },
  { origen: 'en_pruebas', destino: 'en_desarrollo', condicion: 'La validacion encuentra ajustes; queda registrada una observacion.', roles: ['lider', 'validador'] },
  { origen: 'en_pruebas', destino: 'cerrado', condicion: 'La validacion funcional se acepta y queda evidencia registrada.', roles: ['lider', 'validador'] },
];

const PASSWORD_DEMO = 'Dexter2026*';

const USUARIOS = [
  { nombre: 'Andres Torres Cadena', correo: 'andres@dexterlatam.com', roles: ['registrador', 'lider', 'desarrollador', 'validador'] },
  { nombre: 'Jessica Dussan', correo: 'jessica@dexterlatam.com', roles: ['registrador'] },
  { nombre: 'Laura Gomez', correo: 'lider@dexterlatam.com', roles: ['lider'] },
  { nombre: 'Carlos Medina', correo: 'dev@dexterlatam.com', roles: ['desarrollador'] },
  { nombre: 'Paula Rios', correo: 'qa@dexterlatam.com', roles: ['validador'] },
];

const PROYECTOS = [
  { nombre: 'Portal de Clientes Acme', cliente: 'Acme S.A.', descripcion: 'Portal transaccional para clientes de Acme.', soporte: true },
  { nombre: 'App Logistica Transcol', cliente: 'Transcol Ltda.', descripcion: 'Aplicacion de seguimiento de envios.', soporte: false },
  { nombre: 'Sitio Web Corporativo Dexter', cliente: 'Interno Dexter', descripcion: 'Sitio institucional de la empresa.', soporte: false },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Limpieza idempotente de datos (respeta dependencias via TRUNCATE CASCADE).
    await client.query(`TRUNCATE
      sugerencia_automatica, evidencia, observacion, historial_cambio,
      requerimiento, transicion_estado, estado_requerimiento, prioridad,
      tipo_requerimiento, usuario_rol, usuario, rol, proyecto
      RESTART IDENTITY CASCADE`);

    // --- Roles ---
    const rolId = {};
    for (const r of ROLES) {
      const { rows } = await client.query(
        'INSERT INTO rol (codigo, nombre_rol, permisos_basicos) VALUES ($1,$2,$3) RETURNING id_rol',
        [r.codigo, r.nombre, r.permisos]
      );
      rolId[r.codigo] = rows[0].id_rol;
    }

    // --- Catalogos ---
    const tipoId = {};
    for (const t of TIPOS) {
      const { rows } = await client.query(
        'INSERT INTO tipo_requerimiento (codigo, nombre_tipo, descripcion) VALUES ($1,$2,$3) RETURNING id_tipo',
        [t.codigo, t.nombre, t.descripcion]
      );
      tipoId[t.codigo] = rows[0].id_tipo;
    }

    const prioridadId = {};
    for (const p of PRIORIDADES) {
      const { rows } = await client.query(
        'INSERT INTO prioridad (codigo, nombre_prioridad, orden) VALUES ($1,$2,$3) RETURNING id_prioridad',
        [p.codigo, p.nombre, p.orden]
      );
      prioridadId[p.codigo] = rows[0].id_prioridad;
    }

    const estadoId = {};
    for (const e of ESTADOS) {
      const { rows } = await client.query(
        'INSERT INTO estado_requerimiento (codigo, nombre_estado, orden_flujo, es_final) VALUES ($1,$2,$3,$4) RETURNING id_estado',
        [e.codigo, e.nombre, e.orden, e.final]
      );
      estadoId[e.codigo] = rows[0].id_estado;
    }

    // --- Transiciones ---
    for (const tr of TRANSICIONES) {
      await client.query(
        `INSERT INTO transicion_estado (id_estado_origen, id_estado_destino, condicion, roles_autorizados)
         VALUES ($1,$2,$3,$4)`,
        [estadoId[tr.origen], estadoId[tr.destino], tr.condicion, tr.roles]
      );
    }

    // --- Usuarios ---
    const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
    const usuarioId = {};
    for (const u of USUARIOS) {
      const { rows } = await client.query(
        'INSERT INTO usuario (nombre, correo, password_hash) VALUES ($1,$2,$3) RETURNING id_usuario',
        [u.nombre, u.correo, passwordHash]
      );
      usuarioId[u.correo] = rows[0].id_usuario;
      for (const rc of u.roles) {
        await client.query(
          'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1,$2)',
          [rows[0].id_usuario, rolId[rc]]
        );
      }
    }

    // --- Proyectos ---
    const proyectoId = [];
    for (const p of PROYECTOS) {
      const { rows } = await client.query(
        'INSERT INTO proyecto (nombre, cliente_referencia, descripcion, soporte_prioritario) VALUES ($1,$2,$3,$4) RETURNING id_proyecto',
        [p.nombre, p.cliente, p.descripcion, p.soporte]
      );
      proyectoId.push(rows[0].id_proyecto);
    }

    // --- Requerimientos de demostracion ---
    const creador = usuarioId['jessica@dexterlatam.com'];
    const responsableDev = usuarioId['dev@dexterlatam.com'];
    const demoReqs = [
      { proy: 0, desc: 'El boton de guardar no responde en el formulario de pedidos.', sol: 'Cliente Acme', tipo: 'incidencia', prio: 'alta', estado: 'registrado', resp: null },
      { proy: 0, desc: 'Cambiar la etiqueta del campo NIT por Documento en el registro.', sol: 'Cliente Acme', tipo: 'ajuste', prio: 'media', estado: 'en_analisis', resp: null },
      { proy: 1, desc: 'Agregar exportacion a Excel del listado de envios.', sol: 'Operaciones Transcol', tipo: 'nueva_funcionalidad', prio: 'media', estado: 'aprobado', resp: responsableDev },
      { proy: 1, desc: 'La pantalla de rastreo carga lenta cuando hay muchos envios.', sol: 'Soporte Transcol', tipo: 'incidencia', prio: 'alta', estado: 'en_desarrollo', resp: responsableDev },
      { proy: 2, desc: 'Seria bueno mostrar testimonios de clientes en la pagina de inicio.', sol: 'Mercadeo Dexter', tipo: 'mejora', prio: 'baja', estado: 'en_pruebas', resp: responsableDev },
    ];

    let consecutivo = 1;
    for (const dr of demoReqs) {
      const codigo = `REQ-${String(consecutivo).padStart(4, '0')}`;
      const { rows } = await client.query(
        `INSERT INTO requerimiento
          (codigo, id_proyecto, descripcion, solicitante, id_tipo, id_prioridad, id_estado, id_responsable, id_creador)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_requerimiento`,
        [
          codigo,
          proyectoId[dr.proy],
          dr.desc,
          dr.sol,
          tipoId[dr.tipo],
          prioridadId[dr.prio],
          estadoId[dr.estado],
          dr.resp,
          creador,
        ]
      );
      await client.query(
        `INSERT INTO historial_cambio (id_requerimiento, campo_modificado, valor_anterior, valor_nuevo, id_usuario, rol_ejecucion)
         VALUES ($1, 'creacion', NULL, $2, $3, 'registrador')`,
        [rows[0].id_requerimiento, `Requerimiento ${codigo} creado en estado ${dr.estado}`, creador]
      );
      consecutivo += 1;
    }

    await client.query('COMMIT');
    // eslint-disable-next-line no-console
    console.log('[db] Datos de demostracion cargados correctamente.');
    // eslint-disable-next-line no-console
    console.log(`[db] Usuarios demo (clave comun: ${PASSWORD_DEMO}):`);
    USUARIOS.forEach((u) => console.log(`      - ${u.correo} -> ${u.roles.join(', ')}`));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[db] Error al sembrar datos:', err.message);
      process.exit(1);
    });
}

module.exports = seed;
