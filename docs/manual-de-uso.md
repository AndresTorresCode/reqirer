# Manual basico de uso

**Modulo web para la gestion y automatizacion de requerimientos**
Dexter LATAM SAS - Fase 3 / Objetivo 3

Este manual describe el uso de las pantallas del modulo y las acciones que
puede realizar cada rol interno. Esta dirigido al equipo de Dexter LATAM SAS.

---

## 1. Ingreso al sistema

1. Abra el navegador en la direccion del modulo (en desarrollo,
   `http://localhost:5173`).
2. Ingrese su **correo** y **contrasena**.
3. El sistema valida las credenciales y carga su sesion con los roles
   asignados. Sin una sesion activa no es posible consultar ni registrar
   informacion (RNF-09).

Si no recuerda su contrasena o no puede ingresar, solicite al lider de
desarrollo la verificacion de su usuario.

---

## 2. Roles y permisos

El modulo reconoce cuatro roles internos. Un mismo usuario puede tener mas de
un rol (situacion comun en equipos pequenos).

| Rol            | Puede hacer                                                        |
|----------------|--------------------------------------------------------------------|
| **Registrador**| Consultar proyectos, registrar requerimientos, agregar observaciones. |
| **Lider**      | Todo lo del registrador, ademas: crear proyectos, cambiar prioridad, asignar responsable, aprobar y mover entre estados. |
| **Desarrollador** | Actualizar el estado durante el desarrollo y las pruebas, registrar observaciones y evidencias. |
| **Validador**  | Registrar la validacion funcional, evidencia y cerrar requerimientos en pruebas. |

Las opciones que su rol no permite no se muestran o se rechazan con un mensaje
claro.

---

## 3. Pantalla: Proyectos

Es la puerta de entrada del modulo. Todo requerimiento pertenece a un proyecto.

- **Consultar** (todos los roles): la tabla muestra nombre, cliente, estado,
  si tiene soporte prioritario y el numero de requerimientos. Use el buscador
  para filtrar por nombre o cliente.
- **Crear** (solo lider): pulse **"+ Nuevo proyecto"**, complete el nombre
  (obligatorio), el cliente, la descripcion y marque si es un cliente con
  **soporte prioritario** (esto eleva automaticamente la prioridad sugerida de
  sus requerimientos). Guarde.

---

## 4. Pantalla: Registrar requerimiento

Captura la informacion minima que alimenta todo el proceso. Disponible para
registrador y lider.

Pasos:

1. Seleccione el **proyecto** (obligatorio).
2. Indique el **solicitante** (quien pide el cambio).
3. Escriba la **descripcion** del requerimiento.
4. Al salir del campo de descripcion, el sistema muestra una **sugerencia
   automatica** de tipo y prioridad, basada en el texto y en el tipo de cliente.
   - La sugerencia es **orientativa**: puede aceptarla con "Aplicar sugerencia"
     o elegir manualmente.
5. Confirme o ajuste el **tipo** (incidencia, ajuste, mejora, nueva
   funcionalidad) y la **prioridad** (alta, media, baja).
6. Opcionalmente asigne un **responsable** y una **fecha objetivo**.
7. Pulse **"Registrar requerimiento"**. El requerimiento queda en estado
   **Registrado** y se le asigna un codigo (REQ-####).

> El sistema no permite guardar sin proyecto, descripcion, solicitante, tipo y
> prioridad. La sugerencia automatica nunca reemplaza su criterio.

---

## 5. Pantalla: Listado de requerimientos

Vista tabular para revision rapida.

- Filtros combinables por **proyecto, estado, prioridad, tipo y responsable**.
- Busqueda por texto (codigo, descripcion o solicitante).
- "Limpiar filtros" restablece la consulta.
- Haga clic en cualquier fila para abrir el detalle del requerimiento.

---

## 6. Pantalla: Tablero de seguimiento (Kanban)

Muestra los requerimientos organizados en columnas por estado: Registrado,
En analisis, Aprobado, En desarrollo, En pruebas y Cerrado.

- Cada tarjeta muestra el codigo, una parte de la descripcion, el tipo y la
  prioridad.
- El contador de cada columna indica cuantos requerimientos hay en ese estado.
- Use el filtro por proyecto para enfocar un solo proyecto.
- Haga clic en una tarjeta para abrir su detalle.

Es la vista recomendada para las reuniones de seguimiento: permite ver de un
vistazo en que va cada solicitud.

---

## 7. Pantalla: Detalle, historial y cierre

Combina en una sola vista toda la informacion del requerimiento y sus acciones.

**Lado izquierdo - informacion y acciones:**

- Datos principales: descripcion, solicitante, tipo, prioridad, responsable,
  fechas y evidencia de cierre.
- **Actualizar estado**: seleccione el nuevo estado entre las transiciones
  permitidas para su rol. El sistema solo ofrece transiciones validas:
  - Registrado -> En analisis
  - En analisis -> Aprobado
  - Aprobado -> En desarrollo (requiere responsable asignado)
  - En desarrollo -> En pruebas
  - En pruebas -> En desarrollo (devolucion; requiere una observacion)
  - En pruebas -> Cerrado (requiere evidencia o validacion funcional)
- **Gestion (solo lider)**: cambiar la prioridad y asignar o cambiar el
  responsable.
- **Agregar observacion**: registre novedades, decisiones o avances.

**Lado derecho - trazabilidad:**

- **Sugerencia inicial**: el tipo y prioridad sugeridos al registrar y si se
  aceptaron.
- **Historial de cambios**: linea de tiempo con cada cambio de estado,
  prioridad, responsable o alcance, con la fecha, el usuario y el rol con que
  se ejecuto.
- **Observaciones** y **Evidencias** registradas.

> El cierre de un requerimiento exige registrar una evidencia o validacion
> funcional. No es posible saltarse etapas (por ejemplo, pasar de Registrado
> directamente a Cerrado).

---

## 8. Flujo recomendado de trabajo

1. El **registrador** crea el requerimiento con la informacion minima.
2. El **lider** lo pasa a *En analisis*, ajusta prioridad y tipo si hace falta,
   asigna responsable y lo *Aprueba*.
3. El **desarrollador** lo mueve a *En desarrollo*, trabaja y lo pasa a
   *En pruebas*, dejando observaciones del avance.
4. El **validador** (o el lider) revisa: si hay ajustes lo devuelve a desarrollo
   con una observacion; si esta correcto registra la evidencia y lo *Cierra*.
5. En cualquier momento, el equipo consulta el **tablero** o el **listado** para
   el seguimiento.

---

## 9. Mensajes y validaciones frecuentes

- *"Transicion no permitida"*: intento de mover el requerimiento a un estado no
  valido desde el estado actual.
- *"Debe asignar un responsable antes de pasar a desarrollo"*: asigne primero el
  responsable.
- *"El cierre requiere registrar evidencia o validacion funcional"*: agregue la
  evidencia en el cierre.
- *"La devolucion a desarrollo requiere registrar una observacion"*: escriba la
  observacion del motivo de la devolucion.
- *"Esta accion requiere uno de los roles: ..."*: su rol no tiene permiso para
  esa accion.
