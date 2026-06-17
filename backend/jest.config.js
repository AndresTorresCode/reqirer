'use strict';

/**
 * Configuracion de Jest para las pruebas de integracion y funcionales.
 * globalSetup prepara una base de datos de pruebas independiente
 * (dexter_requerimientos_test) para no afectar los datos de desarrollo.
 */
module.exports = {
  testEnvironment: 'node',
  globalSetup: './tests/globalSetup.js',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testTimeout: 20000,
};
