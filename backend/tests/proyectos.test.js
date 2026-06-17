'use strict';

/**
 * Pruebas de proyectos (RF-01 crear, RF-02 consultar) y control de acceso
 * por rol (RNF-08).
 */
const { auth, login, cerrar } = require('./helpers');

let tokenLider;
let tokenRegistrador;

beforeAll(async () => {
  tokenLider = await login('lider');
  tokenRegistrador = await login('registrador');
});

afterAll(cerrar);

describe('Proyectos (RF-01, RF-02)', () => {
  test('cualquier usuario autenticado puede consultar proyectos (RF-02)', async () => {
    const res = await auth(tokenRegistrador).get('/api/proyectos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('el lider puede crear un proyecto (RF-01)', async () => {
    const res = await auth(tokenLider)
      .post('/api/proyectos')
      .send({ nombre: 'Proyecto de prueba QA', cliente_referencia: 'Cliente QA', soporte_prioritario: true });
    expect(res.status).toBe(201);
    expect(res.body.id_proyecto).toBeTruthy();
    expect(res.body.soporte_prioritario).toBe(true);
  });

  test('el registrador NO puede crear proyectos (RNF-08)', async () => {
    const res = await auth(tokenRegistrador)
      .post('/api/proyectos')
      .send({ nombre: 'Proyecto no permitido' });
    expect(res.status).toBe(403);
  });

  test('rechaza crear proyecto sin nombre (validacion)', async () => {
    const res = await auth(tokenLider).post('/api/proyectos').send({});
    expect(res.status).toBe(422);
  });
});
