/**
 * Etiquetas visuales para prioridad, estado y tipo. Dan lectura rapida en
 * listados y tablero (RNF-01, usabilidad).
 */
export function BadgePrioridad({ codigo, nombre }) {
  return <span className={`badge prio-${codigo}`}>{nombre || codigo}</span>;
}

export function BadgeEstado({ codigo, nombre }) {
  const clase = codigo === 'cerrado' ? 'badge estado-cerrado' : 'badge estado';
  return <span className={clase}>{nombre || codigo}</span>;
}

export function BadgeTipo({ nombre, codigo }) {
  return <span className="badge tipo">{nombre || codigo}</span>;
}
