import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { cargarCatalogos } from '../api/catalogos';

/**
 * Pantalla de registro de requerimiento (Figura 5b). Es la mas critica del
 * modulo: captura la informacion minima que alimenta todo el proceso
 * (RF-03, RF-04, RF-05) y muestra la sugerencia inicial de tipo y prioridad
 * (RF-14), siempre editable por el usuario (RN-11).
 */
export default function RegistroRequerimiento() {
  const navigate = useNavigate();
  const [catalogos, setCatalogos] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({
    id_proyecto: '', solicitante: '', descripcion: '',
    tipo: '', prioridad: '', id_responsable: '', fecha_objetivo: '',
  });
  const [sugerencia, setSugerencia] = useState(null);
  const [cargandoSug, setCargandoSug] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

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

  // Solicita la sugerencia automatica (RF-14) con base en la descripcion y el proyecto.
  const pedirSugerencia = async () => {
    if (!form.descripcion.trim()) return;
    setCargandoSug(true);
    try {
      const { data } = await api.post('/requerimientos-sugerencia', {
        descripcion: form.descripcion,
        id_proyecto: form.id_proyecto || undefined,
      });
      setSugerencia(data);
      // Pre-llena tipo/prioridad solo si el usuario aun no eligio.
      setForm((f) => ({
        ...f,
        tipo: f.tipo || data.tipo_sugerido,
        prioridad: f.prioridad || data.prioridad_sugerida,
      }));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargandoSug(false);
    }
  };

  const aplicarSugerencia = () => {
    if (!sugerencia) return;
    setForm((f) => ({ ...f, tipo: sugerencia.tipo_sugerido, prioridad: sugerencia.prioridad_sugerida }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const payload = {
        id_proyecto: Number(form.id_proyecto),
        solicitante: form.solicitante,
        descripcion: form.descripcion,
        tipo: form.tipo || undefined,
        prioridad: form.prioridad || undefined,
        id_responsable: form.id_responsable ? Number(form.id_responsable) : undefined,
        fecha_objetivo: form.fecha_objetivo || undefined,
      };
      const { data } = await api.post('/requerimientos', payload);
      navigate(`/requerimientos/${data.id_requerimiento}`);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  if (!catalogos) return <p className="cargando">Cargando formulario...</p>;

  return (
    <div>
      <h1>Registrar requerimiento</h1>
      <p className="subtitulo">Captura la informacion minima para conservar el contexto desde el inicio (RF-03, RN-02).</p>

      {error && <div className="alerta error">{error}</div>}

      <form className="panel" onSubmit={enviar}>
        <div className="grid-2">
          <div className="campo">
            <label>Proyecto<span className="obligatorio">*</span></label>
            <select value={form.id_proyecto} onChange={(e) => setForm({ ...form, id_proyecto: e.target.value })} required>
              <option value="">Seleccione un proyecto...</option>
              {proyectos.map((p) => (
                <option key={p.id_proyecto} value={p.id_proyecto}>
                  {p.nombre}{p.cliente_referencia ? ` - ${p.cliente_referencia}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Solicitante<span className="obligatorio">*</span></label>
            <input value={form.solicitante} onChange={(e) => setForm({ ...form, solicitante: e.target.value })} placeholder="Quien pide el cambio" required />
          </div>
        </div>

        <div className="campo">
          <label>Descripcion del requerimiento<span className="obligatorio">*</span></label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            onBlur={pedirSugerencia}
            placeholder="Describa la solicitud con el mayor detalle posible..."
            required
          />
          <div className="ayuda">Al terminar de escribir, el sistema sugerira un tipo y una prioridad (RF-14).</div>
        </div>

        {(cargandoSug || sugerencia) && (
          <div className="sugerencia-box">
            <div className="titulo">Sugerencia automatica (revisable)</div>
            {cargandoSug ? (
              <span>Analizando la descripcion...</span>
            ) : (
              <>
                <div>
                  Tipo sugerido: <strong>{sugerencia.tipo_sugerido}</strong> &nbsp;|&nbsp;
                  Prioridad sugerida: <strong>{sugerencia.prioridad_sugerida}</strong>
                </div>
                <div className="ayuda" style={{ marginTop: 4 }}>{sugerencia.motivo}</div>
                <button type="button" className="btn secundario pequeno mt" onClick={aplicarSugerencia}>
                  Aplicar sugerencia
                </button>
              </>
            )}
          </div>
        )}

        <div className="grid-2 mt">
          <div className="campo">
            <label>Tipo<span className="obligatorio">*</span></label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} required>
              <option value="">Seleccione...</option>
              {catalogos.tipos.map((t) => (
                <option key={t.id_tipo} value={t.codigo}>{t.nombre_tipo}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Prioridad<span className="obligatorio">*</span></label>
            <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} required>
              <option value="">Seleccione...</option>
              {catalogos.prioridades.map((p) => (
                <option key={p.id_prioridad} value={p.codigo}>{p.nombre_prioridad}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="campo">
            <label>Responsable (opcional)</label>
            <select value={form.id_responsable} onChange={(e) => setForm({ ...form, id_responsable: e.target.value })}>
              <option value="">Sin asignar</option>
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} ({u.roles.join(', ')})</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Fecha objetivo (opcional)</label>
            <input type="date" value={form.fecha_objetivo} onChange={(e) => setForm({ ...form, fecha_objetivo: e.target.value })} />
          </div>
        </div>

        <div className="acciones-fila">
          <button className="btn exito" disabled={guardando}>{guardando ? 'Registrando...' : 'Registrar requerimiento'}</button>
          <button type="button" className="btn secundario" onClick={() => navigate('/requerimientos')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
