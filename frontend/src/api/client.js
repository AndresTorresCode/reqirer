import axios from 'axios';

/**
 * Cliente HTTP central. Adjunta el token JWT (RNF-09) en cada peticion y
 * centraliza la base del API. Si el backend responde 401, se limpia la
 * sesion para forzar un nuevo inicio.
 */
const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Extrae un mensaje de error legible de la respuesta del backend.
export function mensajeError(error, porDefecto = 'Ocurrio un error') {
  return error?.response?.data?.error || error?.message || porDefecto;
}

export default api;
