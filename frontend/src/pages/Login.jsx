import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mensajeError } from '../api/client';

/**
 * Pantalla de inicio de sesion (RNF-09). Autentica al usuario interno antes
 * de permitir cualquier accion sobre el modulo.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(correo, password);
      navigate('/tablero');
    } catch (err) {
      setError(mensajeError(err, 'No fue posible iniciar sesion'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={enviar}>
        <h1>Modulo de Requerimientos</h1>
        <p className="sub">Dexter LATAM SAS - Gestion y trazabilidad de solicitudes</p>

        {error && <div className="alerta error">{error}</div>}

        <div className="campo">
          <label>Correo<span className="obligatorio">*</span></label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="usuario@dexterlatam.com"
            required
            autoFocus
          />
        </div>
        <div className="campo">
          <label>Contrasena<span className="obligatorio">*</span></label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Iniciar sesion'}
        </button>

        <div className="demo">
          <strong>Usuarios de demostracion</strong> (clave <code>Dexter2026*</code>):<br />
          <code>lider@dexterlatam.com</code> - lider<br />
          <code>jessica@dexterlatam.com</code> - registrador<br />
          <code>dev@dexterlatam.com</code> - desarrollador<br />
          <code>qa@dexterlatam.com</code> - validador
        </div>
      </form>
    </div>
  );
}
