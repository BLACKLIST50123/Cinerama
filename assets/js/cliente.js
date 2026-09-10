/* ============================================================================
   CINERAMA — CLIENTE.JS — Todo el flujo de cara al usuario
   ------------------------------------------------------------------------
   Parte de la arquitectura modular de Cinerama (Fase 14).
   Cargado como <script> clásico (no ES module) para funcionar también
   abriendo index.html directamente con file://, sin necesidad de servidor.
   Navegación entre vistas, cartelera, detalle, horarios, asientos,
   dulcería, checkout/pago, ticket, autenticación, mis compras,
   contacto/ubicación y promociones.
   ============================================================================ */

/* ============================================================================
   4. NAVEGACIÓN ENTRE VISTAS
   ============================================================================ */

function cambiarVista(idDesde, idHacia) {
    const elDesde = document.getElementById(idDesde);
    const elHacia = document.getElementById(idHacia);
    if (!elDesde || !elHacia) return;

    // Si estamos saliendo de la vista de detalles, apagamos el tráiler de inmediato
    if (idDesde === 'vista-detalle-pelicula') {
        const iframeDetalle = document.getElementById('detalle-iframe');
        if (iframeDetalle) iframeDetalle.src = '';
    }

    elDesde.classList.add('opacity-0');
    setTimeout(() => {
        elDesde.classList.add('hidden');
        elHacia.classList.remove('hidden');
        elHacia.classList.remove('opacity-0'); // dispara la transición
        window.scrollTo({ top: 0, behavior: 'smooth' });
        vistaActualVisible = idHacia;
        renderizarStepperCompra(idHacia); // FASE 15: indicador de progreso de la compra
        ajustarAlturaContenedorVistas(idHacia); // Módulo 1: footer estático al final del contenido
        actualizarVisibilidadFooter();          // Módulo 1: footer oculto en panel admin
    }, 300);
}
window.cambiarVista = cambiarVista;

/* ============================================================================
   MÓDULO 1 — FOOTER INTELIGENTE
   ------------------------------------------------------------------------
   Las vistas viven superpuestas dentro de #contenedor-vistas (una en flujo
   normal — vista-inicio —, el resto position:absolute). Como los elementos
   absolutos no aportan altura a su contenedor, fijamos manualmente el
   min-height del contenedor según la vista activa para que el <footer>,
   que va justo después en el flujo normal del documento, quede siempre
   estático al final del contenido visible (nunca flotando ni encima).
   ============================================================================ */
function ajustarAlturaContenedorVistas(idVista) {
    const contenedor = document.getElementById('contenedor-vistas');
    const vista = document.getElementById(idVista);
    if (!contenedor || !vista) return;
    // requestAnimationFrame: esperamos a que el navegador ya haya pintado
    // el contenido nuevo (innerHTML recién asignado) antes de medir su alto.
    requestAnimationFrame(() => {
        contenedor.style.minHeight = `${vista.scrollHeight}px`;
    });
}

/** Oculta el footer dentro del panel admin, o si el usuario logueado es admin. */
function actualizarVisibilidadFooter() {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const debeOcultarse = (usuarioActual && usuarioActual.rol === 'admin') || vistaActualVisible === 'vista-administrador';
    footer.classList.toggle('hidden', Boolean(debeOcultarse));
}
window.actualizarVisibilidadFooter = actualizarVisibilidadFooter;

/* ============================================================================
   FASE 15 — INDICADOR DE PROGRESO DE LA COMPRA (stepper)
   ============================================================================ */

/** Secuencia completa de pasos cuando la compra incluye película (entradas + dulcería). */
const PASOS_COMPRA = [
    { vista: 'vista-horarios', label: 'Horario', icono: 'fa-clock' },
    { vista: 'vista-asientos', label: 'Asientos', icono: 'fa-chair' },
    { vista: 'vista-dulceria', label: 'Dulcería', icono: 'fa-popcorn' },
    { vista: 'vista-pago', label: 'Pago', icono: 'fa-credit-card' },
    { vista: 'vista-ticket', label: 'Listo', icono: 'fa-ticket' }
];

/**
 * Pinta (o esconde) la barra de progreso fija según la vista a la que se está navegando.
 * Se llama automáticamente desde cambiarVista(), así que no requiere tocar cada punto de entrada.
 */
function renderizarStepperCompra(idVista) {
    const contenedor = document.getElementById('stepper-compra');
    const pasosEl = document.getElementById('stepper-compra-pasos');
    if (!contenedor || !pasosEl) return;

    // FASE 3: en modo "dulcería directa" (sin película) el recorrido es más corto
    const pasos = estadoPedido.modoDirecto
        ? PASOS_COMPRA.filter(p => ['vista-dulceria', 'vista-pago', 'vista-ticket'].includes(p.vista))
        : PASOS_COMPRA;

    const indiceActual = pasos.findIndex(p => p.vista === idVista);

    if (indiceActual === -1) {
        contenedor.classList.add('hidden');
        return; // esta vista no forma parte del flujo de compra
    }

    contenedor.classList.remove('hidden');

    pasosEl.innerHTML = pasos.map((paso, i) => {
        const completado = i < indiceActual;
        const actual = i === indiceActual;
        const claseTexto = completado ? 'text-brand-yellow' : actual ? 'text-white' : 'text-gray-600';
        const claseCirculo = completado
            ? 'bg-brand-yellow text-black'
            : actual
                ? 'bg-brand-red text-white shadow-[0_0_10px_rgba(220,32,38,0.6)]'
                : 'bg-dark-700 text-gray-500 border border-white/10';
        // FASE 17: ícono propio de cada sección (check si ya se completó, ícono referente si no)
        const contenidoCirculo = completado
            ? '<i class="fa-solid fa-check text-[11px] md:text-xs"></i>'
            : `<i class="fa-solid ${paso.icono} text-[11px] md:text-xs"></i>`;
        return `
            <div class="flex items-center ${i < pasos.length - 1 ? 'flex-1' : ''}">
                <div class="flex flex-col items-center gap-1 flex-shrink-0">
                    <div class="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${claseCirculo}">
                        ${contenidoCirculo}
                    </div>
                    <span class="text-[10px] md:text-xs font-semibold ${claseTexto} hidden sm:block whitespace-nowrap">${paso.label}</span>
                </div>
                ${i < pasos.length - 1 ? `<div class="flex-1 h-0.5 mx-2 md:mx-3 ${completado ? 'bg-brand-yellow' : 'bg-dark-700'} transition-colors duration-300"></div>` : ''}
            </div>`;
    }).join('');
}

/** FASE 8: muestra/oculta el overlay de carga para operaciones que sí toman tiempo real (ej: procesar pago). */
function mostrarCargaGlobal(visible) {
    const overlay = document.getElementById('overlay-carga-vista');
    if (!overlay) return;
    overlay.classList.toggle('visible', visible);
}

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
   MÓDULO 6 — BANNER DINÁMICO (Home)
   ------------------------------------------------------------------------
   Lee bannerPeliculasIds (persistido por el admin desde Cartelera) y arma
   los slides en vivo, resolviendo cada ID contra baseDatosPeliculas o
   baseDatosEstrenos. Si el admin no eligió ninguna, cae de respaldo a las
   2 primeras películas de Cartelera para que el home nunca quede vacío.
   ============================================================================ */
let indiceSlideActivo = 0;

/** Devuelve el array de objetos-película a mostrar en el banner (ya resueltos, nunca IDs sueltos). */
function obtenerPeliculasParaBanner() {
    const desdeAdmin = bannerPeliculasIds.map(id => resolverPeliculaBanner(id)).filter(Boolean);
    if (desdeAdmin.length > 0) return desdeAdmin;
    return Object.values(baseDatosPeliculas).slice(0, 2); // respaldo: nunca mostrar un banner vacío
}

function renderizarBannerPrincipal() {
    const contenedor = document.getElementById('carrusel-slides');
    if (!contenedor) return;
    const peliculas = obtenerPeliculasParaBanner();
    indiceSlideActivo = 0;

    if (peliculas.length === 0) {
        contenedor.innerHTML = '';
        return;
    }

    contenedor.innerHTML = peliculas.map((p, i) => {
        const esPreEstreno = p.tipoLanzamiento === 'Pre-Estreno';
        const etiqueta = esPreEstreno ? 'Preventa Exclusiva' : (baseDatosEstrenos[p.id] ? 'Próximo Estreno' : 'Estreno');
        const claseEtiqueta = esPreEstreno ? 'bg-brand-yellow text-black' : 'bg-brand-red text-white';
        const esCartelera = Boolean(baseDatosPeliculas[p.id]);
        const textoBotonCompra = esPreEstreno ? 'Comprar Preventa' : 'Comprar Entradas';
        const claseBotonCompra = esPreEstreno
            ? 'bg-brand-yellow hover:bg-yellow-400 text-black shadow-yellow-500/40'
            : 'bg-brand-red hover:bg-brand-dark-red text-white shadow-red-500/40';
        // Estrenos aún sin funciones: el botón de compra no aplica, solo tráiler.
        const botonCompraHTML = esCartelera
            ? `<button onclick="abrirHorarios('${p.id}')" class="${claseBotonCompra} px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all flex items-center gap-2">
                    <i class="fa-solid fa-ticket"></i> ${textoBotonCompra}
                </button>`
            : '';

        return `
            <div class="carousel-item${i === 0 ? ' active' : ''}">
                <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${p.banner || p.poster}');"></div>
                <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent"></div>
                <div class="absolute inset-0 flex flex-col justify-center px-6 md:px-20 max-w-4xl z-20">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="px-3 py-1 ${claseEtiqueta} text-xs font-bold rounded-full w-max uppercase tracking-wider">${etiqueta}</span>
                        <span class="bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-1 rounded text-xs font-bold text-white">${p.clasificacion}</span>
                    </div>
                    <h1 class="text-5xl md:text-7xl font-bold text-white mb-4 leading-tight">${p.titulo}</h1>
                    <p class="text-gray-300 text-lg md:text-xl mb-6 max-w-2xl line-clamp-3">${p.sinopsis || ''}</p>
                    <div class="flex flex-wrap gap-4 items-center">
                        ${botonCompraHTML}
                        <button onclick="abrirDetallePelicula('${p.id}', '${esCartelera ? 'cartelera' : 'estreno'}')" class="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-8 py-3 rounded-full font-bold text-lg border border-white/20 transition-all flex items-center gap-2">
                            <i class="fa-solid fa-play"></i> Ver Tráiler
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');

    const botonesNav = document.querySelectorAll('#slide-anterior, #slide-siguiente');
    botonesNav.forEach(btn => btn.classList.toggle('hidden', peliculas.length <= 1));
}

/** Avanza/retrocede el carrusel del banner. dir: -1 (anterior) | 1 (siguiente). */
window.moverCarrusel = (dir) => {
    const slides = document.querySelectorAll('#carrusel-slides .carousel-item');
    if (slides.length === 0) return;
    slides[indiceSlideActivo].classList.remove('active');
    indiceSlideActivo = (indiceSlideActivo + dir + slides.length) % slides.length;
    slides[indiceSlideActivo].classList.add('active');
};

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

    renderizarBannerPrincipal(); // Módulo 6: el banner depende del mismo catálogo, se refresca junto con los grids
};


/* ============================================================================
   6. DETALLE DE PELÍCULA
   ============================================================================ */

window.abrirDetallePelicula = (peliculaId, tipo = 'cartelera') => {
    const pelicula = tipo === 'cartelera' ? baseDatosPeliculas[peliculaId] : baseDatosEstrenos[peliculaId];
    if (!pelicula) return;

    let urlCorregida = pelicula.trailer || '';
    if (urlCorregida.includes('watch?v=')) {
        urlCorregida = urlCorregida.replace('watch?v=', 'embed/');
    } else if (urlCorregida.includes('youtu.be/')) {
        urlCorregida = urlCorregida.replace('youtu.be/', 'www.youtube.com/embed/');
    }

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
                        <iframe id="detalle-iframe" class="w-full h-full absolute top-0 left-0" src="${urlCorregida}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
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

    // Módulo 1 — fix bug de memoria: la barra flotante "Elegir Asientos" no vive
    // dentro del innerHTML que se regenera en renderizarContenidoHorarios(), así
    // que si no la ocultamos aquí, queda visible arrastrando la selección de
    // una película anterior al entrar a una nueva.
    const barraConfirmacion = document.getElementById('barra-confirmacion-horario');
    if (barraConfirmacion) barraConfirmacion.classList.add('translate-y-full');

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
        funcion.horas.forEach(horaRaw => {
            // FASE 7: cada horario ahora trae su propia sala asignada { hora, sala }
            const { hora, sala } = normalizarFuncionHorario(horaRaw);
            horariosHTML += `<button onclick="seleccionarHorario(this, '${funcion.formato}', '${hora}', ${sala})" class="time-btn bg-dark-900 border border-gray-600 hover:border-brand-red hover:bg-brand-red/10 text-white font-bold py-2.5 px-6 rounded-lg transition-colors focus:outline-none flex flex-col items-center leading-tight">
                <span>${hora}</span><span class="text-[10px] text-gray-500 font-normal">Sala ${sala}</span>
            </button>`;
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
                <span class="inline-block bg-white/10 border border-white/20 px-2 py-1 rounded text-xs font-bold text-white mt-2 mb-4">${pelicula.clasificacion}</span>
                <!-- FASE 9: sinopsis completa (sin resumir) + acceso al tráiler -->
                <p class="text-gray-300 text-sm leading-relaxed border-t border-white/10 pt-4">${pelicula.sinopsis}</p>
                <button onclick="abrirModalTrailer('${pelicula.id}', 'cartelera')" class="w-full mt-5 bg-dark-900 hover:bg-dark-700 border border-white/10 text-white py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <i class="fa-brands fa-youtube text-brand-red"></i> Ver Tráiler
                </button>
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

window.seleccionarHorario = (btnEl, formato, hora, sala = 1) => {
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('bg-brand-red', 'border-brand-red');
        btn.classList.add('bg-dark-900', 'border-gray-600');
    });
    btnEl.classList.remove('bg-dark-900', 'border-gray-600');
    btnEl.classList.add('bg-brand-red', 'border-brand-red');

    estadoPedido.formato = formato;
    estadoPedido.hora = hora;
    estadoPedido.sala = Number(sala) || 1; // FASE 7: sala asociada a esta función

    document.getElementById('fh-fecha').textContent = estadoPedido.fecha;
    document.getElementById('fh-formato').textContent = formato;
    document.getElementById('fh-hora').textContent = hora;
    document.getElementById('barra-confirmacion-horario').classList.remove('translate-y-full');
};

/** FASE 7: normaliza un horario, que puede venir como string (dato antiguo) u objeto { hora, sala }. */
function normalizarFuncionHorario(horaRaw) {
    if (horaRaw && typeof horaRaw === 'object') {
        return { hora: horaRaw.hora, sala: Number(horaRaw.sala) || 1 };
    }
    return { hora: horaRaw, sala: 1 };
}


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
                <i class="fa-solid fa-location-dot text-brand-red w-4"></i> <span class="font-bold text-white">${estadoPedido.cine} — Sala ${estadoPedido.sala || 1}</span>
            </div>
        </div>
    `;

    document.getElementById('resumen-titulo-pelicula').textContent = estadoPedido.pelicula.titulo;
    document.getElementById('resumen-detalle-pelicula').textContent = `${estadoPedido.fecha} • ${estadoPedido.hora} • ${estadoPedido.formato}`;
    document.getElementById('resumen-cine').textContent = `${estadoPedido.cine} — Sala ${estadoPedido.sala || 1}`;

    estadoPedido.asientos = [];
    renderizarGridAsientos();
    actualizarResumenAsientos();
    actualizarBadgeTarifaVigente(); // Módulo 2: muestra la tarifa vigente antes de seleccionar

    cambiarVista('vista-horarios', 'vista-asientos');
    iniciarTemporizadorCompra(); // Módulo 2: el temporizador de compra empieza aquí
};

const renderizarGridAsientos = () => {
    const grid = document.getElementById('grid-asientos');
    grid.innerHTML = '';
    const sala = obtenerSalaConfigurada(estadoPedido.sala || 1);
    const vendidas = obtenerButacasVendidasPorSala(estadoPedido.sala || 1);
    grid.className = 'matriz-sala-cliente';
    grid.style.setProperty('--columnas-sala', sala.columnas);
    grid.innerHTML = sala.asientos.map(asiento => {
        const asientoId = `${asiento.f}${asiento.c}`;
        if (asiento.estado === 'pasadizo') return '<span class="asiento-pasadizo" aria-hidden="true"></span>';
        if (asiento.estado === 'mantenimiento' || vendidas.has(asientoId)) {
            return `<button disabled title="${asientoId} — ${vendidas.has(asientoId) ? 'Ocupado' : 'En mantenimiento'}" class="seat asiento-cliente-no-disponible w-7 h-7 md:w-10 md:h-10 rounded-t-lg md:rounded-t-xl rounded-b-sm border-b-4 border-black/50 cursor-not-allowed">${asientoId}</button>`;
        }
        const accesible = asiento.estado === 'accesible';
        return `<button id="asiento-btn-${asientoId}" data-accesible="${accesible}" onclick="clickAsiento('${asientoId}')" title="${asientoId}${accesible ? ' — Espacio accesible' : ''}" class="seat w-7 h-7 md:w-10 md:h-10 ${accesible ? 'asiento-cliente-accesible' : 'bg-green-600 hover:bg-green-500'} rounded-t-lg md:rounded-t-xl rounded-b-sm border-b-4 border-black/50 cursor-pointer flex justify-center items-end pb-1 text-[8px] md:text-[10px] font-bold text-white/70">${accesible ? '<i class="fa-solid fa-wheelchair text-xs md:text-sm m-auto"></i>' : asientoId}</button>`;
    }).join('');
};

/* ============================================================================
   MÓDULO 2 — MOTOR DE TARIFAS DINÁMICAS
   ============================================================================ */
const MESES_ABREV_A_INDICE = { 'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11 };
const DIAS_SEMANA_ABREV = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Convierte una etiqueta de horario ("Jue, 27 Ago" / "Hoy, 26 Ago") en fecha ISO (YYYY-MM-DD) del año en curso. */
function resolverFechaISODeEtiqueta(etiquetaFecha) {
    if (!etiquetaFecha) return null;
    const partes = etiquetaFecha.split(',');
    if (partes.length < 2) return null;
    const resto = partes[1].trim().split(' ');
    const dia = parseInt(resto[0], 10);
    const mesIndice = MESES_ABREV_A_INDICE[resto[1]];
    if (isNaN(dia) || mesIndice === undefined) return null;
    const anio = new Date().getFullYear();
    return `${anio}-${String(mesIndice + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Devuelve la abreviatura de día (Dom..Sáb) de una etiqueta de horario, resolviendo "Hoy"/"Mañana" con la fecha real. */
function resolverAbreviaturaDiaDeEtiqueta(etiquetaFecha) {
    if (!etiquetaFecha) return null;
    const prefijo = etiquetaFecha.split(',')[0].trim();
    if (prefijo === 'Hoy' || prefijo === 'Mañana') {
        const base = new Date();
        if (prefijo === 'Mañana') base.setDate(base.getDate() + 1);
        return DIAS_SEMANA_ABREV[base.getDay()];
    }
    return DIAS_SEMANA_ABREV.includes(prefijo) ? prefijo : null;
}

/**
 * Calcula la tarifa vigente para la función actualmente seleccionada
 * (estadoPedido.pelicula + estadoPedido.fecha), siguiendo la jerarquía
 * estricta del negocio. Todos los asientos de una misma función pagan esta
 * misma tarifa (ya no hay distinción por tipo de entrada).
 */
function calcularTarifaFuncionActual() {
    const pelicula = estadoPedido.pelicula;

    // 1) Pre-estreno
    if (pelicula && pelicula.tipoLanzamiento === 'Pre-Estreno') return TARIFA_FERIADO_FIN_DE_SEMANA;

    // 2) Feriado / día no laborable (calendario del admin — Módulo 4 le pone UI)
    const fechaISO = resolverFechaISODeEtiqueta(estadoPedido.fecha);
    if (fechaISO && esFechaFeriadoONoLaborable(fechaISO)) return TARIFA_FERIADO_FIN_DE_SEMANA;

    // 3-5) Según día de la semana
    const abreviaturaDia = resolverAbreviaturaDiaDeEtiqueta(estadoPedido.fecha);
    return TARIFAS_POR_DIA_SEMANA[abreviaturaDia] ?? TARIFA_FERIADO_FIN_DE_SEMANA; // fallback seguro
}

/** Actualiza el badge de "tarifa vigente" que se muestra sobre el mapa de asientos. */
function actualizarBadgeTarifaVigente() {
    const el = document.getElementById('texto-tarifa-vigente');
    if (!el) return;
    el.textContent = `${formatearMoneda(calcularTarifaFuncionActual())} c/u`;
}

window.clickAsiento = (asientoId) => {
    const indiceExistente = estadoPedido.asientos.findIndex(s => s.id === asientoId);
    const btn = document.getElementById(`asiento-btn-${asientoId}`);

    if (indiceExistente > -1) {
        estadoPedido.asientos.splice(indiceExistente, 1);
        btn.classList.remove('selected', 'bg-brand-red');
        if (btn.dataset.accesible === 'true') btn.classList.add('asiento-cliente-accesible');
        else btn.classList.add('bg-green-600');
    } else {
        // Módulo 6: límite máximo de asientos por transacción.
        if (estadoPedido.asientos.length >= MAX_ASIENTOS_POR_COMPRA) {
            mostrarToast(`Solo puedes seleccionar hasta ${MAX_ASIENTOS_POR_COMPRA} asientos por compra.`, 'error');
            return;
        }
        // Módulo 2: ya no se pregunta el tipo de entrada; el precio lo determina
        // automáticamente la tarifa vigente de la función (calcularTarifaFuncionActual).
        estadoPedido.asientos.push({
            id: asientoId,
            tipoLabel: 'Entrada General',
            precio: calcularTarifaFuncionActual()
        });
        btn.classList.remove('bg-green-600', 'hover:bg-green-500');
        btn.classList.add('selected');
    }
    actualizarResumenAsientos();
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
   MÓDULO 2 — TEMPORIZADOR DE COMPRA
   ------------------------------------------------------------------------
   Arranca al entrar a asientos, se reinicia cada vez que se avanza de etapa
   (asientos -> dulcería -> pago). Si llega a 0, se muestra un modal de
   "permanencia" con 30s de gracia: si el usuario confirma que sigue ahí, se
   reinicia; si no responde a tiempo (o cancela), se limpia todo y se vuelve
   al inicio.
   ============================================================================ */
function iniciarTemporizadorCompra() {
    detenerTemporizadorCompra(); // por si ya había uno corriendo (evita duplicados)
    segundosRestantesCompra = DURACION_TEMPORIZADOR_COMPRA_SEGUNDOS;
    mostrarBadgeTemporizador();
    actualizarTextoBadgeTemporizador();
    idIntervaloTemporizadorCompra = setInterval(() => {
        segundosRestantesCompra--;
        actualizarTextoBadgeTemporizador();
        if (segundosRestantesCompra <= 0) {
            clearInterval(idIntervaloTemporizadorCompra);
            idIntervaloTemporizadorCompra = null;
            manejarExpiracionTemporizadorCompra();
        }
    }, 1000);
}

/** Se llama al avanzar de etapa dentro del flujo de compra ya iniciado. */
function reiniciarTemporizadorCompra() {
    if (!estadoPedido.pelicula && !estadoPedido.modoDirecto) return; // no hay compra en curso
    iniciarTemporizadorCompra();
}

function detenerTemporizadorCompra() {
    if (idIntervaloTemporizadorCompra) { clearInterval(idIntervaloTemporizadorCompra); idIntervaloTemporizadorCompra = null; }
    ocultarBadgeTemporizador();
}

function mostrarBadgeTemporizador() {
    const badge = document.getElementById('badge-temporizador-compra');
    if (badge) badge.classList.remove('hidden');
}
function ocultarBadgeTemporizador() {
    const badge = document.getElementById('badge-temporizador-compra');
    if (badge) badge.classList.add('hidden');
}
function actualizarTextoBadgeTemporizador() {
    const el = document.getElementById('badge-temporizador-texto');
    if (!el) return;
    const segundos = Math.max(segundosRestantesCompra, 0);
    el.textContent = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
    const badge = document.getElementById('badge-temporizador-compra');
    if (badge) badge.classList.toggle('badge-temporizador-urgente', segundos <= 60);
}

/** Modal de permanencia: 30s de gracia antes de perder la compra por inactividad. */
async function manejarExpiracionTemporizadorCompra() {
    ocultarBadgeTemporizador();
    const continuar = await confirmarAccion({
        titulo: '¿Sigues ahí?',
        mensaje: 'Tu tiempo para completar la compra expiró por inactividad. Si no respondes, en 30 segundos volverás al inicio y perderás tu selección.',
        tipo: 'advertencia',
        textoConfirmar: 'Seguir comprando',
        textoCancelar: 'Salir ahora',
        tiempoLimiteMs: DURACION_GRACIA_PERMANENCIA_SEGUNDOS * 1000
    });

    if (continuar) {
        reiniciarTemporizadorCompra();
    } else {
        mostrarToast('Tu sesión de compra expiró por inactividad.', 'info');
        limpiarEstadoPedido();
        cambiarVista(vistaActualVisible, 'vista-inicio');
    }
}

/* ============================================================================
   MÓDULO 2 — PREVENCIÓN DE FUGA DE SESIÓN
   ------------------------------------------------------------------------
   Se usa desde los enlaces del navbar que rompen el flujo de compra (Inicio,
   Promociones, Ubicación, logo, Dulcería directa). Si hay una compra en
   curso (asientos y/o carrito con productos), pide confirmación antes de
   navegar y perder el progreso.
   ============================================================================ */

/** Limpia por completo el pedido en curso y detiene el temporizador. Reutilizable desde cualquier salida del flujo. */
function limpiarEstadoPedido() {
    detenerTemporizadorCompra();
    estadoPedido.pelicula = null;
    estadoPedido.fecha = null;
    estadoPedido.formato = null;
    estadoPedido.hora = null;
    estadoPedido.sala = null;
    estadoPedido.asientos = [];
    estadoPedido.carrito = {};
    estadoPedido.modoDirecto = false;
    estadoPedido.cupon = null;
}

/**
 * Envuelve una navegación que rompe el flujo de compra. Si no hay nada que
 * perder, navega directo; si hay asientos/dulces seleccionados, confirma antes.
 * @param {Function} accionNavegacion - función que ejecuta la navegación real.
 */
async function intentarSalirDelFlujoDeCompra(accionNavegacion) {
    // Módulo 6: hay "progreso" desde que se eligió película (Horarios en adelante), no solo con asientos/carrito ya elegidos.
    const hayProgreso = estadoPedido.pelicula !== null
        || (estadoPedido.asientos && estadoPedido.asientos.length > 0)
        || (estadoPedido.carrito && Object.keys(estadoPedido.carrito).length > 0);

    if (!hayProgreso) { accionNavegacion(); return; }

    const salir = await confirmarAccion({
        titulo: '¿Salir de la compra?',
        mensaje: 'Tienes una compra en curso. Si sales ahora, perderás los asientos y/o productos que seleccionaste.',
        tipo: 'advertencia',
        textoConfirmar: 'Sí, salir',
        textoCancelar: 'Seguir comprando'
    });
    if (salir) {
        limpiarEstadoPedido();
        accionNavegacion();
    }
}
window.intentarSalirDelFlujoDeCompra = intentarSalirDelFlujoDeCompra;

/* ============================================================================
   9. DULCERÍA (incluye FASE 3 — flujo directo sin película)
   ============================================================================ */

window.irADulceria = () => {
    renderizarGridDulceria('all');
    actualizarResumenFinal();
    aplicarModoDirectoUI();
    cambiarVista('vista-asientos', 'vista-dulceria');
    reiniciarTemporizadorCompra(); // Módulo 2: se avanzó de etapa
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
    iniciarTemporizadorCompra(); // Módulo 2: también es una compra en curso
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

// --- FASE 13: helpers compartidos entre la vista de dulcería del cliente y la del admin (dedup) ---

/** Filtra el catálogo de dulcería por categoría, texto de búsqueda y stock. Usado por cliente y admin. */
function filtrarProductosDulceria({ categoria = 'all', termino = '', soloConStock = false } = {}) {
    const terminoNormalizado = (termino || '').trim().toLowerCase();
    return Object.entries(PRECIOS.dulces).filter(([, p]) => {
        if (soloConStock && !p.stock) return false;
        if (categoria && categoria !== 'all' && p.categoria !== categoria) return false;
        if (terminoNormalizado && !p.nombre.toLowerCase().includes(terminoNormalizado)) return false;
        return true;
    });
}

/** Genera el bloque de imagen (o ícono legado de FontAwesome, para productos guardados antes del Módulo 4) de un producto. */
function renderizarIconoOImagenProducto(prod) {
    if (prod.imagen) return `<img src="${prod.imagen}" class="w-full h-full object-cover">`;
    if (prod.icono) return `<i class="fa-solid ${prod.icono}"></i>`;
    return `<i class="fa-solid fa-image text-gray-600"></i>`; // Módulo 4: respaldo genérico si no hay ninguno de los dos
}

/** Módulo 6: pinta los botones de filtro de categoría según categoriasDulceria (dinámico, ya no hardcodeado en el HTML). */
function renderizarFiltrosCategoriasDulceria() {
    const contenedor = document.getElementById('categorias-dulceria');
    if (!contenedor) return;
    const categorias = [{ id: 'all', nombre: 'Todos' }, ...categoriasDulceria];
    contenedor.innerHTML = categorias.map(cat => `
        <button onclick="renderizarGridDulceria('${cat.id}')" data-categoria="${cat.id}" class="cat-btn px-4 py-2 text-gray-400 font-semibold hover:text-white whitespace-nowrap border-b-2 border-transparent">${cat.nombre}</button>
    `).join('');
}

window.renderizarGridDulceria = (filtroCategoria) => {
    renderizarFiltrosCategoriasDulceria(); // Módulo 6: reconstruye los botones por si las categorías cambiaron en el admin
    document.querySelectorAll('#categorias-dulceria .cat-btn').forEach(btn => {
        btn.classList.remove('text-brand-yellow', 'border-brand-yellow');
        btn.classList.add('text-gray-400', 'border-transparent');
    });
    // Módulo 1 — fix bug "Todos" no marcado: antes se dependía del objeto
    // global 'event' (event.currentTarget), que al llamar la función de forma
    // programática (irADulceria/abrirDulceriaDirecta) apuntaba al último botón
    // clickeado en la app, no al botón de categoría real. Ahora se busca
    // directamente el botón que corresponde al filtro activo.
    const btnClickeado = document.querySelector(`#categorias-dulceria .cat-btn[data-categoria="${filtroCategoria}"]`);
    if (btnClickeado && btnClickeado.classList) {
        btnClickeado.classList.remove('text-gray-400', 'border-transparent');
        btnClickeado.classList.add('text-brand-yellow', 'border-brand-yellow');
    }

    const grid = document.getElementById('grid-productos');

    // FASE 13: filtro compartido con el admin (misma función, mismo criterio de stock/categoría)
    const productos = filtrarProductosDulceria({ categoria: filtroCategoria, soloConStock: true });

    // FASE 16: estado vacío si la categoría elegida no tiene productos disponibles
    if (productos.length === 0) {
        grid.innerHTML = htmlEstadoVacio({
            icono: 'fa-popcorn',
            titulo: 'No hay productos en esta categoría',
            subtitulo: 'Prueba con otra categoría del menú de arriba, o vuelve más tarde.'
        });
        return;
    }

    grid.innerHTML = '';
    productos.forEach(([id, prod]) => {
        grid.innerHTML += `
            <div class="bg-dark-800 rounded-xl border border-white/5 p-4 flex gap-4 hover:border-white/20 transition-colors shadow-lg">
                <div class="w-20 h-20 bg-dark-900 rounded-lg flex items-center justify-center flex-shrink-0 text-brand-yellow text-3xl overflow-hidden">
                    ${renderizarIconoOImagenProducto(prod)}
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
    });
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
    // Módulo 2 — validador: en Dulcería Directa no se puede pasar a pago sin productos.
    if (estadoPedido.modoDirecto && Object.keys(estadoPedido.carrito).length === 0) {
        mostrarToast('Selecciona al menos un producto antes de continuar.', 'error');
        return;
    }

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
    const checkPrivacidad = document.getElementById('check-privacidad-pago');
    if (checkPrivacidad) checkPrivacidad.checked = false;

    aplicarModoDirectoUI();
    recalcularTotalesPago();
    autocompletarCheckout(); // FASE 7: rellena datos del socio si hay sesión iniciada
    cambiarVista('vista-dulceria', 'vista-pago');
    reiniciarTemporizadorCompra(); // Módulo 2: se avanzó de etapa
};

/** FASE 8: inserta un badge "Autocompletado desde tu cuenta" bajo un campo, sin duplicarlo si ya existe. */
function marcarCampoAutocompletado(inputEl) {
    if (!inputEl || !inputEl.parentElement) return;
    if (inputEl.parentElement.querySelector('.badge-autocompletado')) return;
    const badge = document.createElement('span');
    badge.className = 'badge-autocompletado';
    badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Autocompletado desde tu cuenta';
    inputEl.parentElement.appendChild(badge);
}

/** FASE 8: si hay un usuarioActual, autocompleta Nombre, Correo, Documento y tarjeta simulada. */
function autocompletarCheckout() {
    if (!usuarioActual) return;

    const campoNombre = document.getElementById('campo-nombre');
    const campoCorreo = document.getElementById('campo-correo');
    const campoDni = document.getElementById('campo-dni');

    if (campoNombre && !campoNombre.value) { campoNombre.value = usuarioActual.nombre; marcarCampoAutocompletado(campoNombre); }
    if (campoCorreo && !campoCorreo.value) { campoCorreo.value = usuarioActual.correo; marcarCampoAutocompletado(campoCorreo); }

    // Simula un DNI estable para el socio (se genera una vez y se guarda en su perfil)
    if (campoDni && !campoDni.value) {
        if (!usuarioActual.dniSimulado) {
            let usuarios = JSON.parse(localStorage.getItem(LS_USUARIOS)) || [];
            const indice = usuarios.findIndex(u => u.correo === usuarioActual.correo);
            const dniGenerado = String(Math.floor(10000000 + Math.random() * 89999999));
            if (indice > -1) {
                usuarios[indice].dniSimulado = dniGenerado;
                usuarioActual = usuarios[indice];
                localStorage.setItem(LS_USUARIOS, JSON.stringify(usuarios));
                localStorage.setItem(LS_USUARIO_ACTUAL, JSON.stringify(usuarioActual));
            } else {
                usuarioActual.dniSimulado = dniGenerado;
            }
        }
        campoDni.value = usuarioActual.dniSimulado;
        marcarCampoAutocompletado(campoDni);
    }

    // Si el socio tiene un método de pago guardado (últimos 4 dígitos), simula la tarjeta completa
    if (usuarioActual.metodoPago) {
        const campoNumTarjeta = document.getElementById('campo-numero-tarjeta');
        const campoVenc = document.getElementById('campo-vencimiento-tarjeta');
        const campoCvv = document.getElementById('campo-cvv-tarjeta');
        const campoTitular = document.getElementById('campo-titular-tarjeta');

        if (campoNumTarjeta && !campoNumTarjeta.value) { campoNumTarjeta.value = `4551 1234 5678 ${usuarioActual.metodoPago}`; marcarCampoAutocompletado(campoNumTarjeta); }
        if (campoVenc && !campoVenc.value) campoVenc.value = '12/29';
        if (campoCvv && !campoCvv.value) campoCvv.value = '123';
        if (campoTitular && !campoTitular.value) { campoTitular.value = usuarioActual.nombre; marcarCampoAutocompletado(campoTitular); }
    }
}

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

    const valido = validarFormulario(reglas);

    // Módulo 2 — Ley N° 29733: checkbox obligatorio de aceptación de Políticas de Privacidad.
    const checkPrivacidad = document.getElementById('check-privacidad-pago');
    if (checkPrivacidad && !checkPrivacidad.checked) {
        mostrarToast('Debes aceptar las Políticas de Privacidad para continuar.', 'error');
        checkPrivacidad.closest('label')?.classList.add('campo-invalido');
        return false;
    }
    checkPrivacidad?.closest('label')?.classList.remove('campo-invalido');

    return valido;
}


/* ============================================================================
   11. TICKET Y COMPROBANTE (PDF) + guardado en historial
   ============================================================================ */

window.procesarPago = () => {
    // FASE 6: doble validación — se repite aquí como "backend" antes de generar el comprobante
    if (!validarFormularioPago()) return;

    // FASE 8: loading state real mientras se "procesa" el pago (evita doble click y da feedback)
    const btnPagar = document.getElementById('btn-confirmar-pago');
    if (btnPagar) { btnPagar.disabled = true; btnPagar.classList.add('opacity-60', 'cursor-not-allowed'); }
    mostrarCargaGlobal(true);

    setTimeout(() => {
        finalizarProcesamientoPago();
        mostrarCargaGlobal(false);
        if (btnPagar) { btnPagar.disabled = false; btnPagar.classList.remove('opacity-60', 'cursor-not-allowed'); }
    }, 900);
};

/** FASE 8: lógica real de generación de ticket/comprobante, separada para poder simular el delay de "procesando...". */
function finalizarProcesamientoPago() {
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
        // FASE 7 (fix): se usa la sala real de la función elegida, ya no un número aleatorio
        document.getElementById('pdf-cine').textContent = `${estadoPedido.cine.replace('Cinerama ', '')} - Sala ${estadoPedido.sala || 1}`;
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

    // FASE 10: registra las butacas como vendidas en su sala real, para que Mantenimiento no pueda tocarlas
    if (!estadoPedido.modoDirecto && estadoPedido.pelicula && estadoPedido.asientos.length > 0) {
        registrarVentaAsientos(estadoPedido.sala || 1, estadoPedido.asientos.map(s => s.id));
    }

    mostrarToast('¡Pago procesado con éxito! Aquí está tu ticket.', 'exito');
    detenerTemporizadorCompra(); // Módulo 2: la compra se completó, ya no aplica
    cambiarVista('vista-pago', 'vista-ticket');
};

window.descargarPDF = (idElemento, nombreArchivo) => {
    const elemento = document.getElementById(idElemento);
    
    // 1. Calculamos solo la altura real (el ancho ya es fijo de 350px en tu HTML)
    const alturaPx = elemento.scrollHeight;
    
    // 2. Ancho fijo de ticketera (95mm) y altura "infinita" + 2mm de gracia
    const anchoMm = 95;
    const alturaMm = (alturaPx * 0.264583) + 2; 

    const opciones = {
        margin: 0, 
        filename: nombreArchivo,
        image: { type: 'png', quality: 1 }, 
        html2canvas: {
            scale: 3, // Subimos un poco la nitidez, 3 es el balance perfecto
            useCORS: true,
            scrollX: 0,
            scrollY: 0
            // Eliminamos windowWidth y windowHeight para no desfasar el centrado de Tailwind
        },
        pagebreak: { mode: 'avoid-all' },
        jsPDF: { unit: 'mm', format: [anchoMm, alturaMm], orientation: 'portrait' }
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

    // Módulo 2 — Ley N° 29733: checkbox obligatorio de aceptación de Políticas de Privacidad.
    const checkPrivacidad = document.getElementById('check-privacidad-registro');
    if (checkPrivacidad && !checkPrivacidad.checked) {
        mostrarToast('Debes aceptar las Políticas de Privacidad para registrarte.', 'error');
        return;
    }

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

    // FASE 7: versiones móviles del navbar (drawer)
    const menuInvitadoMovil = document.getElementById('menu-invitado-movil');
    const menuUsuarioMovil = document.getElementById('menu-usuario-movil');
    const linkAdminMovil = document.getElementById('link-nav-admin-movil');

    if (usuarioActual) {
        menuInvitado.classList.add('hidden');
        menuInvitado.classList.remove('flex');
        menuUsuario.classList.remove('hidden');
        menuUsuario.classList.add('flex');
        if (linkAdmin) linkAdmin.classList.toggle('hidden', usuarioActual.rol !== 'admin');

        if (menuInvitadoMovil) menuInvitadoMovil.classList.add('hidden');
        if (menuUsuarioMovil) { menuUsuarioMovil.classList.remove('hidden'); menuUsuarioMovil.classList.add('flex'); }
        if (linkAdminMovil) linkAdminMovil.classList.toggle('hidden', usuarioActual.rol !== 'admin');
    } else {
        menuInvitado.classList.remove('hidden');
        menuInvitado.classList.add('flex');
        menuUsuario.classList.add('hidden');
        menuUsuario.classList.remove('flex');
        if (linkAdmin) linkAdmin.classList.add('hidden');

        if (menuInvitadoMovil) menuInvitadoMovil.classList.remove('hidden');
        if (menuUsuarioMovil) { menuUsuarioMovil.classList.add('hidden'); menuUsuarioMovil.classList.remove('flex'); }
        if (linkAdminMovil) linkAdminMovil.classList.add('hidden');
    }

    if (typeof actualizarVisibilidadFooter === 'function') actualizarVisibilidadFooter(); // Módulo 1
};

/** FASE 7: abre/cierra el menú hamburguesa (drawer) en dispositivos móviles. */
window.toggleMenuMovil = (forzarEstado = null) => {
    const overlay = document.getElementById('overlay-menu-movil');
    const drawer = document.getElementById('drawer-menu-movil');
    if (!overlay || !drawer) return;

    menuMovilAbierto = forzarEstado !== null ? forzarEstado : !menuMovilAbierto;

    if (menuMovilAbierto) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        drawer.classList.remove('translate-x-full');
        setTimeout(() => drawer.classList.add('menu-movil-visible'), 10); // FASE 8: dispara stagger de los links
        document.body.style.overflow = 'hidden';
    } else {
        overlay.classList.add('opacity-0');
        drawer.classList.add('translate-x-full');
        drawer.classList.remove('menu-movil-visible');
        document.body.style.overflow = '';
        setTimeout(() => overlay.classList.add('hidden'), 300);
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

    if (!usuarioActual) {
        mostrarToast('Inicia sesión para ver tu historial de compras.', 'error');
        abrirModalLogin();
        return;
    }

    const compras = usuarioActual.compras || [];

    if (compras.length === 0) {
        // FASE 16: estado vacío consistente, con acción directa a la cartelera
        grid.innerHTML = htmlEstadoVacio({
            icono: 'fa-ticket',
            titulo: 'Aún no tienes compras registradas',
            subtitulo: '¡Anímate a ver una película! Cuando compres una entrada o un pedido de dulcería, aparecerá aquí.',
            textoBoton: 'Ver Cartelera',
            accionBoton: "cambiarVista('vista-historial', 'vista-inicio')"
        });
    } else {
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

// Módulo 1: recordamos desde qué vista se entró a Contacto para que el botón "Volver" regrese ahí.
let vistaAnteriorAContacto = 'vista-inicio';

/** Navega a la vista completa de Contacto (Módulo 1: antes era un modal). */
window.irAVistaContacto = () => {
    vistaAnteriorAContacto = vistaActualVisible;
    cambiarVista(vistaActualVisible, 'vista-contacto');
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
    cambiarVista('vista-contacto', vistaAnteriorAContacto || 'vista-inicio');
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

    const coordenadas = [-9.10216, -78.55728]; // Megaplaza Chimbote
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
   17. FASE 7 — VISTA DE PROMOCIONES Y MODAL LEGAL GENÉRICO
   ============================================================================ */

/** Navega a #vista-promociones renderizando primero las tarjetas actualizadas. */
window.abrirVistaPromociones = () => {
    renderizarPromociones();
    cambiarVista(vistaActualVisible, 'vista-promociones');
};

/** Arma la cuadrícula de promociones combinando tarjetas fijas + cupones activos del admin. */
function renderizarPromociones() {
    const grid = document.getElementById('grid-promociones');
    if (!grid) return;

    let html = `
        <div class="bg-dark-800 border border-white/5 rounded-2xl overflow-hidden shadow-xl hover:border-brand-yellow/50 transition-colors flex flex-col">
            <div class="h-40 bg-gradient-to-br from-brand-yellow to-yellow-600 flex items-center justify-center">
                <i class="fa-solid fa-heart text-6xl text-black/80"></i>
            </div>
            <div class="p-6 flex flex-col flex-grow">
                <span class="inline-block w-max px-3 py-1 bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/30 text-xs font-bold rounded-full uppercase mb-3">Combo</span>
                <h3 class="text-xl font-bold text-white mb-2">Combo Pareja</h3>
                <p class="text-gray-400 text-sm flex-grow">2 entradas + 1 Cancha Gigante para compartir + 2 Bebidas Grandes, a precio especial. Pídelo en Dulcería.</p>
                <button onclick="abrirDulceriaDirecta()" class="mt-4 w-full bg-brand-yellow hover:bg-yellow-400 text-black py-2.5 rounded-xl font-bold text-sm transition-colors">Ir a Dulcería</button>
            </div>
        </div>
        <div class="bg-dark-800 border border-white/5 rounded-2xl overflow-hidden shadow-xl hover:border-green-500/50 transition-colors flex flex-col">
            <div class="h-40 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                <i class="fa-solid fa-crown text-6xl text-white/90"></i>
            </div>
            <div class="p-6 flex flex-col flex-grow">
                <span class="inline-block w-max px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 text-xs font-bold rounded-full uppercase mb-3">Exclusivo</span>
                <h3 class="text-xl font-bold text-white mb-2">Beneficio Exclusivo Socio Cinerama</h3>
                <p class="text-gray-400 text-sm flex-grow">Los socios acumulan puntos en cada compra y acceden a preventas exclusivas y una entrada gratis por cumpleaños.</p>
                <button onclick="cambiarVista(vistaActualVisible, 'vista-beneficios')" class="mt-4 w-full bg-transparent border border-green-500/40 text-green-400 hover:bg-green-500/10 py-2.5 rounded-xl font-bold text-sm transition-colors">Ver Beneficios</button>
            </div>
        </div>
    `;

    // Cupones creados por el administrador (Panel Admin > Descuentos)
    const cuponesGuardados = JSON.parse(localStorage.getItem(LS_CUPONES)) || {};
    const todosCupones = { ...CUPONES_BASE, ...cuponesGuardados };
    Object.entries(todosCupones).forEach(([codigo, c]) => {
        html += `
        <div class="bg-dark-800 border border-white/5 rounded-2xl overflow-hidden shadow-xl hover:border-brand-red/50 transition-colors flex flex-col">
            <div class="h-40 bg-gradient-to-br from-dark-700 to-dark-900 flex items-center justify-center border-b border-white/5">
                <i class="fa-solid fa-tag text-6xl text-brand-red/80"></i>
            </div>
            <div class="p-6 flex flex-col flex-grow">
                <span class="inline-block w-max px-3 py-1 bg-brand-red/10 text-brand-red border border-brand-red/30 text-xs font-bold rounded-full uppercase mb-3">Cupón</span>
                <h3 class="text-xl font-bold text-white mb-1 font-mono">${codigo}</h3>
                <p class="text-gray-400 text-sm flex-grow">${c.descripcion || 'Cupón promocional'} — <span class="text-brand-yellow font-bold">-${c.porcentaje}%</span> en tu compra.</p>
            </div>
        </div>`;
    });

    grid.innerHTML = html;
}

// --- Modal Legal genérico (enlaces del footer) ---
const CONTENIDO_LEGAL = {
    'terminos': {
        icono: 'fa-file-contract', titulo: 'Términos y Condiciones',
        texto: [
            'El uso de la plataforma Cinerama implica la aceptación de estos términos. Las entradas y productos de dulcería adquiridos son para uso personal y no reembolsable, salvo cancelación de función por parte del cine.',
            'Cinerama se reserva el derecho de modificar la cartelera, horarios y precios sin previo aviso. Los cupones de descuento aplican únicamente durante su periodo de vigencia y no son acumulables entre sí.'
        ]
    },
    'privacidad': {
        icono: 'fa-user-shield', titulo: 'Políticas de Privacidad',
        texto: [
            'Tus datos (nombre, correo, historial de compras) se almacenan localmente en tu navegador y se utilizan únicamente para mejorar tu experiencia dentro de esta demostración.',
            'No compartimos tu información con terceros. Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento desde tu perfil.'
        ]
    },
    'reclamaciones': {
        icono: 'fa-book', titulo: 'Libro de Reclamaciones',
        texto: [
            'Conforme a la normativa de protección al consumidor, cuentas con este espacio virtual para registrar tu queja o reclamo sobre nuestros productos y servicios.',
            'Para presentar un reclamo formal, escríbenos a través del formulario de Contáctenos indicando tus datos, el detalle de tu compra y el motivo de tu reclamo. Te responderemos dentro de los plazos establecidos por ley.'
        ]
    },
    'quienes-somos': {
        icono: 'fa-film', titulo: '¿Quiénes somos?',
        texto: [
            'Cinerama es la cadena de cines líder en Chimbote, comprometida con ofrecer la mejor experiencia audiovisual, tecnología de punta en salas y la dulcería más completa de la región.',
            'Desde nuestros inicios buscamos acercar el mejor cine nacional e internacional a toda la familia.'
        ]
    },
    'trabaja-con-nosotros': {
        icono: 'fa-briefcase', titulo: 'Trabaja con Nosotros',
        texto: [
            '¿Te apasiona el cine y la atención al cliente? Estamos siempre en búsqueda de talento para nuestro equipo de boletería, dulcería y operaciones.',
            'Envíanos tu currículum a través del formulario de Contáctenos indicando el puesto de tu interés y nos pondremos en contacto contigo.'
        ]
    }
};

// --- FASE 9: Modal de Tráiler (reutilizable desde Detalle y Horarios) ---
window.abrirModalTrailer = (peliculaId, tipo = 'cartelera') => {
    const pelicula = tipo === 'estreno' ? baseDatosEstrenos[peliculaId] : baseDatosPeliculas[peliculaId];
    if (!pelicula) return;
    
    document.getElementById('trailer-titulo').textContent = `Tráiler - ${pelicula.titulo}`;

    // Convertimos el enlace normal a formato "embed" automáticamente
    let urlBase = pelicula.trailer || '';
    if (urlBase.includes('watch?v=')) {
        urlBase = urlBase.replace('watch?v=', 'embed/');
    } else if (urlBase.includes('youtu.be/')) {
        urlBase = urlBase.replace('youtu.be/', 'www.youtube.com/embed/');
    }
    
    // Le inyectamos el enlace de YouTube al reproductor (iframe)
    const iframe = document.getElementById('trailer-iframe');
    // Le agregamos autoplay para que inicie solito al abrir
    const urlVideo = urlBase.includes('?') ? `${urlBase}&autoplay=1` : `${urlBase}?autoplay=1`;
    iframe.src = urlBase ? urlVideo : '';

    const modal = document.getElementById('modal-trailer');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('trailer-contenido').classList.remove('scale-95'); }, 10);
}

window.cerrarModalTrailer = () => {
    const modal = document.getElementById('modal-trailer');
    modal.classList.add('opacity-0');
    document.getElementById('trailer-contenido').classList.add('scale-95');
    
    setTimeout(() => { 
        modal.classList.add('hidden');
        // NUEVO MUY IMPORTANTE: Borramos el enlace al cerrar para que el video se apague y no suene de fondo
        document.getElementById('trailer-iframe').src = '';
    }, 200);
}

window.abrirModalLegal = (clave) => {
    const info = CONTENIDO_LEGAL[clave];
    if (!info) return;

    document.getElementById('legal-titulo').textContent = info.titulo;
    document.getElementById('legal-icono').innerHTML = `<i class="fa-solid ${info.icono} text-2xl text-brand-red"></i>`;
    document.getElementById('legal-texto').innerHTML = info.texto.map(p => `<p>${p}</p>`).join('');

    const modal = document.getElementById('modal-legal');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('legal-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalLegal = () => {
    const modal = document.getElementById('modal-legal');
    modal.classList.add('opacity-0');
    document.getElementById('legal-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
};
