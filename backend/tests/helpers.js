'use strict';

/**
 * Utilidades compartidas por las pruebas: instancia de la app para supertest,
 * acceso al pool y un ayudante para autenticar usuarios de demostracion.
 */
const request = require('supertest');
const createApp = require('../src/app');
const { pool } = require('../src/config/db');

const app = createApp();

const CLAVE_DEMO = 'Dexter2026*';

const USUARIOS = {
  lider: 'lider@dexterlatam.com',
  registrador: 'jessica@dexterlatam.com',
  desarrollador: 'dev@dexterlatam.com',
  validador: 'qa@dexterlatam.com',
  admin: 'andres@dexterlatam.com',
};

/**
 * Inicia sesion con un usuario de demostracion y devuelve su token JWT.
 * @param {keyof USUARIOS} rol
 */
async function login(rol) {
  const correo = USUARIOS[rol];
  const res = await request(app)
    .post('/api/auth/login')
    .send({ correo, password: CLAVE_DEMO });
  if (res.status !== 200) {
    throw new Error(`Login fallido para ${rol}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

// Atajos para peticiones autenticadas.
const auth = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
});

async function cerrar() {
  await pool.end();
}

module.exports = { app, request, pool, login, auth, cerrar, USUARIOS, CLAVE_DEMO };
