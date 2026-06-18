import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { BadgePrioridad, BadgeTipo } from '../components/Badges';

/**
 * Pantalla de tablero de seguimiento (Figura 5d). Presenta los requerimientos
 * organizados por estado siguiendo el enfoque Kanban (RF-10). Es la principal
 * respuesta al problema de "no saber en que va cada solicitud" descrito en la
 * entrevista ENT-01.
 */
export default function Tablero() {
  const navigate = useNavigate();
  const [columnas, setColumnas] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [proyecto, setProyecto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/proyectos').then(({ data }) => setProyectos(data)).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get('/requerimientos/tablero', {
        params: { proyecto: proyecto || undefined },
      });
      setColumnas(data);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [proyecto]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div>
      <div className="barra-superior">
        <div>
          <h1>Tablero de seguimiento</h1>
          <p className="subtitulo">Requerimientos organizados por su estado de avance.</p>
        </div>
        <div className="campo" style={{ minWidth: 240, marginBottom: 0 }}>
          <label>Filtrar por proyecto</label>
          <select value={proyecto} onChange={(e) => setProyecto(e.target.value)}>
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alerta error">{error}</div>}

      {cargando ? (
        <p className="cargando">Cargando tablero...</p>
      ) : (
        <div className="tablero">
          {columnas.map((col) => (
            <div className="columna" key={col.estado}>
              <div className="cabecera">
                <span>{col.nombre}</span>
                <span className="conteo">{col.requerimientos.length}</span>
              </div>
              <div className="cuerpo">
                {col.requerimientos.length === 0 ? (
                  <div className="ayuda" style={{ textAlign: 'center', padding: 8 }}>Sin tarjetas</div>
                ) : (
                  col.requerimientos.map((r) => (
                    <div
                      className="tarjeta"
                      key={r.id_requerimiento}
                      onClick={() => navigate(`/requerimientos/${r.id_requerimiento}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/requerimientos/${r.id_requerimiento}`); } }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver detalle del requerimiento ${r.codigo}`}
                    >
                      <div className="codigo">{r.codigo}</div>
                      <div className="desc">{r.descripcion.length > 70 ? `${r.descripcion.slice(0, 70)}...` : r.descripcion}</div>
                      <div className="meta">
                        <BadgeTipo nombre={r.tipo_nombre} />
                        <BadgePrioridad codigo={r.prioridad_codigo} nombre={r.prioridad_nombre} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
