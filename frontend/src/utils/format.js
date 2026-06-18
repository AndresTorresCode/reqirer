/**
 * Utilidades de presentacion de texto. Convierten codigos internos
 * (por ejemplo "nueva_funcionalidad") en etiquetas legibles para el usuario
 * ("Nueva funcionalidad"), de modo que la interfaz nunca muestre valores
 * tecnicos crudos.
 */

/**
 * Convierte un codigo en una etiqueta legible: reemplaza guiones bajos por
 * espacios y pone la primera letra en mayuscula.
 * @param {string} codigo
 * @returns {string}
 */
export function capitalizar(codigo) {
  if (!codigo && codigo !== 0) return '';
  const texto = String(codigo).replace(/_/g, ' ').trim();
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
