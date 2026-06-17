'use strict';

/**
 * Motor de sugerencia inicial de tipo y prioridad (RF-14).
 *
 * Implementa la "automatizacion basica" comprometida en el alcance: reglas
 * simples basadas en palabras clave del texto de la solicitud y en el tipo
 * de cliente (proyecto con soporte prioritario). La sugerencia SIEMPRE es
 * revisable por el usuario y nunca sustituye su criterio (RN-11), tal como
 * insistio la participante de la entrevista ENT-01.
 *
 * El diseno deja la puerta abierta a reemplazar/complementar estas reglas
 * con un servicio de IA (RNF-07) sin cambiar el resto del modulo: basta con
 * proveer otra implementacion de `sugerir`.
 */

// Normaliza el texto: minusculas y sin tildes, para comparar palabras clave.
function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Palabras clave por tipo de requerimiento.
const CLAVES_TIPO = {
  incidencia: ['error', 'no funciona', 'no carga', 'falla', 'fallo', 'caido', 'bug', 'no responde', 'no sirve', 'roto', 'se cae', 'no abre', 'no guarda'],
  ajuste: ['ajuste', 'ajustar', 'cambiar', 'modificar', 'corregir', 'actualizar', 'etiqueta', 'renombrar', 'mover'],
  mejora: ['mejora', 'mejorar', 'seria bueno', 'optimizar', 'agilizar', 'facilitar', 'comodo'],
  nueva_funcionalidad: ['nuevo', 'nueva', 'agregar', 'anadir', 'crear', 'implementar', 'funcionalidad', 'modulo', 'reporte', 'exportar', 'integrar'],
};

// Palabras clave de urgencia (elevan la prioridad).
const CLAVES_ALTA = ['urgente', 'urge', 'inmediato', 'critico', 'bloquea', 'bloqueado', 'detenido', 'parado', 'caido', 'no funciona', 'produccion', 'ya'];
const CLAVES_BAJA = ['cuando puedan', 'sin afan', 'no urge', 'eventualmente', 'baja prioridad', 'cosmetico', 'opcional'];

/**
 * Calcula una sugerencia de tipo y prioridad a partir del texto.
 * @param {string} descripcion
 * @param {{ soportePrioritario?: boolean }} [opciones]
 * @returns {{ tipo_sugerido: string, prioridad_sugerida: string, motivo: string }}
 */
function sugerir(descripcion, opciones = {}) {
  const texto = normalizar(descripcion);
  const motivos = [];

  // 1) Determinar tipo por la primera familia de palabras clave que aparezca.
  let tipo = null;
  let mejorPuntaje = 0;
  for (const [codigoTipo, claves] of Object.entries(CLAVES_TIPO)) {
    const coincidencias = claves.filter((c) => texto.includes(c));
    if (coincidencias.length > mejorPuntaje) {
      mejorPuntaje = coincidencias.length;
      tipo = codigoTipo;
      motivos.length = 0;
      motivos.push(`palabras como "${coincidencias.join('", "')}"`);
    }
  }
  if (!tipo) {
    tipo = 'ajuste';
    motivos.push('no se detectaron palabras clave especificas (tipo por defecto: ajuste)');
  }

  // 2) Determinar prioridad.
  let prioridad = 'media';
  if (CLAVES_ALTA.some((c) => texto.includes(c))) {
    prioridad = 'alta';
    motivos.push('terminos de urgencia detectados');
  } else if (CLAVES_BAJA.some((c) => texto.includes(c))) {
    prioridad = 'baja';
    motivos.push('terminos de baja urgencia detectados');
  } else if (tipo === 'incidencia') {
    prioridad = 'alta';
    motivos.push('las incidencias se sugieren con prioridad alta por defecto');
  } else if (tipo === 'mejora') {
    prioridad = 'baja';
    motivos.push('las mejoras se sugieren con prioridad baja por defecto');
  }

  // 3) Regla de cliente con soporte prioritario: eleva la prioridad.
  if (opciones.soportePrioritario && prioridad !== 'alta') {
    prioridad = 'alta';
    motivos.push('el proyecto tiene contrato de soporte prioritario');
  }

  return {
    tipo_sugerido: tipo,
    prioridad_sugerida: prioridad,
    motivo: `Sugerencia por reglas: ${motivos.join('; ')}. Revisable por el usuario (RN-11).`,
  };
}

module.exports = { sugerir, normalizar };
