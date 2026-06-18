import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { limpiarCatalogos } from '../api/catalogos';

/**
 * Estructura comun con barra lateral de navegacion. Las opciones se muestran
 * segun los roles del usuario (RNF-08).
 *
 * Responsive: en pantallas anchas la barra lateral es fija; en pantallas
 * pequenas (movil/tablet) se convierte en un menu deslizable (off-canvas)
 * que se abre con el boton de la barra superior y se cierra al navegar o al
 * tocar fuera (RNF-01, usabilidad en distintos dispositivos).
 */
export default function Layout({ children }) {
  const { usuario, logout, tieneRol } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cerrarMenu = () => setMenuAbierto(false);

  const salir = () => {
    cerrarMenu();
    limpiarCatalogos();
    logout();
    navigate('/login');
  };

  const claseLink = ({ isActive }) => (isActive ? 'activo' : '');

  return (
    <div className="app-shell">
      {/* Barra superior visible solo en pantallas pequenas */}
      <header className="topbar-movil">
        <button
          type="button"
          className="hamburguesa"
          aria-label={menuAbierto ? 'Cerrar menu' : 'Abrir menu'}
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="titulo-movil">Modulo de Requerimientos</div>
      </header>

      {/* Capa oscura para cerrar el menu al tocar fuera (solo movil) */}
      {menuAbierto && <div className="overlay-menu" onClick={cerrarMenu} aria-hidden="true" />}

      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
        <div className="marca">
          Modulo de Requerimientos
          <small>Dexter LATAM SAS</small>
        </div>
        <nav>
          <NavLink to="/proyectos" className={claseLink} onClick={cerrarMenu}>
            Proyectos
          </NavLink>
          <NavLink to="/requerimientos" className={claseLink} onClick={cerrarMenu}>
            Listado de requerimientos
          </NavLink>
          <NavLink to="/tablero" className={claseLink} onClick={cerrarMenu}>
            Tablero de seguimiento
          </NavLink>
          {tieneRol('registrador', 'lider') && (
            <NavLink to="/requerimientos/nuevo" className={claseLink} onClick={cerrarMenu}>
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
