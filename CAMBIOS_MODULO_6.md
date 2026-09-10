# Módulo 6 — Correcciones, Banner Dinámico, Categorías Dinámicas y Límite de Asientos

## A) Correcciones previas integradas
1. **Modales tapados por el Navbar**: `login`, `registro`, `perfil`, `legal`, `editar-pelicula`, `editar-feriado` y `editar-dulce` pasaron de `z-50` a `z-[60]`.
2. **Diseño de 3 columnas en Asientos**: se reemplazó el panel lateral deslizante (`#panel-info-asientos` + `togglePanelInfoAsientos()`) por un `grid grid-cols-1 lg:grid-cols-4` (Info / Mapa `lg:col-span-2` / Resumen). Se apila en una sola columna en móvil. Se eliminó todo el código muerto del panel antiguo (HTML, JS y CSS) para que no queden referencias rotas.
3. **Escape del flujo de compra**: "Socio Cinerama" y "Contáctenos" (desktop y menú móvil) ahora pasan por `intentarSalirDelFlujoDeCompra()`.
4. **Alerta de salida temprana**: `hayProgreso` ahora también es `true` en cuanto `estadoPedido.pelicula !== null`, así que ya avisa desde la vista de Horarios, no solo desde Asientos.
5. **Bug del temporizador oculto**: `#badge-temporizador-compra` ahora es `top-40 z-[60]`.
6. **Botones del banner**: `moverCarrusel(-1|1)` ya mueve entre slides (ver punto B).

## B) Banner Dinámico
- Nuevo `bannerPeliculasIds` (persistido en `localStorage` como `cinerama_banner`): array de IDs de película, en el orden del carrusel. Solo se guardan IDs — título, imagen y clasificación siempre se leen en vivo del catálogo, así que si editas la película el banner se actualiza solo.
- **Admin → Cartelera**: nueva tarjeta "Banner Principal" con un checklist de todas las películas (Cartelera + Estrenos). Marcar/desmarcar agrega o quita del banner; las que están activas muestran flechas ↑/↓ para reordenar el carrusel.
- **Cliente**: el `index.html` ya no trae slides hardcodeados — `renderizarBannerPrincipal()` los arma en vivo. "Comprar Entradas" abre horarios de esa película; "Ver Tráiler" abre su detalle. Si el admin no eligió ninguna, se muestran automáticamente las 2 primeras de Cartelera como respaldo (el home nunca queda vacío).

## C) Categorías Dinámicas de Dulcería
- Nuevo `categoriasDulceria` (persistido como `cinerama_categorias_dulceria`), sembrado con las 4 categorías que ya existían (Combos, Cancha, Bebidas, Snacks) para no romper los productos actuales.
- **Admin → Dulcería**: nueva sección "Categorías de Dulcería" para crear (con validación de nombre duplicado) y eliminar categorías.
- **Regla de eliminación de categoría** (según lo acordado): al eliminar una categoría con productos asignados, se muestra primero cuántos productos la usan y una confirmación de advertencia; si el admin confirma, la categoría se borra y esos productos se reasignan automáticamente a **"Sin categoría"** (una categoría especial que no se puede borrar). Al salir de la pestaña Dulcería habiendo productos en "Sin categoría", se muestra un aviso para asignarles categoría ahora o dejarlos así.
- El `<select>` de categoría en crear/editar producto (admin) y los botones de filtro (cliente y admin) ahora se generan desde esta lista dinámica, no están fijos en el HTML.

## D) Límite de 8 asientos por compra
`clickAsiento()` bloquea la selección de un 9º asiento con un toast de aviso (`MAX_ASIENTOS_POR_COMPRA = 8` en `estado.js`, para tener la regla en un solo lugar).

## Pulido de UX adicional
- **Salas (Mantenimiento)**: el botón "Guardar Cambios" ya no está pegado a la leyenda (se agregó separación + borde divisor), y se agregó un botón **"Restablecer"** al lado que descarta los cambios sin guardar y recarga la última versión guardada de la sala (con confirmación).
- Los filtros de dulcería (cliente y admin) y el nombre de categoría mostrado junto a cada producto en el admin ahora usan siempre el nombre legible de la categoría (antes se mostraba el `id` crudo capitalizado).
- Se corrigió de paso un bug latente en `filtrarAdminDulceria()` que dependía del objeto global `event`, igual al que ya se había arreglado en el cliente — ahora ambos localizan el botón por `data-categoria`.

## Cómo probar
1. **Modales**: abre login/registro/editar película con el navbar visible → la "X" de cerrar ya no debe quedar tapada.
2. **Asientos**: entra a comprar entradas → debes ver 3 columnas en desktop y todo apilado en móvil. Selecciona 9 asientos → el 9º debe bloquearse con un toast.
3. **Salir del flujo**: elige una película (Horarios) sin llegar a Asientos, y haz clic en "Contáctenos" → debe salir la advertencia de perder tu progreso.
4. **Banner**: en Admin → Cartelera → marca 2-3 películas para el banner y reordénalas → vuelve al inicio y revisa que el carrusel las muestre en ese orden, con sus datos reales.
5. **Categorías**: en Admin → Dulcería → crea una categoría, asígnala a un producto, y luego intenta eliminar esa categoría → debe avisarte cuántos productos la usan antes de reasignarlos a "Sin categoría". Sal de la pestaña Dulcería → debe avisarte que hay productos sin categoría.
6. **Salas**: en Admin → Salas, cambia algo sin guardar y pulsa "Restablecer" → debe pedir confirmación y devolver la sala a su último estado guardado.
