/* ============================================================================
   CINERAMA — LÓGICA PRINCIPAL DE LA APLICACIÓN (SPA)
   ------------------------------------------------------------------------
   ÍNDICE DE BLOQUES:
     1.  ESTADO GLOBAL Y CONFIGURACIÓN
     2.  BASE DE DATOS MOCK (películas, estrenos, snacks, cupones)
     3.  FASE 6 — SISTEMA DE TOASTS Y VALIDADORES
     4.  NAVEGACIÓN ENTRE VISTAS (router simple por clases)
     5.  RENDERIZADO DE INICIO (cartelera / estrenos)
     6.  DETALLE DE PELÍCULA
     7.  HORARIOS Y FUNCIONES
     8.  SELECCIÓN DE ASIENTOS
     9.  DULCERÍA (incluye Fase 3 — flujo directo sin película)
     10. CHECKOUT / PAGO (incluye Fase 5 — motor de cupones)
     11. TICKET Y COMPROBANTE (PDF) + guardado en historial de compras
     12. AUTENTICACIÓN (login / registro) con validación doble
     13. FASE 1 — HISTORIAL "MIS COMPRAS" Y MODAL DE PERFIL
     14. FASE 4 — MODAL DE CONTACTO Y VISTA DE UBICACIÓN (Leaflet)
     15. FASE 5 — PANEL DE ADMINISTRADOR
     16. CHATBOT (CineBot IA simulado)
     17. INICIALIZACIÓN GENERAL (DOMContentLoaded)
   ============================================================================ */


/* ============================================================================
   1. ESTADO GLOBAL Y CONFIGURACIÓN
   ============================================================================ */

// Estado del pedido en curso (entradas + dulcería)
const estadoPedido = {
    pelicula: null,
    cine: 'Cinerama Chimbote', // por defecto
    fecha: null,
    formato: null,
    hora: null,
    asientos: [],   // Array de { id: 'D4', tipoLabel: 'Adulto', precio: 20.0 }
    carrito: {},    // Objeto contador de snacks { 'combo1': 2 }
    modoDirecto: false, // FASE 3: true cuando se entra por "Dulcería directa" (sin película)
    cupon: null      // FASE 5: { codigo, porcentaje } cupón aplicado
};

// --- SISTEMA DE USUARIOS (localStorage) ---
let usuarioActual = null;
const LS_USUARIOS = 'cinerama_usuarios';
const LS_USUARIO_ACTUAL = 'cinerama_usuario_actual';
const LS_CUPONES = 'cinerama_cupones';
const LS_BUTACAS_BLOQUEADAS = 'cinerama_butacas_bloqueadas';

let vistaActualVisible = 'vista-inicio';
let asientoPendienteId = null;
let panelAbierto = false;

/* ============================================================================
   2. BASE DE DATOS MOCK
   ============================================================================ */

const PRECIOS = {
    entradas: {
        'adulto': { label: 'Adulto', precio: 22.0 },
        'nino': { label: 'Niño', precio: 18.0 },
        'mayor': { label: 'Adulto Mayor', precio: 18.0 },
        'preferencial': { label: 'Preferencial', precio: 18.0 }
    },
    dulces: {
        // Combos
        'c_mega': { nombre: 'Combo Mega Familiar', desc: '2 Canchas Gigantes + 4 Bebidas Grandes + 1 Nachos', precio: 65.0, icono: 'fa-box-open', categoria: 'combo', stock: true },
        'c_duo': { nombre: 'Combo Dúo', desc: '1 Cancha Gigante + 2 Bebidas Grandes', precio: 40.0, icono: 'fa-heart', categoria: 'combo', stock: true },
        'c_personal': { nombre: 'Combo Personal', desc: '1 Cancha Mediana + 1 Bebida Mediana', precio: 25.0, icono: 'fa-user', categoria: 'combo', stock: true },
        // Cancha
        'p_gigante': { nombre: 'Cancha Gigante', desc: 'Sabor Mantequilla, Salada o Mixta', precio: 22.0, icono: 'fa-popcorn', categoria: 'cancha', stock: true },
        'p_mediana': { nombre: 'Cancha Mediana', desc: 'Sabor Mantequilla o Salada', precio: 16.0, icono: 'fa-popcorn', categoria: 'cancha', stock: true },
        // Bebidas
        'b_grande': { nombre: 'Gaseosa Grande', desc: 'Coca-Cola, Inca Kola, Sprite (32oz)', precio: 12.0, icono: 'fa-glass-water', categoria: 'bebida', stock: true },
        'b_mediana': { nombre: 'Gaseosa Mediana', desc: 'Coca-Cola, Inca Kola, Sprite (21oz)', precio: 9.0, icono: 'fa-glass-water', categoria: 'bebida', stock: true },
        'b_agua': { nombre: 'Agua Mineral', desc: 'Con o sin gas (500ml)', precio: 6.0, icono: 'fa-bottle-water', categoria: 'bebida', stock: true },
        // Snacks
        's_nachos': { nombre: 'Nachos con Queso', desc: 'Porción personal de nachos crocantes con salsa de queso cheddar calientita', precio: 15.0, icono: 'fa-cheese', categoria: 'snack', stock: true },
        's_hotdog': { nombre: 'Hot Dog Jumbo', desc: 'Salchicha de res con pan artesanal y cremas a elección', precio: 12.0, icono: 'fa-hotdog', categoria: 'snack', stock: true },
        's_mms': { nombre: 'M&M\'s', desc: 'Paquete grande M&M\'s Chocolate o Maní', precio: 8.0, icono: 'fa-candy-cane', categoria: 'snack', stock: true },
        's_snickers': { nombre: 'Snickers', desc: 'Barra de chocolate grande', precio: 6.0, icono: 'fa-cookie', categoria: 'snack', stock: true }
    }
};

// FASE 5: Cupones por defecto (se combinan con los creados desde el panel admin)
const CUPONES_BASE = {
    'VERANO20': { porcentaje: 20, descripcion: 'Descuento de verano' },
    'CINERAMA10': { porcentaje: 10, descripcion: 'Bienvenida Cinerama' }
};

const baseDatosPeliculas = {
    'spiderman': {
        id: 'spiderman',
        titulo: 'Spider-Man: Un Nuevo Día',
        banner: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070',
        poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600',
        genero: 'Acción / Aventura', clasificacion: 'APT', duracion: '2h 25m',
        sinopsis: 'Peter Parker se enfrenta a su mayor desafío cuando las barreras entre multiversos colisionan inesperadamente. Viejos enemigos de realidades alternativas llegan a Nueva York, y Peter deberá aliarse con versiones de sí mismo para restaurar el equilibrio antes de que su mundo sea destruido por completo.',
        trailer: 'https://www.youtube.com/embed/t06RUxPbp_c?si=Rj4D-H8eK0oD932R',
        horarios: {
            'Hoy, 26 Ago': [{ formato: '2D Doblada', horas: ['13:00', '15:30', '18:00'] }, { formato: 'SALA XD', horas: ['14:00', '17:00', '20:30'] }],
            'Jue, 27 Ago': [{ formato: '2D Doblada', horas: ['14:00', '16:30', '19:00'] }, { formato: 'SALA XD', horas: ['15:00', '18:00', '21:30'] }],
            'Vie, 28 Ago': [{ formato: '2D Subtitulada', horas: ['18:00', '21:00'] }, { formato: 'SALA XD', horas: ['19:30', '22:30'] }]
        }
    },
    'demonio': {
        id: 'demonio',
        titulo: 'La Noche del Demonio',
        banner: 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?q=80&w=2070',
        poster: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=600',
        genero: 'Terror / Suspenso', clasificacion: '+14', duracion: '1h 46m',
        sinopsis: 'Una familia se muda a una nueva casa buscando un nuevo comienzo, solo para descubrir que el lugar está plagado de entidades oscuras. A medida que las manifestaciones empeoran, descubren que el verdadero mal no reside en la casa, sino que ha poseído a su hijo menor.',
        trailer: 'https://www.youtube.com/embed/zuZnRUxPbp_c',
        horarios: {
            'Hoy, 26 Ago': [{ formato: '2D Doblada', horas: ['16:00', '21:00'] }, { formato: 'D-BOX', horas: ['19:00', '23:30'] }],
            'Jue, 27 Ago': [{ formato: '2D Doblada', horas: ['17:00', '22:00'] }, { formato: 'D-BOX', horas: ['20:00', '23:50'] }]
        }
    },
    'odisea': {
        id: 'odisea',
        titulo: 'La Odisea Espacial',
        banner: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=2070',
        poster: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=600&auto=format&fit=crop',
        genero: 'Ciencia Ficción', clasificacion: 'APT', duracion: '2h 52m',
        sinopsis: 'Un grupo de astronautas se embarca en una misión secreta hacia Júpiter acompañados por HAL 9000, una inteligencia artificial que controla la nave. A mitad de camino, la máquina comienza a exhibir un comportamiento extraño y letal.',
        trailer: 'https://www.youtube.com/embed/xhRUxPbp_c',
        horarios: {
            'Hoy, 26 Ago': [{ formato: '2D Subtitulada', horas: ['14:15', '17:45', '21:15'] }],
            'Jue, 27 Ago': [{ formato: '2D Subtitulada', horas: ['15:15', '18:45'] }]
        }
    }
};

const baseDatosEstrenos = {
    'batman': {
        id: 'batman',
        titulo: 'El Caballero Oscuro',
        poster: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?q=80&w=600',
        banner: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?q=80&w=2070',
        genero: 'Acción / Thriller', clasificacion: '+14', duracion: '2h 32m',
        sinopsis: 'Gotham City se enfrenta a una nueva amenaza cuando un criminal anarquista conocido como el Joker emerge para sumir la ciudad en el caos.',
        trailer: 'https://www.youtube.com/embed/EXeTwQWrcwY'
    },
    'avatar': {
        id: 'avatar',
        titulo: 'El Planeta Perdido',
        poster: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=600',
        banner: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=2070',
        genero: 'Aventura / Sci-Fi', clasificacion: 'APT', duracion: '3h 10m',
        sinopsis: 'Exploradores humanos llegan a un planeta exuberante y deben aprender a convivir con la flora y fauna alienígena que lo habita.',
        trailer: 'https://www.youtube.com/embed/a8Gx8wiNbs8'
    }
};

const formatearMoneda = (monto) => `S/ ${monto.toFixed(2)}`;


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
   4. NAVEGACIÓN ENTRE VISTAS
   ============================================================================ */

function cambiarVista(idDesde, idHacia) {
    const elDesde = document.getElementById(idDesde);
    const elHacia = document.getElementById(idHacia);
    if (!elDesde || !elHacia) return;

    elDesde.classList.add('opacity-0');
    setTimeout(() => {
        elDesde.classList.add('hidden');
        elHacia.classList.remove('hidden');
        elHacia.classList.remove('opacity-0'); // dispara la transición
        window.scrollTo({ top: 0, behavior: 'smooth' });
        vistaActualVisible = idHacia;
    }, 300);
}
window.cambiarVista = cambiarVista;

// Efecto de scroll en el navbar
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('barra-navegacion');
    if (!navbar) return;
    if (window.scrollY > 50) {
        navbar.classList.add('bg-black'); navbar.classList.remove('bg-gradient-to-b', 'from-black/80', 'to-transparent');
    } else {
        navbar.classList.remove('bg-black'); navbar.classList.add('bg-gradient-to-b', 'from-black/80', 'to-transparent');
    }
});


/* ============================================================================
   5. RENDERIZADO DE INICIO (cartelera / estrenos)
   ============================================================================ */

const renderizarGridsInicio = () => {
    const gridCartelera = document.getElementById('grid-cartelera');
    gridCartelera.innerHTML = '';
    Object.values(baseDatosPeliculas).forEach(pelicula => {
        gridCartelera.innerHTML += `
            <article onclick="abrirHorarios('${pelicula.id}')" class="movie-card group cursor-pointer flex flex-col h-full relative">
                <div class="absolute top-2 left-2 z-20 ${pelicula.clasificacion === 'APT' ? 'bg-black/80 border-white/10' : 'bg-red-600/90 border-red-500/30'} backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white border">${pelicula.clasificacion}</div>
                <div class="relative rounded-xl overflow-hidden aspect-[2/3] mb-4 bg-dark-800 shadow-xl shadow-black/50">
                    <img src="${pelicula.poster}" class="w-full h-full object-cover">
                    <div class="movie-overlay absolute inset-0 flex flex-col justify-end p-4 gap-2">
                        <button onclick="event.stopPropagation(); abrirHorarios('${pelicula.id}')" class="w-full bg-brand-red hover:bg-brand-dark-red text-white py-2.5 rounded-lg font-bold transition-colors shadow-lg flex items-center justify-center gap-2">
                            <i class="fa-solid fa-ticket"></i> Horarios
                        </button>
                        <button onclick="event.stopPropagation(); abrirDetallePelicula('${pelicula.id}', 'cartelera')" class="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white py-2.5 rounded-lg font-bold border border-white/30 transition-colors shadow-lg flex items-center justify-center gap-2">
                            <i class="fa-solid fa-play"></i> Tráiler
                        </button>
                    </div>
                </div>
                <div class="flex-grow flex flex-col">
                    <h3 class="font-bold text-lg md:text-xl text-white mb-1 leading-tight group-hover:text-brand-red transition-colors">${pelicula.titulo}</h3>
                    <p class="text-gray-400 text-sm mb-2">${pelicula.genero} &bull; ${pelicula.duracion}</p>
                </div>
            </article>
        `;
    });

    const gridEstrenos = document.getElementById('grid-estrenos');
    gridEstrenos.innerHTML = '';
    Object.values(baseDatosEstrenos).forEach(pelicula => {
        gridEstrenos.innerHTML += `
            <article onclick="abrirDetallePelicula('${pelicula.id}', 'estreno')" class="movie-card group cursor-pointer flex flex-col h-full relative">
                <div class="relative rounded-xl overflow-hidden aspect-[2/3] mb-4 bg-dark-800 shadow-xl shadow-black/50">
                    <img src="${pelicula.poster}" class="w-full h-full object-cover grayscale-[30%]">
                    <div class="absolute top-2 right-2 bg-brand-yellow text-black font-bold text-xs px-2 py-1 rounded shadow-md z-20">PRONTO</div>
                    <div class="movie-overlay absolute inset-0 flex flex-col justify-end p-4">
                        <button onclick="event.stopPropagation(); abrirDetallePelicula('${pelicula.id}', 'estreno')" class="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white py-3 rounded-lg font-bold border border-white/30 transition-colors shadow-lg flex items-center justify-center gap-2">
                            <i class="fa-solid fa-play"></i> Ver Tráiler
                        </button>
                    </div>
                </div>
                <div class="flex-grow flex flex-col">
                    <h3 class="font-bold text-lg md:text-xl text-white mb-1 leading-tight group-hover:text-brand-yellow transition-colors">${pelicula.titulo}</h3>
                    <p class="text-gray-400 text-sm mb-2">${pelicula.genero}</p>
                </div>
            </article>
        `;
    });
};


/* ============================================================================
   6. DETALLE DE PELÍCULA
   ============================================================================ */

window.abrirDetallePelicula = (peliculaId, tipo = 'cartelera') => {
    const pelicula = tipo === 'cartelera' ? baseDatosPeliculas[peliculaId] : baseDatosEstrenos[peliculaId];
    if (!pelicula) return;

    const botonCompraHTML = tipo === 'cartelera'
        ? `<button onclick="abrirHorarios('${pelicula.id}')" class="bg-brand-red hover:bg-brand-dark-red text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg shadow-red-500/40 transition-all flex items-center gap-2 mt-6"><i class="fa-solid fa-ticket"></i> Ver Horarios</button>`
        : `<button disabled class="bg-gray-600 text-gray-400 px-8 py-3 rounded-full font-bold text-lg cursor-not-allowed mt-6"><i class="fa-solid fa-clock"></i> Próximamente</button>`;

    const html = `
        <div class="relative w-full h-[50vh] min-h-[400px]">
            <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${pelicula.banner}');"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/80 to-black/30"></div>
            <button onclick="cambiarVista('vista-detalle-pelicula', 'vista-inicio')" class="absolute top-24 left-6 md:left-12 z-50 text-white hover:text-brand-yellow bg-black/40 p-3 rounded-full backdrop-blur-md transition-colors"><i class="fa-solid fa-arrow-left text-xl"></i></button>
        </div>

        <div class="max-w-[1200px] mx-auto px-6 md:px-12 -mt-32 relative z-20 flex flex-col md:flex-row gap-8 pb-20">
            <div class="w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
                <img src="${pelicula.poster}" class="w-full rounded-2xl shadow-2xl shadow-black/80 border-2 border-white/10">
            </div>

            <div class="flex-grow pt-4">
                <div class="flex items-center gap-3 mb-2">
                    <span class="bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-1 rounded text-xs font-bold text-white">${pelicula.clasificacion}</span>
                    <span class="text-gray-300 font-semibold text-sm">${pelicula.genero}</span>
                    <span class="text-gray-300 font-semibold text-sm">&bull;</span>
                    <span class="text-gray-300 font-semibold text-sm">${pelicula.duracion}</span>
                </div>
                <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">${pelicula.titulo}</h1>
                <p class="text-gray-300 text-lg leading-relaxed mb-8 max-w-3xl">${pelicula.sinopsis}</p>

                <div class="mb-8">
                    <h3 class="text-xl font-bold text-white mb-4 border-l-4 border-brand-red pl-3">Tráiler Oficial</h3>
                    <div class="video-container max-w-3xl bg-black rounded-2xl border border-white/10">
                        <div class="flex items-center justify-center flex-col bg-dark-800 text-gray-500">
                            <i class="fa-brands fa-youtube text-6xl text-white/20 mb-2"></i>
                            <p class="text-sm">Video Player Placeholder</p>
                            <p class="text-xs">Src: ${pelicula.trailer}</p>
                        </div>
                    </div>
                </div>

                ${botonCompraHTML}
            </div>
        </div>
    `;

    document.getElementById('contenido-detalle').innerHTML = html;
    cambiarVista(vistaActualVisible, 'vista-detalle-pelicula');
};


/* ============================================================================
   7. HORARIOS Y FUNCIONES
   ============================================================================ */

window.abrirHorarios = (peliculaId) => {
    const pelicula = baseDatosPeliculas[peliculaId];
    if (!pelicula) return;

    estadoPedido.modoDirecto = false;
    estadoPedido.pelicula = pelicula;
    estadoPedido.formato = null; estadoPedido.hora = null; estadoPedido.fecha = null;

    const fechasDisponibles = Object.keys(pelicula.horarios);
    estadoPedido.fecha = fechasDisponibles[0];

    renderizarContenidoHorarios(pelicula, fechasDisponibles);
    cambiarVista(vistaActualVisible, 'vista-horarios');
};

const renderizarContenidoHorarios = (pelicula, fechasDisponibles) => {
    const contenedor = document.getElementById('contenido-horarios');

    let tabsFechaHTML = '<div class="flex gap-2 overflow-x-auto hide-scrollbar mb-8 border-b border-white/10 pb-2">';
    fechasDisponibles.forEach(fecha => {
        const activa = fecha === estadoPedido.fecha;
        const clasesActivas = activa ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400 hover:text-white border-b-2 border-transparent';
        tabsFechaHTML += `<button onclick="cambiarFechaHorario('${fecha}')" class="px-5 py-2 font-bold whitespace-nowrap transition-colors ${clasesActivas}">${fecha}</button>`;
    });
    tabsFechaHTML += '</div>';

    let horariosHTML = '';
    const funcionesDelDia = pelicula.horarios[estadoPedido.fecha];
    funcionesDelDia.forEach(funcion => {
        horariosHTML += `
            <div class="bg-dark-800 rounded-xl p-5 border border-white/5 mb-6">
                <h4 class="text-lg font-bold text-white mb-4 border-l-4 border-brand-red pl-3">${funcion.formato}</h4>
                <div class="flex flex-wrap gap-3">`;
        funcion.horas.forEach(hora => {
            horariosHTML += `<button onclick="seleccionarHorario(this, '${funcion.formato}', '${hora}')" class="time-btn bg-dark-900 border border-gray-600 hover:border-brand-red hover:bg-brand-red/10 text-white font-bold py-2.5 px-6 rounded-lg transition-colors focus:outline-none">${hora}</button>`;
        });
        horariosHTML += `</div></div>`;
    });

    contenedor.innerHTML = `
        <div class="w-full lg:w-1/3 flex flex-col">
            <button onclick="cambiarVista('vista-horarios', 'vista-inicio')" class="text-white/60 hover:text-white mb-6 flex items-center gap-2 transition-colors w-max">
                <i class="fa-solid fa-arrow-left"></i> Volver a Cartelera
            </button>
            <div class="bg-dark-800 rounded-2xl p-6 border border-white/5 shadow-xl sticky top-28">
                <img src="${pelicula.poster}" class="w-full rounded-xl mb-4 shadow-lg">
                <h2 class="text-2xl font-bold text-white mb-1">${pelicula.titulo}</h2>
                <p class="text-gray-400 text-sm mb-1">${pelicula.genero} &bull; ${pelicula.duracion}</p>
                <span class="inline-block bg-white/10 border border-white/20 px-2 py-1 rounded text-xs font-bold text-white mt-2">${pelicula.clasificacion}</span>
            </div>
        </div>
        <div class="w-full lg:w-2/3">
            <h2 class="text-2xl md:text-3xl font-bold text-white mb-2">Elige fecha y horario</h2>
            <div class="h-1 w-20 bg-brand-red rounded-full mb-6"></div>
            ${tabsFechaHTML}
            ${horariosHTML}
        </div>
    `;
};

window.cambiarFechaHorario = (fecha) => {
    estadoPedido.fecha = fecha;
    estadoPedido.formato = null; estadoPedido.hora = null;
    document.getElementById('barra-confirmacion-horario').classList.add('translate-y-full');
    renderizarContenidoHorarios(estadoPedido.pelicula, Object.keys(estadoPedido.pelicula.horarios));
};

window.seleccionarHorario = (btnEl, formato, hora) => {
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('bg-brand-red', 'border-brand-red');
        btn.classList.add('bg-dark-900', 'border-gray-600');
    });
    btnEl.classList.remove('bg-dark-900', 'border-gray-600');
    btnEl.classList.add('bg-brand-red', 'border-brand-red');

    estadoPedido.formato = formato;
    estadoPedido.hora = hora;

    document.getElementById('fh-fecha').textContent = estadoPedido.fecha;
    document.getElementById('fh-formato').textContent = formato;
    document.getElementById('fh-hora').textContent = hora;
    document.getElementById('barra-confirmacion-horario').classList.remove('translate-y-full');
};


/* ============================================================================
   8. SELECCIÓN DE ASIENTOS
   ============================================================================ */

window.irAAsientos = () => {
    document.getElementById('info-pelicula-asientos').innerHTML = `
        <img src="${estadoPedido.pelicula.poster}" class="w-full rounded-xl mb-4 shadow-lg shadow-black/50">
        <h2 class="text-xl font-bold text-white mb-1">${estadoPedido.pelicula.titulo}</h2>
        <div class="flex flex-wrap gap-2 text-xs text-gray-400 mb-2">
            <span class="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-white font-bold">${estadoPedido.pelicula.clasificacion}</span>
            <span>${estadoPedido.formato}</span>
        </div>
        <p class="text-gray-300 text-sm mb-2 font-semibold">${estadoPedido.pelicula.genero} &bull; ${estadoPedido.pelicula.duracion}</p>
        <p class="text-gray-400 text-xs leading-relaxed mb-6 border-b border-white/10 pb-6 text-justify">${estadoPedido.pelicula.sinopsis}</p>

        <div class="space-y-3 mb-6 bg-dark-900 p-3 rounded-lg border border-white/5">
            <div class="flex items-center gap-3 text-sm text-gray-300">
                <i class="fa-regular fa-calendar text-brand-red w-4"></i> <span class="font-bold text-white">${estadoPedido.fecha}</span>
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-300">
                <i class="fa-regular fa-clock text-brand-red w-4"></i> <span class="font-bold text-white">${estadoPedido.hora}</span>
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-300">
                <i class="fa-solid fa-location-dot text-brand-red w-4"></i> <span class="font-bold text-white">${estadoPedido.cine}</span>
            </div>
        </div>
    `;

    document.getElementById('resumen-titulo-pelicula').textContent = estadoPedido.pelicula.titulo;
    document.getElementById('resumen-detalle-pelicula').textContent = `${estadoPedido.fecha} • ${estadoPedido.hora} • ${estadoPedido.formato}`;
    document.getElementById('resumen-cine').textContent = estadoPedido.cine;

    estadoPedido.asientos = [];
    renderizarGridAsientos();
    actualizarResumenAsientos();

    if (window.innerWidth >= 1024) togglePanelInfoAsientos(true);
    else togglePanelInfoAsientos(false);

    cambiarVista('vista-horarios', 'vista-asientos');
};

window.togglePanelInfoAsientos = (forzarEstado = null) => {
    const panel = document.getElementById('panel-info-asientos');
    const contenedorPrincipal = document.getElementById('contenedor-principal-asientos');
    const icono = document.getElementById('icono-toggle-panel');

    if (forzarEstado !== null) panelAbierto = forzarEstado;
    else panelAbierto = !panelAbierto;

    if (panelAbierto) {
        panel.classList.add('panel-open');
        icono.classList.replace('fa-chevron-right', 'fa-chevron-left');
        if (window.innerWidth >= 1024) contenedorPrincipal.style.marginLeft = '320px';
    } else {
        panel.classList.remove('panel-open');
        icono.classList.replace('fa-chevron-left', 'fa-chevron-right');
        if (window.innerWidth >= 1024) contenedorPrincipal.style.marginLeft = '80px';
    }
};

const renderizarGridAsientos = () => {
    const grid = document.getElementById('grid-asientos');
    grid.innerHTML = '';
    const filas = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const columnas = 12;

    filas.forEach(fila => {
        const filaDiv = document.createElement('div');
        filaDiv.className = 'flex gap-1.5 md:gap-2 justify-center items-center';
        filaDiv.innerHTML = `<div class="w-4 md:w-6 text-center text-gray-500 font-bold text-xs md:text-sm mr-2">${fila}</div>`;

        for (let c = 1; c <= columnas; c++) {
            if (c === 4 || c === 10) filaDiv.innerHTML += `<div class="w-4 md:w-8"></div>`; // pasillos

            const asientoId = `${fila}${c}`;
            const ocupado = Math.random() < 0.25 || estaButacaBloqueada(asientoId);

            if (ocupado) {
                filaDiv.innerHTML += `<button disabled class="seat w-7 h-7 md:w-10 md:h-10 bg-gray-700 rounded-t-lg md:rounded-t-xl rounded-b-sm border-b-4 border-black/50 opacity-50 cursor-not-allowed"></button>`;
            } else {
                filaDiv.innerHTML += `<button id="asiento-btn-${asientoId}" onclick="clickAsiento('${asientoId}')" class="seat w-7 h-7 md:w-10 md:h-10 bg-green-600 hover:bg-green-500 rounded-t-lg md:rounded-t-xl rounded-b-sm border-b-4 border-black/50 cursor-pointer flex justify-center items-end pb-1 text-[8px] md:text-[10px] font-bold text-white/50">${c}</button>`;
            }
        }
        grid.appendChild(filaDiv);
    });
};

window.clickAsiento = (asientoId) => {
    const indiceExistente = estadoPedido.asientos.findIndex(s => s.id === asientoId);
    const btn = document.getElementById(`asiento-btn-${asientoId}`);

    if (indiceExistente > -1) {
        estadoPedido.asientos.splice(indiceExistente, 1);
        btn.classList.remove('selected', 'bg-brand-red');
        btn.classList.add('bg-green-600');
        actualizarResumenAsientos();
    } else {
        asientoPendienteId = asientoId;
        document.getElementById('modal-asiento-id').textContent = asientoId;

        const contenedor = document.getElementById('contenedor-tipos-entrada');
        contenedor.innerHTML = '';
        for (const [key, detalles] of Object.entries(PRECIOS.entradas)) {
            contenedor.innerHTML += `
                <button onclick="confirmarTipoEntrada('${key}')" class="w-full flex justify-between items-center bg-dark-900 hover:bg-dark-700 border border-white/10 p-4 rounded-xl transition-colors text-left">
                    <span class="font-bold text-white">${detalles.label}</span>
                    <span class="text-brand-yellow font-bold">${formatearMoneda(detalles.precio)}</span>
                </button>
            `;
        }

        const modal = document.getElementById('modal-tipo-entrada');
        const contenido = document.getElementById('modal-tipo-entrada-contenido');
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            contenido.classList.remove('scale-95');
        }, 10);
    }
};

window.cerrarModalTipoEntrada = () => {
    const modal = document.getElementById('modal-tipo-entrada');
    const contenido = document.getElementById('modal-tipo-entrada-contenido');
    modal.classList.add('opacity-0');
    contenido.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); asientoPendienteId = null; }, 200);
};

window.confirmarTipoEntrada = (claveTipo) => {
    if (!asientoPendienteId) return;

    estadoPedido.asientos.push({
        id: asientoPendienteId,
        tipoLabel: PRECIOS.entradas[claveTipo].label,
        precio: PRECIOS.entradas[claveTipo].precio
    });

    const btn = document.getElementById(`asiento-btn-${asientoPendienteId}`);
    btn.classList.remove('bg-green-600', 'hover:bg-green-500');
    btn.classList.add('selected');

    actualizarResumenAsientos();
    cerrarModalTipoEntrada();
};

const actualizarResumenAsientos = () => {
    const contenedor = document.getElementById('resumen-contenedor-asientos');
    const totalEl = document.getElementById('resumen-total');
    const btnSiguiente = document.getElementById('btn-ir-dulceria');

    if (estadoPedido.asientos.length === 0) {
        contenedor.innerHTML = '<p class="text-gray-500 text-sm text-center italic mt-4" id="mensaje-sin-asientos">Aún no has seleccionado asientos.</p>';
        totalEl.textContent = 'S/ 0.00';
        btnSiguiente.disabled = true;
        return;
    }

    let html = '<ul class="space-y-3">';
    let total = 0;

    estadoPedido.asientos.forEach(asiento => {
        total += asiento.precio;
        html += `
            <li class="flex justify-between items-center text-sm bg-dark-900 p-2 rounded-lg border border-white/5">
                <div>
                    <span class="bg-brand-yellow text-black font-bold px-2 py-0.5 rounded text-xs mr-2">${asiento.id}</span>
                    <span class="text-white">${asiento.tipoLabel}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-white font-bold">${formatearMoneda(asiento.precio)}</span>
                    <button onclick="clickAsiento('${asiento.id}')" class="text-gray-500 hover:text-brand-red transition-colors"><i class="fa-solid fa-trash"></i></button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    contenedor.innerHTML = html;
    totalEl.textContent = formatearMoneda(total);
    btnSiguiente.disabled = false;
};


/* ============================================================================
   9. DULCERÍA (incluye FASE 3 — flujo directo sin película)
   ============================================================================ */

window.irADulceria = () => {
    renderizarGridDulceria('all');
    actualizarResumenFinal();
    aplicarModoDirectoUI();
    cambiarVista('vista-asientos', 'vista-dulceria');
};

/**
 * FASE 3: Flujo independiente de Dulcería, enlazado al NavBar.
 * Reinicia el carrito y activa el modo directo, que oculta toda
 * referencia a "Entradas" / "Película" en Dulcería y Pago.
 */
window.abrirDulceriaDirecta = () => {
    estadoPedido.modoDirecto = true;
    estadoPedido.pelicula = null;
    estadoPedido.asientos = [];
    estadoPedido.carrito = {};
    estadoPedido.cupon = null;

    renderizarGridDulceria('all');
    actualizarResumenFinal();
    aplicarModoDirectoUI();
    cambiarVista(vistaActualVisible, 'vista-dulceria');
    mostrarToast('Carrito de dulcería reiniciado. ¡Arma tu pedido!', 'info');
};

/** Muestra/oculta bloques relacionados a entradas según el modo actual. */
function aplicarModoDirectoUI() {
    const esDirecto = estadoPedido.modoDirecto;

    const btnVolverAsientos = document.getElementById('btn-volver-asientos-dulceria');
    const bloqueEntradasResumen = document.getElementById('bloque-entradas-resumen-dulceria');
    if (btnVolverAsientos) btnVolverAsientos.classList.toggle('hidden', esDirecto);
    if (bloqueEntradasResumen) bloqueEntradasResumen.classList.toggle('hidden', esDirecto);

    const bloqueEntradasPago = document.getElementById('bloque-entradas-resumen-pago');
    const bloquePeliculaPago = document.getElementById('bloque-pelicula-pago');
    if (bloqueEntradasPago) bloqueEntradasPago.classList.toggle('hidden', esDirecto);
    if (bloquePeliculaPago) bloquePeliculaPago.classList.toggle('hidden', esDirecto);
}

window.renderizarGridDulceria = (filtroCategoria) => {
    document.querySelectorAll('#categorias-dulceria .cat-btn').forEach(btn => {
        btn.classList.remove('text-brand-yellow', 'border-brand-yellow');
        btn.classList.add('text-gray-400', 'border-transparent');
    });
    const btnClickeado = event ? event.currentTarget : document.querySelector('#categorias-dulceria .cat-btn');
    if (btnClickeado && btnClickeado.classList) {
        btnClickeado.classList.remove('text-gray-400', 'border-transparent');
        btnClickeado.classList.add('text-brand-yellow', 'border-brand-yellow');
    }

    const grid = document.getElementById('grid-productos');
    grid.innerHTML = '';

    for (const [id, prod] of Object.entries(PRECIOS.dulces)) {
        if (!prod.stock) continue; // FASE 5: respeta el stock activado/desactivado por el admin
        if (filtroCategoria !== 'all' && prod.categoria !== filtroCategoria) continue;

        grid.innerHTML += `
            <div class="bg-dark-800 rounded-xl border border-white/5 p-4 flex gap-4 hover:border-white/20 transition-colors shadow-lg">
                <div class="w-20 h-20 bg-dark-900 rounded-lg flex items-center justify-center flex-shrink-0 text-brand-yellow text-3xl">
                    <i class="fa-solid ${prod.icono}"></i>
                </div>
                <div class="flex-grow flex flex-col justify-between">
                    <div>
                        <h4 class="text-white font-bold leading-tight mb-1">${prod.nombre}</h4>
                        <p class="text-gray-400 text-xs leading-snug line-clamp-2">${prod.desc}</p>
                    </div>
                    <div class="flex justify-between items-end mt-3">
                        <span class="font-bold text-white text-lg">${formatearMoneda(prod.precio)}</span>
                        <div class="flex items-center gap-3 bg-dark-900 rounded-full px-2 py-1 border border-white/10">
                            <button onclick="actualizarCantidadSnack('${id}', -1)" class="w-6 h-6 rounded-full bg-dark-700 text-white flex items-center justify-center hover:bg-brand-red transition-colors"><i class="fa-solid fa-minus text-xs"></i></button>
                            <span id="cant-${id}" class="text-white font-bold text-sm w-4 text-center">${estadoPedido.carrito[id] || 0}</span>
                            <button onclick="actualizarCantidadSnack('${id}', 1)" class="w-6 h-6 rounded-full bg-dark-700 text-white flex items-center justify-center hover:bg-brand-yellow hover:text-black transition-colors"><i class="fa-solid fa-plus text-xs"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

window.actualizarCantidadSnack = (id, cambio) => {
    const actual = estadoPedido.carrito[id] || 0;
    const nuevoValor = actual + cambio;
    if (nuevoValor < 0) return;

    if (nuevoValor === 0) {
        delete estadoPedido.carrito[id];
    } else {
        estadoPedido.carrito[id] = nuevoValor;
    }

    const spanCantidad = document.getElementById(`cant-${id}`);
    if (spanCantidad) spanCantidad.textContent = nuevoValor;
    actualizarResumenFinal();
};

const actualizarResumenFinal = () => {
    const contenedorEntradas = document.getElementById('lista-final-asientos');
    let totalEntradas = 0;
    let htmlEntradas = '';
    estadoPedido.asientos.forEach(asiento => {
        totalEntradas += asiento.precio;
        htmlEntradas += `<div class="flex justify-between text-sm"><span class="text-gray-300">Asiento ${asiento.id} (${asiento.tipoLabel})</span><span class="text-white">${formatearMoneda(asiento.precio)}</span></div>`;
    });
    contenedorEntradas.innerHTML = htmlEntradas || '<p class="text-gray-500 text-sm italic">Sin entradas en este pedido.</p>';
    document.getElementById('total-entradas').textContent = formatearMoneda(totalEntradas);

    const contenedorSnacks = document.getElementById('lista-final-dulces');
    let totalSnacks = 0;

    if (Object.keys(estadoPedido.carrito).length === 0) {
        contenedorSnacks.innerHTML = '<p class="text-gray-500 text-sm italic" id="mensaje-sin-dulces">No has agregado dulces.</p>';
    } else {
        let htmlSnacks = '';
        for (const [id, cant] of Object.entries(estadoPedido.carrito)) {
            const prod = PRECIOS.dulces[id];
            const totalLinea = prod.precio * cant;
            totalSnacks += totalLinea;
            htmlSnacks += `<div class="flex justify-between text-sm"><span class="text-gray-300">${cant}x ${prod.nombre}</span><span class="text-white">${formatearMoneda(totalLinea)}</span></div>`;
        }
        contenedorSnacks.innerHTML = htmlSnacks;
    }
    document.getElementById('total-dulces').textContent = formatearMoneda(totalSnacks);
    document.getElementById('total-general-dulceria').textContent = formatearMoneda(totalEntradas + totalSnacks);
};


/* ============================================================================
   10. CHECKOUT / PAGO (incluye FASE 5 — motor de cupones)
   ============================================================================ */

window.irAPago = () => {
    const bloquePelicula = document.getElementById('bloque-pelicula-pago');
    if (estadoPedido.modoDirecto || !estadoPedido.pelicula) {
        bloquePelicula.classList.add('hidden');
    } else {
        bloquePelicula.classList.remove('hidden');
        document.getElementById('pago-titulo-pelicula').textContent = estadoPedido.pelicula.titulo;
        document.getElementById('pago-detalle-pelicula').textContent = `${estadoPedido.fecha} • ${estadoPedido.hora} • ${estadoPedido.formato}`;
    }

    estadoPedido.cupon = null;
    const inputCupon = document.getElementById('input-cupon');
    if (inputCupon) inputCupon.value = '';
    const filaDescuento = document.getElementById('fila-descuento-cupon');
    if (filaDescuento) filaDescuento.classList.add('hidden');

    aplicarModoDirectoUI();
    recalcularTotalesPago();
    cambiarVista('vista-dulceria', 'vista-pago');
};

/** Calcula subtotales, aplica el cupón (si existe) y refresca la UI de pago. */
function recalcularTotalesPago() {
    const totalEntradas = estadoPedido.asientos.reduce((sum, s) => sum + s.precio, 0);
    const totalDulces = Object.entries(estadoPedido.carrito).reduce((sum, [id, cant]) => sum + (PRECIOS.dulces[id].precio * cant), 0);
    const subtotal = totalEntradas + totalDulces;

    let descuento = 0;
    if (estadoPedido.cupon) {
        descuento = subtotal * (estadoPedido.cupon.porcentaje / 100);
    }
    const totalFinal = Math.max(subtotal - descuento, 0);

    document.getElementById('pago-total-entradas').textContent = formatearMoneda(totalEntradas);
    document.getElementById('pago-total-dulces').textContent = formatearMoneda(totalDulces);

    const filaDescuento = document.getElementById('fila-descuento-cupon');
    if (estadoPedido.cupon) {
        filaDescuento.classList.remove('hidden');
        document.getElementById('pago-descuento-monto').textContent = `- ${formatearMoneda(descuento)}`;
        document.getElementById('pago-descuento-codigo').textContent = estadoPedido.cupon.codigo;
    } else {
        filaDescuento.classList.add('hidden');
    }

    document.getElementById('pago-total-general').textContent = formatearMoneda(totalFinal);
    document.getElementById('monto-yape').textContent = formatearMoneda(totalFinal);

    return { totalEntradas, totalDulces, subtotal, descuento, totalFinal };
}

/** FASE 5: Motor de descuentos — valida y aplica un cupón promocional. */
window.aplicarCupon = () => {
    const input = document.getElementById('input-cupon');
    const codigo = input.value.trim().toUpperCase();

    if (!Validadores.requerido(codigo)) {
        marcarCampoInvalido(input, 'Ingresa un código de cupón.');
        mostrarToast('Ingresa un código de cupón para aplicar.', 'error');
        return;
    }

    const cuponesGuardados = JSON.parse(localStorage.getItem(LS_CUPONES)) || {};
    const todosCupones = { ...CUPONES_BASE, ...cuponesGuardados };
    const cuponEncontrado = todosCupones[codigo];

    // Doble validación: el cupón debe existir y tener porcentaje numérico válido (1-100)
    if (!cuponEncontrado || !(cuponEncontrado.porcentaje > 0 && cuponEncontrado.porcentaje <= 100)) {
        marcarCampoInvalido(input, 'Cupón inválido o vencido.');
        mostrarToast('Ese cupón no existe o ya no es válido.', 'error');
        estadoPedido.cupon = null;
        recalcularTotalesPago();
        return;
    }

    limpiarCampoInvalido(input);
    estadoPedido.cupon = { codigo, porcentaje: cuponEncontrado.porcentaje };
    recalcularTotalesPago();
    mostrarToast(`Cupón "${codigo}" aplicado: -${cuponEncontrado.porcentaje}%`, 'exito');
};

window.toggleTipoDocumento = () => {
    const esFactura = document.querySelector('input[name="comprobante"]:checked').value === 'factura';
    const inputRuc = document.getElementById('campo-ruc');
    const inputDni = document.getElementById('campo-dni');

    if (esFactura) {
        inputRuc.classList.remove('hidden');
        inputDni.classList.add('hidden');
        document.getElementById('campo-nombre').placeholder = 'Razón Social';
    } else {
        inputRuc.classList.add('hidden');
        inputDni.classList.remove('hidden');
        document.getElementById('campo-nombre').placeholder = 'Nombres y Apellidos';
    }
};

window.toggleMetodoPago = () => {
    const esYape = document.querySelector('input[name="paymethod"]:checked').value === 'yape';
    if (esYape) {
        document.getElementById('formulario-yape').classList.remove('hidden');
        document.getElementById('formulario-tarjeta').classList.add('hidden');
    } else {
        document.getElementById('formulario-yape').classList.add('hidden');
        document.getElementById('formulario-tarjeta').classList.remove('hidden');
    }
};

/** FASE 6: Validación (frontend) de todo el formulario de pago antes de procesar. */
function validarFormularioPago() {
    const tipoDoc = document.querySelector('input[name="comprobante"]:checked').value;
    const campoNumero = tipoDoc === 'boleta' ? document.getElementById('campo-dni') : document.getElementById('campo-ruc');
    const campoNombre = document.getElementById('campo-nombre');
    const campoCorreo = document.getElementById('campo-correo');

    const reglas = [
        { input: campoNombre, prueba: () => Validadores.soloTexto(campoNombre.value), mensaje: 'Ingresa un nombre válido (solo letras).' },
        { input: campoCorreo, prueba: () => Validadores.correo(campoCorreo.value), mensaje: 'Ingresa un correo electrónico válido.' },
        tipoDoc === 'boleta'
            ? { input: campoNumero, prueba: () => Validadores.dni(campoNumero.value), mensaje: 'El DNI debe tener 8 dígitos.' }
            : { input: campoNumero, prueba: () => Validadores.ruc(campoNumero.value), mensaje: 'El RUC debe tener 11 dígitos.' }
    ];

    const metodoPago = document.querySelector('input[name="paymethod"]:checked').value;
    if (metodoPago === 'card') {
        const numTarjeta = document.getElementById('campo-numero-tarjeta');
        const venc = document.getElementById('campo-vencimiento-tarjeta');
        const cvv = document.getElementById('campo-cvv-tarjeta');
        const titular = document.getElementById('campo-titular-tarjeta');
        reglas.push(
            { input: numTarjeta, prueba: () => Validadores.numeroTarjeta(numTarjeta.value), mensaje: 'Número de tarjeta inválido (16 dígitos).' },
            { input: venc, prueba: () => Validadores.vencimientoTarjeta(venc.value), mensaje: 'Vencimiento inválido. Usa el formato MM/AA.' },
            { input: cvv, prueba: () => Validadores.cvv(cvv.value), mensaje: 'CVV inválido.' },
            { input: titular, prueba: () => Validadores.soloTexto(titular.value), mensaje: 'Ingresa el nombre del titular.' }
        );
    }

    return validarFormulario(reglas);
}


/* ============================================================================
   11. TICKET Y COMPROBANTE (PDF) + guardado en historial
   ============================================================================ */

window.procesarPago = () => {
    // FASE 6: doble validación — se repite aquí como "backend" antes de generar el comprobante
    if (!validarFormularioPago()) return;

    const nombre = document.getElementById('campo-nombre').value || 'Cliente Cinerama';
    const tipoDoc = document.querySelector('input[name="comprobante"]:checked').value;
    const numeroDoc = tipoDoc === 'boleta' ? document.getElementById('campo-dni').value : document.getElementById('campo-ruc').value;

    const totales = recalcularTotalesPago();

    // --- Llenar Ticket PDF ---
    if (estadoPedido.modoDirecto || !estadoPedido.pelicula) {
        document.getElementById('pdf-titulo-pelicula').textContent = 'Pedido de Dulcería';
        document.getElementById('pdf-formato').textContent = 'RETIRO EN BARRA';
        document.getElementById('pdf-fecha').textContent = new Date().toLocaleDateString('es-PE');
        document.getElementById('pdf-hora').textContent = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('pdf-cine').textContent = estadoPedido.cine;
        document.getElementById('pdf-asientos').textContent = '—';
    } else {
        document.getElementById('pdf-titulo-pelicula').textContent = estadoPedido.pelicula.titulo;
        document.getElementById('pdf-formato').textContent = estadoPedido.formato.toUpperCase();
        document.getElementById('pdf-fecha').textContent = estadoPedido.fecha;
        document.getElementById('pdf-hora').textContent = estadoPedido.hora;
        document.getElementById('pdf-cine').textContent = `${estadoPedido.cine.replace('Cinerama ', '')} - Sala ${Math.floor(Math.random() * 5) + 1}`;
        document.getElementById('pdf-asientos').textContent = estadoPedido.asientos.map(s => s.id).join(', ') || '—';
    }
    const codigoTicket = Math.floor(Math.random() * 9000000000) + 1000000000;
    document.getElementById('pdf-codigo').textContent = codigoTicket;

    const pdfDulces = document.getElementById('pdf-dulces');
    if (Object.keys(estadoPedido.carrito).length === 0) {
        pdfDulces.innerHTML = '<li class="text-gray-500 font-normal">Sin compras de dulcería.</li>';
    } else {
        pdfDulces.innerHTML = Object.entries(estadoPedido.carrito).map(([id, cant]) => `<li>${cant}x ${PRECIOS.dulces[id].nombre}</li>`).join('');
    }

    // --- Llenar Boleta/Factura PDF ---
    document.getElementById('pdf-tipo-documento').textContent = tipoDoc === 'boleta' ? 'BOLETA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA';
    const numeroComprobante = Math.floor(Math.random() * 9000) + 1000;
    document.getElementById('pdf-numero-comprobante').textContent = numeroComprobante;
    document.getElementById('pdf-nombre-cliente').textContent = nombre;
    document.getElementById('pdf-documento-cliente').textContent = numeroDoc;

    const hoy = new Date();
    document.getElementById('pdf-fecha-emision').textContent = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()} ${hoy.getHours()}:${hoy.getMinutes().toString().padStart(2, '0')}`;

    let filasComprobante = '';
    estadoPedido.asientos.forEach(asiento => {
        filasComprobante += `<tr><td class="py-1">1x Entrada ${asiento.tipoLabel}</td><td class="text-right py-1">${asiento.precio.toFixed(2)}</td></tr>`;
    });
    Object.entries(estadoPedido.carrito).forEach(([id, cant]) => {
        const p = PRECIOS.dulces[id];
        const subT = p.precio * cant;
        filasComprobante += `<tr><td class="py-1">${cant}x ${p.nombre}</td><td class="text-right py-1">${subT.toFixed(2)}</td></tr>`;
    });
    if (estadoPedido.cupon) {
        filasComprobante += `<tr><td class="py-1 text-brand-red">Cupón ${estadoPedido.cupon.codigo} (-${estadoPedido.cupon.porcentaje}%)</td><td class="text-right py-1 text-brand-red">-${totales.descuento.toFixed(2)}</td></tr>`;
    }
    document.getElementById('pdf-items-comprobante').innerHTML = filasComprobante;

    const totalGeneral = totales.totalFinal;
    const subtotalSinIgv = totalGeneral / 1.18;
    const igv = totalGeneral - subtotalSinIgv;

    document.getElementById('pdf-subtotal').textContent = subtotalSinIgv.toFixed(2);
    document.getElementById('pdf-igv').textContent = igv.toFixed(2);
    document.getElementById('pdf-total-comprobante').textContent = formatearMoneda(totalGeneral);

    // FASE 1: guardar la compra en el historial del usuario actual (si hay sesión iniciada)
    guardarCompraEnHistorial({
        codigo: `CR-${codigoTicket}`,
        fecha: hoy.toISOString(),
        pelicula: (estadoPedido.modoDirecto || !estadoPedido.pelicula) ? 'Pedido de Dulcería' : estadoPedido.pelicula.titulo,
        detalle: (estadoPedido.modoDirecto || !estadoPedido.pelicula) ? 'Retiro en barra' : `${estadoPedido.fecha} • ${estadoPedido.hora} • ${estadoPedido.formato}`,
        asientos: estadoPedido.asientos.map(s => s.id),
        dulces: Object.entries(estadoPedido.carrito).map(([id, cant]) => `${cant}x ${PRECIOS.dulces[id].nombre}`),
        total: totalGeneral,
        tipoDoc,
        numeroDoc
    });

    mostrarToast('¡Pago procesado con éxito! Aquí está tu ticket.', 'exito');
    cambiarVista('vista-pago', 'vista-ticket');
};

window.descargarPDF = (idElemento, nombreArchivo) => {
    const elemento = document.getElementById(idElemento);
    const opciones = {
        margin: 10,
        filename: nombreArchivo,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 1200 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opciones).from(elemento).save();
};


/* ============================================================================
   12. AUTENTICACIÓN (login / registro) — con validación doble (Fase 6)
   ============================================================================ */

window.abrirModalLogin = () => {
    const modal = document.getElementById('modal-login');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('login-contenido').classList.remove('scale-95'); }, 10);
};

window.abrirModalRegistro = () => {
    const modal = document.getElementById('modal-registro');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('registro-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalesAuth = () => {
    const modalLogin = document.getElementById('modal-login');
    const modalRegistro = document.getElementById('modal-registro');

    modalLogin.classList.add('opacity-0');
    modalRegistro.classList.add('opacity-0');
    document.getElementById('login-contenido').classList.add('scale-95');
    document.getElementById('registro-contenido').classList.add('scale-95');

    setTimeout(() => {
        modalLogin.classList.add('hidden');
        modalRegistro.classList.add('hidden');
    }, 200);
};

// --- Registro con localStorage + validación doble ---
window.manejarRegistro = (e) => {
    e.preventDefault();
    const inputNombre = document.getElementById('reg-nombre');
    const inputCorreo = document.getElementById('reg-correo');
    const inputContrasena = document.getElementById('reg-contrasena');

    // 1) Validación "frontend"
    const valido = validarFormulario([
        { input: inputNombre, prueba: () => Validadores.soloTexto(inputNombre.value), mensaje: 'Ingresa un nombre válido (solo letras).' },
        { input: inputCorreo, prueba: () => Validadores.correo(inputCorreo.value), mensaje: 'Ingresa un correo electrónico válido.' },
        { input: inputContrasena, prueba: () => Validadores.contrasena(inputContrasena.value), mensaje: 'La contraseña debe tener al menos 6 caracteres.' }
    ]);
    if (!valido) return;

    const nombre = inputNombre.value.trim();
    const correo = inputCorreo.value.trim().toLowerCase();
    const contrasena = inputContrasena.value;

    // 2) Validación "backend" (repetida antes de tocar el almacenamiento)
    if (!Validadores.soloTexto(nombre) || !Validadores.correo(correo) || !Validadores.contrasena(contrasena)) {
        mostrarToast('No se pudo validar la información del registro.', 'error');
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem(LS_USUARIOS)) || [];

    if (usuarios.find(u => u.correo === correo)) {
        marcarCampoInvalido(inputCorreo, 'Este correo ya está registrado.');
        mostrarToast('Este correo ya está registrado.', 'error');
        return;
    }

    const nuevoUsuario = { nombre, correo, contrasena, rol: 'cliente', compras: [], metodoPago: null };
    usuarios.push(nuevoUsuario);
    localStorage.setItem(LS_USUARIOS, JSON.stringify(usuarios));

    mostrarToast('Cuenta creada con éxito. Ahora inicia sesión.', 'exito');
    cerrarModalesAuth();
    abrirModalLogin();
    document.getElementById('formulario-registro').reset();
};

// --- Login con localStorage + validación doble ---
window.manejarLogin = (e) => {
    e.preventDefault();
    const inputCorreo = document.getElementById('login-correo');
    const inputContrasena = document.getElementById('login-contrasena');
    const mensajeError = document.getElementById('login-error');

    const valido = validarFormulario([
        { input: inputCorreo, prueba: () => Validadores.correo(inputCorreo.value), mensaje: 'Ingresa un correo electrónico válido.' },
        { input: inputContrasena, prueba: () => Validadores.requerido(inputContrasena.value), mensaje: 'Ingresa tu contraseña.' }
    ]);
    if (!valido) return;

    const correo = inputCorreo.value.trim().toLowerCase();
    const contrasena = inputContrasena.value;

    let usuarios = JSON.parse(localStorage.getItem(LS_USUARIOS)) || [];
    const usuario = usuarios.find(u => u.correo === correo && u.contrasena === contrasena);

    if (usuario) {
        usuarioActual = usuario;
        localStorage.setItem(LS_USUARIO_ACTUAL, JSON.stringify(usuario));
        mensajeError.classList.add('hidden');
        cerrarModalesAuth();
        actualizarNavbarAuth();
        document.getElementById('formulario-login').reset();
        mostrarToast(`¡Bienvenido de nuevo, ${usuario.nombre}!`, 'exito');
    } else {
        mensajeError.classList.remove('hidden');
        mostrarToast('Credenciales incorrectas.', 'error');
    }
};

window.cerrarSesion = () => {
    usuarioActual = null;
    localStorage.removeItem(LS_USUARIO_ACTUAL);
    actualizarNavbarAuth();
    cambiarVista(vistaActualVisible, 'vista-inicio');
    mostrarToast('Sesión cerrada correctamente.', 'info');
};

window.actualizarNavbarAuth = () => {
    const menuInvitado = document.getElementById('menu-invitado');
    const menuUsuario = document.getElementById('menu-usuario');
    const linkAdmin = document.getElementById('link-nav-admin');

    if (usuarioActual) {
        menuInvitado.classList.add('hidden');
        menuInvitado.classList.remove('flex');
        menuUsuario.classList.remove('hidden');
        menuUsuario.classList.add('flex');
        if (linkAdmin) linkAdmin.classList.toggle('hidden', usuarioActual.rol !== 'admin');
    } else {
        menuInvitado.classList.remove('hidden');
        menuInvitado.classList.add('flex');
        menuUsuario.classList.add('hidden');
        menuUsuario.classList.remove('flex');
        if (linkAdmin) linkAdmin.classList.add('hidden');
    }
};


/* ============================================================================
   13. FASE 1 — HISTORIAL "MIS COMPRAS" Y MODAL DE PERFIL
   ============================================================================ */

/** Guarda un ticket de compra dentro del arreglo `compras` del usuario logueado. */
function guardarCompraEnHistorial(compra) {
    if (!usuarioActual) return; // Los invitados no tienen historial persistente

    let usuarios = JSON.parse(localStorage.getItem(LS_USUARIOS)) || [];
    const indice = usuarios.findIndex(u => u.correo === usuarioActual.correo);
    if (indice === -1) return;

    if (!Array.isArray(usuarios[indice].compras)) usuarios[indice].compras = [];
    usuarios[indice].compras.unshift(compra);

    usuarioActual = usuarios[indice];
    localStorage.setItem(LS_USUARIOS, JSON.stringify(usuarios));
    localStorage.setItem(LS_USUARIO_ACTUAL, JSON.stringify(usuarioActual));
}

/** Lee el arreglo `compras` del usuario actual y lo renderiza en #vista-historial. */
window.abrirMisCompras = () => {
    const grid = document.getElementById('grid-historial-compras');
    const mensajeVacio = document.getElementById('mensaje-historial-vacio');

    if (!usuarioActual) {
        mostrarToast('Inicia sesión para ver tu historial de compras.', 'error');
        abrirModalLogin();
        return;
    }

    const compras = usuarioActual.compras || [];

    if (compras.length === 0) {
        grid.innerHTML = '';
        mensajeVacio.classList.remove('hidden');
    } else {
        mensajeVacio.classList.add('hidden');
        grid.innerHTML = compras.map(compra => `
            <div class="bg-dark-800 rounded-2xl border border-white/5 p-5 shadow-xl hover:border-brand-red/50 transition-colors">
                <div class="flex justify-between items-start mb-3">
                    <span class="bg-brand-red/10 text-brand-red text-xs font-bold px-2 py-1 rounded border border-brand-red/30">${compra.codigo}</span>
                    <span class="text-gray-500 text-xs">${new Date(compra.fecha).toLocaleDateString('es-PE')}</span>
                </div>
                <h4 class="text-white font-bold text-lg mb-1">${compra.pelicula}</h4>
                <p class="text-gray-400 text-sm mb-3">${compra.detalle}</p>
                ${compra.asientos && compra.asientos.length ? `<p class="text-xs text-gray-400 mb-1"><i class="fa-solid fa-chair text-brand-yellow mr-1"></i> ${compra.asientos.join(', ')}</p>` : ''}
                ${compra.dulces && compra.dulces.length ? `<p class="text-xs text-gray-400 mb-3"><i class="fa-solid fa-popcorn text-brand-yellow mr-1"></i> ${compra.dulces.join(', ')}</p>` : ''}
                <div class="border-t border-white/10 pt-3 flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Total pagado</span>
                    <span class="text-brand-yellow font-bold text-lg">${formatearMoneda(compra.total)}</span>
                </div>
            </div>
        `).join('');
    }

    cambiarVista(vistaActualVisible, 'vista-historial');
};

/** Alterna la visibilidad del modal de perfil (Nombre, Correo, método de pago). */
window.toggleUserProfile = () => window.abrirModalPerfil();

window.abrirModalPerfil = () => {
    if (!usuarioActual) {
        abrirModalLogin();
        return;
    }
    document.getElementById('perfil-nombre').textContent = usuarioActual.nombre;
    document.getElementById('perfil-correo').textContent = usuarioActual.correo;
    document.getElementById('perfil-metodo-actual').textContent = usuarioActual.metodoPago
        ? `Tarjeta guardada terminada en ${usuarioActual.metodoPago}`
        : 'No tienes un método de pago guardado.';

    const modal = document.getElementById('modal-perfil');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('perfil-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalPerfil = () => {
    const modal = document.getElementById('modal-perfil');
    modal.classList.add('opacity-0');
    document.getElementById('perfil-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

/** Simula guardar un método de pago (solo los últimos 4 dígitos se conservan). */
window.guardarMetodoPago = (e) => {
    e.preventDefault();
    const inputTarjeta = document.getElementById('perfil-numero-tarjeta');

    const valido = validarFormulario([
        { input: inputTarjeta, prueba: () => Validadores.numeroTarjeta(inputTarjeta.value), mensaje: 'Ingresa un número de tarjeta válido (16 dígitos).' }
    ]);
    if (!valido) return;

    const soloDigitos = inputTarjeta.value.replace(/\s/g, '');
    const ultimos4 = soloDigitos.slice(-4);

    let usuarios = JSON.parse(localStorage.getItem(LS_USUARIOS)) || [];
    const indice = usuarios.findIndex(u => u.correo === usuarioActual.correo);
    if (indice > -1) {
        usuarios[indice].metodoPago = ultimos4;
        usuarioActual = usuarios[indice];
        localStorage.setItem(LS_USUARIOS, JSON.stringify(usuarios));
        localStorage.setItem(LS_USUARIO_ACTUAL, JSON.stringify(usuarioActual));
    }

    document.getElementById('perfil-metodo-actual').textContent = `Tarjeta guardada terminada en ${ultimos4}`;
    inputTarjeta.value = '';
    mostrarToast('Método de pago guardado (simulado).', 'exito');
};


/* ============================================================================
   14. FASE 4 — MODAL DE CONTACTO Y VISTA DE UBICACIÓN (Leaflet)
   ============================================================================ */

window.abrirModalContacto = () => {
    const modal = document.getElementById('modal-contacto');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('contacto-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalContacto = () => {
    const modal = document.getElementById('modal-contacto');
    modal.classList.add('opacity-0');
    document.getElementById('contacto-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

window.manejarFormularioContacto = (e) => {
    e.preventDefault();
    const nombres = document.getElementById('contacto-nombres');
    const apellidos = document.getElementById('contacto-apellidos');
    const correo = document.getElementById('contacto-correo');
    const distrito = document.getElementById('contacto-distrito');
    const mensaje = document.getElementById('contacto-mensaje');

    // Doble validación (frontend aquí; se repetiría en un backend real antes de guardar/enviar)
    const valido = validarFormulario([
        { input: nombres, prueba: () => Validadores.soloTexto(nombres.value), mensaje: 'Ingresa tus nombres (solo letras).' },
        { input: apellidos, prueba: () => Validadores.soloTexto(apellidos.value), mensaje: 'Ingresa tus apellidos (solo letras).' },
        { input: correo, prueba: () => Validadores.correo(correo.value), mensaje: 'Ingresa un correo electrónico válido.' },
        { input: distrito, prueba: () => Validadores.requerido(distrito.value), mensaje: 'Selecciona tu distrito.' },
        { input: mensaje, prueba: () => Validadores.minLength(mensaje.value, 10), mensaje: 'Tu mensaje debe tener al menos 10 caracteres.' }
    ]);
    if (!valido) return;

    // Simulación de envío (no hay backend real conectado)
    mostrarToast('¡Gracias! Recibimos tu mensaje y te contactaremos pronto.', 'exito');
    document.getElementById('formulario-contacto').reset();
    cerrarModalContacto();
};

let mapaLeafletInstancia = null;

/** Inicializa (una sola vez) el mapa Leaflet apuntando a Megaplaza Chimbote. */
window.inicializarMapaUbicacion = () => {
    const contenedor = document.getElementById('mapa-ubicacion');
    if (!contenedor || typeof L === 'undefined') return;

    // Si el mapa ya existe, solo se invalida el tamaño (evita duplicados al re-visitar la vista)
    if (mapaLeafletInstancia) {
        setTimeout(() => mapaLeafletInstancia.invalidateSize(), 200);
        return;
    }

    const coordenadas = [-9.0709, -78.5930]; // Megaplaza Chimbote
    mapaLeafletInstancia = L.map('mapa-ubicacion').setView(coordenadas, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(mapaLeafletInstancia);

    const iconoCine = L.divIcon({
        html: '<div style="background:#DC2026;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;"><span style="transform:rotate(45deg);color:white;">🎬</span></div>',
        className: '', iconSize: [34, 34], iconAnchor: [17, 34]
    });

    L.marker(coordenadas, { icon: iconoCine }).addTo(mapaLeafletInstancia)
        .bindPopup('<strong>Cinerama Chimbote</strong><br>Megaplaza Chimbote<br>Av. Principal, Chimbote, Perú')
        .openPopup();

    setTimeout(() => mapaLeafletInstancia.invalidateSize(), 200);
};

/** Navega a la vista de ubicación e inicializa el mapa. */
window.abrirVistaUbicacion = () => {
    cambiarVista(vistaActualVisible, 'vista-ubicacion');
    setTimeout(inicializarMapaUbicacion, 350); // espera a que termine la transición de opacidad
};


/* ============================================================================
   15. FASE 5 — PANEL DE ADMINISTRADOR
   ============================================================================ */

/** Crea la cuenta admin de demostración si aún no existe (solo la primera vez). */
function asegurarAdminDemo() {
    let usuarios = JSON.parse(localStorage.getItem(LS_USUARIOS)) || [];
    if (!usuarios.find(u => u.correo === 'admin@cinerama.com')) {
        usuarios.push({ nombre: 'Administrador Cinerama', correo: 'admin@cinerama.com', contrasena: 'admin123', rol: 'admin', compras: [], metodoPago: null });
        localStorage.setItem(LS_USUARIOS, JSON.stringify(usuarios));
    }
}

window.abrirPanelAdministrador = () => {
    if (!usuarioActual || usuarioActual.rol !== 'admin') {
        mostrarToast('Acceso restringido: solo para administradores.', 'error');
        return;
    }
    cambiarVista(vistaActualVisible, 'vista-administrador');
    cambiarTabAdmin('cartelera');
};

/** Controla qué pestaña del sidebar del admin está visible. */
window.cambiarTabAdmin = (tab) => {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('activo'));
    const btnActivo = document.getElementById(`tab-btn-${tab}`);
    if (btnActivo) btnActivo.classList.add('activo');

    document.querySelectorAll('.admin-tab-panel').forEach(panel => panel.classList.add('hidden'));
    const panelActivo = document.getElementById(`tab-panel-${tab}`);
    if (panelActivo) panelActivo.classList.remove('hidden');

    if (tab === 'cartelera') renderizarAdminCartelera();
    if (tab === 'dulceria') renderizarAdminDulceria();
    if (tab === 'salas') renderizarAdminSalas();
    if (tab === 'descuentos') renderizarAdminDescuentos();
    if (tab === 'dashboard') renderizarAdminDashboard();
};

// --- 15.1 Cartelera: CRUD simulado de películas ---
function renderizarAdminCartelera() {
    const lista = document.getElementById('admin-lista-peliculas');
    lista.innerHTML = Object.values(baseDatosPeliculas).map(p => `
        <div class="flex items-center justify-between bg-dark-900 border border-white/5 rounded-xl p-3">
            <div class="flex items-center gap-3">
                <img src="${p.poster}" class="w-10 h-14 object-cover rounded">
                <div>
                    <p class="text-white font-bold text-sm">${p.titulo}</p>
                    <p class="text-gray-500 text-xs">${p.genero} &bull; ${p.duracion}</p>
                </div>
            </div>
            <button onclick="eliminarPeliculaAdmin('${p.id}')" class="text-gray-500 hover:text-brand-red transition-colors"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');
}

window.eliminarPeliculaAdmin = (id) => {
    delete baseDatosPeliculas[id];
    renderizarAdminCartelera();
    renderizarGridsInicio();
    mostrarToast('Película eliminada de la cartelera (simulado).', 'info');
};

window.crearPeliculaAdmin = (e) => {
    e.preventDefault();
    const titulo = document.getElementById('admin-pelicula-titulo');
    const genero = document.getElementById('admin-pelicula-genero');
    const duracion = document.getElementById('admin-pelicula-duracion');
    const horaFuncion = document.getElementById('admin-pelicula-hora');

    const valido = validarFormulario([
        { input: titulo, prueba: () => Validadores.minLength(titulo.value, 2), mensaje: 'Ingresa el título de la película.' },
        { input: genero, prueba: () => Validadores.minLength(genero.value, 2), mensaje: 'Ingresa el género.' },
        { input: duracion, prueba: () => Validadores.minLength(duracion.value, 2), mensaje: 'Ingresa la duración (ej: 2h 10m).' },
        { input: horaFuncion, prueba: () => Validadores.requerido(horaFuncion.value), mensaje: 'Selecciona una hora de función.' }
    ]);
    if (!valido) return;

    const id = 'peli_' + Date.now();
    baseDatosPeliculas[id] = {
        id, titulo: titulo.value.trim(), genero: genero.value.trim(), duracion: duracion.value.trim(),
        clasificacion: 'APT',
        poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600',
        banner: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070',
        sinopsis: 'Sinopsis pendiente de configurar.',
        trailer: '#',
        horarios: { 'Hoy, 26 Ago': [{ formato: '2D Doblada', horas: [horaFuncion.value] }] }
    };

    renderizarAdminCartelera();
    renderizarGridsInicio();
    e.target.reset();
    mostrarToast('Película y horario agregados a la cartelera.', 'exito');
};

// --- 15.2 Dulcería: gestión de stock ---
function renderizarAdminDulceria() {
    const lista = document.getElementById('admin-lista-dulceria');
    lista.innerHTML = Object.entries(PRECIOS.dulces).map(([id, p]) => `
        <div class="flex items-center justify-between bg-dark-900 border border-white/5 rounded-xl p-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center text-brand-yellow"><i class="fa-solid ${p.icono}"></i></div>
                <div>
                    <p class="text-white font-bold text-sm">${p.nombre}</p>
                    <p class="text-gray-500 text-xs">${formatearMoneda(p.precio)}</p>
                </div>
            </div>
            <label class="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                ${p.stock ? 'En stock' : 'Agotado'}
                <input type="checkbox" class="toggle-stock" ${p.stock ? 'checked' : ''} onchange="toggleStockDulce('${id}', this.checked)">
            </label>
        </div>
    `).join('');
}

window.toggleStockDulce = (id, activo) => {
    PRECIOS.dulces[id].stock = activo;
    renderizarAdminDulceria();
    mostrarToast(`${PRECIOS.dulces[id].nombre}: ${activo ? 'activado' : 'desactivado'}.`, 'info');
};

// --- 15.3 Salas (Mantenimiento): mini-mapa de butacas bloqueables ---
function estaButacaBloqueada(id) {
    const bloqueadas = JSON.parse(localStorage.getItem(LS_BUTACAS_BLOQUEADAS)) || [];
    return bloqueadas.includes(id);
}

function renderizarAdminSalas() {
    const grid = document.getElementById('admin-grid-salas');
    const bloqueadas = JSON.parse(localStorage.getItem(LS_BUTACAS_BLOQUEADAS)) || [];
    const filas = ['A', 'B', 'C', 'D'];
    let html = '';
    filas.forEach(fila => {
        html += `<div class="flex gap-1.5 justify-center mb-1.5">`;
        for (let c = 1; c <= 10; c++) {
            const id = `${fila}${c}`;
            const bloqueada = bloqueadas.includes(id);
            html += `<button onclick="toggleButacaMantenimiento('${id}')" class="butaca-mantenimiento ${bloqueada ? 'bloqueada' : ''} seat w-6 h-6 md:w-8 md:h-8 bg-green-600 rounded-t-lg rounded-b-sm border-b-4 border-black/40"></button>`;
        }
        html += `</div>`;
    });
    grid.innerHTML = html;
}

window.toggleButacaMantenimiento = (id) => {
    let bloqueadas = JSON.parse(localStorage.getItem(LS_BUTACAS_BLOQUEADAS)) || [];
    if (bloqueadas.includes(id)) {
        bloqueadas = bloqueadas.filter(b => b !== id);
    } else {
        bloqueadas.push(id);
    }
    localStorage.setItem(LS_BUTACAS_BLOQUEADAS, JSON.stringify(bloqueadas));
    renderizarAdminSalas();
};

// --- 15.4 Descuentos: creación de cupones y promociones globales ---
function renderizarAdminDescuentos() {
    const lista = document.getElementById('admin-lista-cupones');
    const cuponesGuardados = JSON.parse(localStorage.getItem(LS_CUPONES)) || {};
    const todos = { ...CUPONES_BASE, ...cuponesGuardados };

    lista.innerHTML = Object.entries(todos).map(([codigo, c]) => `
        <div class="flex items-center justify-between bg-dark-900 border border-white/5 rounded-xl p-3">
            <div>
                <p class="text-brand-yellow font-mono font-bold text-sm">${codigo}</p>
                <p class="text-gray-500 text-xs">${c.descripcion || 'Cupón promocional'}</p>
            </div>
            <span class="text-white font-bold">-${c.porcentaje}%</span>
        </div>
    `).join('');

    const promoActiva = localStorage.getItem('cinerama_promo_martes2x1') === 'true';
    const toggle = document.getElementById('admin-toggle-martes2x1');
    if (toggle) toggle.checked = promoActiva;
}

window.crearCuponAdmin = (e) => {
    e.preventDefault();
    const inputCodigo = document.getElementById('admin-cupon-codigo');
    const inputPorcentaje = document.getElementById('admin-cupon-porcentaje');
    const inputDesc = document.getElementById('admin-cupon-desc');

    const valido = validarFormulario([
        { input: inputCodigo, prueba: () => Validadores.minLength(inputCodigo.value, 3), mensaje: 'El código debe tener al menos 3 caracteres.' },
        { input: inputPorcentaje, prueba: () => Number(inputPorcentaje.value) > 0 && Number(inputPorcentaje.value) <= 100, mensaje: 'El descuento debe estar entre 1 y 100%.' }
    ]);
    if (!valido) return;

    const codigo = inputCodigo.value.trim().toUpperCase();
    const cuponesGuardados = JSON.parse(localStorage.getItem(LS_CUPONES)) || {};
    cuponesGuardados[codigo] = { porcentaje: Number(inputPorcentaje.value), descripcion: inputDesc.value.trim() || 'Cupón creado por administrador' };
    localStorage.setItem(LS_CUPONES, JSON.stringify(cuponesGuardados));

    renderizarAdminDescuentos();
    e.target.reset();
    mostrarToast(`Cupón "${codigo}" creado correctamente.`, 'exito');
};

window.toggleMartes2x1 = (activo) => {
    localStorage.setItem('cinerama_promo_martes2x1', activo);
    mostrarToast(`Promoción "Martes 2x1" ${activo ? 'activada' : 'desactivada'} globalmente.`, 'info');
};

// --- 15.5 Dashboard: métricas simples ---
function renderizarAdminDashboard() {
    const usuarios = JSON.parse(localStorage.getItem(LS_USUARIOS)) || [];
    let totalTickets = 0;
    let totalDulces = 0;
    let totalVentas = 0;
    let totalCompras = 0;

    usuarios.forEach(u => {
        (u.compras || []).forEach(compra => {
            totalCompras++;
            totalTickets += (compra.asientos || []).length;
            totalDulces += (compra.dulces || []).length;
            totalVentas += compra.total || 0;
        });
    });

    document.getElementById('admin-dash-ventas').textContent = formatearMoneda(totalVentas);
    document.getElementById('admin-dash-compras').textContent = totalCompras;
    document.getElementById('admin-dash-tickets').textContent = totalTickets;
    document.getElementById('admin-dash-dulces').textContent = totalDulces;
}


/* ============================================================================
   16. CHATBOT (CineBot IA simulado)
   ============================================================================ */

function inicializarChatbot() {
    const btnToggleChat = document.getElementById('toggle-chat');
    const btnCerrarChat = document.getElementById('cerrar-chat');
    const ventanaChat = document.getElementById('ventana-chat-ia');
    const inputChat = document.getElementById('entrada-chat');
    const btnEnviar = document.getElementById('enviar-chat');
    const contenedorMensajes = document.getElementById('mensajes-chat');

    const toggleChat = () => {
        const oculto = ventanaChat.classList.contains('hidden');
        if (oculto) {
            ventanaChat.classList.remove('hidden');
            ventanaChat.classList.add('flex');
            inputChat.focus();
        } else {
            ventanaChat.classList.add('hidden');
            ventanaChat.classList.remove('flex');
        }
    };
    btnToggleChat.addEventListener('click', toggleChat);
    btnCerrarChat.addEventListener('click', toggleChat);

    const agregarMensaje = (texto, esBot) => {
        const html = esBot
            ? `<div class="flex gap-2 chat-bubble-enter">
                <div class="w-6 h-6 rounded-full bg-brand-red flex-shrink-0 flex items-center justify-center mt-1"><i class="fa-solid fa-robot text-[10px] text-white"></i></div>
                <div class="bg-dark-700 text-white p-3 rounded-xl rounded-tl-none self-start max-w-[85%] border border-white/5 shadow-sm">${texto}</div>
            </div>`
            : `<div class="flex gap-2 chat-bubble-enter justify-end">
                <div class="bg-brand-red text-white p-3 rounded-xl rounded-tr-none self-end max-w-[85%] shadow-sm">${texto}</div>
            </div>`;
        contenedorMensajes.insertAdjacentHTML('beforeend', html);
        contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
    };

    const procesarChat = () => {
        const texto = inputChat.value.trim();
        if (!texto) return;

        agregarMensaje(texto, false);
        inputChat.value = '';

        setTimeout(() => {
            let respuesta = "No entendí muy bien. 😅 ¿Quieres saber sobre la cartelera, los precios de las entradas o sobre la dulcería?";
            const minuscula = texto.toLowerCase();

            if (minuscula.includes('hola') || minuscula.includes('saludos') || minuscula.includes('buenas')) {
                respuesta = "¡Hola! Bienvenido a Cinerama 🍿. ¿En qué te puedo ayudar? Puedes preguntarme por películas en estreno, precios o los combos de dulcería.";
            } else if (minuscula.includes('precio') || minuscula.includes('costo') || minuscula.includes('cuanto')) {
                respuesta = "Nuestras entradas regulares cuestan S/ 22.00 para adultos y S/ 18.00 para niños o adultos mayores. ¿Deseas saber el precio de algún combo?";
            } else if (minuscula.includes('estreno') || minuscula.includes('cartelera') || minuscula.includes('pelicula') || minuscula.includes('ver')) {
                respuesta = "Ahora mismo tenemos en cartelera 'Spider-Man: Un Nuevo Día' y 'La Noche del Demonio'. Además, pronto llegará 'El Caballero Oscuro'. ¡Anímate a ver los tráilers en la página principal!";
            } else if (minuscula.includes('dulce') || minuscula.includes('combo') || minuscula.includes('cancha') || minuscula.includes('popcorn') || minuscula.includes('comida')) {
                respuesta = "¡La dulcería es lo mejor! 😋 Tenemos el Combo Mega Familiar a S/ 65.00 (2 canchas gigantes, 4 bebidas y nachos). También puedes armar tu pedido con cancha gigante, M&M's, o Hot Dogs.";
            } else if (minuscula.includes('spiderman') || minuscula.includes('spider')) {
                respuesta = "¡Excelente elección! 'Spider-Man: Un Nuevo Día' tiene una duración de 2h 25m y es apta para todos. ¡Haz clic en 'Comprar Entradas' en el póster para asegurar tu butaca!";
            } else if (minuscula.includes('cupon') || minuscula.includes('descuento') || minuscula.includes('promo')) {
                respuesta = "¡Tenemos cupones activos! Prueba con el código VERANO20 en la vista de pago para obtener un 20% de descuento. 🎟️";
            }
            agregarMensaje(respuesta, true);
        }, 800);
    };

    btnEnviar.addEventListener('click', procesarChat);
    inputChat.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') procesarChat();
    });
}


/* ============================================================================
   17. INICIALIZACIÓN GENERAL
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
    renderizarGridsInicio();
    asegurarAdminDemo();

    const usuarioGuardado = localStorage.getItem(LS_USUARIO_ACTUAL);
    if (usuarioGuardado) {
        usuarioActual = JSON.parse(usuarioGuardado);
    }
    actualizarNavbarAuth();

    inicializarChatbot();
});
