'use strict';

/**
 * Preparacion global de las pruebas: garantiza que la base de pruebas exista,
 * aplica el esquema y siembra los catalogos y datos de demostracion. Se
 * ejecuta una sola vez antes de toda la suite.
 */
process.env.NODE_ENV = 'test';

module.exports = async () => {
  const initDb = require('../src/db/initDb');
  const seed = require('../src/db/seedDb');
  const { pool } = require('../src/config/db');

  await initDb(); // crea la base de pruebas si no existe + aplica schema.sql
  await seed(); // catalogos + datos de demostracion
  await pool.end(); // cierra el pool de este proceso de setup
};
