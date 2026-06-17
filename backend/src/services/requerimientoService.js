'use strict';

/**
 * Servicio del requerimiento: entidad central del modulo. Concentra la
 * logica de negocio de la Fase 2 traducida a la Fase 3:
 *   - Registro con informacion minima           (RF-03, RF-04, RF-05, RN-02)
 *   - Sugerencia inicial de tipo/prioridad       (RF-14, RN-04, RN-11)
 *   - Asignacion de responsable                  (RF-06, RN-05)
 *   - Maquina de estados con transiciones validas(RF-07, RN-03, RN-06, RN-09)
 *   - Historial de cambios automatico            (RF-08, RNF-02, RN-07)
 *   - Observaciones de seguimiento               (RF-12, RN-08)
 *   - Evidencia y condicion de cierre            (RF-13, RN-10)
 *   - Listado, tablero y filtros                 (RF-09, RF-10, RF-11)
 */
const db = require('../config/db');
const AppError = require('../utils/AppError');
const sugerenciaService = require('./sugerenciaService');

// SELECT base reutilizable con los nombres legibles de cada catalogo.
const SELECT_BASE = `
  SELECT r.id_requerimiento, r.codigo, r.descripcion, r.solicitante,
         r.id_proyecto, p.nombre AS proyecto_nombre, p.soporte_prioritario,
         r.id_tipo, t.codigo AS tipo_codigo, t.nombre_tipo AS tipo_nombre,
         r.id_prioridad, pr.codigo AS prioridad_codigo, pr.nombre_prioridad AS prioridad_nombre, pr.orden AS prioridad_orden,
         r.id_estado, e.codigo AS estado_codigo, e.nombre_estado AS estado_nombre, e.orden_flujo AS estado_orden, e.es_final,
         r.id_responsable, ur.nombre AS responsable_nombre,
         r.id_creador, uc.nombre AS creador_nombre,
         r.fecha_registro, r.fecha_objetivo, r.fecha_cierre, r.evidencia_cierre
    FROM requerimiento r
    JOIN proyecto p             ON p.id_proyecto = r.id_proyecto
    JOIN tipo_requerimiento t   ON t.id_tipo = r.id_tipo
    JOIN prioridad pr           ON pr.id_prioridad = r.id_prioridad
    JOIN estado_requerimiento e ON e.id_estado = r.id_estado
    LEFT JOIN usuario ur        ON ur.id_usuario = r.id_responsable
    JOIN usuario uc             ON uc.id_usuario = r.id_creador`;

// ----------------------- Helpers internos -----------------------

// Devuelve el primer rol del usuario que pertenezca a la lista permitida, o
// null si no tiene ninguno. Se usa tanto para autorizar acciones (cuando null
// significa "no autorizado") como para etiquetar el rol de ejecucion en el
// historial. No debe devolver un rol no autorizado como respaldo.
function pickRol(rolesUsuario, rolesPermitidos) {
  return rolesUsuario.find((r) => rolesPermitidos.includes(r)) || null;
}

async function resolverTipoId(ejecutor, valor) {
  if (valor == null) return null;
  const campo = Number.isInteger(Number(valor)) && !`${valor}`.match(/[a-z_]/i) ? 'id_tipo' : 'codigo';
  const { rows } = await ejecutor.query(
    `SELECT id_tipo FROM tipo_requerimiento WHERE ${campo} = $1`,
    [valor]
  );
  return rows[0] ? rows[0].id_tipo : null;
}

async function resolverPrioridadId(ejecutor, valor) {
  if (valor == null) return null;
  const campo = Number.isInteger(Number(valor)) && !`${valor}`.match(/[a-z]/i) ? 'id_prioridad' : 'codigo';
  const { rows } = await ejecutor.query(
    `SELECT id_prioridad FROM prioridad WHERE ${campo} = $1`,
    [valor]
  );
  return rows[0] ? rows[0].id_prioridad : null;
}

async function obtenerEstadoPorCodigo(ejecutor, codigo) {
  const { rows } = await ejecutor.query(
    'SELECT id_estado, codigo, nombre_estado, orden_flujo, es_final FROM estado_requerimiento WHERE codigo = $1',
    [codigo]
  );
  return rows[0] || null;
}

async function registrarHistorial(ejecutor, { idReq, campo, anterior, nuevo, idUsuario, rol }) {
  await ejecutor.query(
    `INSERT INTO historial_cambio
       (id_requerimiento, campo_modificado, valor_anterior, valor_nuevo, id_usuario, rol_ejecucion)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [idReq, campo, anterior == null ? null : String(anterior), nuevo == null ? null : String(nuevo), idUsuario, rol]
  );
}

async function obtenerCrudo(ejecutor, id) {
  const { rows } = await ejecutor.query(
    'SELECT * FROM requerimiento WHERE id_requerimiento = $1',
    [id]
  );
  return rows[0] || null;
}

// ----------------------- Consultas -----------------------

/**
 * Listado con filtros por proyecto, estado, prioridad, responsable, tipo y
 * texto libre (RF-09 listado, RF-11 filtros).
 */
async function listar(filtros = {}) {
  const { proyecto, estado, prioridad, responsable, tipo, q } = filtros;
  const cond = [];
  const params = [];

  if (proyecto) { params.push(proyecto); cond.push(`r.id_proyecto = $${params.length}`); }
  if (estado) { params.push(estado); cond.push(`e.codigo = $${params.length}`); }
  if (prioridad) { params.push(prioridad); cond.push(`pr.codigo = $${params.length}`); }
  if (tipo) { params.push(tipo); cond.push(`t.codigo = $${params.length}`); }
  if (responsable) { params.push(responsable); cond.push(`r.id_responsable = $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    cond.push(`(r.descripcion ILIKE $${params.length} OR r.codigo ILIKE $${params.length} OR r.solicitante ILIKE $${params.length})`);
  }

  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const { rows } = await db.query(
    `${SELECT_BASE} ${where} ORDER BY pr.orden ASC, r.fecha_registro DESC`,
    params
  );
  return rows;
}

/**
 * Tablero Kanban: requerimientos agrupados por estado (RF-10).
 */
async function tablero(filtros = {}) {
  const estados = (await db.query(
    'SELECT codigo, nombre_estado, orden_flujo FROM estado_requerimiento ORDER BY orden_flujo'
  )).rows;

  const reqs = await listar(filtros);
  const columnas = estados.map((e) => ({
    estado: e.codigo,
    nombre: e.nombre_estado,
    orden: e.orden_flujo,
    requerimientos: reqs.filter((r) => r.estado_codigo === e.codigo),
  }));
  return columnas;
}

/**
 * Detalle completo del requerimiento con su trazabilidad (RF-07, RF-08, RF-11).
 */
async function obtenerDetalle(id) {
  const { rows } = await db.query(`${SELECT_BASE} WHERE r.id_requerimiento = $1`, [id]);
  if (!rows[0]) {
    throw AppError.notFound('Requerimiento no encontrado');
  }
  const requerimiento = rows[0];

  const [historial, observaciones, evidencias, sugerencia, transiciones] = await Promise.all([
    db.query(
      `SELECT h.id_historial, h.campo_modificado, h.valor_anterior, h.valor_nuevo,
              h.rol_ejecucion, h.fecha, u.nombre AS usuario_nombre
         FROM historial_cambio h JOIN usuario u ON u.id_usuario = h.id_usuario
        WHERE h.id_requerimiento = $1 ORDER BY h.fecha ASC, h.id_historial ASC`,
      [id]
    ),
    db.query(
      `SELECT o.id_observacion, o.contenido, o.fecha, u.nombre AS usuario_nombre
         FROM observacion o JOIN usuario u ON u.id_usuario = o.id_usuario
        WHERE o.id_requerimiento = $1 ORDER BY o.fecha ASC`,
      [id]
    ),
    db.query(
      `SELECT id_evidencia, tipo, descripcion, fecha FROM evidencia
        WHERE id_requerimiento = $1 ORDER BY fecha ASC`,
      [id]
    ),
    db.query('SELECT * FROM sugerencia_automatica WHERE id_requerimiento = $1', [id]),
    db.query(
      `SELECT ed.codigo AS destino, ed.nombre_estado AS destino_nombre, t.condicion, t.roles_autorizados
         FROM transicion_estado t
         JOIN estado_requerimiento ed ON ed.id_estado = t.id_estado_destino
        WHERE t.id_estado_origen = $1 ORDER BY ed.orden_flujo`,
      [requerimiento.id_estado]
    ),
  ]);

  return {
    ...requerimiento,
    historial: historial.rows,
    observaciones: observaciones.rows,
    evidencias: evidencias.rows,
    sugerencia: sugerencia.rows[0] || null,
    transiciones_disponibles: transiciones.rows,
  };
}

// ----------------------- Comandos -----------------------

/**
 * Crea un requerimiento con la informacion minima (RN-02), lo deja en estado
 * "registrado" (RN-03) y guarda la sugerencia automatica asociada (RF-14).
 */
async function crear(datos, usuario) {
  const { id_proyecto, descripcion, solicitante, fecha_objetivo } = datos;

  if (!id_proyecto) throw AppError.unprocessable('El proyecto es obligatorio (RN-01)');
  if (!descripcion || !descripcion.trim()) throw AppError.unprocessable('La descripcion es obligatoria (RN-02)');
  if (!solicitante || !solicitante.trim()) throw AppError.unprocessable('El solicitante es obligatorio (RN-02)');

  return db.withTransaction(async (client) => {
    // Validar proyecto y obtener bandera de soporte prioritario (RN-01).
    const proy = await client.query(
      'SELECT id_proyecto, soporte_prioritario FROM proyecto WHERE id_proyecto = $1',
      [id_proyecto]
    );
    if (!proy.rows[0]) throw AppError.unprocessable('El proyecto indicado no existe (RN-01)');

    // Sugerencia automatica (RF-14) a partir del texto y el tipo de cliente.
    const sugerencia = sugerenciaService.sugerir(descripcion, {
      soportePrioritario: proy.rows[0].soporte_prioritario,
    });

    // Tipo y prioridad: el usuario decide; si no envia, se usa la sugerencia
    // (que siempre queda registrada y es revisable, RN-04 y RN-11).
    const idTipo = (await resolverTipoId(client, datos.id_tipo || datos.tipo)) ||
      (await resolverTipoId(client, sugerencia.tipo_sugerido));
    const idPrioridad = (await resolverPrioridadId(client, datos.id_prioridad || datos.prioridad)) ||
      (await resolverPrioridadId(client, sugerencia.prioridad_sugerida));

    if (!idTipo) throw AppError.unprocessable('El tipo de requerimiento es obligatorio (RN-02)');
    if (!idPrioridad) throw AppError.unprocessable('La prioridad es obligatoria (RN-02)');

    const estadoInicial = await obtenerEstadoPorCodigo(client, 'registrado'); // RN-03

    // Codigo consecutivo REQ-####.
    const next = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0) + 1 AS siguiente
         FROM requerimiento WHERE codigo LIKE 'REQ-%'`
    );
    const codigo = `REQ-${String(next.rows[0].siguiente).padStart(4, '0')}`;

    const insert = await client.query(
      `INSERT INTO requerimiento
        (codigo, id_proyecto, descripcion, solicitante, id_tipo, id_prioridad, id_estado, id_responsable, id_creador, fecha_objetivo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id_requerimiento`,
      [codigo, id_proyecto, descripcion.trim(), solicitante.trim(), idTipo, idPrioridad,
        estadoInicial.id_estado, datos.id_responsable || null, usuario.id, fecha_objetivo || null]
    );
    const idReq = insert.rows[0].id_requerimiento;

    // Marca si el usuario acepto la sugerencia (coincidencia de tipo y prioridad).
    const tipoElegido = await client.query('SELECT codigo FROM tipo_requerimiento WHERE id_tipo = $1', [idTipo]);
    const prioElegida = await client.query('SELECT codigo FROM prioridad WHERE id_prioridad = $1', [idPrioridad]);
    const aceptada =
      tipoElegido.rows[0].codigo === sugerencia.tipo_sugerido &&
      prioElegida.rows[0].codigo === sugerencia.prioridad_sugerida;

    await client.query(
      `INSERT INTO sugerencia_automatica
        (id_requerimiento, tipo_sugerido, prioridad_sugerida, motivo, aceptada)
       VALUES ($1,$2,$3,$4,$5)`,
      [idReq, sugerencia.tipo_sugerido, sugerencia.prioridad_sugerida, sugerencia.motivo, aceptada]
    );

    await registrarHistorial(client, {
      idReq,
      campo: 'creacion',
      anterior: null,
      nuevo: `Requerimiento ${codigo} creado en estado registrado`,
      idUsuario: usuario.id,
      rol: pickRol(usuario.roles, ['registrador', 'lider']),
    });

    if (datos.id_responsable) {
      await registrarHistorial(client, {
        idReq, campo: 'responsable', anterior: null, nuevo: `usuario ${datos.id_responsable}`,
        idUsuario: usuario.id, rol: pickRol(usuario.roles, ['lider']),
      });
    }

    const { rows } = await client.query(`${SELECT_BASE} WHERE r.id_requerimiento = $1`, [idReq]);
    return { ...rows[0], sugerencia };
  });
}

/**
 * Edita campos de alcance del requerimiento (descripcion, solicitante, tipo,
 * fecha objetivo). Cada cambio relevante queda en el historial (RN-07).
 */
async function actualizar(id, datos, usuario) {
  return db.withTransaction(async (client) => {
    const actual = await obtenerCrudo(client, id);
    if (!actual) throw AppError.notFound('Requerimiento no encontrado');

    const rol = pickRol(usuario.roles, ['registrador', 'lider']);
    const cambios = [];

    if (datos.descripcion && datos.descripcion.trim() !== actual.descripcion) {
      await registrarHistorial(client, { idReq: id, campo: 'alcance', anterior: actual.descripcion, nuevo: datos.descripcion.trim(), idUsuario: usuario.id, rol });
      cambios.push(['descripcion', datos.descripcion.trim()]);
    }
    if (datos.solicitante && datos.solicitante.trim() !== actual.solicitante) {
      cambios.push(['solicitante', datos.solicitante.trim()]);
    }
    if (datos.id_tipo || datos.tipo) {
      const idTipo = await resolverTipoId(client, datos.id_tipo || datos.tipo);
      if (idTipo && idTipo !== actual.id_tipo) {
        await registrarHistorial(client, { idReq: id, campo: 'tipo', anterior: actual.id_tipo, nuevo: idTipo, idUsuario: usuario.id, rol });
        cambios.push(['id_tipo', idTipo]);
      }
    }
    if (datos.fecha_objetivo !== undefined) {
      cambios.push(['fecha_objetivo', datos.fecha_objetivo || null]);
    }

    if (cambios.length) {
      const set = cambios.map(([campo], i) => `${campo} = $${i + 2}`).join(', ');
      const valores = cambios.map(([, valor]) => valor);
      await client.query(`UPDATE requerimiento SET ${set} WHERE id_requerimiento = $1`, [id, ...valores]);
    }

    const { rows } = await client.query(`${SELECT_BASE} WHERE r.id_requerimiento = $1`, [id]);
    return rows[0];
  });
}

/**
 * Cambia la prioridad. Solo el lider lo hace tras la creacion; queda en
 * historial (RF-05, RN-07).
 */
async function cambiarPrioridad(id, valorPrioridad, usuario) {
  return db.withTransaction(async (client) => {
    const actual = await obtenerCrudo(client, id);
    if (!actual) throw AppError.notFound('Requerimiento no encontrado');

    const idPrioridad = await resolverPrioridadId(client, valorPrioridad);
    if (!idPrioridad) throw AppError.unprocessable('Prioridad invalida');
    if (idPrioridad === actual.id_prioridad) {
      const { rows } = await client.query(`${SELECT_BASE} WHERE r.id_requerimiento = $1`, [id]);
      return rows[0];
    }

    await client.query('UPDATE requerimiento SET id_prioridad = $2 WHERE id_requerimiento = $1', [id, idPrioridad]);
    await registrarHistorial(client, {
      idReq: id, campo: 'prioridad', anterior: actual.id_prioridad, nuevo: idPrioridad,
      idUsuario: usuario.id, rol: pickRol(usuario.roles, ['lider']),
    });

    const { rows } = await client.query(`${SELECT_BASE} WHERE r.id_requerimiento = $1`, [id]);
    return rows[0];
  });
}

/**
 * Asigna o cambia el responsable (RF-06). Queda registrado (RN-05, RN-07).
 */
async function asignarResponsable(id, idResponsable, usuario) {
  return db.withTransaction(async (client) => {
    const actual = await obtenerCrudo(client, id);
    if (!actual) throw AppError.notFound('Requerimiento no encontrado');

    const existe = await client.query('SELECT 1 FROM usuario WHERE id_usuario = $1', [idResponsable]);
    if (!existe.rows[0]) throw AppError.unprocessable('El responsable indicado no existe');

    await client.query('UPDATE requerimiento SET id_responsable = $2 WHERE id_requerimiento = $1', [id, idResponsable]);
    await registrarHistorial(client, {
      idReq: id, campo: 'responsable', anterior: actual.id_responsable, nuevo: idResponsable,
      idUsuario: usuario.id, rol: pickRol(usuario.roles, ['lider']),
    });

    const { rows } = await client.query(`${SELECT_BASE} WHERE r.id_requerimiento = $1`, [id]);
    return rows[0];
  });
}

/**
 * Cambia el estado respetando las transiciones permitidas (Tabla 13, RN-06),
 * las condiciones de cada transicion y el control de acceso por rol (RNF-08).
 * Aplica RN-09 (no se salta etapas) y RN-10 (cierre exige evidencia).
 */
async function cambiarEstado(id, datos, usuario) {
  const { estado_destino, observacion, evidencia } = datos;
  if (!estado_destino) throw AppError.badRequest('Debe indicar el estado destino');

  return db.withTransaction(async (client) => {
    const actual = await obtenerCrudo(client, id);
    if (!actual) throw AppError.notFound('Requerimiento no encontrado');

    const estadoActual = (await client.query(
      'SELECT * FROM estado_requerimiento WHERE id_estado = $1', [actual.id_estado]
    )).rows[0];
    const estadoDestino = await obtenerEstadoPorCodigo(client, estado_destino);
    if (!estadoDestino) throw AppError.unprocessable('El estado destino no existe');

    if (estadoDestino.id_estado === estadoActual.id_estado) {
      throw AppError.unprocessable('El requerimiento ya se encuentra en ese estado');
    }

    // Verificar transicion permitida (RN-06, RN-09).
    const trans = await client.query(
      'SELECT condicion, roles_autorizados FROM transicion_estado WHERE id_estado_origen = $1 AND id_estado_destino = $2',
      [estadoActual.id_estado, estadoDestino.id_estado]
    );
    if (!trans.rows[0]) {
      throw AppError.unprocessable(
        `Transicion no permitida: de "${estadoActual.nombre_estado}" a "${estadoDestino.nombre_estado}" (Tabla 13)`,
        'TRANSICION_NO_PERMITIDA'
      );
    }

    // Control de acceso por rol para esta transicion (RNF-08).
    const rolesAutorizados = trans.rows[0].roles_autorizados;
    const rolEjecucion = pickRol(usuario.roles, rolesAutorizados);
    if (!rolEjecucion) {
      throw AppError.forbidden(
        `Esta transicion solo puede ejecutarla: ${rolesAutorizados.join(', ')}`
      );
    }

    // Condicion: pasar a "en desarrollo" exige responsable asignado.
    if (estadoDestino.codigo === 'en_desarrollo' && !actual.id_responsable) {
      throw AppError.unprocessable('Debe asignar un responsable antes de pasar a desarrollo (Tabla 13)');
    }

    // Condicion: la devolucion de pruebas a desarrollo exige una observacion.
    if (estadoActual.codigo === 'en_pruebas' && estadoDestino.codigo === 'en_desarrollo' && !(observacion && observacion.trim())) {
      throw AppError.unprocessable('La devolucion a desarrollo requiere registrar una observacion (Tabla 13)');
    }

    // Condicion de cierre (RN-10): evidencia o validacion registrada.
    let evidenciaCierre = actual.evidencia_cierre;
    if (estadoDestino.codigo === 'cerrado') {
      const evidenciasPrevias = await client.query(
        'SELECT COUNT(*)::int AS n FROM evidencia WHERE id_requerimiento = $1', [id]
      );
      const hayEvidencia = (evidencia && evidencia.descripcion && evidencia.descripcion.trim()) || evidenciasPrevias.rows[0].n > 0;
      if (!hayEvidencia) {
        throw AppError.unprocessable('El cierre requiere registrar evidencia o validacion funcional (RN-10)');
      }
      if (evidencia && evidencia.descripcion && evidencia.descripcion.trim()) {
        evidenciaCierre = evidencia.descripcion.trim();
      }
    }

    // Registrar observacion adjunta si viene.
    if (observacion && observacion.trim()) {
      await client.query(
        'INSERT INTO observacion (id_requerimiento, contenido, id_usuario) VALUES ($1,$2,$3)',
        [id, observacion.trim(), usuario.id]
      );
    }

    // Registrar evidencia adjunta si viene.
    if (evidencia && evidencia.descripcion && evidencia.descripcion.trim()) {
      await client.query(
        'INSERT INTO evidencia (id_requerimiento, tipo, descripcion, id_usuario) VALUES ($1,$2,$3,$4)',
        [id, evidencia.tipo || 'validacion', evidencia.descripcion.trim(), usuario.id]
      );
    }

    // Aplicar el cambio de estado.
    const esCierre = estadoDestino.codigo === 'cerrado';
    await client.query(
      `UPDATE requerimiento
          SET id_estado = $2,
              fecha_cierre = ${esCierre ? 'now()' : 'fecha_cierre'},
              evidencia_cierre = $3
        WHERE id_requerimiento = $1`,
      [id, estadoDestino.id_estado, evidenciaCierre]
    );

    await registrarHistorial(client, {
      idReq: id, campo: 'estado', anterior: estadoActual.nombre_estado, nuevo: estadoDestino.nombre_estado,
      idUsuario: usuario.id, rol: rolEjecucion,
    });

    const { rows } = await client.query(`${SELECT_BASE} WHERE r.id_requerimiento = $1`, [id]);
    return rows[0];
  });
}

/**
 * Agrega una observacion de seguimiento (RF-12). Queda asociada al
 * requerimiento y a un usuario identificable (RN-08).
 */
async function agregarObservacion(id, contenido, usuario) {
  if (!contenido || !contenido.trim()) throw AppError.unprocessable('La observacion no puede estar vacia (RN-08)');
  const existe = await db.query('SELECT 1 FROM requerimiento WHERE id_requerimiento = $1', [id]);
  if (!existe.rows[0]) throw AppError.notFound('Requerimiento no encontrado');

  const { rows } = await db.query(
    `INSERT INTO observacion (id_requerimiento, contenido, id_usuario)
     VALUES ($1,$2,$3)
     RETURNING id_observacion, id_requerimiento, contenido, fecha`,
    [id, contenido.trim(), usuario.id]
  );
  return rows[0];
}

/**
 * Registra una evidencia o validacion funcional (RF-13).
 */
async function agregarEvidencia(id, { tipo, descripcion }, usuario) {
  if (!descripcion || !descripcion.trim()) throw AppError.unprocessable('La descripcion de la evidencia es obligatoria');
  const existe = await db.query('SELECT 1 FROM requerimiento WHERE id_requerimiento = $1', [id]);
  if (!existe.rows[0]) throw AppError.notFound('Requerimiento no encontrado');

  const { rows } = await db.query(
    `INSERT INTO evidencia (id_requerimiento, tipo, descripcion, id_usuario)
     VALUES ($1,$2,$3,$4)
     RETURNING id_evidencia, id_requerimiento, tipo, descripcion, fecha`,
    [id, tipo || 'validacion', descripcion.trim(), usuario.id]
  );
  return rows[0];
}

/**
 * Vista previa de la sugerencia para el formulario de registro (RF-14),
 * sin persistir nada todavia.
 */
async function previewSugerencia(descripcion, idProyecto) {
  let soportePrioritario = false;
  if (idProyecto) {
    const { rows } = await db.query('SELECT soporte_prioritario FROM proyecto WHERE id_proyecto = $1', [idProyecto]);
    soportePrioritario = rows[0] ? rows[0].soporte_prioritario : false;
  }
  return sugerenciaService.sugerir(descripcion, { soportePrioritario });
}

module.exports = {
  listar,
  tablero,
  obtenerDetalle,
  crear,
  actualizar,
  cambiarPrioridad,
  asignarResponsable,
  cambiarEstado,
  agregarObservacion,
  agregarEvidencia,
  previewSugerencia,
};
