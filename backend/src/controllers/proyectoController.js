'use strict';

const asyncHandler = require('../utils/asyncHandler');
const proyectoService = require('../services/proyectoService');

const listar = asyncHandler(async (req, res) => {
  const { q, estado } = req.query;
  res.json(await proyectoService.listar({ q, estado }));
});

const obtener = asyncHandler(async (req, res) => {
  res.json(await proyectoService.obtenerPorId(req.params.id));
});

const crear = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.crear(req.body);
  res.status(201).json(proyecto);
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await proyectoService.actualizar(req.params.id, req.body));
});

module.exports = { listar, obtener, crear, actualizar };
