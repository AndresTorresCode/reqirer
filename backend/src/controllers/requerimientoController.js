'use strict';

const asyncHandler = require('../utils/asyncHandler');
const requerimientoService = require('../services/requerimientoService');

const listar = asyncHandler(async (req, res) => {
  const { proyecto, estado, prioridad, responsable, tipo, q } = req.query;
  res.json(await requerimientoService.listar({ proyecto, estado, prioridad, responsable, tipo, q }));
});

const tablero = asyncHandler(async (req, res) => {
  const { proyecto, prioridad, responsable, tipo } = req.query;
  res.json(await requerimientoService.tablero({ proyecto, prioridad, responsable, tipo }));
});

const obtener = asyncHandler(async (req, res) => {
  res.json(await requerimientoService.obtenerDetalle(req.params.id));
});

const crear = asyncHandler(async (req, res) => {
  const requerimiento = await requerimientoService.crear(req.body, req.user);
  res.status(201).json(requerimiento);
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await requerimientoService.actualizar(req.params.id, req.body, req.user));
});

const cambiarEstado = asyncHandler(async (req, res) => {
  res.json(await requerimientoService.cambiarEstado(req.params.id, req.body, req.user));
});

const cambiarPrioridad = asyncHandler(async (req, res) => {
  res.json(await requerimientoService.cambiarPrioridad(req.params.id, req.body.prioridad || req.body.id_prioridad, req.user));
});

const asignarResponsable = asyncHandler(async (req, res) => {
  res.json(await requerimientoService.asignarResponsable(req.params.id, req.body.id_responsable, req.user));
});

const agregarObservacion = asyncHandler(async (req, res) => {
  const obs = await requerimientoService.agregarObservacion(req.params.id, req.body.contenido, req.user);
  res.status(201).json(obs);
});

const agregarEvidencia = asyncHandler(async (req, res) => {
  const evi = await requerimientoService.agregarEvidencia(req.params.id, req.body, req.user);
  res.status(201).json(evi);
});

const previewSugerencia = asyncHandler(async (req, res) => {
  const { descripcion, id_proyecto } = req.body;
  res.json(await requerimientoService.previewSugerencia(descripcion, id_proyecto));
});

module.exports = {
  listar,
  tablero,
  obtener,
  crear,
  actualizar,
  cambiarEstado,
  cambiarPrioridad,
  asignarResponsable,
  agregarObservacion,
  agregarEvidencia,
  previewSugerencia,
};
