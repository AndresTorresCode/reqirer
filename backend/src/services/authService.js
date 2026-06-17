'use strict';

/**
 * Servicio de autenticacion (RNF-09). Valida credenciales contra la tabla
 * usuario y emite un token JWT que transporta los roles del usuario para el
 * control de acceso (RNF-08).
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Recupera un usuario con sus roles a partir del correo.
 */
async function obtenerUsuarioPorCorreo(correo) {
  const { rows } = await db.query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.password_hash, u.estado,
            COALESCE(ARRAY_AGG(r.codigo) FILTER (WHERE r.codigo IS NOT NULL), '{}') AS roles
       FROM usuario u
       LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
       LEFT JOIN rol r          ON r.id_rol = ur.id_rol
      WHERE LOWER(u.correo) = LOWER($1)
      GROUP BY u.id_usuario`,
    [correo]
  );
  return rows[0] || null;
}

/**
 * Verifica credenciales y devuelve { token, usuario }.
 */
async function login(correo, password) {
  if (!correo || !password) {
    throw AppError.badRequest('Correo y contrasena son obligatorios');
  }

  const usuario = await obtenerUsuarioPorCorreo(correo);
  if (!usuario) {
    throw AppError.unauthorized('Credenciales invalidas');
  }
  if (usuario.estado !== 'activo') {
    throw AppError.forbidden('El usuario se encuentra inactivo');
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordOk) {
    throw AppError.unauthorized('Credenciales invalidas');
  }

  // RN-12: un usuario sin rol activo no puede operar el modulo.
  if (!usuario.roles || usuario.roles.length === 0) {
    throw AppError.forbidden('El usuario no tiene roles asignados');
  }

  const payload = {
    sub: usuario.id_usuario,
    nombre: usuario.nombre,
    correo: usuario.correo,
    roles: usuario.roles,
  };
  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  return {
    token,
    usuario: {
      id: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      roles: usuario.roles,
    },
  };
}

module.exports = { login, obtenerUsuarioPorCorreo };
