'use strict';

/**
 * Punto de entrada del servidor. Verifica la conexion a la base de datos y
 * pone el API a escuchar en el puerto configurado.
 */
const createApp = require('./app');
const config = require('./config/env');
const { pool } = require('./config/db');

async function main() {
  // Verificacion temprana de la conexion a PostgreSQL.
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[server] No se pudo conectar a PostgreSQL:', err.message);
    process.exit(1);
  }

  const app = createApp();
  const host = '0.0.0.0';
  app.listen(config.port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Modulo de requerimientos escuchando en el puerto ${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`[server] Entorno: ${config.env} | BD: ${config.db.connectionString ? 'DATABASE_URL' : config.db.database} | SSL: ${config.db.ssl ? 'si' : 'no'}`);
    // eslint-disable-next-line no-console
    console.log(`[server] Frontend (SPA) servido por Express: ${config.serveClient ? 'si' : 'no'}`);
  });
}

main();
