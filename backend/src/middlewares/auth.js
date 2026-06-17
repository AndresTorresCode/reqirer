'use strict';

/**
 * Middleware de autenticacion (RNF-09). Verifica el token JWT enviado en el
 * encabezado Authorization: Bearer <token> y adjunta el usuario a req.user.
 */
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('../utils/AppError');

function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Token no proporcionado'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    // RN-12: un usuario sin rol activo no puede ejecutar acciones.
    if (!Array.isArray(payload.roles) || payload.roles.length === 0) {
      return next(AppError.forbidden('El usuario no tiene roles activos asignados'));
    }
    req.user = {
      id: payload.sub,
      nombre: payload.nombre,
      correo: payload.correo,
      roles: payload.roles,
    };
    return next();
  } catch (err) {
    return next(AppError.unauthorized('Token invalido o expirado'));
  }
}

module.exports = authenticate;
