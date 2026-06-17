'use strict';

/**
 * Pruebas del flujo de estados y trazabilidad (RF-07, RF-08, RF-12, RF-13)
 * y de las reglas de negocio de transicion (RN-06, RN-09, RN-10).
 * Recorre el ciclo de vida completo de un requerimiento.
 */
const { auth, login, cerrar } = require('./helpers');

let tokenLider;
let tokenDev;
let idReq;

beforeAll(async () => {
  tokenLider = await login('lider');
  tokenDev = await login('desarrollador');

  const res = await auth(tokenLider)
    .post('/api/requerimientos')
    .send({ id_proyecto: 1, descripcion: 'Flujo completo de prueba', solicitante: 'QA', tipo: 'ajuste', prioridad: 'media' });
  idReq = res.body.id_requerimiento;
});

afterAll(cerrar);

describe('Maquina de estados y reglas de transicion (RF-07)', () => {
  test('RN-09: no permite saltar de registrado a cerrado', async () => {
    const res = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'cerrado' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('TRANSICION_NO_PERMITIDA');
  });

  test('avanza registrado -> en_analisis', async () => {
    const res = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'en_analisis' });
    expect(res.status).toBe(200);
    expect(res.body.estado_codigo).toBe('en_analisis');
  });

  test('RNF-08: un desarrollador no puede aprobar (solo lider)', async () => {
    const res = await auth(tokenDev)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'aprobado' });
    expect(res.status).toBe(403);
  });

  test('avanza en_analisis -> aprobado (lider)', async () => {
    const res = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'aprobado' });
    expect(res.status).toBe(200);
    expect(res.body.estado_codigo).toBe('aprobado');
  });

  test('condicion Tabla 13: aprobado -> en_desarrollo exige responsable asignado', async () => {
    const sinResp = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'en_desarrollo' });
    expect(sinResp.status).toBe(422);

    await auth(tokenLider).patch(`/api/requerimientos/${idReq}/responsable`).send({ id_responsable: 4 });

    const conResp = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'en_desarrollo' });
    expect(conResp.status).toBe(200);
    expect(conResp.body.estado_codigo).toBe('en_desarrollo');
  });

  test('avanza en_desarrollo -> en_pruebas', async () => {
    const res = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'en_pruebas' });
    expect(res.status).toBe(200);
    expect(res.body.estado_codigo).toBe('en_pruebas');
  });

  test('devolucion en_pruebas -> en_desarrollo exige observacion (Tabla 13)', async () => {
    const sinObs = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'en_desarrollo' });
    expect(sinObs.status).toBe(422);

    const conObs = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'en_desarrollo', observacion: 'Falta ajustar el redondeo del total' });
    expect(conObs.status).toBe(200);
    expect(conObs.body.estado_codigo).toBe('en_desarrollo');
  });

  test('RN-10: el cierre exige evidencia', async () => {
    // Volver a en_pruebas
    await auth(tokenLider).patch(`/api/requerimientos/${idReq}/estado`).send({ estado_destino: 'en_pruebas' });

    const sinEvidencia = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'cerrado' });
    expect(sinEvidencia.status).toBe(422);

    const conEvidencia = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'cerrado', evidencia: { tipo: 'validacion', descripcion: 'Probado en QA, calculo correcto' } });
    expect(conEvidencia.status).toBe(200);
    expect(conEvidencia.body.estado_codigo).toBe('cerrado');
    expect(conEvidencia.body.fecha_cierre).toBeTruthy();
  });

  test('un requerimiento cerrado no admite mas transiciones', async () => {
    const res = await auth(tokenLider)
      .patch(`/api/requerimientos/${idReq}/estado`)
      .send({ estado_destino: 'en_desarrollo' });
    expect(res.status).toBe(422);
  });
});

describe('Trazabilidad y seguimiento (RF-08, RF-12, RF-13)', () => {
  test('el historial conserva los cambios con usuario y rol (RF-08, RNF-02)', async () => {
    const res = await auth(tokenLider).get(`/api/requerimientos/${idReq}`);
    const historial = res.body.historial;
    expect(historial.length).toBeGreaterThanOrEqual(6);
    const cambiosEstado = historial.filter((h) => h.campo_modificado === 'estado');
    expect(cambiosEstado.length).toBeGreaterThanOrEqual(5);
    expect(historial.every((h) => h.usuario_nombre)).toBe(true);
    expect(cambiosEstado.every((h) => h.rol_ejecucion)).toBe(true);
  });

  test('registra observaciones de seguimiento (RF-12)', async () => {
    const res = await auth(tokenLider)
      .post(`/api/requerimientos/${idReq}/observaciones`)
      .send({ contenido: 'Se notifico al cliente del cierre' });
    expect(res.status).toBe(201);
    expect(res.body.contenido).toBe('Se notifico al cliente del cierre');
  });

  test('RN-08: rechaza observacion vacia', async () => {
    const res = await auth(tokenLider)
      .post(`/api/requerimientos/${idReq}/observaciones`)
      .send({ contenido: '   ' });
    expect(res.status).toBe(422);
  });

  test('el detalle incluye la evidencia registrada durante el cierre (RF-13)', async () => {
    const res = await auth(tokenLider).get(`/api/requerimientos/${idReq}`);
    expect(res.body.evidencias.length).toBeGreaterThanOrEqual(1);
  });
});
