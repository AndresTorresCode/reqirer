-- =====================================================================
-- ESQUEMA FISICO DEL MODULO DE GESTION DE REQUERIMIENTOS
-- Dexter LATAM SAS - Fase 3 / Objetivo 3
--
-- Traduce el modelo logico de la Fase 2 (Tablas 14, 15 y 16) a un
-- esquema relacional en PostgreSQL. Conserva las tres familias de
-- entidades definidas en el diseno:
--   1. Contexto:      proyecto, usuario, rol
--   2. Nucleo:        requerimiento + catalogos (tipo, prioridad, estado)
--   3. Trazabilidad:  historial_cambio, observacion, evidencia,
--                     sugerencia_automatica
-- =====================================================================

-- Se eliminan en orden inverso a las dependencias para permitir recargas.
DROP TABLE IF EXISTS sugerencia_automatica CASCADE;
DROP TABLE IF EXISTS evidencia CASCADE;
DROP TABLE IF EXISTS observacion CASCADE;
DROP TABLE IF EXISTS historial_cambio CASCADE;
DROP TABLE IF EXISTS requerimiento CASCADE;
DROP TABLE IF EXISTS transicion_estado CASCADE;
DROP TABLE IF EXISTS estado_requerimiento CASCADE;
DROP TABLE IF EXISTS prioridad CASCADE;
DROP TABLE IF EXISTS tipo_requerimiento CASCADE;
DROP TABLE IF EXISTS usuario_rol CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS rol CASCADE;
DROP TABLE IF EXISTS proyecto CASCADE;

-- ---------------------------------------------------------------------
-- ENTIDADES DE CONTEXTO
-- ---------------------------------------------------------------------

-- Rol: define los permisos basicos segun la responsabilidad interna (RNF-08).
CREATE TABLE rol (
  id_rol           SERIAL PRIMARY KEY,
  codigo           VARCHAR(30)  NOT NULL UNIQUE,
  nombre_rol       VARCHAR(80)  NOT NULL,
  permisos_basicos TEXT         NOT NULL DEFAULT ''
);

-- Usuario: actores internos que consultan, registran, atienden o validan.
CREATE TABLE usuario (
  id_usuario     SERIAL PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL,
  correo         VARCHAR(160) NOT NULL UNIQUE,
  password_hash  VARCHAR(200) NOT NULL,
  estado         VARCHAR(20)  NOT NULL DEFAULT 'activo'
                   CHECK (estado IN ('activo', 'inactivo')),
  fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Relacion N a N entre usuario y rol: un mismo usuario puede cumplir
-- varios roles, tal como senalo la entrevista ENT-01 (equipos pequenos).
CREATE TABLE usuario_rol (
  id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_rol     INTEGER NOT NULL REFERENCES rol(id_rol)         ON DELETE RESTRICT,
  PRIMARY KEY (id_usuario, id_rol)
);

-- Proyecto: agrupa requerimientos asociados a un cliente o iniciativa (RF-01).
CREATE TABLE proyecto (
  id_proyecto        SERIAL PRIMARY KEY,
  nombre             VARCHAR(150) NOT NULL,
  cliente_referencia VARCHAR(150),
  descripcion        TEXT,
  estado             VARCHAR(20)  NOT NULL DEFAULT 'activo'
                       CHECK (estado IN ('activo', 'inactivo', 'archivado')),
  -- Bandera para la regla de sugerencia: clientes con soporte prioritario
  -- elevan automaticamente la prioridad sugerida (RF-14).
  soporte_prioritario BOOLEAN     NOT NULL DEFAULT false,
  fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- CATALOGOS DEL NUCLEO DEL PROCESO
-- ---------------------------------------------------------------------

-- Tipo de requerimiento: incidencia, ajuste, mejora, nueva funcionalidad (RF-04).
CREATE TABLE tipo_requerimiento (
  id_tipo     SERIAL PRIMARY KEY,
  codigo      VARCHAR(30)  NOT NULL UNIQUE,
  nombre_tipo VARCHAR(80)  NOT NULL,
  descripcion TEXT
);

-- Prioridad: alta, media, baja (RF-05). orden permite ordenamiento.
CREATE TABLE prioridad (
  id_prioridad     SERIAL PRIMARY KEY,
  codigo           VARCHAR(20) NOT NULL UNIQUE,
  nombre_prioridad VARCHAR(40) NOT NULL,
  orden            INTEGER     NOT NULL
);

-- Estado del requerimiento: controla el avance dentro del flujo (RF-07).
CREATE TABLE estado_requerimiento (
  id_estado     SERIAL PRIMARY KEY,
  codigo        VARCHAR(30) NOT NULL UNIQUE,
  nombre_estado VARCHAR(60) NOT NULL,
  orden_flujo   INTEGER     NOT NULL,
  es_final      BOOLEAN     NOT NULL DEFAULT false
);

-- Transiciones permitidas entre estados (Tabla 13 de la Fase 2).
-- Cada transicion declara su condicion y los roles autorizados a
-- ejecutarla, de modo que la maquina de estados queda configurable
-- sin tocar el codigo (RNF-07, escalabilidad).
CREATE TABLE transicion_estado (
  id_transicion       SERIAL PRIMARY KEY,
  id_estado_origen    INTEGER NOT NULL REFERENCES estado_requerimiento(id_estado),
  id_estado_destino   INTEGER NOT NULL REFERENCES estado_requerimiento(id_estado),
  condicion           TEXT    NOT NULL,
  roles_autorizados   TEXT[]  NOT NULL,
  UNIQUE (id_estado_origen, id_estado_destino)
);

-- ---------------------------------------------------------------------
-- ENTIDAD CENTRAL: REQUERIMIENTO
-- ---------------------------------------------------------------------
CREATE TABLE requerimiento (
  id_requerimiento SERIAL PRIMARY KEY,
  codigo           VARCHAR(20) UNIQUE,             -- ej: REQ-0001
  id_proyecto      INTEGER NOT NULL REFERENCES proyecto(id_proyecto),       -- RN-01
  descripcion      TEXT    NOT NULL,               -- RN-02
  solicitante      VARCHAR(150) NOT NULL,          -- RN-02
  id_tipo          INTEGER NOT NULL REFERENCES tipo_requerimiento(id_tipo), -- RN-02
  id_prioridad     INTEGER NOT NULL REFERENCES prioridad(id_prioridad),     -- RN-02
  id_estado        INTEGER NOT NULL REFERENCES estado_requerimiento(id_estado),
  id_responsable   INTEGER REFERENCES usuario(id_usuario),
  id_creador       INTEGER NOT NULL REFERENCES usuario(id_usuario),
  fecha_registro   TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_objetivo   DATE,
  fecha_cierre     TIMESTAMPTZ,
  evidencia_cierre TEXT
);

CREATE INDEX idx_req_proyecto    ON requerimiento(id_proyecto);
CREATE INDEX idx_req_estado      ON requerimiento(id_estado);
CREATE INDEX idx_req_prioridad   ON requerimiento(id_prioridad);
CREATE INDEX idx_req_responsable ON requerimiento(id_responsable);

-- ---------------------------------------------------------------------
-- ENTIDADES DE TRAZABILIDAD
-- ---------------------------------------------------------------------

-- HistorialCambio: conserva cambios relevantes del requerimiento (RF-08, RNF-02).
-- Registra ademas el rol bajo el cual se ejecuto la accion, para reconstruir
-- "quien decidio que y en que calidad" (Fase 2, seccion 6.2.1).
CREATE TABLE historial_cambio (
  id_historial     SERIAL PRIMARY KEY,
  id_requerimiento INTEGER NOT NULL REFERENCES requerimiento(id_requerimiento) ON DELETE CASCADE,
  campo_modificado VARCHAR(60) NOT NULL,
  valor_anterior   TEXT,
  valor_nuevo      TEXT,
  id_usuario       INTEGER NOT NULL REFERENCES usuario(id_usuario),
  rol_ejecucion    VARCHAR(60),
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hist_req ON historial_cambio(id_requerimiento);

-- Observacion: seguimiento narrativo y aportes durante la atencion (RF-12).
CREATE TABLE observacion (
  id_observacion   SERIAL PRIMARY KEY,
  id_requerimiento INTEGER NOT NULL REFERENCES requerimiento(id_requerimiento) ON DELETE CASCADE,
  contenido        TEXT    NOT NULL,
  id_usuario       INTEGER NOT NULL REFERENCES usuario(id_usuario),
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_obs_req ON observacion(id_requerimiento);

-- Evidencia: soporte del cierre o de una validacion funcional (RF-13, RN-10).
CREATE TABLE evidencia (
  id_evidencia     SERIAL PRIMARY KEY,
  id_requerimiento INTEGER NOT NULL REFERENCES requerimiento(id_requerimiento) ON DELETE CASCADE,
  tipo             VARCHAR(40) NOT NULL,
  descripcion      TEXT        NOT NULL,
  id_usuario       INTEGER REFERENCES usuario(id_usuario),
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evi_req ON evidencia(id_requerimiento);

-- SugerenciaAutomatica: apoyo de clasificacion por reglas simples o IA (RF-14).
-- Relacion 1 a 1 con el requerimiento (Tabla 16).
CREATE TABLE sugerencia_automatica (
  id_sugerencia      SERIAL PRIMARY KEY,
  id_requerimiento   INTEGER NOT NULL UNIQUE REFERENCES requerimiento(id_requerimiento) ON DELETE CASCADE,
  tipo_sugerido      VARCHAR(30),
  prioridad_sugerida VARCHAR(20),
  motivo             TEXT,
  aceptada           BOOLEAN NOT NULL DEFAULT false,
  fecha              TIMESTAMPTZ NOT NULL DEFAULT now()
);
