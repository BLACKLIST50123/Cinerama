/* ============================================================================
   CINE NÁUTICA — ESTADO.JS — Estado global, constantes y datos mock
   ------------------------------------------------------------------------
   Parte de la arquitectura modular de la app (Fase 14).
   Cargado como <script> clásico (no ES module) para funcionar también
   abriendo index.html directamente con file://, sin necesidad de servidor.
   Debe cargarse PRIMERO: define baseDatosPeliculas, baseDatosEstrenos,
   PRECIOS, CUPONES_BASE, estadoPedido y todas las claves de localStorage
   que el resto de módulos utiliza.
   ============================================================================ */

/* ============================================================================
   1. ESTADO GLOBAL Y CONFIGURACIÓN
   ============================================================================ */

// MÓDULO 9: nombre del cine, centralizado para poder ofrecer esta app a cualquier cine sin
// tener que buscar y reemplazar texto por todo el proyecto. El resto del código lee de aquí.
const NOMBRE_CINE = 'Cine Náutica';
const NOMBRE_CINE_CORTO = 'Náutica';

// Estado del pedido en curso (entradas + dulcería)
const estadoPedido = {
    pelicula: null,
    cine: NOMBRE_CINE, // por defecto
    formatoId: null, // MÓDULO 9: id del formato de proyección de la función elegida (catálogo de formatos)
    fecha: null,
    formato: null,
    hora: null,
    sala: null,      // FASE 7: número de sala (1-8) de la función elegida
    asientos: [],   // Array de { id: 'D4', tipoLabel: 'Adulto', precio: 20.0 }
    carrito: {},    // Objeto contador de snacks { 'combo1': 2 }
    modoDirecto: false, // FASE 3: true cuando se entra por "Dulcería directa" (sin película)
    cupon: null,     // FASE 5: { codigo, porcentaje } cupón aplicado
    puntosCanjeados: 0, // MÓDULO 7: puntos de Socio Náutica que el usuario decidió canjear en este pedido
    socioVinculadoCorreo: null, // MÓDULO 8: solo en venta de COUNTER — correo del socio al que se vincula la venta (canje y puntos van a él, nunca a la cuenta del counter)
    checkoutCounterListo: false // MÓDULO 8: true cuando el formulario de pago del counter ya se limpió para esta venta (evita arrastrar datos del cliente anterior)
};

// --- SISTEMA DE USUARIOS (localStorage) ---
let usuarioActual = null;
const LS_USUARIOS = 'cinerama_usuarios';
const LS_USUARIO_ACTUAL = 'cinerama_usuario_actual';
const LS_CUPONES = 'cinerama_cupones';
const LS_BUTACAS_BLOQUEADAS = 'cinerama_butacas_bloqueadas';

// --- FASE 7: PERSISTENCIA DE CATÁLOGO Y MULTISALA ---
const LS_PELICULAS = 'cinerama_peliculas';
const LS_ESTRENOS = 'cinerama_estrenos';
const LS_DULCES = 'cinerama_dulces';
const LS_SALAS_MANTENIMIENTO = 'cinerama_salas_mantenimiento';
const NUMERO_TOTAL_SALAS = 8;
const LS_VENTAS_ASIENTOS = 'cinerama_ventas_asientos'; // FASE 10: registro persistente de butacas vendidas por sala

// --- MÓDULO 9: catálogo de formatos de proyección (2D/3D/4DX/...) y tipos de entrada (General/Niño/...) ---
const LS_FORMATOS_PROYECCION = 'cinerama_formatos_proyeccion';
const LS_TIPOS_ENTRADA = 'cinerama_tipos_entrada';
const LS_TARIFAS_DIA = 'cinerama_tarifas_dia'; // MÓDULO 2 (ampliado): tarifas base por día, editables desde Admin > Tarifas

// --- FIX (corrección solicitada): ventas por FUNCIÓN real (no solo por sala) ---
// Cada registro de LS_VENTAS_ASIENTOS ahora también guarda fecha/hora de la función,
// para que una butaca vendida en un horario no bloquee esa misma butaca en otro horario
// distinto de la misma sala. Ver utilidades.js -> registrarVentaAsientos/obtenerButacasVendidas.

// --- FIX (corrección solicitada): bloqueo temporal real de butacas entre pestañas/usuarios ---
// LS_BUTACAS_BLOQUEADAS (arriba) quedó declarada pero nunca se llegó a usar en el flujo real;
// esta es la implementación funcional, basada en localStorage (compartido entre pestañas del
// mismo navegador) + un id de sesión por pestaña (sessionStorage). Ver utilidades.js.
const LS_BLOQUEOS_ASIENTOS = 'cinerama_bloqueos_asientos_temporales';

// --- MÓDULO 6: BANNER DINÁMICO Y CATEGORÍAS DINÁMICAS DE DULCERÍA ---
const LS_BANNER = 'cinerama_banner';                         // array de IDs de película, en el orden del carrusel
const LS_CATEGORIAS_DULCERIA = 'cinerama_categorias_dulceria'; // array de { id, nombre }
const CATEGORIA_SIN_ASIGNAR = 'sin-categoria';                // categoría especial, siempre existe, no se puede eliminar
const MAX_ASIENTOS_POR_COMPRA = 8;                            // Módulo 6: límite de asientos por transacción

/** FASE 10: layout único de butacas, compartido entre el mapa del cliente y el de mantenimiento admin
 *  para que ambos representen exactamente la misma sala (mismas filas, columnas y pasillos). */
const LAYOUT_SALA = {
    filas: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    columnas: 12,
    pasillos: [4, 10] // columnas después de las cuales se inserta un espacio visual
};

let salaMantenimientoActual = 1; // Sala seleccionada en el panel admin (Salas > Mantenimiento)
let filtroAdminDulceriaActual = 'all';

let vistaActualVisible = 'vista-inicio';
let menuMovilAbierto = false;

// --- MÓDULO 2: TEMPORIZADOR DE COMPRA ---
const DURACION_TEMPORIZADOR_COMPRA_SEGUNDOS = 5 * 60; // 5 minutos desde que se entra a asientos
const DURACION_GRACIA_PERMANENCIA_SEGUNDOS = 30;       // gracia del modal "¿Sigues ahí?"
let segundosRestantesCompra = 0;
let idIntervaloTemporizadorCompra = null;

// FIX — bloqueo temporal real: la reserva de una butaca dura lo mismo que el temporizador
// de compra, y se renueva junto con él cada vez que se avanza de etapa.
const DURACION_BLOQUEO_ASIENTO_SEGUNDOS = DURACION_TEMPORIZADOR_COMPRA_SEGUNDOS;
let idIntervaloRefrescoAsientos = null; // refresca el mapa de asientos en vivo mientras vista-asientos está visible

// FIX — libro de ventas global (incluye compras de invitados, no solo de usuarios logueados).
const LS_VENTAS_GENERAL = 'cinerama_ventas_general';

/* ============================================================================
   2. BASE DE DATOS MOCK
   ============================================================================ */

const PRECIOS = {
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
    'NAUTICA10': { porcentaje: 10, descripcion: 'Bienvenida Náutica' }
};

/* ============================================================================
   MÓDULO 2 — JERARQUÍA DE TARIFAS DINÁMICAS (editables desde Admin > Tarifas)
   ------------------------------------------------------------------------
   El precio final de un asiento se construye en 3 pasos:
     1) Tarifa base del día  (este bloque — editable desde el panel Admin)
     2) Recargo del formato  (catálogo de formatos — 2D/3D/4DX/...)
     3) Descuento del tipo   (catálogo de tipos de entrada — General/Niño/...)

   Jerarquía de evaluación de la tarifa base (estricta):
     1) ¿Película en Pre-Estreno?                                 -> Tarifa Alta
     2) Jueves / Viernes / Sábado / Domingo                       -> Tarifa Alta
     3) Lunes / Miércoles                                         -> Tarifa Media
     4) Martes                                                    -> Tarifa Económica
   ============================================================================ */

// Valores por defecto de fábrica (solo se usan la primera vez que no hay localStorage).
const TARIFAS_DIA_INICIALES = {
    economica: 12.0,  // Martes
    media:     13.0,  // Lunes / Miércoles
    alta:      18.0   // Jue / Vie / Sáb / Dom / Pre-Estrenos
};

function obtenerTarifasDia() {
    const guardado = JSON.parse(localStorage.getItem(LS_TARIFAS_DIA));
    if (guardado && typeof guardado.economica === 'number') return guardado;
    guardarEnLocalStorageSeguro(LS_TARIFAS_DIA, TARIFAS_DIA_INICIALES);
    return { ...TARIFAS_DIA_INICIALES };
}

function guardarTarifasDia(obj) {
    return guardarEnLocalStorageSeguro(LS_TARIFAS_DIA, obj);
}

/** Conveniencia: tarifa de un slot de día ('economica'|'media'|'alta') como número. */
function obtenerTarifaPorSlot(slot) {
    return obtenerTarifasDia()[slot] ?? obtenerTarifasDia().alta;
}

// MÓDULO 3 — margen de limpieza obligatorio entre funciones de una misma sala.
const MARGEN_LIMPIEZA_MINUTOS = 30;


/* ============================================================================
   MÓDULO 9 — CATÁLOGO DE FORMATOS DE PROYECCIÓN (tab Admin > Tarifas)
   ------------------------------------------------------------------------
   Cada formato tiene un recargo en soles que se suma a la tarifa base del día
   (ver calcularTarifaBaseFuncionActual, en cliente.js). Las salas declaran qué
   formatos de esta lista soportan (crearConfiguracionSala) y las películas qué
   formatos ofrecen (campo `formatosDisponibles`); así el admin nunca puede
   programar un formato que la sala no tiene o que la película no ofrece.
   El id '2d' es el formato base del catálogo y no se puede eliminar (siempre
   tiene que existir al menos un formato "de entrada" con recargo 0).
   ============================================================================ */
const FORMATOS_PROYECCION_INICIALES = [
    { id: '2d', nombre: '2D', recargo: 0, protegido: true },
    { id: '3d', nombre: '3D', recargo: 5 },
    { id: '4dx', nombre: '4DX', recargo: 15 },
    { id: 'xd', nombre: 'XD', recargo: 8 },
    { id: 'vip', nombre: 'VIP', recargo: 20 },
    { id: 'dbox', nombre: 'D-BOX', recargo: 15 }
];

function obtenerCatalogoFormatos() {
    const guardado = JSON.parse(localStorage.getItem(LS_FORMATOS_PROYECCION));
    if (guardado && Array.isArray(guardado) && guardado.length > 0) return guardado;
    guardarEnLocalStorageSeguro(LS_FORMATOS_PROYECCION, FORMATOS_PROYECCION_INICIALES);
    return FORMATOS_PROYECCION_INICIALES;
}

function guardarCatalogoFormatos(lista) {
    return guardarEnLocalStorageSeguro(LS_FORMATOS_PROYECCION, lista);
}

function obtenerFormatoPorId(id) {
    return obtenerCatalogoFormatos().find(f => f.id === id) || null;
}

/* ============================================================================
   MÓDULO 9 — CATÁLOGO DE TIPOS DE ENTRADA (tab Admin > Tarifas)
   ------------------------------------------------------------------------
   Descuento en % sobre la tarifa ya calculada (base del día + recargo del
   formato). El id 'general' es el tipo por defecto al elegir un asiento y no
   se puede eliminar (siempre tiene que quedar un tipo sin condiciones).
   'conadis' refleja el descuento del 20% de la Ley N° 29973 (Perú); queda
   como un tipo de entrada editable más, sin tope de entradas por función.
   ============================================================================ */
const TIPOS_ENTRADA_INICIALES = [
    { id: 'general', nombre: 'General / Adulto', descuentoPct: 0, protegido: true },
    { id: 'nino', nombre: 'Niño', descuentoPct: 30 },
    { id: 'adulto-mayor', nombre: 'Adulto Mayor', descuentoPct: 20 },
    { id: 'conadis', nombre: 'CONADIS', descuentoPct: 20 }
];

function obtenerCatalogoTiposEntrada() {
    const guardado = JSON.parse(localStorage.getItem(LS_TIPOS_ENTRADA));
    if (guardado && Array.isArray(guardado) && guardado.length > 0) return guardado;
    guardarEnLocalStorageSeguro(LS_TIPOS_ENTRADA, TIPOS_ENTRADA_INICIALES);
    return TIPOS_ENTRADA_INICIALES;
}

function guardarCatalogoTiposEntrada(lista) {
    return guardarEnLocalStorageSeguro(LS_TIPOS_ENTRADA, lista);
}

function obtenerTipoEntradaPorId(id) {
    return obtenerCatalogoTiposEntrada().find(t => t.id === id) || null;
}

function obtenerTipoEntradaPorDefecto() {
    const catalogo = obtenerCatalogoTiposEntrada();
    return catalogo.find(t => t.id === 'general') || catalogo[0];
}

const baseDatosPeliculas = {
    'spiderman': {
        id: 'spiderman',
        titulo: 'Spider-Man: Un Nuevo Día',
        banner: 'assets/img/banners/SpidermanHorizontal.jpg',
        poster: 'assets/img/posters/Spiderman.webp',
        genero: 'Acción / Aventura', clasificacion: 'APT', duracion: '2h 25m', tipoLanzamiento: 'Estreno', formatosDisponibles: ['2d', 'xd'],
        sinopsis: 'Peter Parker se enfrenta a su mayor desafío cuando las barreras entre multiversos colisionan inesperadamente. Viejos enemigos de realidades alternativas llegan a Nueva York, y Peter deberá aliarse con versiones de sí mismo para restaurar el equilibrio antes de que su mundo sea destruido por completo.',
        trailer: 'https://www.youtube.com/watch?v=QXibcL7-XbU',
        horarios: {
            'Hoy, 26 Ago': [
                { formato: '2D Doblada', horas: [{ hora: '13:00', sala: 1 }, { hora: '15:30', sala: 1 }, { hora: '18:00', sala: 2 }] },
                { formato: 'SALA XD', horas: [{ hora: '14:00', sala: 3 }, { hora: '17:00', sala: 3 }, { hora: '20:30', sala: 3 }] }
            ],
            'Jue, 27 Ago': [
                { formato: '2D Doblada', horas: [{ hora: '14:00', sala: 1 }, { hora: '16:30', sala: 1 }, { hora: '19:00', sala: 2 }] },
                { formato: 'SALA XD', horas: [{ hora: '15:00', sala: 3 }, { hora: '18:00', sala: 3 }, { hora: '21:30', sala: 3 }] }
            ],
            'Vie, 28 Ago': [
                { formato: '2D Subtitulada', horas: [{ hora: '18:00', sala: 2 }, { hora: '21:00', sala: 2 }] },
                { formato: 'SALA XD', horas: [{ hora: '19:30', sala: 3 }, { hora: '22:30', sala: 3 }] }
            ]
        }
    },
    'demonio': {
        id: 'demonio',
        titulo: 'La Noche del Demonio',
        banner: 'assets/img/banners/LaNocheDelDemonioHorizontal.jpg',
        poster: 'assets/img/posters/LaNocheDelDemonio.jpg',
        genero: 'Terror / Suspenso', clasificacion: '+14', duracion: '1h 46m', tipoLanzamiento: 'Pre-Estreno', formatosDisponibles: ['2d', 'dbox'],
        sinopsis: 'Una familia se muda a una nueva casa buscando un nuevo comienzo, solo para descubrir que el lugar está plagado de entidades oscuras. A medida que las manifestaciones empeoran, descubren que el verdadero mal no reside en la casa, sino que ha poseído a su hijo menor.',
        trailer: 'https://www.youtube.com/watch?v=orvNgTGq6cg',
        horarios: {
            'Hoy, 26 Ago': [
                { formato: '2D Doblada', horas: [{ hora: '16:00', sala: 4 }, { hora: '21:00', sala: 4 }] },
                { formato: 'D-BOX', horas: [{ hora: '19:00', sala: 5 }, { hora: '23:30', sala: 5 }] }
            ],
            'Jue, 27 Ago': [
                { formato: '2D Doblada', horas: [{ hora: '17:00', sala: 4 }, { hora: '22:00', sala: 4 }] },
                { formato: 'D-BOX', horas: [{ hora: '20:00', sala: 5 }, { hora: '23:50', sala: 5 }] }
            ]
        }
    },
    'odisea': {
        id: 'odisea',
        titulo: 'La Odisea Espacial',
        banner: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=2070',
        poster: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=600&auto=format&fit=crop',
        genero: 'Ciencia Ficción', clasificacion: 'APT', duracion: '2h 52m', tipoLanzamiento: 'Regular', formatosDisponibles: ['2d'],
        sinopsis: 'Un grupo de astronautas se embarca en una misión secreta hacia Júpiter acompañados por HAL 9000, una inteligencia artificial que controla la nave. A mitad de camino, la máquina comienza a exhibir un comportamiento extraño y letal.',
        trailer: 'https://www.youtube.com/embed/xhRUxPbp_c',
        horarios: {
            'Hoy, 26 Ago': [{ formato: '2D Subtitulada', horas: [{ hora: '14:15', sala: 6 }, { hora: '17:45', sala: 6 }, { hora: '21:15', sala: 7 }] }],
            'Jue, 27 Ago': [{ formato: '2D Subtitulada', horas: [{ hora: '15:15', sala: 6 }, { hora: '18:45', sala: 7 }] }]
        }
    }
};

const baseDatosEstrenos = {
    'batman': {
        id: 'batman',
        titulo: 'El Caballero Oscuro',
        poster: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?q=80&w=600',
        banner: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?q=80&w=2070',
        genero: 'Acción / Thriller', clasificacion: '+14', duracion: '2h 32m', formatosDisponibles: ['2d', '3d'],
        sinopsis: 'Gotham City se enfrenta a una nueva amenaza cuando un criminal anarquista conocido como el Joker emerge para sumir la ciudad en el caos.',
        trailer: 'https://www.youtube.com/embed/EXeTwQWrcwY'
    },
    'avatar': {
        id: 'avatar',
        titulo: 'El Planeta Perdido',
        poster: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=600',
        banner: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=2070',
        genero: 'Aventura / Sci-Fi', clasificacion: 'APT', duracion: '3h 10m', formatosDisponibles: ['2d', '3d', '4dx'],
        sinopsis: 'Exploradores humanos llegan a un planeta exuberante y deben aprender a convivir con la flora y fauna alienígena que lo habita.',
        trailer: 'https://www.youtube.com/embed/a8Gx8wiNbs8'
    }
};

const formatearMoneda = (monto) => `S/ ${monto.toFixed(2)}`;

// MÓDULO 3 — catálogo de géneros para el selector de chips (multi-selección) de Cartelera.
const GENEROS_DISPONIBLES = [
    'Acción', 'Aventura', 'Comedia', 'Drama', 'Terror', 'Suspenso',
    'Ciencia Ficción', 'Fantasía', 'Animación', 'Romance', 'Documental',
    'Musical', 'Familiar', 'Crimen'
];




/* ============================================================================
   PERSISTENCIA DEL CATÁLOGO (localStorage) — Fase 7
   Carga/guarda baseDatosPeliculas, baseDatosEstrenos y PRECIOS.dulces.
   Depende de guardarEnLocalStorageSeguro() (definida en utilidades.js).
   ============================================================================ */

function inicializarPersistenciaCartelera() {
    const peliculasGuardadas = JSON.parse(localStorage.getItem(LS_PELICULAS));
    if (peliculasGuardadas && Object.keys(peliculasGuardadas).length > 0) {
        Object.keys(baseDatosPeliculas).forEach(k => delete baseDatosPeliculas[k]);
        Object.assign(baseDatosPeliculas, peliculasGuardadas);
    } else {
        guardarEnLocalStorageSeguro(LS_PELICULAS, baseDatosPeliculas);
    }

    const estrenosGuardados = JSON.parse(localStorage.getItem(LS_ESTRENOS));
    if (estrenosGuardados && Object.keys(estrenosGuardados).length > 0) {
        Object.keys(baseDatosEstrenos).forEach(k => delete baseDatosEstrenos[k]);
        Object.assign(baseDatosEstrenos, estrenosGuardados);
    } else {
        guardarEnLocalStorageSeguro(LS_ESTRENOS, baseDatosEstrenos);
    }
}

function guardarCarteleraEnStorage() {
    guardarEnLocalStorageSeguro(LS_PELICULAS, baseDatosPeliculas);
    guardarEnLocalStorageSeguro(LS_ESTRENOS, baseDatosEstrenos);
}

function inicializarPersistenciaDulceria() {
    const dulcesGuardados = JSON.parse(localStorage.getItem(LS_DULCES));
    if (dulcesGuardados && Object.keys(dulcesGuardados).length > 0) {
        Object.keys(PRECIOS.dulces).forEach(k => delete PRECIOS.dulces[k]);
        Object.assign(PRECIOS.dulces, dulcesGuardados);
    } else {
        guardarEnLocalStorageSeguro(LS_DULCES, PRECIOS.dulces);
    }
}

function guardarDulceriaEnStorage() {
    guardarEnLocalStorageSeguro(LS_DULCES, PRECIOS.dulces);
}

/* ============================================================================
   MÓDULO 6 — PERSISTENCIA DEL BANNER DINÁMICO
   ------------------------------------------------------------------------
   El banner guarda solo IDs de película (de baseDatosPeliculas o
   baseDatosEstrenos); el resto de datos (título, imagen, clasificación...)
   siempre se lee en vivo desde el catálogo, así que si el admin edita la
   película el banner se actualiza solo, sin duplicar información.
   ============================================================================ */
let bannerPeliculasIds = [];

function inicializarPersistenciaBanner() {
    const guardado = JSON.parse(localStorage.getItem(LS_BANNER));
    bannerPeliculasIds = Array.isArray(guardado) ? guardado : [];
}

function guardarBannerEnStorage() {
    guardarEnLocalStorageSeguro(LS_BANNER, bannerPeliculasIds);
}

/** Busca una película destacada del banner en cartelera o estrenos (o null si ya no existe). */
function resolverPeliculaBanner(id) {
    return baseDatosPeliculas[id] || baseDatosEstrenos[id] || null;
}

/** Quita de la lista del banner cualquier ID que ya no exista en el catálogo (ej. tras eliminar una película). */
function limpiarBannerDeIdsInexistentes() {
    const antes = bannerPeliculasIds.length;
    bannerPeliculasIds = bannerPeliculasIds.filter(id => resolverPeliculaBanner(id));
    if (bannerPeliculasIds.length !== antes) guardarBannerEnStorage();
}

/* ============================================================================
   MÓDULO 6 — PERSISTENCIA DE CATEGORÍAS DINÁMICAS DE DULCERÍA
   ------------------------------------------------------------------------
   Se siembra con las 4 categorías que ya traía la app (combo/cancha/bebida/
   snack) para no romper los productos existentes. "Sin categoría" es una
   categoría especial que siempre existe (no se guarda en la lista editable
   ni se puede eliminar) y sirve de destino cuando se borra una categoría
   que aún tenía productos asignados.
   ============================================================================ */
const CATEGORIAS_DULCERIA_POR_DEFECTO = [
    { id: 'combo', nombre: 'Combos Populares' },
    { id: 'cancha', nombre: 'Cancha (Popcorn)' },
    { id: 'bebida', nombre: 'Bebidas' },
    { id: 'snack', nombre: 'Snacks & Dulces' }
];

let categoriasDulceria = [];

function inicializarPersistenciaCategoriasDulceria() {
    const guardadas = JSON.parse(localStorage.getItem(LS_CATEGORIAS_DULCERIA));
    if (Array.isArray(guardadas) && guardadas.length > 0) {
        categoriasDulceria = guardadas;
    } else {
        categoriasDulceria = CATEGORIAS_DULCERIA_POR_DEFECTO.map(c => ({ ...c }));
        guardarCategoriasDulceriaEnStorage();
    }
}

function guardarCategoriasDulceriaEnStorage() {
    guardarEnLocalStorageSeguro(LS_CATEGORIAS_DULCERIA, categoriasDulceria);
}

/** Todas las categorías visibles para elegir/filtrar: las editables + "Sin categoría" al final. */
function obtenerCategoriasDulceriaConSinAsignar() {
    return [...categoriasDulceria, { id: CATEGORIA_SIN_ASIGNAR, nombre: 'Sin categoría' }];
}

/** Cuántos productos de PRECIOS.dulces usan una categoría dada. */
function contarProductosPorCategoria(categoriaId) {
    return Object.values(PRECIOS.dulces).filter(p => p.categoria === categoriaId).length;
}
