'use strict';

/**
 * Servicio de usuarios. Permite listar a los actores internos (por ejemplo,
 * para asignar un responsable, RF-06) sin exponer datos sensibles como el
 * hash de contrasena.
 */
const db = require('../config/db');

async function listar({ rol } = {}) {
  const params = [];
  let where = "WHERE u.estado = 'activo'";
  if (rol) {
    params.push(rol);
    where += ` AND EXISTS (
      SELECT 1 FROM usuario_rol ur2
      JOIN rol r2 ON r2.id_rol = ur2.id_rol
      WHERE ur2.id_usuario = u.id_usuario AND r2.codigo = $${params.length})`;
  }

  const { rows } = await db.query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.estado,
            COALESCE(ARRAY_AGG(r.codigo) FILTER (WHERE r.codigo IS NOT NULL), '{}') AS roles
       FROM usuario u
       LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
       LEFT JOIN rol r          ON r.id_rol = ur.id_rol
       ${where}
      GROUP BY u.id_usuario
      ORDER BY u.nombre`,
    params
  );
  return rows;
}

module.exports = { listar };
