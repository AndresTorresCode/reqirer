'use strict';

/**
 * Manejo centralizado de errores. Traduce AppError y errores conocidos de
 * PostgreSQL a respuestas HTTP claras (apoya RNF-01: mensajes comprensibles).
 */
const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Errores de negocio controlados.
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code || undefined,
    });
  }

  // Violaciones de integridad de PostgreSQL (RNF-03).
  if (err && err.code) {
    switch (err.code) {
      case '23503': // foreign_key_violation
        return res.status(422).json({
          error: 'Referencia invalida: el dato relacionado no existe.',
          code: 'FK_VIOLATION',
        });
      case '23505': // unique_violation
        return res.status(409).json({
          error: 'Ya existe un registro con ese valor unico.',
          code: 'UNIQUE_VIOLATION',
        });
      case '23502': // not_null_violation
        return res.status(422).json({
          error: `El campo "${err.column}" es obligatorio.`,
          code: 'NOT_NULL_VIOLATION',
        });
      case '23514': // check_violation
        return res.status(422).json({
          error: 'Un valor no cumple las restricciones definidas.',
          code: 'CHECK_VIOLATION',
        });
      default:
        break;
    }
  }

  // Error no previsto: se registra en servidor sin filtrar detalles al cliente.
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = errorHandler;
