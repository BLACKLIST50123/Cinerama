/* ============================================================================
   CINERAMA — UTILIDADES.JS — Helpers compartidos por cliente.js y admin.js
   ------------------------------------------------------------------------
   Parte de la arquitectura modular de Cinerama (Fase 14).
   Cargado como <script> clásico (no ES module) para funcionar también
   abriendo index.html directamente con file://, sin necesidad de servidor.
   Toasts, validadores, formato de moneda/fecha y helpers de salas/ventas
   usados tanto por el flujo de cliente como por el panel admin.
   ============================================================================ */

/* ============================================================================
   3. FASE 6 — SISTEMA DE TOASTS Y VALIDADORES
   ------------------------------------------------------------------------
   Validación de doble seguridad: cada formulario valida en el "frontend"
   (al escribir/enviar) y se vuelve a validar en la función que procesa
   los datos ("backend" simulado), antes de guardar en localStorage.
   ============================================================================ */

/**
 * Muestra una notificación tipo toast, sin romper la estética oscura.
 * @param {string} mensaje
 * @param {'exito'|'error'|'info'} tipo
 */
window.mostrarToast = (mensaje, tipo = 'info') => {
    let contenedor = document.getElementById('contenedor-toasts');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'contenedor-toasts';
        document.body.appendChild(contenedor);
    }

    const iconos = { exito: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const colores = { exito: 'text-green-400', error: 'text-brand-red', info: 'text-brand-yellow' };

    const toast = document.createElement('div');
    toast.className = `toast-cinerama toast-${tipo}`;
    toast.innerHTML = `
        <i class="fa-solid ${iconos[tipo] || iconos.info} ${colores[tipo] || colores.info} mt-0.5"></i>
        <span class="flex-1">${mensaje}</span>
    `;
    contenedor.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-saliendo');
        setTimeout(() => toast.remove(), 250);
    }, 3800);
};

// --- Validadores atómicos reutilizables ---
const Validadores = {
    requerido: (valor) => valor !== null && valor !== undefined && String(valor).trim().length > 0,
    soloTexto: (valor) => /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,60}$/.test(String(valor).trim()),
    correo: (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim()),
    contrasena: (valor) => String(valor).length >= 6,
    dni: (valor) => /^\d{8}$/.test(String(valor).trim()),
    ruc: (valor) => /^\d{11}$/.test(String(valor).trim()),
    telefono: (valor) => /^9\d{8}$/.test(String(valor).trim()),
    numeroTarjeta: (valor) => /^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/.test(String(valor).trim()),
    vencimientoTarjeta: (valor) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(String(valor).trim()),
    cvv: (valor) => /^\d{3,4}$/.test(String(valor).trim()),
    minLength: (valor, min) => String(valor).trim().length >= min
};

/** Marca visualmente un campo como inválido y muestra un mensaje bajo él. */
function marcarCampoInvalido(inputEl, mensaje) {
    if (!inputEl) return;
    inputEl.classList.add('campo-invalido');
    let msgEl = inputEl.parentElement.querySelector('.mensaje-error-campo');
    if (!msgEl) {
        msgEl = document.createElement('span');
        msgEl.className = 'mensaje-error-campo';
        inputEl.parentElement.appendChild(msgEl);
    }
    msgEl.textContent = mensaje;
}

/** Limpia el estado de error visual de un campo. */
function limpiarCampoInvalido(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('campo-invalido');
    const msgEl = inputEl.parentElement.querySelector('.mensaje-error-campo');
    if (msgEl) msgEl.remove();
}

/**
 * Ejecuta una lista de reglas { input, prueba, mensaje } y devuelve true
 * solo si TODAS pasan. Aplica estilos de error visual (Fase 6).
 */
function validarFormulario(reglas) {
    let esValido = true;
    let primerError = null;
    reglas.forEach(regla => {
        const pasa = regla.prueba();
        if (!pasa) {
            esValido = false;
            marcarCampoInvalido(regla.input, regla.mensaje);
            if (!primerError) primerError = regla.mensaje;
        } else {
            limpiarCampoInvalido(regla.input);
        }
    });
    if (!esValido && primerError) {
        mostrarToast(primerError, 'error');
    }
    return esValido;
}




/* ============================================================================
   HELPERS COMPARTIDOS: archivos, fechas y salas (mantenimiento/ventas)
   Usados por cliente.js (asientos, checkout) y admin.js (mantenimiento).
   ============================================================================ */

function convertirArchivoABase64(archivo) {
    return new Promise((resolve, reject) => {
        if (!archivo) { resolve(''); return; }
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        lector.readAsDataURL(archivo);
    });
}

function guardarEnLocalStorageSeguro(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
        return true;
    } catch (err) {
        console.error('Error al guardar en localStorage:', clave, err);
        mostrarToast('No se pudo guardar el cambio: el almacenamiento local está lleno. Intenta usar imágenes más livianas o por URL.', 'error');
        return false;
    }
}

function formatearFechaAmigable(fechaISO) {
    if (!fechaISO) return '';
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const fecha = new Date(`${fechaISO}T00:00:00`);
    if (isNaN(fecha.getTime())) return fechaISO;
    return `${dias[fecha.getDay()]}, ${fecha.getDate()} ${meses[fecha.getMonth()]}`;
}

function etiquetaFilaSala(indice) {
    let etiqueta = '';
    let numero = indice + 1;
    while (numero > 0) {
        const resto = (numero - 1) % 26;
        etiqueta = String.fromCharCode(65 + resto) + etiqueta;
        numero = Math.floor((numero - 1) / 26);
    }
    return etiqueta;
}

function crearConfiguracionSala(numero, filas = LAYOUT_SALA.filas.length, columnas = LAYOUT_SALA.columnas) {
    const asientos = [];
    for (let f = 0; f < filas; f++) {
        for (let c = 1; c <= columnas; c++) asientos.push({ f: etiquetaFilaSala(f), c, estado: 'disponible' });
    }
    return { id_sala: `sala_${String(numero).padStart(2, '0')}`, nombre: `Sala ${numero}`, filas, columnas, asientos };
}

/** Lee el nuevo esquema y migra en memoria el formato antiguo { sala: [butacas bloqueadas] }. */
function obtenerDatosSalas() {
    const guardado = JSON.parse(localStorage.getItem(LS_SALAS_MANTENIMIENTO));
    if (guardado && Array.isArray(guardado.salas)) return guardado;

    const salas = [];
    for (let numero = 1; numero <= NUMERO_TOTAL_SALAS; numero++) {
        const sala = crearConfiguracionSala(numero);
        const bloqueadas = guardado && Array.isArray(guardado[String(numero)]) ? guardado[String(numero)] : [];
        sala.asientos.forEach(asiento => {
            if (bloqueadas.includes(`${asiento.f}${asiento.c}`)) asiento.estado = 'mantenimiento';
        });
        salas.push(sala);
    }
    return { salas };
}

function guardarDatosSalas(datos) {
    return guardarEnLocalStorageSeguro(LS_SALAS_MANTENIMIENTO, datos);
}

function obtenerSalaConfigurada(numero = 1) {
    const datos = obtenerDatosSalas();
    return datos.salas.find(sala => Number(sala.id_sala.replace('sala_', '')) === Number(numero)) || crearConfiguracionSala(numero);
}

function obtenerMatrizSalasMantenimiento() {
    return obtenerDatosSalas();
}

function estaButacaBloqueada(id, sala = 1) {
    const configuracion = obtenerSalaConfigurada(sala);
    const asiento = configuracion.asientos.find(item => `${item.f}${item.c}` === id);
    return asiento && asiento.estado === 'mantenimiento';
}

function registrarVentaAsientos(sala, idsAsientos) {
    if (!sala || !idsAsientos || idsAsientos.length === 0) return;
    const ventas = JSON.parse(localStorage.getItem(LS_VENTAS_ASIENTOS)) || [];
    ventas.push({ sala: Number(sala), asientos: idsAsientos, fecha: new Date().toISOString() });
    guardarEnLocalStorageSeguro(LS_VENTAS_ASIENTOS, ventas);
}

function obtenerButacasVendidasPorSala(sala) {
    const ventas = JSON.parse(localStorage.getItem(LS_VENTAS_ASIENTOS)) || [];
    const vendidas = new Set();
    ventas.filter(v => Number(v.sala) === Number(sala)).forEach(v => v.asientos.forEach(id => vendidas.add(id)));
    return vendidas;
}

/** Convierte una duración con formato "2h 25m" (o variantes con espacios) en minutos totales. */
function duracionAMinutos(duracionStr) {
    if (!duracionStr) return 0;
    const match = String(duracionStr).match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
    if (!match) return 0;
    const horas = parseInt(match[1], 10) || 0;
    const minutos = parseInt(match[2], 10) || 0;
    return horas * 60 + minutos;
}

/** Convierte "HH:MM" en minutos desde medianoche. Devuelve null si el formato no es válido. */
function horaAMinutos(horaStr) {
    if (!horaStr) return null;
    const partes = String(horaStr).split(':');
    const h = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

/* ============================================================================
   MÓDULO 5 — RESTRICCIONES DE TECLADO (helpers globales, reutilizables en toda la app)
   ============================================================================ */

/** Restringe un input a solo dígitos, con un máximo opcional de caracteres (ej. DNI=8, RUC=11, CVV=4). */
function restringirSoloNumeros(inputEl, maxDigitos = null) {
    let limpio = inputEl.value.replace(/\D/g, '');
    if (maxDigitos) limpio = limpio.slice(0, maxDigitos);
    inputEl.value = limpio;
}

/** Formatea en vivo un número de tarjeta: solo dígitos, agrupados de 4 en 4, máximo 16 dígitos. */
function formatearNumeroTarjetaEnVivo(inputEl) {
    const digitos = inputEl.value.replace(/\D/g, '').slice(0, 16);
    inputEl.value = digitos.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/** Formatea en vivo un vencimiento de tarjeta al formato estricto MM/AA. */
function formatearVencimientoTarjetaEnVivo(inputEl) {
    const digitos = inputEl.value.replace(/\D/g, '').slice(0, 4);
    inputEl.value = digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
}

/* ============================================================================
   MÓDULO 3 — SELECTORES DE CHIPS (Género multi-selección / Formato único)
   ============================================================================ */

/**
 * Pinta un selector de chips de MÚLTIPLE selección dentro de contenedorId,
 * sincronizado con un <input type="hidden"> cuyo valor queda como las
 * opciones activas unidas por " / " (ej. "Acción / Aventura").
 * @param {string} seleccionInicial - valor ya guardado (ej. "Acción / Aventura"), puede venir vacío.
 */
function renderizarSelectorChipsMultiple(contenedorId, inputOcultoId, opciones, seleccionInicial = '') {
    const contenedor = document.getElementById(contenedorId);
    const inputOculto = document.getElementById(inputOcultoId);
    if (!contenedor || !inputOculto) return;

    const seleccionadas = new Set(
        String(seleccionInicial).split('/').map(s => s.trim()).filter(Boolean)
    );

    function repintar() {
        contenedor.innerHTML = opciones.map(op => {
            const activo = seleccionadas.has(op);
            return `<button type="button" data-valor="${op}" class="chip-selector ${activo ? 'chip-selector-activo' : ''}">${op}</button>`;
        }).join('');
        inputOculto.value = opciones.filter(op => seleccionadas.has(op)).join(' / ');
    }

    contenedor.onclick = (ev) => {
        const btn = ev.target.closest('.chip-selector');
        if (!btn) return;
        const valor = btn.dataset.valor;
        if (seleccionadas.has(valor)) seleccionadas.delete(valor); else seleccionadas.add(valor);
        repintar();
    };

    repintar();
}

/**
 * Pinta un grupo de chips de selección ÚNICA (comportamiento tipo radio).
 * Llama a onCambio(valorSeleccionado) cada vez que cambia, incluyendo al pintarse.
 */
function renderizarGrupoChipsUnico(contenedorId, opciones, valorInicial, onCambio) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    let seleccionado = opciones.includes(valorInicial) ? valorInicial : opciones[0];

    function repintar() {
        contenedor.innerHTML = opciones.map(op =>
            `<button type="button" data-valor="${op}" class="chip-selector ${op === seleccionado ? 'chip-selector-activo' : ''}">${op}</button>`
        ).join('');
    }

    contenedor.onclick = (ev) => {
        const btn = ev.target.closest('.chip-selector');
        if (!btn) return;
        seleccionado = btn.dataset.valor;
        repintar();
        onCambio(seleccionado);
    };

    repintar();
    onCambio(seleccionado);
}

/**
 * Formatea en vivo un campo de duración a partir de solo dígitos ingresados:
 * "225" -> "2h 25m", "0225" -> "02h 25m". Restringe a números y máximo 4 dígitos (HHMM).
 */
function formatearDuracionEnVivo(inputEl) {
    const digitos = inputEl.value.replace(/\D/g, '').slice(0, 4);
    const horas = digitos.length > 2 ? digitos.slice(0, digitos.length - 2) : digitos;
    const minutos = digitos.length > 2 ? digitos.slice(-2) : '';
    let resultado = '';
    if (horas) resultado += `${horas}h`;
    if (minutos) resultado += ` ${minutos}m`;
    inputEl.value = resultado;
}

/* ============================================================================
   FASE 16 — ESTADOS VACÍOS (empty states) consistentes en toda la app
   ============================================================================ */

/**
 * Genera el HTML de un estado vacío consistente: ícono + título + subtítulo + botón opcional.
 * Pensado para inyectarse dentro de un grid/lista (usa col-span-full para no romper el layout).
 * @param {{icono?: string, titulo: string, subtitulo?: string, textoBoton?: string, accionBoton?: string}} opciones
 */
function htmlEstadoVacio({ icono = 'fa-inbox', titulo = 'No hay nada por aquí', subtitulo = '', textoBoton = '', accionBoton = '' } = {}) {
    return `
        <div class="col-span-full flex flex-col items-center justify-center text-center py-16 px-6">
            <div class="w-16 h-16 rounded-full bg-dark-800 border border-white/10 flex items-center justify-center mb-4">
                <i class="fa-solid ${icono} text-2xl text-gray-600"></i>
            </div>
            <h4 class="text-white font-bold text-lg mb-1">${titulo}</h4>
            ${subtitulo ? `<p class="text-gray-500 text-sm max-w-xs mb-5">${subtitulo}</p>` : ''}
            ${textoBoton ? `<button onclick="${accionBoton}" class="bg-brand-red hover:bg-brand-dark-red text-white px-6 py-2.5 rounded-full font-bold text-sm transition-colors">${textoBoton}</button>` : ''}
        </div>`;
}
