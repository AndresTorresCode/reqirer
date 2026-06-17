'use strict';

const asyncHandler = require('../utils/asyncHandler');
const usuarioService = require('../services/usuarioService');

const listar = asyncHandler(async (req, res) => {
  res.json(await usuarioService.listar({ rol: req.query.rol }));
});

module.exports = { listar };
