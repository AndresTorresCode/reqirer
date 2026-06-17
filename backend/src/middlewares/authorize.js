'use strict';

/**
 * Middleware de autorizacion por rol interno (RNF-08). Recibe la lista de
 * roles habilitados para la accion y verifica que el usuario tenga al menos
 * uno de ellos. Debe usarse despues de authenticate.
 *
 * @param {...string} rolesPermitidos - codigos de rol habilitados
 */
const AppError = require('../utils/AppError');

function authorize(...rolesPermitidos) {
  return function check(req, _res, next) {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    const tieneRol = req.user.roles.some((r) => rolesPermitidos.includes(r));
    if (!tieneRol) {
      return next(
        AppError.forbidden(
          `Esta accion requiere uno de los roles: ${rolesPermitidos.join(', ')}`
        )
      );
    }
    return next();
  };
}

module.exports = authorize;
