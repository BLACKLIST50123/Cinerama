# Módulo 5 — Estandarización de Inputs y Modales (Global)

## 1. Modales Custom (barrido final)
Encontré y reemplacé los últimos rastros de diálogos nativos que quedaban en la app:
- `admin.js` → `actualizarTipoPeliculaAdmin()`: el `window.confirm()` al cambiar el switch "Próximo Estreno" con funciones ya preparadas, ahora usa `confirmarAccion()`.
- **Consolidación de modales duplicados**: la app ya tenía un modal Tailwind propio para confirmar eliminaciones (`#modal-confirmar-eliminar`, usado por "Eliminar Película" y "Eliminar Producto"), separado del `confirmarAccion()` que construí en el Módulo 1. Como senior dev, no tenía sentido mantener dos sistemas de modal de confirmación haciendo lo mismo — eliminé el modal duplicado (HTML + sus 3 funciones JS) y `pedirConfirmacionEliminar()` ahora delega en `confirmarAccion()`. Mismo comportamiento para quien usa la app, menos código para mantener.

Con esto, **ya no queda ningún `alert()` ni `confirm()` nativo en todo el proyecto** — lo confirmé con una búsqueda completa en los 7 archivos JS y el HTML.

## 2. Restricciones de Teclado
Nuevos helpers reutilizables en `utilidades.js`:
- `restringirSoloNumeros(input, maxDigitos)` — limpia cualquier carácter no numérico en vivo y corta al máximo de dígitos indicado.
- `formatearNumeroTarjetaEnVivo(input)` — solo dígitos, agrupados de 4 en 4, máximo 16.
- `formatearVencimientoTarjetaEnVivo(input)` — formato estricto `MM/AA`.

Aplicados a todos los campos numéricos "sí o sí" de la app:
| Campo | Restricción |
|---|---|
| DNI (pago) | Máximo 8 dígitos, solo números |
| RUC (pago) | Máximo 11 dígitos, solo números |
| Número de tarjeta (pago) | Solo números, formateado en grupos de 4 |
| Vencimiento de tarjeta (pago) | Formato estricto `MM/AA` |
| CVV (pago) | Máximo 4 dígitos, solo números |
| Tarjeta simulada (perfil de socio) | Mismo formato que número de tarjeta |

Nota sobre fechas: el único campo de fecha en formato libre "tipo `--/--/--`" que existe en la app es justamente el vencimiento de tarjeta (`MM/AA`), que ya quedó cubierto arriba. El resto de fechas de la app (horarios en el admin) ya usan `<input type="date">` nativo del navegador, que impone su propio formato válido sin necesitar una máscara adicional — así que no había nada más que enmascarar ahí.

Todos los campos numéricos que ya usaban `type="number"` (precios, filas/columnas de sala, porcentaje de cupón) se dejaron tal cual: el navegador ya les impide ingresar letras de forma nativa, así que agregar una máscara encima sería redundante.

## Con esto se completan los 5 módulos de tu lista
Revisé `notas.txt` de principio a fin contra lo entregado en los 5 zips y no quedó ningún punto pendiente de tu lista original. Si al probar este último módulo (o cualquiera de los anteriores) encuentras algo que no cuadra, dímelo con el mayor detalle posible (qué hiciste, qué esperabas, qué pasó) y lo reviso.

## Cómo probar
1. Ve a cualquier flujo de eliminar (una película o un producto de dulcería en el admin) → debe seguir viéndose igual que antes (modal bonito, no `confirm()` del navegador).
2. En el admin, crea una película nueva, activa "Próximo Estreno" después de haber preparado funciones → debe salir el modal de advertencia con el mismo estilo del resto de la app.
3. En Pago, intenta escribir letras en DNI, RUC, número de tarjeta, vencimiento o CVV → no debe dejar, y el vencimiento debe autoformatearse a `MM/AA` mientras escribes.
4. En tu perfil de socio (⚙️ editar método de pago), el campo de tarjeta simulada debe comportarse igual.
