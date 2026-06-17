'use strict';

/**
 * Servicio de catalogos. Expone los valores controlados del proceso
 * (tipos, prioridades, estados, roles) y las transiciones permitidas.
 * Centralizar los catalogos apoya la integridad (RNF-03) y la escalabilidad
 * (RNF-07): agregar un nuevo tipo o estado no exige tocar el codigo.
 */
const db = require('../config/db');

async function listarTipos() {
  const { rows } = await db.query(
    'SELECT id_tipo, codigo, nombre_tipo, descripcion FROM tipo_requerimiento ORDER BY id_tipo'
  );
  return rows;
}

async function listarPrioridades() {
  const { rows } = await db.query(
    'SELECT id_prioridad, codigo, nombre_prioridad, orden FROM prioridad ORDER BY orden'
  );
  return rows;
}

async function listarEstados() {
  const { rows } = await db.query(
    'SELECT id_estado, codigo, nombre_estado, orden_flujo, es_final FROM estado_requerimiento ORDER BY orden_flujo'
  );
  return rows;
}

async function listarRoles() {
  const { rows } = await db.query(
    'SELECT id_rol, codigo, nombre_rol, permisos_basicos FROM rol ORDER BY id_rol'
  );
  return rows;
}

async function listarTransiciones() {
  const { rows } = await db.query(
    `SELECT t.id_transicion,
            eo.codigo AS origen, eo.nombre_estado AS origen_nombre,
            ed.codigo AS destino, ed.nombre_estado AS destino_nombre,
            t.condicion, t.roles_autorizados
       FROM transicion_estado t
       JOIN estado_requerimiento eo ON eo.id_estado = t.id_estado_origen
       JOIN estado_requerimiento ed ON ed.id_estado = t.id_estado_destino
      ORDER BY eo.orden_flujo, ed.orden_flujo`
  );
  return rows;
}

async function obtenerTodos() {
  const [tipos, prioridades, estados, roles, transiciones] = await Promise.all([
    listarTipos(),
    listarPrioridades(),
    listarEstados(),
    listarRoles(),
    listarTransiciones(),
  ]);
  return { tipos, prioridades, estados, roles, transiciones };
}

module.exports = {
  listarTipos,
  listarPrioridades,
  listarEstados,
  listarRoles,
  listarTransiciones,
  obtenerTodos,
};
