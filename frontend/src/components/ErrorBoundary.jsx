import React from 'react';

/**
 * Captura los errores de renderizado de React para evitar que la aplicacion
 * quede en una pantalla en blanco. En su lugar muestra un mensaje claro y la
 * opcion de recargar, mejorando la robustez de la interfaz ante fallos
 * inesperados.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hayError: false };
  }

  static getDerivedStateFromError() {
    return { hayError: true };
  }

  componentDidCatch(error, info) {
    // Se registra en consola para diagnostico; no se expone el detalle al usuario.
    // eslint-disable-next-line no-console
    console.error('[ui] Error no controlado:', error, info);
  }

  render() {
    if (this.state.hayError) {
      return (
        <div className="login-wrap">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <h1>Algo salio mal</h1>
            <p className="sub">Ocurrio un problema inesperado en la interfaz.</p>
            <button
              className="btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => window.location.reload()}
            >
              Recargar la pagina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
