import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import api from '../api/client';

/**
 * Contexto de autenticacion. Conserva el usuario y el token, y expone
 * utilidades de rol para mostrar/ocultar acciones segun los permisos
 * internos (RNF-08).
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  const login = useCallback(async (correo, password) => {
    const { data } = await api.post('/auth/login', { correo, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  const tieneRol = useCallback(
    (...roles) => !!usuario && usuario.roles.some((r) => roles.includes(r)),
    [usuario]
  );

  const value = useMemo(
    () => ({ usuario, login, logout, tieneRol, autenticado: !!usuario }),
    [usuario, login, logout, tieneRol]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
