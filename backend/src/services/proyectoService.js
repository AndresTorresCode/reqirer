'use strict';

/**
 * Servicio de proyectos (RF-01 crear, RF-02 consultar).
 * El proyecto es el contenedor obligatorio de todo requerimiento (RN-01).
 */
const db = require('../config/db');
const AppError = require('../utils/AppError');

async function listar({ q, estado } = {}) {
  const condiciones = [];
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    condiciones.push(`(p.nombre ILIKE $${params.length} OR p.cliente_referencia ILIKE $${params.length})`);
  }
  if (estado) {
    params.push(estado);
    condiciones.push(`p.estado = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT p.id_proyecto, p.nombre, p.cliente_referencia, p.descripcion,
            p.estado, p.soporte_prioritario, p.fecha_creacion,
            COUNT(r.id_requerimiento)::int AS total_requerimientos
       FROM proyecto p
       LEFT JOIN requerimiento r ON r.id_proyecto = p.id_proyecto
       ${where}
      GROUP BY p.id_proyecto
      ORDER BY p.nombre`,
    params
  );
  return rows;
}

async function obtenerPorId(id) {
  const { rows } = await db.query(
    `SELECT id_proyecto, nombre, cliente_referencia, descripcion, estado,
            soporte_prioritario, fecha_creacion
       FROM proyecto WHERE id_proyecto = $1`,
    [id]
  );
  if (!rows[0]) {
    throw AppError.notFound('Proyecto no encontrado');
  }
  return rows[0];
}

async function crear({ nombre, cliente_referencia, descripcion, soporte_prioritario }) {
  if (!nombre || !nombre.trim()) {
    throw AppError.unprocessable('El nombre del proyecto es obligatorio');
  }
  const { rows } = await db.query(
    `INSERT INTO proyecto (nombre, cliente_referencia, descripcion, soporte_prioritario)
     VALUES ($1, $2, $3, COALESCE($4, false))
     RETURNING id_proyecto, nombre, cliente_referencia, descripcion, estado,
               soporte_prioritario, fecha_creacion`,
    [nombre.trim(), cliente_referencia || null, descripcion || null, soporte_prioritario]
  );
  return rows[0];
}

async function actualizar(id, { nombre, cliente_referencia, descripcion, estado, soporte_prioritario }) {
  await obtenerPorId(id); // valida existencia
  const { rows } = await db.query(
    `UPDATE proyecto
        SET nombre = COALESCE($2, nombre),
            cliente_referencia = COALESCE($3, cliente_referencia),
            descripcion = COALESCE($4, descripcion),
            estado = COALESCE($5, estado),
            soporte_prioritario = COALESCE($6, soporte_prioritario)
      WHERE id_proyecto = $1
      RETURNING id_proyecto, nombre, cliente_referencia, descripcion, estado,
                soporte_prioritario, fecha_creacion`,
    [id, nombre, cliente_referencia, descripcion, estado, soporte_prioritario]
  );
  return rows[0];
}

module.exports = { listar, obtenerPorId, crear, actualizar };
