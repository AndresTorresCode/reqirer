import { useState, useEffect, useCallback } from 'react';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';

/**
 * Pantalla de gestion de proyectos (Figura 5a). Es la puerta de entrada del
 * modulo: todo requerimiento debe quedar ubicado dentro de un proyecto
 * (RF-01 crear, RF-02 consultar, RN-01).
 */
export default function Proyectos() {
  const { tieneRol } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', cliente_referencia: '', descripcion: '', soporte_prioritario: false });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get('/proyectos', { params: { q: busqueda || undefined } });
      setProyectos(data);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await api.post('/proyectos', form);
      setForm({ nombre: '', cliente_referencia: '', descripcion: '', soporte_prioritario: false });
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <div className="barra-superior">
        <div>
          <h1>Proyectos</h1>
          <p className="subtitulo">Contenedor de los requerimientos por cliente o iniciativa (RF-01, RF-02).</p>
        </div>
        {tieneRol('lider') && (
          <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? 'Cancelar' : '+ Nuevo proyecto'}
          </button>
        )}
      </div>

      {error && <div className="alerta error">{error}</div>}

      {mostrarForm && (
        <form className="panel" onSubmit={crear}>
          <h2>Registrar nuevo proyecto</h2>
          <div className="grid-2">
            <div className="campo">
              <label>Nombre<span className="obligatorio">*</span></label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div className="campo">
              <label>Cliente / referencia</label>
              <input value={form.cliente_referencia} onChange={(e) => setForm({ ...form, cliente_referencia: e.target.value })} />
            </div>
          </div>
          <div className="campo">
            <label>Descripcion</label>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="campo">
            <label>
              <input
                type="checkbox"
                checked={form.soporte_prioritario}
                onChange={(e) => setForm({ ...form, soporte_prioritario: e.target.checked })}
                style={{ width: 'auto', marginRight: 8 }}
              />
              Cliente con contrato de soporte prioritario
            </label>
            <div className="ayuda">Si se marca, la sugerencia automatica elevara la prioridad de sus requerimientos (RF-14).</div>
          </div>
          <button className="btn exito" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar proyecto'}</button>
        </form>
      )}

      <div className="panel">
        <div className="campo" style={{ maxWidth: 320 }}>
          <label>Buscar proyecto</label>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o cliente..." />
        </div>

        {cargando ? (
          <p className="cargando">Cargando proyectos...</p>
        ) : proyectos.length === 0 ? (
          <p className="vacio">No hay proyectos registrados.</p>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cliente / referencia</th>
                <th>Estado</th>
                <th>Soporte prioritario</th>
                <th>Requerimientos</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => (
                <tr key={p.id_proyecto}>
                  <td><strong>{p.nombre}</strong></td>
                  <td>{p.cliente_referencia || '-'}</td>
                  <td><span className="badge estado">{p.estado}</span></td>
                  <td>{p.soporte_prioritario ? 'Si' : 'No'}</td>
                  <td>{p.total_requerimientos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
