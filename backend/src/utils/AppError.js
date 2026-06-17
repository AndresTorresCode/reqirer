'use strict';

/**
 * Error de aplicacion con codigo HTTP asociado. Permite que los servicios
 * lancen errores de negocio (por ejemplo, una transicion no permitida) y
 * que el middleware central los traduzca a respuestas HTTP coherentes.
 */
class AppError extends Error {
  /**
   * @param {number} statusCode - codigo HTTP (400, 403, 404, 409, 422...)
   * @param {string} message - mensaje legible para el usuario interno
   * @param {string} [code] - codigo corto opcional para el frontend
   */
  constructor(statusCode, message, code) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code || null;
    this.isOperational = true;
  }

  static badRequest(message, code) {
    return new AppError(400, message, code);
  }

  static unauthorized(message = 'No autenticado', code) {
    return new AppError(401, message, code);
  }

  static forbidden(message = 'No autorizado para esta accion', code) {
    return new AppError(403, message, code);
  }

  static notFound(message = 'Recurso no encontrado', code) {
    return new AppError(404, message, code);
  }

  static conflict(message, code) {
    return new AppError(409, message, code);
  }

  static unprocessable(message, code) {
    return new AppError(422, message, code);
  }
}

module.exports = AppError;
