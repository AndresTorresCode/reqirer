import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { cargarCatalogos } from '../api/catalogos';
import { useAuth } from '../context/AuthContext';
import { BadgePrioridad, BadgeEstado, BadgeTipo } from '../components/Badges';
import { capitalizar } from '../utils/format';

/**
 * Pantalla de detalle, historial y cierre (Figura 5e). Combina en una sola
 * vista la informacion completa del requerimiento, su trazabilidad y las
 * acciones de avance y cierre (RF-07, RF-08, RF-12, RF-13).
 */
export default function DetalleRequerimiento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tieneRol, usuario } = useAuth();

  const [req, setReq] = useState(null);
  const [catalogos, setCatalogos] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Estados de los formularios de accion.
  const [destino, setDestino] = useState('');
  const [obsTransicion, setObsTransicion] = useState('');
  const [evidencia, setEvidencia] = useState('');
  const [nuevaObs, setNuevaObs] = useState('');
  const [nuevaPrioridad, setNuevaPrioridad] = useState('');
  const [nuevoResp, setNuevoResp] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [det, cat, usr] = await Promise.all([
        api.get(`/requerimientos/${id}`),
        cargarCatalogos(),
        api.get('/usuarios'),
      ]);
      setReq(det.data);
      setCatalogos(cat);
      setUsuarios(usr.data);
      setNuevaPrioridad(det.data.prioridad_codigo);
      setNuevoResp(det.data.id_responsable || '');
    } catch (err) {
      setError(mensajeError(err));
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // Transiciones que el usuario actual puede ejecutar segun su rol (RNF-08).
  const transicionesPermitidas = (req?.transiciones_disponibles || []).filter((t) =>
    t.roles_autorizados.some((r) => usuario.roles.includes(r))
  );

  const ejecutar = async (accion) => {
    setProcesando(true);
    setError('');
    setAviso('');
    try {
      await accion();
      // Limpia formularios y recarga.
      setDestino(''); setObsTransicion(''); setEvidencia(''); setNuevaObs('');
      await cargar();
      setAviso('Cambio registrado correctamente.');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstado = () => {
    if (!destino) { setError('Seleccione el estado destino'); return; }
    const payload = { estado_destino: destino };
    if (obsTransicion.trim()) payload.observacion = obsTransicion.trim();
    if (evidencia.trim()) payload.evidencia = { tipo: 'validacion', descripcion: evidencia.trim() };
    ejecutar(() => api.patch(`/requerimientos/${id}/estado`, payload));
  };

  const esCierre = destino === 'cerrado';
  const esDevolucion = req?.estado_codigo === 'en_pruebas' && destino === 'en_desarrollo';

  if (error && !req) return <div className="alerta error">{error}</div>;
  if (!req || !catalogos) return <p className="cargando">Cargando requerimiento...</p>;

  return (
    <div>
      <div className="barra-superior">
        <div>
          <h1>{req.codigo} <BadgeEstado codigo={req.estado_codigo} nombre={req.estado_nombre} /></h1>
          <p className="subtitulo">{req.proyecto_nombre}</p>
        </div>
        <button className="btn secundario" onClick={() => navigate(-1)}>Volver</button>
      </div>

      {error && <div className="alerta error">{error}</div>}
      {aviso && <div className="alerta ok">{aviso}</div>}

      <div className="detalle-grid">
        {/* ---------------- Columna izquierda: datos y acciones ---------------- */}
        <div>
          <div className="panel">
            <h2>Informacion del requerimiento</h2>
            <div className="dato"><div className="etq">Descripcion</div><div className="val">{req.descripcion}</div></div>
            <div className="grid-2">
              <div className="dato"><div className="etq">Solicitante</div><div className="val">{req.solicitante}</div></div>
              <div className="dato"><div className="etq">Tipo</div><div className="val"><BadgeTipo nombre={req.tipo_nombre} /></div></div>
              <div className="dato"><div className="etq">Prioridad</div><div className="val"><BadgePrioridad codigo={req.prioridad_codigo} nombre={req.prioridad_nombre} /></div></div>
              <div className="dato"><div className="etq">Responsable</div><div className="val">{req.responsable_nombre || 'Sin asignar'}</div></div>
              <div className="dato"><div className="etq">Registrado por</div><div className="val">{req.creador_nombre}</div></div>
              <div className="dato"><div className="etq">Fecha de registro</div><div className="val">{new Date(req.fecha_registro).toLocaleString('es-CO')}</div></div>
              {req.fecha_cierre && <div className="dato"><div className="etq">Fecha de cierre</div><div className="val">{new Date(req.fecha_cierre).toLocaleString('es-CO')}</div></div>}
            </div>
            {req.evidencia_cierre && (
              <div className="dato"><div className="etq">Evidencia de cierre</div><div className="val">{req.evidencia_cierre}</div></div>
            )}
          </div>

          {/* Cambio de estado (RF-07) */}
          <div className="panel">
            <h2>Actualizar estado</h2>
            {req.es_final ? (
              <div className="alerta info">El requerimiento esta cerrado. No admite mas transiciones.</div>
            ) : transicionesPermitidas.length === 0 ? (
              <div className="alerta info">
                Su rol no puede ejecutar las transiciones disponibles desde "{req.estado_nombre}".
                {req.transiciones_disponibles.length > 0 && (
                  <> Requiere: {[...new Set(req.transiciones_disponibles.flatMap((t) => t.roles_autorizados))].join(', ')}.</>
                )}
              </div>
            ) : (
              <>
                <div className="campo">
                  <label>Nuevo estado</label>
                  <select value={destino} onChange={(e) => setDestino(e.target.value)}>
                    <option value="">Seleccione...</option>
                    {transicionesPermitidas.map((t) => (
                      <option key={t.destino} value={t.destino}>{t.destino_nombre}</option>
                    ))}
                  </select>
                  {destino && (
                    <div className="ayuda">
                      Condicion: {req.transiciones_disponibles.find((t) => t.destino === destino)?.condicion}
                    </div>
                  )}
                </div>
                <div className="campo">
                  <label>Observacion {esDevolucion && <span className="obligatorio">* (requerida en devolucion)</span>}</label>
                  <textarea value={obsTransicion} onChange={(e) => setObsTransicion(e.target.value)} placeholder="Comentario del cambio (opcional, salvo devolucion)" />
                </div>
                {esCierre && (
                  <div className="campo">
                    <label>Evidencia de cierre<span className="obligatorio">*</span></label>
                    <textarea value={evidencia} onChange={(e) => setEvidencia(e.target.value)} placeholder="Validacion funcional, prueba o confirmacion" />
                    <div className="ayuda">El cierre exige evidencia o validacion funcional registrada.</div>
                  </div>
                )}
                <button className="btn" disabled={procesando} onClick={cambiarEstado}>
                  {procesando ? 'Procesando...' : 'Aplicar cambio de estado'}
                </button>
              </>
            )}
          </div>

          {/* Acciones del lider: prioridad y responsable */}
          {tieneRol('lider') && !req.es_final && (
            <div className="panel">
              <h2>Gestion (lider)</h2>
              <div className="grid-2">
                <div className="campo">
                  <label>Cambiar prioridad</label>
                  <div className="acciones-fila">
                    <select value={nuevaPrioridad} onChange={(e) => setNuevaPrioridad(e.target.value)}>
                      {catalogos.prioridades.map((p) => <option key={p.id_prioridad} value={p.codigo}>{p.nombre_prioridad}</option>)}
                    </select>
                    <button className="btn secundario pequeno" disabled={procesando}
                      onClick={() => ejecutar(() => api.patch(`/requerimientos/${id}/prioridad`, { prioridad: nuevaPrioridad }))}>
                      Guardar
                    </button>
                  </div>
                </div>
                <div className="campo">
                  <label>Asignar responsable</label>
                  <div className="acciones-fila">
                    <select value={nuevoResp} onChange={(e) => setNuevoResp(e.target.value)}>
                      <option value="">Sin asignar</option>
                      {usuarios.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>)}
                    </select>
                    <button className="btn secundario pequeno" disabled={procesando || !nuevoResp}
                      onClick={() => ejecutar(() => api.patch(`/requerimientos/${id}/responsable`, { id_responsable: Number(nuevoResp) }))}>
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones (RF-12) */}
          <div className="panel">
            <h2>Agregar observacion de seguimiento</h2>
            <div className="campo">
              <textarea value={nuevaObs} onChange={(e) => setNuevaObs(e.target.value)} placeholder="Novedad, decision o avance..." />
            </div>
            <button className="btn secundario" disabled={procesando || !nuevaObs.trim()}
              onClick={() => ejecutar(() => api.post(`/requerimientos/${id}/observaciones`, { contenido: nuevaObs.trim() }))}>
              Agregar observacion
            </button>
          </div>
        </div>

        {/* ---------------- Columna derecha: trazabilidad ---------------- */}
        <div>
          {req.sugerencia && (
            <div className="panel">
              <h2>Sugerencia inicial</h2>
              <p style={{ margin: '0 0 6px' }}>
                Tipo: <strong>{capitalizar(req.sugerencia.tipo_sugerido)}</strong> | Prioridad: <strong>{capitalizar(req.sugerencia.prioridad_sugerida)}</strong>
              </p>
              <p className="ayuda">{req.sugerencia.motivo}</p>
              <p className="ayuda">Aceptada por el usuario: <strong>{req.sugerencia.aceptada ? 'Si' : 'No'}</strong></p>
            </div>
          )}

          <div className="panel">
            <h2>Historial de cambios</h2>
            {req.historial.length === 0 ? (
              <p className="vacio">Sin movimientos.</p>
            ) : (
              <ul className="timeline">
                {req.historial.map((h) => (
                  <li key={h.id_historial}>
                    <div className="campo-h">
                      {etiquetaCampo(h.campo_modificado)}
                      {h.valor_anterior && h.campo_modificado !== 'creacion' ? `: ${h.valor_anterior} -> ${h.valor_nuevo}` : (h.campo_modificado === 'creacion' ? '' : `: ${h.valor_nuevo || ''}`)}
                    </div>
                    <div className="fecha-h">
                      {new Date(h.fecha).toLocaleString('es-CO')} - {h.usuario_nombre}
                      {h.rol_ejecucion ? ` (rol: ${h.rol_ejecucion})` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <h2>Observaciones</h2>
            {req.observaciones.length === 0 ? (
              <p className="vacio">Sin observaciones.</p>
            ) : (
              req.observaciones.map((o) => (
                <div key={o.id_observacion} className="dato">
                  <div className="val">{o.contenido}</div>
                  <div className="fecha-h">{new Date(o.fecha).toLocaleString('es-CO')} - {o.usuario_nombre}</div>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <h2>Evidencias</h2>
            {req.evidencias.length === 0 ? (
              <p className="vacio">Sin evidencias.</p>
            ) : (
              req.evidencias.map((e) => (
                <div key={e.id_evidencia} className="dato">
                  <div className="val"><span className="badge tipo">{capitalizar(e.tipo)}</span> {e.descripcion}</div>
                  <div className="fecha-h">{new Date(e.fecha).toLocaleString('es-CO')}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Traduce el nombre tecnico del campo a una etiqueta legible.
function etiquetaCampo(campo) {
  const mapa = {
    creacion: 'Requerimiento creado',
    estado: 'Cambio de estado',
    prioridad: 'Cambio de prioridad',
    responsable: 'Cambio de responsable',
    alcance: 'Cambio de alcance',
    tipo: 'Cambio de tipo',
  };
  return mapa[campo] || campo;
}
