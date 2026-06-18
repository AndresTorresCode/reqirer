import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { cargarCatalogos } from '../api/catalogos';
import { BadgePrioridad, BadgeEstado, BadgeTipo } from '../components/Badges';

/**
 * Pantalla de consulta por listado y filtros (Figura 5c). Ofrece una vista
 * tabular con filtros combinables por proyecto, estado, prioridad, tipo,
 * responsable y texto libre (RF-09 listado, RF-11 filtros).
 */
const FILTROS_VACIOS = { proyecto: '', estado: '', prioridad: '', tipo: '', responsable: '', q: '' };

export default function Listado() {
  const navigate = useNavigate();
  const [catalogos, setCatalogos] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [requerimientos, setRequerimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [cat, proy, usr] = await Promise.all([
          cargarCatalogos(),
          api.get('/proyectos'),
          api.get('/usuarios'),
        ]);
        setCatalogos(cat);
        setProyectos(proy.data);
        setUsuarios(usr.data);
      } catch (err) {
        setError(mensajeError(err));
      }
    })();
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = {};
      Object.entries(filtros).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await api.get('/requerimientos', { params });
      setRequerimientos(data);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));

  if (!catalogos) return <p className="cargando">Cargando...</p>;

  return (
    <div>
      <h1>Listado de requerimientos</h1>
      <p className="subtitulo">Consulta en forma de tabla con filtros combinables.</p>

      {error && <div className="alerta error">{error}</div>}

      <div className="panel">
        <div className="filtros">
          <div className="campo">
            <label>Proyecto</label>
            <select value={filtros.proyecto} onChange={(e) => cambiar('proyecto', e.target.value)}>
              <option value="">Todos</option>
              {proyectos.map((p) => <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Estado</label>
            <select value={filtros.estado} onChange={(e) => cambiar('estado', e.target.value)}>
              <option value="">Todos</option>
              {catalogos.estados.map((es) => <option key={es.id_estado} value={es.codigo}>{es.nombre_estado}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Prioridad</label>
            <select value={filtros.prioridad} onChange={(e) => cambiar('prioridad', e.target.value)}>
              <option value="">Todas</option>
              {catalogos.prioridades.map((p) => <option key={p.id_prioridad} value={p.codigo}>{p.nombre_prioridad}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Tipo</label>
            <select value={filtros.tipo} onChange={(e) => cambiar('tipo', e.target.value)}>
              <option value="">Todos</option>
              {catalogos.tipos.map((t) => <option key={t.id_tipo} value={t.codigo}>{t.nombre_tipo}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Responsable</label>
            <select value={filtros.responsable} onChange={(e) => cambiar('responsable', e.target.value)}>
              <option value="">Todos</option>
              {usuarios.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="campo mt" style={{ maxWidth: 360 }}>
          <label>Buscar (codigo, descripcion o solicitante)</label>
          <input value={filtros.q} onChange={(e) => cambiar('q', e.target.value)} placeholder="Texto libre..." />
        </div>
        <button className="btn secundario pequeno" onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar filtros</button>
      </div>

      <div className="panel">
        {cargando ? (
          <p className="cargando">Cargando requerimientos...</p>
        ) : requerimientos.length === 0 ? (
          <p className="vacio">No se encontraron requerimientos con esos criterios.</p>
        ) : (
          <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Descripcion</th>
                <th>Proyecto</th>
                <th>Tipo</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {requerimientos.map((r) => (
                <tr
                  key={r.id_requerimiento}
                  onClick={() => navigate(`/requerimientos/${r.id_requerimiento}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/requerimientos/${r.id_requerimiento}`); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver detalle del requerimiento ${r.codigo}`}
                >
                  <td><strong>{r.codigo}</strong></td>
                  <td>{r.descripcion.length > 60 ? `${r.descripcion.slice(0, 60)}...` : r.descripcion}</td>
                  <td>{r.proyecto_nombre}</td>
                  <td><BadgeTipo nombre={r.tipo_nombre} /></td>
                  <td><BadgePrioridad codigo={r.prioridad_codigo} nombre={r.prioridad_nombre} /></td>
                  <td><BadgeEstado codigo={r.estado_codigo} nombre={r.estado_nombre} /></td>
                  <td>{r.responsable_nombre || <span style={{ color: '#999' }}>Sin asignar</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <p className="ayuda mt">{requerimientos.length} requerimiento(s). Haga clic en una fila para ver el detalle.</p>
      </div>
    </div>
  );
}
