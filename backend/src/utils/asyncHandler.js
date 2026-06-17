'use strict';

/**
 * Envuelve un controlador asincrono y reenvia cualquier error al
 * middleware central de manejo de errores, evitando repetir try/catch.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
