'use strict';

/**
 * Crea la base de datos configurada si aun no existe. Se conecta a la base
 * administrativa "postgres" para poder ejecutar CREATE DATABASE. Es util
 * sobre todo para la base de pruebas (dexter_requerimientos_test).
 */
const { Client } = require('pg');
const config = require('../config/env');

async function ensureDatabase() {
  const admin = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: 'postgres',
  });

  await admin.connect();
  try {
    const { rows } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.db.database]
    );
    if (rows.length === 0) {
      // El nombre de base no admite parametrizacion; proviene de configuracion
      // controlada, no de entrada de usuario.
      await admin.query(`CREATE DATABASE ${config.db.database}`);
      // eslint-disable-next-line no-console
      console.log(`[db] Base de datos creada: ${config.db.database}`);
    }
  } finally {
    await admin.end();
  }
}

module.exports = ensureDatabase;
