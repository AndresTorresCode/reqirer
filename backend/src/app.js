'use strict';

/**
 * Construccion de la aplicacion Express. Se separa de la puesta en marcha
 * del servidor (server.js) para poder importarla en las pruebas con
 * supertest sin abrir un puerto.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const config = require('./config/env');
const apiRouter = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');

function createApp() {
  const app = express();

  // ¿Servimos el frontend compilado desde este mismo servicio? (deploy de un
  // solo servicio en Railway). Solo si esta habilitado y el build existe.
  const servingClient =
    config.serveClient && fs.existsSync(path.join(config.clientDistPath, 'index.html'));

  // Seguridad de cabeceras HTTP (apoya RNF-09). Cuando ademas servimos la SPA,
  // se ajusta la politica de contenido (CSP) para permitir el bundle propio y
  // los estilos en linea que genera React.
  app.use(
    helmet(
      servingClient
        ? {
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:'],
                fontSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
              },
            },
          }
        : undefined
    )
  );
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());

  // Registro de peticiones (silencioso durante las pruebas).
  if (!config.isTest) {
    app.use(morgan('dev'));
  }

  app.use('/api', apiRouter);

  // Servir el frontend compilado y resolver el enrutado del SPA: cualquier GET
  // que no comience por /api devuelve index.html para que React Router maneje
  // la ruta en el cliente. Las rutas /api desconocidas siguen cayendo en el 404.
  if (servingClient) {
    app.use(express.static(config.clientDistPath));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(config.clientDistPath, 'index.html'));
    });
  }

  // Recurso no encontrado.
  app.use((req, _res, next) => {
    next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
  });

  // Manejo central de errores.
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
