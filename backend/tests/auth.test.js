'use strict';

/**
 * Pruebas de autenticacion y control de acceso (RNF-08, RNF-09, RN-12).
 */
const { app, request, login, auth, cerrar } = require('./helpers');

afterAll(cerrar);

describe('Autenticacion (RNF-09)', () => {
  test('inicia sesion con credenciales validas y entrega token + roles', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'lider@dexterlatam.com', password: 'Dexter2026*' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario.correo).toBe('lider@dexterlatam.com');
    expect(res.body.usuario.roles).toContain('lider');
  });

  test('rechaza credenciales invalidas con 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'lider@dexterlatam.com', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  test('rechaza el acceso a rutas protegidas sin token (RNF-09)', async () => {
    const res = await request(app).get('/api/requerimientos');
    expect(res.status).toBe(401);
  });

  test('devuelve el usuario autenticado en /auth/me', async () => {
    const token = await login('desarrollador');
    const res = await auth(token).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.usuario.roles).toContain('desarrollador');
  });
});

describe('Salud del servicio', () => {
  test('responde el endpoint /health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
