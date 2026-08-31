/* ============================================================================
   CINERAMA — ESTADO.JS — Estado global, constantes y datos mock
   ------------------------------------------------------------------------
   Parte de la arquitectura modular de Cinerama (Fase 14).
   Cargado como <script> clásico (no ES module) para funcionar también
   abriendo index.html directamente con file://, sin necesidad de servidor.
   Debe cargarse PRIMERO: define baseDatosPeliculas, baseDatosEstrenos,
   PRECIOS, CUPONES_BASE, estadoPedido y todas las claves de localStorage
   que el resto de módulos utiliza.
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
    sala: null,      // FASE 7: número de sala (1-8) de la función elegida
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

// --- FASE 7: PERSISTENCIA DE CATÁLOGO Y MULTISALA ---
const LS_PELICULAS = 'cinerama_peliculas';
const LS_ESTRENOS = 'cinerama_estrenos';
const LS_DULCES = 'cinerama_dulces';
const LS_SALAS_MANTENIMIENTO = 'cinerama_salas_mantenimiento';
const NUMERO_TOTAL_SALAS = 8;
const LS_VENTAS_ASIENTOS = 'cinerama_ventas_asientos'; // FASE 10: registro persistente de butacas vendidas por sala

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
let asientoPendienteId = null;
let panelAbierto = false;
let menuMovilAbierto = false;

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
        banner: 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?q=80&w=2070',
        poster: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=600',
        genero: 'Terror / Suspenso', clasificacion: '+14', duracion: '1h 46m',
        sinopsis: 'Una familia se muda a una nueva casa buscando un nuevo comienzo, solo para descubrir que el lugar está plagado de entidades oscuras. A medida que las manifestaciones empeoran, descubren que el verdadero mal no reside en la casa, sino que ha poseído a su hijo menor.',
        trailer: 'https://www.youtube.com/embed/zuZnRUxPbp_c',
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
        genero: 'Ciencia Ficción', clasificacion: 'APT', duracion: '2h 52m',
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
