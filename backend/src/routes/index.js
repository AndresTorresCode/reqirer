'use strict';

/**
 * Enrutador principal del API. Agrupa los recursos del modulo bajo /api.
 */
const { Router } = require('express');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

const authController = require('../controllers/authController');
const catalogoController = require('../controllers/catalogoController');
const proyectoController = require('../controllers/proyectoController');
const usuarioController = require('../controllers/usuarioController');
const requerimientoController = require('../controllers/requerimientoController');

const router = Router();

// Salud del servicio (sin autenticacion).
router.get('/health', (_req, res) => res.json({ status: 'ok', servicio: 'modulo-requerimientos' }));

// ---------------- Autenticacion (RNF-09) ----------------
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.me);

// ---------------- Catalogos (consulta para cualquier rol) ----------------
router.get('/catalogos', authenticate, catalogoController.obtenerTodos);
router.get('/catalogos/transiciones', authenticate, catalogoController.transiciones);

// ---------------- Usuarios ----------------
router.get('/usuarios', authenticate, usuarioController.listar);

// ---------------- Proyectos (RF-01, RF-02) ----------------
router.get('/proyectos', authenticate, proyectoController.listar);
router.get('/proyectos/:id', authenticate, proyectoController.obtener);
router.post('/proyectos', authenticate, authorize('lider'), proyectoController.crear);
router.put('/proyectos/:id', authenticate, authorize('lider'), proyectoController.actualizar);

// ---------------- Requerimientos (RF-03 .. RF-14) ----------------
// Consultas: cualquier rol autenticado.
router.get('/requerimientos', authenticate, requerimientoController.listar);
router.get('/requerimientos/tablero', authenticate, requerimientoController.tablero);
router.get('/requerimientos/:id', authenticate, requerimientoController.obtener);

// Registro y edicion de alcance (RF-03, RF-04): registrador o lider.
router.post('/requerimientos', authenticate, authorize('registrador', 'lider'), requerimientoController.crear);
router.put('/requerimientos/:id', authenticate, authorize('registrador', 'lider'), requerimientoController.actualizar);

// Prioridad (RF-05) y responsable (RF-06): lider.
router.patch('/requerimientos/:id/prioridad', authenticate, authorize('lider'), requerimientoController.cambiarPrioridad);
router.patch('/requerimientos/:id/responsable', authenticate, authorize('lider'), requerimientoController.asignarResponsable);

// Estado (RF-07): el rol exacto se valida por transicion en el servicio.
router.patch('/requerimientos/:id/estado', authenticate, requerimientoController.cambiarEstado);

// Observaciones (RF-12): cualquier rol activo.
router.post('/requerimientos/:id/observaciones', authenticate, requerimientoController.agregarObservacion);

// Evidencia / validacion de cierre (RF-13): desarrollador, validador o lider.
router.post('/requerimientos/:id/evidencias', authenticate, authorize('desarrollador', 'validador', 'lider'), requerimientoController.agregarEvidencia);

// Vista previa de sugerencia (RF-14): registrador o lider (durante el registro).
router.post('/requerimientos-sugerencia', authenticate, authorize('registrador', 'lider'), requerimientoController.previewSugerencia);

module.exports = router;
