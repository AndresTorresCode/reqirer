import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { limpiarCatalogos } from '../api/catalogos';

/**
 * Estructura comun con barra lateral de navegacion. Las opciones se muestran
 * segun los roles del usuario (RNF-08).
 */
export default function Layout({ children }) {
  const { usuario, logout, tieneRol } = useAuth();
  const navigate = useNavigate();

  const salir = () => {
    limpiarCatalogos();
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="marca">
          Modulo de Requerimientos
          <small>Dexter LATAM SAS</small>
        </div>
        <nav>
          <NavLink to="/proyectos" className={({ isActive }) => (isActive ? 'activo' : '')}>
            Proyectos
          </NavLink>
          <NavLink to="/requerimientos" className={({ isActive }) => (isActive ? 'activo' : '')}>
            Listado de requerimientos
          </NavLink>
          <NavLink to="/tablero" className={({ isActive }) => (isActive ? 'activo' : '')}>
            Tablero de seguimiento
          </NavLink>
          {tieneRol('registrador', 'lider') && (
            <NavLink to="/requerimientos/nuevo" className={({ isActive }) => (isActive ? 'activo' : '')}>
              + Registrar requerimiento
            </NavLink>
          )}
        </nav>
        <div className="usuario-box">
          <div className="nombre">{usuario?.nombre}</div>
          <div className="roles">Roles: {usuario?.roles.join(', ')}</div>
          <button className="btn-salir" onClick={salir}>Cerrar sesion</button>
        </div>
      </aside>
      <main className="contenido">{children}</main>
    </div>
  );
}
