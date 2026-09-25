# Módulo 9 — Cine Náutica: Horarios, Tarifas por tipo/formato, Formatos, validaciones de Salas y listados de Socios/Personal

Este módulo convierte el proyecto de una app hecha para "Cinerama" a una propuesta genérica
para cualquier cine (aquí ejemplificada como **Cine Náutica**, nombre ficticio), y ajusta las
políticas de precio a lo que marca la ley peruana o es práctica común de las cadenas:
- **CONADIS**: 20% de descuento (Ley N° 29973, art. 44.2) — sin tope de entradas por función por
  ahora, tal como se acordó; queda como un tipo de entrada editable si la norma cambia.
- **Adulto Mayor / Niño**: no son descuentos legalmente obligatorios en cine — son política
  comercial de cada cadena, así que quedan como tipos de entrada 100% editables (nombre y %).

## 0) Rebranding
- `NOMBRE_CINE` / `NOMBRE_CINE_CORTO` centralizados en `estado.js`; todo el texto visible
  (navbar, footer, tickets/PDF, comprobantes, toasts, chatbot, popup del mapa) ya no dice
  "Cinerama". El enlace de Facebook (que apuntaba a una página real) se dejó como placeholder.
  Las claves de `localStorage` (`cinerama_usuarios`, etc.) y el correo demo `admin@cinerama.com`
  se dejaron sin tocar a propósito: son identificadores internos invisibles para el usuario, y
  renombrarlos no aportaba nada aparte de riesgo.

## 1) Duración en dos campos (horas / minutos)
Reemplazado el input de texto libre "2h 25m" por dos `<input type="number">` en los formularios
de crear y editar película. Internamente se sigue combinando al mismo formato de string que ya
usaba `duracionAMinutos()` (y por lo tanto el motor de choques de horarios), así que no hubo que
tocar esa lógica.

## 2) Tab "Horarios" (calendario + programación), separado de Cartelera
- **Cartelera** ahora solo crea/edita datos de la película (título, sinopsis, duración,
  clasificación, imágenes, **formatos que ofrece**). Ya no exige crear funciones para guardar una
  película — se eliminó por completo el "gestor de horarios" embebido y su requisito.
- **Horarios** es la única pantalla que crea/edita/mueve funciones: calendario mensual (coloreado
  según si el día tiene funciones), agenda del día agrupada **por hora** (como pediste, para tener
  todo el vistazo de un tirón), y un botón "+ Agregar función" que abre un modal para elegir
  película → formato (filtrado a los que esa película ofrece) → idioma (Doblada/Subtitulada) →
  sala (filtrada a las que soportan ese formato, con las ocupadas en ese horario bloqueadas) → hora.
  El mismo modal sirve para **editar/mover** una función existente (clic en el lápiz de la agenda).
- El dato sigue viviendo exactamente donde antes (`pelicula.horarios[fecha]`), así que **la
  migración fue automática**: todo lo que ya estaba programado en las películas semilla apareció
  directo en el calendario nuevo sin tocar nada a mano.
- **Bug cerrado de paso** (autorizado por tu comentario de "si ves huecos los arreglas"): el
  detector de choques viejo ignoraba por completo los demás horarios de la propia película al
  programar uno nuevo (una película sí podía chocar consigo misma sin aviso). El nuevo detector
  cruza contra TODAS las funciones de esa fecha, propia película incluida. Verificado con test.
- Desde Cartelera, el ícono de calendario de cada película ahora salta directo a Horarios con el
  día correspondiente ya seleccionado (`irAHorariosDeEstaPelicula`).

## 3) Salas: sin indicador de "vendida", con bloqueo real donde corresponde
- Se quitó el indicador visual de butacas vendidas (Módulo 4, era solo informativo).
- Política implementada:
  - Una butaca con una venta para una **función futura** nunca se puede tocar (ni su estructura —
    pasadizo — ni su estado — mantenimiento/accesible). El clic se bloquea con un toast explicando
    el motivo, en vez de mostrar un candado permanente en la matriz.
  - "Generar Cuadrícula Base" (regenerar toda la sala) se bloquea si la sala tiene **al menos una**
    butaca vendida a futuro, porque podría eliminar o renumerar esa butaca comprometida.
  - Todo lo demás —butacas sin vender, aunque otras de la misma sala sí tengan venta— se edita
    libre, igual que antes.
- Nueva función de datos `obtenerButacasVendidasFuturasPorSala()` (utilidades.js), que sí distingue
  fecha/hora reales de la función (a diferencia de la vieja, que era "toda venta histórica").

## 4) Tarifas (antes "Calendario") — tipo de entrada + formato + día
- La pestaña "Calendario (Feriados)" se renombró a **"Tarifas"** y ahora reúne:
  1. **Formatos de proyección** (catálogo editable: 2D, 3D, 4DX, XD, VIP, D-BOX de partida, con
     opción de agregar más) — nombre y **recargo en soles** editables. "2D" está protegido (no se
     puede eliminar; siempre debe existir un formato base con recargo 0).
  2. **Tipos de entrada** (catálogo editable: General/Adulto, Niño, Adulto Mayor, CONADIS de
     partida) — nombre y **% de descuento** editables, con opción de agregar más (ej. Estudiante).
     "General / Adulto" está protegido (siempre debe quedar un tipo sin condiciones).
  3. El calendario de feriados de siempre (sin cambios de lógica, solo de ubicación).
- Un formato o tipo de entrada en uso (por alguna sala, película o función ya programada) no se
  puede eliminar — se avisa dónde está en uso.
- **El precio de una entrada ahora se arma en 3 pasos**: tarifa base del día (sin cambios: martes,
  L/Mi, J-D/feriado/pre-estreno) **+** recargo del formato de la función **×** descuento del tipo
  de entrada elegido para ese asiento.
- **Cambio de flujo en el checkout**: cada asiento elegido trae un selector de "tipo de entrada"
  en el resumen (antes todos eran "Entrada General" fijo); cambiar el tipo recalcula el precio de
  ese asiento al instante, sin tener que deseleccionarlo.

## 5) Catálogo de formatos vs. capacidad de salas y películas
- Cada **sala** ahora declara qué formatos soporta (`formatosSoportados`, checkboxes en Admin >
  Salas). Por defecto, toda sala existente quedó con **todos** los formatos habilitados (para no
  bloquear de golpe lo ya programado); el admin la restringe desde ahí si quiere.
- Cada **película** declara en qué formatos se ofrece (`formatosDisponibles`, checkboxes
  obligatorios en el alta/edición — hay que marcar al menos uno).
- El modal de "Agregar función" en Horarios cruza ambos: el selector de formato se limita a los
  de la película, y el de sala se limita a las que soportan ese formato — es imposible programar
  una combinación inválida.
- El idioma (Doblada/Subtitulada) quedó como un dato aparte del formato (antes iban mezclados en
  un solo texto libre como "2D Doblada").

## 6) Tab "Socios": listado completo, filtro por nivel, buscador y ficha
- Ya no es solo un buscador puntual: ahora se listan **todos** los socios en una lista con scroll
  (`max-h-[480px]`, ni muy chica ni infinita, tal como pediste), con filtro por nivel
  (Bronce/Plata/Oro) y buscador libre (nombre, correo, código, DNI) que filtra en vivo.
- Clic en la tarjeta de un socio abre el panel de detalle ya existente (carnet, nivel, historial
  de puntos, validadores de cumpleaños y fila preferencial) — mismo panel de siempre, ahora
  alimentado desde la lista en vez de una búsqueda exacta.

## 7) Tab "Personal": listado, buscador, ficha de detalle y más datos al crear cuentas
- Buscador (nombre, correo, DNI) sobre el listado con scroll que ya existía, sumado al filtro por
  rol del Módulo 8.
- **Campos nuevos, obligatorios al crear o editar una cuenta de personal**: DNI (8 dígitos,
  validado y único entre el personal) y celular (9 dígitos, empieza con 9). Nota interna, opcional.
- Se guarda además `creadoPor` (correo del admin que dio de alta la cuenta) y se sigue guardando
  `creadoEn` (ya existía).
- Nuevo botón "Ver ficha" (ícono de ojo) en cada tarjeta: abre un panel de solo lectura con todos
  los datos — nombre, rol, correo, DNI, celular, estado, fecha de ingreso, quién la creó, nota, y
  la contraseña oculta con un botón de "ojo" para revelarla (no se muestra en texto plano por
  defecto). Desde ahí hay un botón directo a "Editar cuenta".

## Restricciones respetadas
- Se mantuvo el patrón de separación de acceso a datos en `socios.js` (Personal, sección 8) para
  la futura migración a Supabase.
- `socios.js` se sigue cargando antes que `cliente.js`/`admin.js`.
- Estilo del código existente (Tailwind inline, `mostrarToast`/`confirmarAccion`/`Validadores`/
  `validarFormulario`, comentarios citando "MÓDULO 9").
- El flujo de compra normal de cliente y la venta de counter (Módulo 8) se revalidaron enteros y
  siguen funcionando igual — únicamente el precio por asiento ahora pasa por el nuevo motor de
  tipo de entrada + formato en vez de la tarifa plana de antes.

## Decisión pendiente / limitación conocida
Las fechas de las funciones se guardan como etiqueta "Día, DD Mes" sin año (para no reescribir el
motor de compra existente, que ya trabajaba así desde antes de este módulo) y se resuelven contra
el año actual. Esto significa que la programación no distingue automáticamente entre, por ejemplo,
el 5 de enero de este año o del que viene — funciona perfecto dentro de un mismo año calendario,
que es el uso esperado de una cartelera de cine. Si más adelante se necesita programar con meses de
anticipación cruzando el cambio de año, este es el punto exacto a extender (agregar el año a la
etiqueta y a `resolverFechaISODeEtiqueta`).

## Testing
Se armó un segundo arnés jsdom (45 aserciones) para todo lo nuevo de este módulo: catálogos por
defecto, alta de película sin función con formatos obligatorios, CRUD de formatos/tipos de entrada
con protección de los elementos base, formatos soportados por sala + bloqueo de edición de butacas
vendidas a futuro + bloqueo de "Generar Cuadrícula", alta/edición/choques/auto-choque/mover función
en Horarios con compatibilidad sala↔formato↔película, precio de checkout con recargo de formato y
descuento por tipo de entrada (incluido CONADIS), listado/filtro/ficha de Socios, y Personal con
campos obligatorios, búsqueda y ficha con contraseña revelable. Se corrió también el arnés completo
del Módulo 8 (78 aserciones) para confirmar que nada del flujo de cliente/counter/admin se rompió.
**Total: 123 de 123 pasando.**
