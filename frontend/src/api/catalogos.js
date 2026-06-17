import api from './client';

/**
 * Carga y cachea los catalogos del proceso (tipos, prioridades, estados,
 * roles, transiciones) una sola vez por sesion, ya que cambian poco.
 */
let cache = null;

export async function cargarCatalogos() {
  if (cache) return cache;
  const { data } = await api.get('/catalogos');
  cache = data;
  return data;
}

export function limpiarCatalogos() {
  cache = null;
}
