'use strict';

/**
 * Pruebas unitarias del motor de sugerencia (RF-14, RN-04, RN-11).
 * Validan la clasificacion por palabras clave y la regla de soporte
 * prioritario, sin depender de la base de datos.
 */
const { sugerir } = require('../src/services/sugerenciaService');

describe('Motor de sugerencia automatica (RF-14)', () => {
  test('clasifica una incidencia urgente como tipo incidencia y prioridad alta', () => {
    const s = sugerir('El sistema da error y no funciona, es urgente');
    expect(s.tipo_sugerido).toBe('incidencia');
    expect(s.prioridad_sugerida).toBe('alta');
  });

  test('clasifica una mejora opcional como tipo mejora y prioridad baja', () => {
    const s = sugerir('Seria bueno mejorar la pantalla de inicio, es opcional');
    expect(s.tipo_sugerido).toBe('mejora');
    expect(s.prioridad_sugerida).toBe('baja');
  });

  test('clasifica una nueva funcionalidad', () => {
    const s = sugerir('Necesitamos agregar un nuevo modulo de reportes exportable');
    expect(s.tipo_sugerido).toBe('nueva_funcionalidad');
  });

  test('eleva la prioridad cuando el proyecto tiene soporte prioritario', () => {
    const sinSoporte = sugerir('Cambiar la etiqueta de un campo');
    const conSoporte = sugerir('Cambiar la etiqueta de un campo', { soportePrioritario: true });
    expect(sinSoporte.prioridad_sugerida).not.toBe('alta');
    expect(conSoporte.prioridad_sugerida).toBe('alta');
  });

  test('la sugerencia siempre incluye un motivo legible (RN-11)', () => {
    const s = sugerir('Corregir un calculo');
    expect(typeof s.motivo).toBe('string');
    expect(s.motivo.length).toBeGreaterThan(0);
  });
});
