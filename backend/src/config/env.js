'use strict';

/**
 * Carga y centraliza la configuracion de entorno del modulo.
 * Mantener la configuracion en un solo lugar facilita la mantenibilidad
 * exigida por el RNF-05 (separacion clara entre capas y configuracion).
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';
const isProduction = env === 'production';

// Cadena de conexion unica (la usan plataformas gestionadas como Railway,
// Render o Heroku). Si esta presente, tiene prioridad sobre las variables PG*.
const databaseUrl = process.env.DATABASE_URL || '';

// SSL: las bases gestionadas suelen exigir conexion cifrada. Por defecto se
// activa cuando hay DATABASE_URL; se puede forzar/desactivar con PGSSL.
//   PGSSL=disable | false  -> sin SSL
//   PGSSL=require | true    -> con SSL
const pgSsl = (process.env.PGSSL || '').toLowerCase();
const sslEnabled = pgSsl
  ? !['disable', 'false', 'off', '0'].includes(pgSsl)
  : Boolean(databaseUrl);

const config = {
  env,
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 4000,
  db: {
    // Si hay DATABASE_URL se usa la cadena; de lo contrario, parametros sueltos.
    connectionString: databaseUrl || null,
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'dexter',
    password: process.env.PGPASSWORD || 'dexter_dev_2026',
    // En pruebas se usa una base independiente para no afectar los datos reales.
    database: isTest
      ? process.env.PGDATABASE_TEST || 'dexter_requerimientos_test'
      : process.env.PGDATABASE || 'dexter_requerimientos',
    // node-postgres espera false o un objeto de opciones SSL.
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'clave-desarrollo-dexter-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Servir el frontend compilado desde Express (deploy de un solo servicio).
  // Por defecto se sirve siempre salvo en pruebas; se puede forzar con
  // SERVE_CLIENT=true|false.
  serveClient: process.env.SERVE_CLIENT
    ? process.env.SERVE_CLIENT === 'true'
    : !isTest,
  // Ruta del build del frontend (modulo-requerimientos/frontend/dist).
  clientDistPath:
    process.env.CLIENT_DIST_PATH ||
    path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist'),
};

module.exports = config;
