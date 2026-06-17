'use strict';

const asyncHandler = require('../utils/asyncHandler');
const catalogoService = require('../services/catalogoService');

const obtenerTodos = asyncHandler(async (_req, res) => {
  const catalogos = await catalogoService.obtenerTodos();
  res.json(catalogos);
});

const transiciones = asyncHandler(async (_req, res) => {
  res.json(await catalogoService.listarTransiciones());
});

module.exports = { obtenerTodos, transiciones };
