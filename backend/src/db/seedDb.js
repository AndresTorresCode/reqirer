'use strict';

/**
 * Carga los catalogos del proceso y un conjunto amplio de datos de
 * demostracion. Uso: npm run db:seed   (requiere haber corrido db:init antes)
 *
 * Catalogos sembrados (coherentes con la Fase 1 y Fase 2):
 *   - 4 roles internos (Tabla 11)
 *   - 4 tipos de requerimiento (RF-04)
 *   - 3 niveles de prioridad (RF-05)
 *   - 6 estados del flujo (Tabla 12)
 *   - 6 transiciones permitidas (Tabla 13)
 *
 * Datos demo: 7 usuarios, 6 proyectos y ~26 requerimientos repartidos en los
 * 6 estados, con historial de transiciones, observaciones (RF-12), evidencias
 * (RF-13) y sugerencias automaticas (RF-14), para que el listado, el tablero
 * y el detalle se vean poblados de forma realista.
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const config = require('../config/env');

const ROLES = [
  { codigo: 'registrador', nombre: 'Usuario interno solicitante o registrador', permisos: 'Consultar proyectos, registrar requerimientos y aportar observaciones de seguimiento.' },
  { codigo: 'lider', nombre: 'Lider de desarrollo o responsable de priorizacion', permisos: 'Revisar requerimientos, ajustar prioridad, asignar responsable y aprobar para desarrollo.' },
  { codigo: 'desarrollador', nombre: 'Responsable tecnico o desarrollador', permisos: 'Actualizar estado, registrar observaciones de avance y reportar ajustes.' },
  { codigo: 'validador', nombre: 'Rol de validacion o revision', permisos: 'Registrar validacion funcional, observacion de cierre y evidencia asociada.' },
];

const TIPOS = [
  { codigo: 'incidencia', nombre: 'Incidencia', descripcion: 'Error reportado sobre algo que ya funcionaba.' },
  { codigo: 'ajuste', nombre: 'Ajuste', descripcion: 'Cambio sobre una funcionalidad existente.' },
  { codigo: 'mejora', nombre: 'Mejora', descripcion: 'Optimizacion o valor agregado opcional.' },
  { codigo: 'nueva_funcionalidad', nombre: 'Nueva funcionalidad', descripcion: 'Capacidad nueva no existente antes.' },
];

const PRIORIDADES = [
  { codigo: 'alta', nombre: 'Alta', orden: 1 },
  { codigo: 'media', nombre: 'Media', orden: 2 },
  { codigo: 'baja', nombre: 'Baja', orden: 3 },
];

const ESTADOS = [
  { codigo: 'registrado', nombre: 'Registrado', orden: 1, final: false },
  { codigo: 'en_analisis', nombre: 'En analisis', orden: 2, final: false },
  { codigo: 'aprobado', nombre: 'Aprobado', orden: 3, final: false },
  { codigo: 'en_desarrollo', nombre: 'En desarrollo', orden: 4, final: false },
  { codigo: 'en_pruebas', nombre: 'En pruebas', orden: 5, final: false },
  { codigo: 'cerrado', nombre: 'Cerrado', orden: 6, final: true },
];

// Transiciones permitidas (Tabla 13). roles indica quien puede ejecutarlas.
const TRANSICIONES = [
  { origen: 'registrado', destino: 'en_analisis', condicion: 'La solicitud cuenta con informacion minima para revision.', roles: ['lider', 'registrador'] },
  { origen: 'en_analisis', destino: 'aprobado', condicion: 'El lider confirma que el requerimiento puede atenderse.', roles: ['lider'] },
  { origen: 'aprobado', destino: 'en_desarrollo', condicion: 'Existe un responsable asignado.', roles: ['lider', 'desarrollador'] },
  { origen: 'en_desarrollo', destino: 'en_pruebas', condicion: 'El responsable reporta avance suficiente para revision.', roles: ['lider', 'desarrollador'] },
  { origen: 'en_pruebas', destino: 'en_desarrollo', condicion: 'La validacion encuentra ajustes; queda registrada una observacion.', roles: ['lider', 'validador'] },
  { origen: 'en_pruebas', destino: 'cerrado', condicion: 'La validacion funcional se acepta y queda evidencia registrada.', roles: ['lider', 'validador'] },
];

const PASSWORD_DEMO = 'Dexter2026*';

const USUARIOS = [
  { nombre: 'Andres Torres Cadena', correo: 'andres@dexterlatam.com', roles: ['registrador', 'lider', 'desarrollador', 'validador'] },
  { nombre: 'Jessica Dussan', correo: 'jessica@dexterlatam.com', roles: ['registrador'] },
  { nombre: 'Laura Gomez', correo: 'lider@dexterlatam.com', roles: ['lider'] },
  { nombre: 'Carlos Medina', correo: 'dev@dexterlatam.com', roles: ['desarrollador'] },
  { nombre: 'Paula Rios', correo: 'qa@dexterlatam.com', roles: ['validador'] },
  { nombre: 'Mateo Ruiz', correo: 'mateo@dexterlatam.com', roles: ['desarrollador'] },
  { nombre: 'Sofia Lopez', correo: 'sofia@dexterlatam.com', roles: ['validador'] },
];

const PROYECTOS = [
  { nombre: 'Portal de Clientes Acme', cliente: 'Acme S.A.', descripcion: 'Portal transaccional para clientes de Acme.', soporte: true },
  { nombre: 'App Logistica Transcol', cliente: 'Transcol Ltda.', descripcion: 'Aplicacion de seguimiento de envios.', soporte: false },
  { nombre: 'Sitio Web Corporativo Dexter', cliente: 'Interno Dexter', descripcion: 'Sitio institucional de la empresa.', soporte: false },
  { nombre: 'Sistema de Facturacion Nueva Era', cliente: 'Nueva Era SAS', descripcion: 'Modulo de facturacion electronica para Nueva Era.', soporte: true },
  { nombre: 'Plataforma E-learning Aula Viva', cliente: 'Aula Viva', descripcion: 'Plataforma de cursos en linea y seguimiento de estudiantes.', soporte: false },
  { nombre: 'App Movil Banca Coopser', cliente: 'Coopser', descripcion: 'Aplicacion movil de banca para la cooperativa Coopser.', soporte: true },
];

// Orden del flujo, para reconstruir el camino de transiciones de cada estado.
const ORDEN_ESTADOS = ['registrado', 'en_analisis', 'aprobado', 'en_desarrollo', 'en_pruebas', 'cerrado'];

/**
 * Conjunto de requerimientos de demostracion. Campos opcionales:
 *   resp: correo del responsable (obligatorio de aprobado en adelante)
 *   dias: dias atras en que se registro (para fechas realistas)
 *   obj:  dias despues del registro como fecha objetivo
 *   obs:  observaciones [{ correo, texto }]
 *   sug:  sugerencia automatica { tipo, prio, motivo, aceptada }
 */
const REQS = [
  // ---------------- REGISTRADO ----------------
  { proy: 0, desc: 'El boton de guardar no responde en el formulario de pedidos.', sol: 'Cliente Acme', tipo: 'incidencia', prio: 'alta', estado: 'registrado', dias: 2,
    sug: { tipo: 'incidencia', prio: 'alta', motivo: 'Texto indica fallo ("no responde") y el proyecto tiene soporte prioritario.', aceptada: false } },
  { proy: 3, desc: 'La factura electronica no descarga el PDF en el navegador Safari.', sol: 'Contabilidad Nueva Era', tipo: 'incidencia', prio: 'alta', estado: 'registrado', dias: 3,
    obs: [{ correo: 'jessica@dexterlatam.com', texto: 'El cliente adjunto un video del error; se reproduce solo en Safari.' }] },
  { proy: 4, desc: 'Permitir descargar un certificado en PDF de los cursos terminados.', sol: 'Coordinacion Aula Viva', tipo: 'nueva_funcionalidad', prio: 'media', estado: 'registrado', dias: 5 },
  { proy: 5, desc: 'Agregar modo oscuro (tema oscuro) a la aplicacion movil.', sol: 'Usuarios Coopser', tipo: 'mejora', prio: 'baja', estado: 'registrado', dias: 6,
    sug: { tipo: 'mejora', prio: 'baja', motivo: 'Solicitud opcional de apariencia, sin impacto funcional.', aceptada: false } },
  { proy: 1, desc: 'Cambiar el formato de fecha a dd/mm/aaaa en la pantalla de rastreo.', sol: 'Operaciones Transcol', tipo: 'ajuste', prio: 'media', estado: 'registrado', dias: 8 },

  // ---------------- EN ANALISIS ----------------
  { proy: 0, desc: 'Cambiar la etiqueta del campo "NIT" por "Documento" en el registro.', sol: 'Cliente Acme', tipo: 'ajuste', prio: 'media', estado: 'en_analisis', dias: 12,
    obs: [{ correo: 'lider@dexterlatam.com', texto: 'Revisar si afecta validaciones del documento antes de aprobar.' }] },
  { proy: 3, desc: 'Integrar la facturacion con la DIAN para validacion en linea.', sol: 'Gerencia Nueva Era', tipo: 'nueva_funcionalidad', prio: 'alta', estado: 'en_analisis', dias: 14, obj: 45,
    obs: [{ correo: 'lider@dexterlatam.com', texto: 'Requiere credenciales del ambiente de pruebas de la DIAN.' }],
    sug: { tipo: 'nueva_funcionalidad', prio: 'alta', motivo: 'Capacidad nueva y critica para el negocio; proyecto con soporte prioritario.', aceptada: true } },
  { proy: 2, desc: 'Optimizar las imagenes de la pagina de inicio para que cargue mas rapido.', sol: 'Mercadeo Dexter', tipo: 'mejora', prio: 'baja', estado: 'en_analisis', dias: 16 },
  { proy: 5, desc: 'Algunos usuarios no reciben el codigo OTP por SMS al iniciar sesion.', sol: 'Soporte Coopser', tipo: 'incidencia', prio: 'media', estado: 'en_analisis', dias: 18,
    obs: [{ correo: 'jessica@dexterlatam.com', texto: 'Parece intermitente y solo con un operador movil.' }] },

  // ---------------- APROBADO ----------------
  { proy: 1, desc: 'Agregar exportacion a Excel del listado de envios.', sol: 'Operaciones Transcol', tipo: 'nueva_funcionalidad', prio: 'media', estado: 'aprobado', dias: 20, obj: 30, resp: 'dev@dexterlatam.com' },
  { proy: 4, desc: 'Habilitar un foro de preguntas y respuestas por curso.', sol: 'Docentes Aula Viva', tipo: 'nueva_funcionalidad', prio: 'media', estado: 'aprobado', dias: 22, obj: 40, resp: 'mateo@dexterlatam.com',
    obs: [{ correo: 'lider@dexterlatam.com', texto: 'Aprobado para el siguiente sprint; definir moderacion de mensajes.' }] },
  { proy: 0, desc: 'Agregar un filtro por estado de pedido en el portal de clientes.', sol: 'Cliente Acme', tipo: 'ajuste', prio: 'alta', estado: 'aprobado', dias: 24, resp: 'dev@dexterlatam.com',
    sug: { tipo: 'ajuste', prio: 'alta', motivo: 'Cambio sobre funcionalidad existente; cliente con soporte prioritario.', aceptada: true } },
  { proy: 3, desc: 'Mostrar un resumen mensual de facturacion en el panel principal.', sol: 'Contabilidad Nueva Era', tipo: 'mejora', prio: 'media', estado: 'aprobado', dias: 26, resp: 'mateo@dexterlatam.com' },

  // ---------------- EN DESARROLLO ----------------
  { proy: 1, desc: 'La pantalla de rastreo carga lenta cuando hay muchos envios.', sol: 'Soporte Transcol', tipo: 'incidencia', prio: 'alta', estado: 'en_desarrollo', dias: 28, obj: 12, resp: 'dev@dexterlatam.com',
    obs: [{ correo: 'dev@dexterlatam.com', texto: 'Identificado: faltan indices en la consulta de envios. Agregando paginacion.' }] },
  { proy: 5, desc: 'Implementar transferencias entre cuentas propias del usuario.', sol: 'Producto Coopser', tipo: 'nueva_funcionalidad', prio: 'alta', estado: 'en_desarrollo', dias: 30, obj: 20, resp: 'mateo@dexterlatam.com',
    obs: [{ correo: 'mateo@dexterlatam.com', texto: 'Avance 60%: pantalla lista, falta confirmacion con OTP.' }],
    sug: { tipo: 'nueva_funcionalidad', prio: 'alta', motivo: 'Funcionalidad core de banca; proyecto con soporte prioritario.', aceptada: true } },
  { proy: 3, desc: 'Permitir anular una factura emitida por error (con motivo).', sol: 'Contabilidad Nueva Era', tipo: 'ajuste', prio: 'media', estado: 'en_desarrollo', dias: 32, resp: 'dev@dexterlatam.com' },
  { proy: 4, desc: 'Agregar una barra de progreso del avance del curso.', sol: 'Coordinacion Aula Viva', tipo: 'mejora', prio: 'media', estado: 'en_desarrollo', dias: 34, resp: 'mateo@dexterlatam.com',
    obs: [{ correo: 'lider@dexterlatam.com', texto: 'Mantener consistencia visual con el resto de la plataforma.' }] },
  { proy: 0, desc: 'Permitir adjuntar archivos (imagenes/PDF) a un pedido.', sol: 'Cliente Acme', tipo: 'nueva_funcionalidad', prio: 'media', estado: 'en_desarrollo', dias: 36, obj: 18, resp: 'andres@dexterlatam.com' },

  // ---------------- EN PRUEBAS ----------------
  { proy: 2, desc: 'Mostrar testimonios de clientes en la pagina de inicio.', sol: 'Mercadeo Dexter', tipo: 'mejora', prio: 'baja', estado: 'en_pruebas', dias: 38, resp: 'dev@dexterlatam.com',
    obs: [{ correo: 'qa@dexterlatam.com', texto: 'En validacion: revisar comportamiento en moviles pequenos.' }] },
  { proy: 1, desc: 'Notificar por correo cuando un envio cambia de estado.', sol: 'Operaciones Transcol', tipo: 'nueva_funcionalidad', prio: 'media', estado: 'en_pruebas', dias: 40, resp: 'mateo@dexterlatam.com',
    obs: [{ correo: 'sofia@dexterlatam.com', texto: 'Los correos llegan; falta validar la plantilla en Outlook.' }] },
  { proy: 5, desc: 'Corregir el calculo del saldo disponible despues de un pago.', sol: 'Soporte Coopser', tipo: 'incidencia', prio: 'alta', estado: 'en_pruebas', dias: 42, resp: 'mateo@dexterlatam.com',
    sug: { tipo: 'incidencia', prio: 'alta', motivo: 'Error de calculo financiero; alto impacto y soporte prioritario.', aceptada: true } },
  { proy: 3, desc: 'Agregar el logo del cliente en el PDF de la factura.', sol: 'Gerencia Nueva Era', tipo: 'ajuste', prio: 'media', estado: 'en_pruebas', dias: 44, resp: 'dev@dexterlatam.com' },

  // ---------------- CERRADO ----------------
  { proy: 0, desc: 'Error 500 al pagar con tarjeta American Express.', sol: 'Cliente Acme', tipo: 'incidencia', prio: 'alta', estado: 'cerrado', dias: 52, resp: 'dev@dexterlatam.com',
    obs: [{ correo: 'dev@dexterlatam.com', texto: 'Causa: el proveedor de pagos rechazaba el prefijo de Amex. Corregido.' }],
    evid: 'Pago de prueba con Amex aprobado y registrado correctamente en el portal.' },
  { proy: 1, desc: 'Unificar el formato de los codigos de guia de los envios.', sol: 'Operaciones Transcol', tipo: 'ajuste', prio: 'media', estado: 'cerrado', dias: 58, resp: 'mateo@dexterlatam.com',
    evid: 'Reporte de guias muestra el formato unificado en todos los envios.' },
  { proy: 4, desc: 'Exportar a Excel el listado de estudiantes inscritos.', sol: 'Coordinacion Aula Viva', tipo: 'nueva_funcionalidad', prio: 'media', estado: 'cerrado', dias: 63, resp: 'dev@dexterlatam.com',
    obs: [{ correo: 'sofia@dexterlatam.com', texto: 'Validado: el archivo abre en Excel y LibreOffice sin errores.' }],
    evid: 'Archivo de exportacion verificado con 320 estudiantes de prueba.' },
  { proy: 2, desc: 'Agregar enlaces a redes sociales en el pie de pagina.', sol: 'Mercadeo Dexter', tipo: 'mejora', prio: 'baja', estado: 'cerrado', dias: 68, resp: 'andres@dexterlatam.com',
    evid: 'Enlaces a redes verificados; abren en una pestana nueva.' },
];

const DIA_MS = 86400000;

function iso(date) {
  return date.toISOString();
}

function soloFecha(date) {
  return date.toISOString().slice(0, 10);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Limpieza idempotente de datos (respeta dependencias via TRUNCATE CASCADE).
    await client.query(`TRUNCATE
      sugerencia_automatica, evidencia, observacion, historial_cambio,
      requerimiento, transicion_estado, estado_requerimiento, prioridad,
      tipo_requerimiento, usuario_rol, usuario, rol, proyecto
      RESTART IDENTITY CASCADE`);

    // --- Roles ---
    const rolId = {};
    for (const r of ROLES) {
      const { rows } = await client.query(
        'INSERT INTO rol (codigo, nombre_rol, permisos_basicos) VALUES ($1,$2,$3) RETURNING id_rol',
        [r.codigo, r.nombre, r.permisos]
      );
      rolId[r.codigo] = rows[0].id_rol;
    }

    // --- Catalogos ---
    const tipoId = {};
    for (const t of TIPOS) {
      const { rows } = await client.query(
        'INSERT INTO tipo_requerimiento (codigo, nombre_tipo, descripcion) VALUES ($1,$2,$3) RETURNING id_tipo',
        [t.codigo, t.nombre, t.descripcion]
      );
      tipoId[t.codigo] = rows[0].id_tipo;
    }

    const prioridadId = {};
    for (const p of PRIORIDADES) {
      const { rows } = await client.query(
        'INSERT INTO prioridad (codigo, nombre_prioridad, orden) VALUES ($1,$2,$3) RETURNING id_prioridad',
        [p.codigo, p.nombre, p.orden]
      );
      prioridadId[p.codigo] = rows[0].id_prioridad;
    }

    const estadoId = {};
    for (const e of ESTADOS) {
      const { rows } = await client.query(
        'INSERT INTO estado_requerimiento (codigo, nombre_estado, orden_flujo, es_final) VALUES ($1,$2,$3,$4) RETURNING id_estado',
        [e.codigo, e.nombre, e.orden, e.final]
      );
      estadoId[e.codigo] = rows[0].id_estado;
    }
    const nombreEstado = Object.fromEntries(ESTADOS.map((e) => [e.codigo, e.nombre]));

    // --- Transiciones ---
    for (const tr of TRANSICIONES) {
      await client.query(
        `INSERT INTO transicion_estado (id_estado_origen, id_estado_destino, condicion, roles_autorizados)
         VALUES ($1,$2,$3,$4)`,
        [estadoId[tr.origen], estadoId[tr.destino], tr.condicion, tr.roles]
      );
    }

    // --- Usuarios ---
    const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
    const usuarioId = {};
    for (const u of USUARIOS) {
      const { rows } = await client.query(
        'INSERT INTO usuario (nombre, correo, password_hash) VALUES ($1,$2,$3) RETURNING id_usuario',
        [u.nombre, u.correo, passwordHash]
      );
      usuarioId[u.correo] = rows[0].id_usuario;
      for (const rc of u.roles) {
        await client.query(
          'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1,$2)',
          [rows[0].id_usuario, rolId[rc]]
        );
      }
    }

    // --- Proyectos ---
    const proyectoId = [];
    for (const p of PROYECTOS) {
      const { rows } = await client.query(
        'INSERT INTO proyecto (nombre, cliente_referencia, descripcion, soporte_prioritario) VALUES ($1,$2,$3,$4) RETURNING id_proyecto',
        [p.nombre, p.cliente, p.descripcion, p.soporte]
      );
      proyectoId.push(rows[0].id_proyecto);
    }

    // Determina quien ejecuta cada transicion y bajo que rol.
    const actorTransicion = (origen, destino, respId) => {
      const clave = `${origen}>${destino}`;
      if (clave === 'aprobado>en_desarrollo' || clave === 'en_desarrollo>en_pruebas') {
        return { rol: 'desarrollador', uid: respId || usuarioId['dev@dexterlatam.com'] };
      }
      if (clave === 'en_pruebas>cerrado') {
        return { rol: 'validador', uid: usuarioId['qa@dexterlatam.com'] };
      }
      return { rol: 'lider', uid: usuarioId['lider@dexterlatam.com'] };
    };

    // --- Requerimientos de demostracion ---
    const creadorPorDefecto = usuarioId['jessica@dexterlatam.com'];
    const ahora = Date.now();
    let consecutivo = 1;

    for (const r of REQS) {
      const codigo = `REQ-${String(consecutivo).padStart(4, '0')}`;
      const idxEstado = ORDEN_ESTADOS.indexOf(r.estado);
      const respId = r.resp ? usuarioId[r.resp] : null;
      const fechaReg = new Date(ahora - (r.dias || 10) * DIA_MS);
      const esCerrado = r.estado === 'cerrado';

      // Fechas: objetivo y cierre.
      const fechaObjetivo = r.obj ? soloFecha(new Date(fechaReg.getTime() + r.obj * DIA_MS)) : null;
      // El cierre ocurre en la ultima transicion (se calcula abajo); reservamos.
      const numTransiciones = idxEstado; // cuantas transiciones desde "registrado"
      const fechaCierre = esCerrado
        ? iso(new Date(fechaReg.getTime() + (ahora - fechaReg.getTime()) * (numTransiciones / (numTransiciones + 1))))
        : null;
      const evidenciaCierre = esCerrado ? (r.evid || 'Validacion funcional aceptada.') : null;

      const { rows } = await client.query(
        `INSERT INTO requerimiento
          (codigo, id_proyecto, descripcion, solicitante, id_tipo, id_prioridad, id_estado,
           id_responsable, id_creador, fecha_registro, fecha_objetivo, fecha_cierre, evidencia_cierre)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id_requerimiento`,
        [
          codigo,
          proyectoId[r.proy],
          r.desc,
          r.sol,
          tipoId[r.tipo],
          prioridadId[r.prio],
          estadoId[r.estado],
          respId,
          creadorPorDefecto,
          iso(fechaReg),
          fechaObjetivo,
          fechaCierre,
          evidenciaCierre,
        ]
      );
      const reqId = rows[0].id_requerimiento;

      // Historial: creacion.
      await client.query(
        `INSERT INTO historial_cambio (id_requerimiento, campo_modificado, valor_anterior, valor_nuevo, id_usuario, rol_ejecucion, fecha)
         VALUES ($1, 'creacion', NULL, $2, $3, 'registrador', $4)`,
        [reqId, `Requerimiento ${codigo} registrado`, creadorPorDefecto, iso(fechaReg)]
      );

      // Historial: asignacion de responsable (RF-06), si aplica.
      if (respId) {
        const fechaAsignacion = iso(new Date(fechaReg.getTime() + (ahora - fechaReg.getTime()) * 0.25));
        await client.query(
          `INSERT INTO historial_cambio (id_requerimiento, campo_modificado, valor_anterior, valor_nuevo, id_usuario, rol_ejecucion, fecha)
           VALUES ($1, 'responsable', NULL, $2, $3, 'lider', $4)`,
          [reqId, USUARIOS.find((u) => u.correo === r.resp).nombre, usuarioId['lider@dexterlatam.com'], fechaAsignacion]
        );
      }

      // Historial: transiciones de estado a lo largo del flujo (RF-07, RF-08).
      for (let i = 0; i < numTransiciones; i += 1) {
        const origen = ORDEN_ESTADOS[i];
        const destino = ORDEN_ESTADOS[i + 1];
        const actor = actorTransicion(origen, destino, respId);
        const fechaTrans = iso(new Date(fechaReg.getTime() + (ahora - fechaReg.getTime()) * ((i + 1) / (numTransiciones + 1))));
        await client.query(
          `INSERT INTO historial_cambio (id_requerimiento, campo_modificado, valor_anterior, valor_nuevo, id_usuario, rol_ejecucion, fecha)
           VALUES ($1, 'estado', $2, $3, $4, $5, $6)`,
          [reqId, nombreEstado[origen], nombreEstado[destino], actor.uid, actor.rol, fechaTrans]
        );
      }

      // Observaciones (RF-12).
      if (Array.isArray(r.obs)) {
        for (let j = 0; j < r.obs.length; j += 1) {
          const o = r.obs[j];
          const fechaObs = iso(new Date(fechaReg.getTime() + (ahora - fechaReg.getTime()) * (0.5 + j * 0.1)));
          await client.query(
            `INSERT INTO observacion (id_requerimiento, contenido, id_usuario, fecha) VALUES ($1,$2,$3,$4)`,
            [reqId, o.texto, usuarioId[o.correo], fechaObs]
          );
        }
      }

      // Evidencia (RF-13): para cerrados, evidencia de cierre.
      if (esCerrado) {
        await client.query(
          `INSERT INTO evidencia (id_requerimiento, tipo, descripcion, id_usuario, fecha) VALUES ($1,'cierre',$2,$3,$4)`,
          [reqId, evidenciaCierre, usuarioId['qa@dexterlatam.com'], fechaCierre]
        );
      }

      // Sugerencia automatica (RF-14).
      if (r.sug) {
        await client.query(
          `INSERT INTO sugerencia_automatica (id_requerimiento, tipo_sugerido, prioridad_sugerida, motivo, aceptada, fecha)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [reqId, r.sug.tipo, r.sug.prio, r.sug.motivo, r.sug.aceptada, iso(fechaReg)]
        );
      }

      consecutivo += 1;
    }

    await client.query('COMMIT');

    // Destino legible (sin credenciales) para distinguir local vs Railway.
    let destino = config.db.database;
    if (config.db.connectionString) {
      try {
        const u = new URL(config.db.connectionString);
        destino = `${u.hostname}:${u.port || 5432}${u.pathname}`;
      } catch (_e) {
        destino = '(DATABASE_URL)';
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[db] Datos de demostracion cargados sobre ${destino}.`);
    // eslint-disable-next-line no-console
    console.log(`[db] ${PROYECTOS.length} proyectos, ${USUARIOS.length} usuarios y ${REQS.length} requerimientos.`);
    // eslint-disable-next-line no-console
    console.log(`[db] Usuarios demo (clave comun: ${PASSWORD_DEMO}):`);
    USUARIOS.forEach((u) => console.log(`      - ${u.correo} -> ${u.roles.join(', ')}`));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[db] Error al sembrar datos:', err.message);
      process.exit(1);
    });
}

module.exports = seed;
