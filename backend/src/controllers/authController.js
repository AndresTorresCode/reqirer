'use strict';

const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

const login = asyncHandler(async (req, res) => {
  const { correo, password } = req.body;
  const resultado = await authService.login(correo, password);
  res.json(resultado);
});

const me = asyncHandler(async (req, res) => {
  res.json({ usuario: req.user });
});

module.exports = { login, me };
