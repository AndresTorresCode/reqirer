'use strict';

/**
 * Pruebas de registro, clasificacion y consulta de requerimientos
 * (RF-03, RF-04, RF-05, RF-09, RF-11, RF-14 y reglas RN-01, RN-02, RN-03).
 */
const { auth, login, cerrar } = require('./helpers');

let tokenLider;
let tokenRegistrador;

beforeAll(async () => {
  tokenLider = await login('lider');
  tokenRegistrador = await login('registrador');
});

afterAll(cerrar);

describe('Registro de requerimientos (RF-03, RN-01, RN-02, RN-03)', () => {
  test('registra un requerimiento con informacion minima y queda en estado registrado (RN-03)', async () => {
    const res = await auth(tokenRegistrador)
      .post('/api/requerimientos')
      .send({
        id_proyecto: 1,
        descripcion: 'Corregir el calculo del total en la factura',
        solicitante: 'Cliente Acme',
        tipo: 'ajuste',
        prioridad: 'media',
      });
    expect(res.status).toBe(201);
    expect(res.body.codigo).toMatch(/^REQ-\d{4}$/);
    expect(res.body.estado_codigo).toBe('registrado'); // RN-03
    expect(res.body.tipo_codigo).toBe('ajuste');
  });

  test('rechaza un requerimiento sin descripcion (RN-02)', async () => {
    const res = await auth(tokenRegistrador)
      .post('/api/requerimientos')
      .send({ id_proyecto: 1, solicitante: 'Cliente Acme', tipo: 'ajuste', prioridad: 'media' });
    expect(res.status).toBe(422);
  });

  test('rechaza un requerimiento sin proyecto (RN-01)', async () => {
    const res = await auth(tokenRegistrador)
      .post('/api/requerimientos')
      .send({ descripcion: 'Algo', solicitante: 'X', tipo: 'ajuste', prioridad: 'media' });
    expect(res.status).toBe(422);
  });

  test('rechaza un requerimiento con proyecto inexistente (RN-01, integridad)', async () => {
    const res = await auth(tokenRegistrador)
      .post('/api/requerimientos')
      .send({ id_proyecto: 99999, descripcion: 'Algo', solicitante: 'X', tipo: 'ajuste', prioridad: 'media' });
    expect(res.status).toBe(422);
  });

  test('aplica la sugerencia automatica cuando no se envia tipo/prioridad (RF-14)', async () => {
    const res = await auth(tokenRegistrador)
      .post('/api/requerimientos')
      .send({
        id_proyecto: 1,
        descripcion: 'La pantalla muestra un error y no funciona, urgente',
        solicitante: 'Soporte',
      });
    expect(res.status).toBe(201);
    expect(res.body.tipo_codigo).toBe('incidencia');
    expect(res.body.prioridad_codigo).toBe('alta');
    expect(res.body.sugerencia).toBeTruthy();
  });
});

describe('Asignacion y prioridad (RF-05, RF-06)', () => {
  let idReq;
  beforeAll(async () => {
    const res = await auth(tokenRegistrador)
      .post('/api/requerimientos')
      .send({ id_proyecto: 2, descripcion: 'Ajuste menor en formulario', solicitante: 'Cliente', tipo: 'ajuste', prioridad: 'baja' });
    idReq = res.body.id_requerimiento;
  });

  test('el lider puede cambiar la prioridad (RF-05) y queda en historial (RN-07)', async () => {
    const res = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/prioridad`)
      .send({ prioridad: 'alta' });
    expect(res.status).toBe(200);
    expect(res.body.prioridad_codigo).toBe('alta');

    const detalle = await auth(tokenLider).get(`/api/requerimientos/${idReq}`);
    const cambioPrioridad = detalle.body.historial.find((h) => h.campo_modificado === 'prioridad');
    expect(cambioPrioridad).toBeTruthy();
  });

  test('el lider puede asignar responsable (RF-06)', async () => {
    const res = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/responsable`)
      .send({ id_responsable: 4 });
    expect(res.status).toBe(200);
    expect(res.body.id_responsable).toBe(4);
  });

  test('el registrador NO puede cambiar prioridad (RNF-08)', async () => {
    const res = await auth(tokenRegistrador)
      .patch(`/api/requerimientos/${idReq}/prioridad`)
      .send({ prioridad: 'media' });
    expect(res.status).toBe(403);
  });
});

describe('Consulta: listado, tablero y filtros (RF-09, RF-10, RF-11)', () => {
  test('lista requerimientos (RF-09)', async () => {
    const res = await auth(tokenLider).get('/api/requerimientos');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('filtra por estado (RF-11)', async () => {
    const res = await auth(tokenLider).get('/api/requerimientos?estado=registrado');
    expect(res.status).toBe(200);
    expect(res.body.every((r) => r.estado_codigo === 'registrado')).toBe(true);
  });

  test('filtra por prioridad (RF-11)', async () => {
    const res = await auth(tokenLider).get('/api/requerimientos?prioridad=alta');
    expect(res.status).toBe(200);
    expect(res.body.every((r) => r.prioridad_codigo === 'alta')).toBe(true);
  });

  test('filtra por proyecto (RF-11)', async () => {
    const res = await auth(tokenLider).get('/api/requerimientos?proyecto=1');
    expect(res.status).toBe(200);
    expect(res.body.every((r) => r.id_proyecto === 1)).toBe(true);
  });

  test('el tablero agrupa por estado con las 6 columnas (RF-10)', async () => {
    const res = await auth(tokenLider).get('/api/requerimientos/tablero');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(6);
    expect(res.body.map((c) => c.estado)).toEqual([
      'registrado', 'en_analisis', 'aprobado', 'en_desarrollo', 'en_pruebas', 'cerrado',
    ]);
  });
});
