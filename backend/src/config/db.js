'use strict';

/**
 * Capa de acceso a datos (pool de conexiones a PostgreSQL).
 * Aisla el resto de la aplicacion del detalle de conexion, en linea con
 * la separacion de capas del RNF-05 (mantenibilidad).
 */
const { Pool } = require('pg');
const config = require('./env');

// Si existe DATABASE_URL (entornos gestionados como Railway) se usa la cadena
// de conexion; de lo contrario, los parametros sueltos del entorno local.
const poolConfig = config.db.connectionString
  ? { connectionString: config.db.connectionString }
  : {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
    };

// node-postgres solo acepta la propiedad ssl si es un objeto; si es false la
// omitimos para no forzar TLS en desarrollo local.
if (config.db.ssl) {
  poolConfig.ssl = config.db.ssl;
}

poolConfig.max = 10;
poolConfig.idleTimeoutMillis = 30000;

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  // Un error en un cliente inactivo no debe tumbar el proceso.
  // eslint-disable-next-line no-console
  console.error('[db] Error inesperado en cliente inactivo:', err.message);
});

/**
 * Ejecuta una consulta usando el pool.
 * @param {string} text - sentencia SQL parametrizada
 * @param {Array} params - parametros ($1, $2, ...)
 */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Ejecuta una funcion dentro de una transaccion. Si la funcion lanza,
 * se hace ROLLBACK; de lo contrario COMMIT. Se usa para operaciones que
 * deben ser atomicas (por ejemplo, cambiar estado + registrar historial),
 * garantizando la integridad exigida por el RNF-03.
 * @param {(client: import('pg').PoolClient) => Promise<any>} callback
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
