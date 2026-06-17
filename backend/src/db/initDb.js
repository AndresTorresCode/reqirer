'use strict';

/**
 * Inicializa el esquema de la base de datos ejecutando schema.sql.
 * Uso: npm run db:init
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = require('../config/env');
const ensureDatabase = require('./ensureDatabase');

// Construye la configuracion del cliente segun el entorno: cadena de conexion
// (DATABASE_URL) en plataformas gestionadas, o parametros sueltos en local.
function buildClientConfig() {
  const base = config.db.connectionString
    ? { connectionString: config.db.connectionString }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
      };
  if (config.db.ssl) {
    base.ssl = config.db.ssl;
  }
  return base;
}

async function initDb() {
  // En bases gestionadas (DATABASE_URL) o en produccion, la base ya existe y
  // el usuario no tiene permiso para ejecutar CREATE DATABASE; se omite ese
  // paso y se aplica unicamente el esquema. ensureDatabase solo se usa en
  // local (util para crear la base de pruebas).
  const usaBaseGestionada = Boolean(config.db.connectionString) || config.isProduction;
  if (!usaBaseGestionada) {
    await ensureDatabase();
  }

  const client = new Client(buildClientConfig());

  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  await client.connect();
  try {
    await client.query(schemaSql);
    // eslint-disable-next-line no-console
    console.log(`[db] Esquema aplicado sobre ${config.db.database}`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  initDb()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[db] Error al inicializar el esquema:', err.message);
      process.exit(1);
    });
}

module.exports = initDb;
