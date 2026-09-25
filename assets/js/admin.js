/* ============================================================================
   CINE NÁUTICA — ADMIN.JS — Panel de administrador completo
   ------------------------------------------------------------------------
   Parte de la arquitectura modular de la app (Fase 14).
   Cargado como <script> clásico (no ES module) para funcionar también
   abriendo index.html directamente con file://, sin necesidad de servidor.
   CRUD de cartelera y horarios (con validación de choques de sala),
   CRUD de dulcería, mantenimiento de salas, descuentos y dashboard.
   ============================================================================ */

/* ============================================================================
   15. FASE 5 — PANEL DE ADMINISTRADOR
   ============================================================================ */

/** Crea la cuenta admin de demostración si aún no existe (solo la primera vez). */
function asegurarAdminDemo() {
    let usuarios = JSON.parse(localStorage.getItem(LS_USUARIOS)) || [];
    if (!usuarios.find(u => u.correo === 'admin@cinerama.com')) {
        usuarios.push({ nombre: 'Administrador Náutica', correo: 'admin@cinerama.com', contrasena: 'admin123', rol: 'admin', activo: true, compras: [], metodoPago: null });
        localStorage.setItem(LS_USUARIOS, JSON.stringify(usuarios));
    }
}

window.abrirPanelAdministrador = () => {
    if (!usuarioActual || usuarioActual.rol !== 'admin') {
        mostrarToast('Acceso restringido: solo para administradores.', 'error');
        return;
    }
    cambiarVista(vistaActualVisible, 'vista-administrador');
    tabAdminActivo = null; // Módulo 6: fuerza a que la primera entrada no dispare el aviso de "salir de dulcería"
    cambiarTabAdmin('cartelera');
    renderizarSelectorChipsMultiple('admin-pelicula-genero-chips', 'admin-pelicula-genero', GENEROS_DISPONIBLES, ''); // Módulo 3
};

// Módulo 6: recuerda la pestaña activa para poder avisar antes de salir de Dulcería si quedaron productos "Sin categoría".
let tabAdminActivo = null;

/** Controla qué pestaña del sidebar del admin está visible. */
window.cambiarTabAdmin = async (tab) => {
    // Módulo 6: si se sale de Dulcería y quedaron productos "Sin categoría" (por una categoría eliminada), se avisa antes de salir.
    if (tabAdminActivo === 'dulceria' && tab !== 'dulceria') {
        const sinCategoria = contarProductosPorCategoria(CATEGORIA_SIN_ASIGNAR);
        if (sinCategoria > 0) {
            const irAAsignarAhora = await confirmarAccion({
                titulo: 'Tienes productos sin categoría',
                mensaje: `${sinCategoria} producto${sinCategoria === 1 ? '' : 's'} quedó${sinCategoria === 1 ? '' : 'aron'} "Sin categoría" tras eliminar una categoría. Puedes asignarles una categoría ahora, o dejarlos así (seguirán visibles para tus clientes bajo ese filtro).`,
                tipo: 'advertencia',
                textoConfirmar: 'Asignar ahora',
                textoCancelar: 'Dejar así y salir'
            });
            if (irAAsignarAhora) {
                filtrarAdminDulceria(CATEGORIA_SIN_ASIGNAR); // se queda en Dulcería, ya filtrado por "Sin categoría"
                return; // cancela el cambio de pestaña
            }
        }
    }
    tabAdminActivo = tab;

    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('activo'));
    const btnActivo = document.getElementById(`tab-btn-${tab}`);
    if (btnActivo) btnActivo.classList.add('activo');

    document.querySelectorAll('.admin-tab-panel').forEach(panel => panel.classList.add('hidden'));
    const panelActivo = document.getElementById(`tab-panel-${tab}`);
    if (panelActivo) panelActivo.classList.remove('hidden');

    // FASE 8: breadcrumb dinámico con el nombre de la sección activa
    const nombresSeccion = { cartelera: 'Cartelera', horarios: 'Horarios', dulceria: 'Dulcería', salas: 'Salas (Mantenimiento)', tarifas: 'Tarifas', descuentos: 'Descuentos', socios: 'Socios', personal: 'Personal', dashboard: 'Dashboard' };
    const breadcrumb = document.getElementById('admin-breadcrumb-actual');
    if (breadcrumb) breadcrumb.textContent = nombresSeccion[tab] || tab;

    if (tab === 'cartelera') { renderizarAdminCartelera(); renderizarAdminBanner(); pintarCheckboxesFormatosAdmin('admin-pelicula-formatos', []); }
    if (tab === 'horarios') renderizarAdminHorarios(); // MÓDULO 9
    if (tab === 'dulceria') { renderizarAdminDulceria(); renderizarListaCategoriasDulceria(); }
    if (tab === 'salas') renderizarAdminSalas();
    if (tab === 'tarifas') renderizarAdminTarifas(); // MÓDULO 9 (antes "calendario")
    if (tab === 'descuentos') renderizarAdminDescuentos();
    if (tab === 'socios') reiniciarPanelSociosAdmin();
    if (tab === 'personal') renderizarAdminPersonal(); // MÓDULO 8
    if (tab === 'dashboard') renderizarAdminDashboard();
};


// --- FASE 7: PERSISTENCIA DEL CATÁLOGO (localStorage) ---


/** Traduce el prefijo lógico ('pelicula'/'dulce'/'edit-pelicula'/'edit-dulce') al prefijo real usado en los IDs/names del HTML. */
function prefijoCampoImagenAdmin(prefijo) {
    if (prefijo === 'pelicula') return 'admin-pelicula';
    if (prefijo === 'dulce') return 'admin-dulce';
    return prefijo; // 'edit-pelicula' y 'edit-dulce' ya coinciden tal cual
}

/** FASE 11: determina si un prefijo lógico corresponde a un producto de dulcería (campo "imagen") o a una película (campo "poster"). */
function sufijoCampoImagenAdmin(prefijo) {
    return prefijo.includes('dulce') ? 'imagen' : 'poster';
}

/**
 * Lee el origen de imagen elegido (URL o Archivo) para un formulario del admin
 * y devuelve la cadena final (URL tal cual, o Base64 si se cargó un archivo).
 * @param {string} prefijo 'pelicula' | 'edit-pelicula' | 'dulce' | 'edit-dulce'
 */
async function obtenerImagenDesdeFormulario(prefijo) {
    const prefijoReal = prefijoCampoImagenAdmin(prefijo);
    const sufijo = sufijoCampoImagenAdmin(prefijo);
    const origenSeleccionado = document.querySelector(`input[name="${prefijoReal}-origen-img"]:checked`);
    const esArchivo = origenSeleccionado && origenSeleccionado.value === 'archivo';

    if (esArchivo) {
        const inputArchivo = document.getElementById(`${prefijoReal}-${sufijo}-archivo`);
        const archivo = inputArchivo && inputArchivo.files && inputArchivo.files[0];
        if (archivo) return await convertirArchivoABase64(archivo);
        return '';
    }
    const inputUrl = document.getElementById(`${prefijoReal}-${sufijo}-url`);
    return inputUrl ? inputUrl.value.trim() : '';
}

/** FASE 8: actualiza el <img> de vista previa cuando el admin escribe una URL. */
window.actualizarPreviewImagenAdmin = (idPreview, url) => {
    const preview = document.getElementById(idPreview);
    if (!preview) return;
    if (url && url.trim()) {
        preview.src = url.trim();
        preview.classList.remove('hidden');
    } else {
        preview.classList.add('hidden');
    }
};

/** FASE 8: actualiza el <img> de vista previa al elegir un archivo local (antes de convertirlo a Base64 al guardar). */
window.actualizarPreviewImagenArchivo = (idInputFile, idPreview) => {
    const inputFile = document.getElementById(idInputFile);
    const preview = document.getElementById(idPreview);
    if (!inputFile || !preview || !inputFile.files || !inputFile.files[0]) return;
    const lector = new FileReader();
    lector.onload = () => {
        preview.src = lector.result;
        preview.classList.remove('hidden');
    };
    lector.readAsDataURL(inputFile.files[0]);
};

/** Alterna entre los campos "URL" y "Archivo" en los formularios de imagen del admin. */
window.alternarOrigenImagenAdmin = (prefijo) => {
    const prefijoReal = prefijoCampoImagenAdmin(prefijo);
    const sufijo = sufijoCampoImagenAdmin(prefijo);
    const seleccionado = document.querySelector(`input[name="${prefijoReal}-origen-img"]:checked`);
    const esArchivo = seleccionado && seleccionado.value === 'archivo';
    const campoUrl = document.getElementById(`${prefijoReal}-${sufijo}-url`);
    const campoArchivo = document.getElementById(`${prefijoReal}-${sufijo}-archivo`);
    if (campoUrl) campoUrl.classList.toggle('hidden', esArchivo);
    if (campoArchivo) campoArchivo.classList.toggle('hidden', !esArchivo);
};

/* ============================================================================
   NUEVO — CAMPO SEPARADO DE BANNER (además del póster) EN CARTELERA
   ------------------------------------------------------------------------
   pelicula.poster (vertical) y pelicula.banner (horizontal promocional) ya
   existían como campos separados en los datos, pero el formulario del admin
   solo pedía UNA imagen y la duplicaba en ambos. Estas funciones son el
   equivalente exacto de obtenerImagenDesdeFormulario/alternarOrigenImagenAdmin
   pero para el banner, con su propio grupo de radios y sus propios campos
   (…-banner-url / …-banner-archivo / …-banner-preview), sin tocar los del
   póster. El banner es OPCIONAL: si se deja vacío, se sigue usando el póster
   como banner (mismo comportamiento de antes), para no exigir un paso extra.
   ============================================================================ */

/** Igual que obtenerImagenDesdeFormulario(), pero para el campo de banner. */
async function obtenerImagenBannerDesdeFormulario(prefijo) {
    const prefijoReal = prefijoCampoImagenAdmin(prefijo);
    const origenSeleccionado = document.querySelector(`input[name="${prefijoReal}-banner-origen-img"]:checked`);
    const esArchivo = origenSeleccionado && origenSeleccionado.value === 'archivo';

    if (esArchivo) {
        const inputArchivo = document.getElementById(`${prefijoReal}-banner-archivo`);
        const archivo = inputArchivo && inputArchivo.files && inputArchivo.files[0];
        if (archivo) return await convertirArchivoABase64(archivo);
        return '';
    }
    const inputUrl = document.getElementById(`${prefijoReal}-banner-url`);
    return inputUrl ? inputUrl.value.trim() : '';
}

/** Igual que alternarOrigenImagenAdmin(), pero para el campo de banner. */
window.alternarOrigenImagenBannerAdmin = (prefijo) => {
    const prefijoReal = prefijoCampoImagenAdmin(prefijo);
    const seleccionado = document.querySelector(`input[name="${prefijoReal}-banner-origen-img"]:checked`);
    const esArchivo = seleccionado && seleccionado.value === 'archivo';
    const campoUrl = document.getElementById(`${prefijoReal}-banner-url`);
    const campoArchivo = document.getElementById(`${prefijoReal}-banner-archivo`);
    if (campoUrl) campoUrl.classList.toggle('hidden', esArchivo);
    if (campoArchivo) campoArchivo.classList.toggle('hidden', !esArchivo);
};







/* MÓDULO 9: la duración se ingresa en dos campos numéricos (horas y minutos) en vez de un
   texto libre "2h 25m". Internamente se sigue guardando como ese mismo string (duracionAMinutos,
   el motor de choques de horarios y el resto del código ya lo esperan así), solo cambia la UI. */
function combinarDuracionHM(idHoras, idMinutos, idOculto) {
    const horas = Math.max(0, Math.min(9, parseInt(document.getElementById(idHoras).value, 10) || 0));
    const minutos = Math.max(0, Math.min(59, parseInt(document.getElementById(idMinutos).value, 10) || 0));
    const texto = `${horas}h ${minutos}m`;
    document.getElementById(idOculto).value = texto;
    return texto;
}

function separarDuracionHM(duracionStr, idHoras, idMinutos) {
    const totalMinutos = duracionAMinutos(duracionStr);
    document.getElementById(idHoras).value = Math.floor(totalMinutos / 60) || '';
    document.getElementById(idMinutos).value = totalMinutos % 60 || '';
}

/** Rellena un <select> con las opciones "Sala 1" .. "Sala N". */
function poblarSelectSalas(selectEl, seleccionActual = 1) {
    if (!selectEl) return;
    let html = '';
    for (let i = 1; i <= NUMERO_TOTAL_SALAS; i++) {
        html += `<option value="${i}" ${Number(seleccionActual) === i ? 'selected' : ''}>Sala ${i}</option>`;
    }
    selectEl.innerHTML = html;
}

// --- FASE 12: Gestión avanzada de horarios (fechas, formatos, horas y salas sin choques) ---


/**
 * Devuelve el conjunto de salas (números) ocupadas en una fecha+hora, considerando
 * el MARGEN DE LIMPIEZA (Módulo 3): una sala está ocupada si el bloque
 * [hora, hora + duración + 30min] de la función que se quiere agregar se
 * superpone con el mismo bloque de CUALQUIER función ya programada ese día
 * en esa sala (sin importar si las horas exactas coinciden).
 * @param {number} duracionMinutos - duración de la película que se está programando.
 * @param {string} excluirPeliculaId - si se indica, esa película no cuenta como "ocupante" (para no chocar consigo misma al editar).
 */
function obtenerSalasOcupadas(fecha, hora, duracionMinutos, excluirPeliculaId = null) {
    const ocupadas = new Set();
    if (!fecha || !hora) return ocupadas;
    const inicioNueva = horaAMinutos(hora);
    if (inicioNueva === null) return ocupadas;
    const finNueva = inicioNueva + (duracionMinutos || 0) + MARGEN_LIMPIEZA_MINUTOS;

    Object.values(baseDatosPeliculas).forEach(p => {
        if (excluirPeliculaId && p.id === excluirPeliculaId) return;
        const funciones = (p.horarios && p.horarios[fecha]) || [];
        const duracionExistente = duracionAMinutos(p.duracion);
        funciones.forEach(funcion => {
            (funcion.horas || []).forEach(horaRaw => {
                const { hora: h, sala } = normalizarFuncionHorario(horaRaw);
                const inicioExistente = horaAMinutos(h);
                if (inicioExistente === null) return;
                const finExistente = inicioExistente + duracionExistente + MARGEN_LIMPIEZA_MINUTOS;
                // Hay choque si los bloques [inicio, fin] se superponen en cualquier sentido.
                const hayChoque = inicioNueva < finExistente && inicioExistente < finNueva;
                if (hayChoque) ocupadas.add(sala);
            });
        });
    });
    return ocupadas;
}

/** Rellena un <select> de salas marcando como deshabilitadas las que ya están ocupadas en esa fecha+hora. */
function poblarSelectSalasDisponibles(selectEl, ocupadas, salaPreseleccionada = 1) {
    if (!selectEl) return;
    let html = '';
    for (let i = 1; i <= NUMERO_TOTAL_SALAS; i++) {
        const bloqueada = ocupadas.has(i);
        html += `<option value="${i}" ${bloqueada ? 'disabled' : ''} ${Number(salaPreseleccionada) === i && !bloqueada ? 'selected' : ''}>Sala ${i}${bloqueada ? ' (ocupada)' : ''}</option>`;
    }
    selectEl.innerHTML = html;
}

window.actualizarTipoPeliculaAdmin = () => {
    const esEstreno = document.getElementById('admin-pelicula-es-estreno').checked;
    const mensaje = document.getElementById('admin-pelicula-tipo-mensaje');
    if (mensaje) mensaje.textContent = esEstreno
        ? 'PRÓXIMO ESTRENO: se publica sin funciones hasta que pase a cartelera.'
        : 'EN CARTELERA: podrás programarle funciones desde el tab "Horarios" apenas la guardes.';

    // Módulo 3: el tipo de lanzamiento (Regular/Estreno/Pre-Estreno) solo aplica a películas en Cartelera.
    const contenedorLanzamiento = document.getElementById('admin-pelicula-lanzamiento-contenedor');
    if (contenedorLanzamiento) contenedorLanzamiento.classList.toggle('hidden', esEstreno);
};

/** Espejo de actualizarTipoPeliculaAdmin() pero para el modal de edición (Módulo 3). */
window.actualizarLanzamientoVisibleEdicion = () => {
    const esEstreno = document.getElementById('edit-pelicula-es-estreno').checked;
    const contenedorLanzamiento = document.getElementById('edit-pelicula-lanzamiento-contenedor');
    if (contenedorLanzamiento) contenedorLanzamiento.classList.toggle('hidden', esEstreno);
};

/* ============================================================================
   MÓDULO 9 — Checkboxes de "formatos disponibles" (formulario de película)
   Reutilizado tanto en "Agregar Película" como en "Editar Película".
   ============================================================================ */
function pintarCheckboxesFormatosAdmin(contenedorId, formatosMarcados = []) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    const catalogo = obtenerCatalogoFormatos();
    contenedor.innerHTML = catalogo.map(f => `
        <label class="flex items-center gap-1.5 bg-dark-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 cursor-pointer hover:border-brand-red/50 transition-colors">
            <input type="checkbox" value="${f.id}" class="accent-brand-red" ${formatosMarcados.includes(f.id) ? 'checked' : ''}> ${f.nombre}
        </label>
    `).join('');
}

function leerFormatosElegidosAdmin(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return [];
    return Array.from(contenedor.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
}

/* ============================================================================
   MÓDULO 9 — TAB "HORARIOS": calendario + programación de funciones
   ------------------------------------------------------------------------
   Antes las funciones de una película se creaban dentro del formulario de
   Cartelera; ahora Cartelera solo guarda datos de la película y este tab es
   el único que crea/edita/mueve funciones. El dato sigue viviendo donde
   siempre (pelicula.horarios[etiquetaAmigable] = [{formato, formatoId,
   idioma, horas:[{hora,sala}]}]), solo cambió quién lo edita.
   ============================================================================ */
let horariosMesVisible = new Date();
let horariosDiaSeleccionadoISO = null;
let funcionesDelDiaActual = [];
let funcionAdminEnEdicion = null; // referencia completa a la función que se está editando, o null si es nueva
let idiomaFuncionSeleccionado = 'Doblada';

function obtenerFechaISOHoy() {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

/** Junta, para cada fecha ISO, todas las funciones programadas en cualquier película (calendario + agenda). */
function obtenerFuncionesAgrupadasPorFechaISO() {
    const mapa = {};
    Object.values(baseDatosPeliculas).forEach(pelicula => {
        Object.keys(pelicula.horarios || {}).forEach(etiqueta => {
            const fechaISO = resolverFechaISODeEtiqueta(etiqueta);
            if (!fechaISO) return;
            (pelicula.horarios[etiqueta] || []).forEach((grupo, indiceGrupo) => {
                (grupo.horas || []).forEach((horaRaw, indiceHora) => {
                    const { hora, sala } = normalizarFuncionHorario(horaRaw);
                    if (!mapa[fechaISO]) mapa[fechaISO] = [];
                    mapa[fechaISO].push({
                        peliculaId: pelicula.id, peliculaTitulo: pelicula.titulo, poster: pelicula.poster,
                        duracionMinutos: duracionAMinutos(pelicula.duracion),
                        etiquetaFecha: etiqueta, fechaISO,
                        formato: grupo.formato, formatoId: grupo.formatoId || resolverFormatoIdDesdeTexto(grupo.formato),
                        idioma: grupo.idioma || (grupo.formato && grupo.formato.includes('Subtitulada') ? 'Subtitulada' : 'Doblada'),
                        hora, sala: Number(sala), indiceGrupo, indiceHora
                    });
                });
            });
        });
    });
    Object.keys(mapa).forEach(fecha => mapa[fecha].sort((a, b) => a.hora.localeCompare(b.hora)));
    return mapa;
}

/** Convierte texto legado de formato ("SALA XD", "D-BOX", "2D Subtitulada"...) al id del catálogo más parecido. Fallback: '2d'. */
function resolverFormatoIdDesdeTexto(formatoTexto) {
    const texto = String(formatoTexto || '').toUpperCase();
    const coincidencia = obtenerCatalogoFormatos().find(f => texto.includes(f.nombre.toUpperCase()));
    return coincidencia ? coincidencia.id : '2d';
}

function renderizarAdminHorarios() {
    if (!horariosDiaSeleccionadoISO) horariosDiaSeleccionadoISO = obtenerFechaISOHoy();
    horariosMesVisible = new Date(horariosDiaSeleccionadoISO + 'T00:00:00');
    seleccionarDiaHorarios(horariosDiaSeleccionadoISO);
}

/* ---------- Datepicker flotante ---------- */
let datepickerAbierto = false;

window.toggleDatepickerHorarios = () => {
    datepickerAbierto = !datepickerAbierto;
    const dropdown = document.getElementById('datepicker-dropdown');
    if (datepickerAbierto) {
        renderizarDatepicker();
        dropdown.classList.add('visible');
        // Cerrar al hacer click fuera
        setTimeout(() => document.addEventListener('click', cerrarDatepickerFuera), 0);
    } else {
        dropdown.classList.remove('visible');
        document.removeEventListener('click', cerrarDatepickerFuera);
    }
};

function cerrarDatepickerFuera(e) {
    const contenedor = document.getElementById('datepicker-horarios');
    if (!contenedor.contains(e.target)) {
        datepickerAbierto = false;
        document.getElementById('datepicker-dropdown').classList.remove('visible');
        document.removeEventListener('click', cerrarDatepickerFuera);
    }
}

window.datepickerCambiarMes = (delta) => {
    horariosMesVisible.setMonth(horariosMesVisible.getMonth() + delta);
    renderizarDatepicker();
};

function renderizarDatepicker() {
    const funcionesPorFecha = obtenerFuncionesAgrupadasPorFechaISO();
    const anio = horariosMesVisible.getFullYear();
    const mes = horariosMesVisible.getMonth();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    document.getElementById('dp-mes-titulo').textContent = `${meses[mes]} ${anio}`;

    const primerDiaSemana = new Date(anio, mes, 1).getDay();
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const hoyISO = obtenerFechaISOHoy();

    let html = '';
    // Días del mes anterior (relleno)
    const diasMesAnterior = new Date(anio, mes, 0).getDate();
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
        html += `<button type="button" class="dp-dia dp-otro-mes" disabled>${diasMesAnterior - i}</button>`;
    }
    // Días del mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaISO = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const tieneFunciones = (funcionesPorFecha[fechaISO] || []).length > 0;
        const esSeleccionado = fechaISO === horariosDiaSeleccionadoISO;
        const esHoy = fechaISO === hoyISO;
        let clase = 'dp-dia';
        if (esSeleccionado) clase += ' dp-seleccionado';
        else if (tieneFunciones) clase += ' dp-tiene-funciones';
        if (esHoy && !esSeleccionado) clase += ' dp-hoy';
        html += `<button type="button" class="${clase}" onclick="seleccionarDiaDesdeDP('${fechaISO}')">${dia}</button>`;
    }
    // Días del mes siguiente (relleno)
    const totalCeldas = primerDiaSemana + diasEnMes;
    const restantes = totalCeldas % 7 === 0 ? 0 : 7 - (totalCeldas % 7);
    for (let i = 1; i <= restantes; i++) {
        html += `<button type="button" class="dp-dia dp-otro-mes" disabled>${i}</button>`;
    }
    document.getElementById('dp-grid').innerHTML = html;
}

window.seleccionarDiaDesdeDP = (fechaISO) => {
    seleccionarDiaHorarios(fechaISO);
    datepickerAbierto = false;
    document.getElementById('datepicker-dropdown').classList.remove('visible');
    document.removeEventListener('click', cerrarDatepickerFuera);
};

/* ---------- Compatibilidad: mantener cambiarMesHorariosAdmin ---------- */
window.cambiarMesHorariosAdmin = (delta) => {
    datepickerCambiarMes(delta);
};

/* ---------- Selección de día y renderizado del grid ---------- */
window.seleccionarDiaHorarios = (fechaISO) => {
    horariosDiaSeleccionadoISO = fechaISO;
    horariosMesVisible = new Date(fechaISO + 'T00:00:00');
    funcionesDelDiaActual = obtenerFuncionesAgrupadasPorFechaISO()[fechaISO] || [];

    // Actualizar label del datepicker
    const fechaObj = new Date(fechaISO + 'T00:00:00');
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    document.getElementById('datepicker-label').textContent =
        `${diasSemana[fechaObj.getDay()]}, ${fechaObj.getDate()} ${mesesCortos[fechaObj.getMonth()]} ${fechaObj.getFullYear()}`;

    // Contador
    const contadorEl = document.getElementById('grid-funciones-contador');
    if (contadorEl) contadorEl.textContent = funcionesDelDiaActual.length > 0
        ? `${funcionesDelDiaActual.length} función${funcionesDelDiaActual.length !== 1 ? 'es' : ''} programada${funcionesDelDiaActual.length !== 1 ? 's' : ''}`
        : '';

    renderizarGridHorarios();
};

/* ============================================================================
   MÓDULO 10 — RENDERIZACIÓN DEL GRID DE HORARIOS (Matriz 2D)
   ============================================================================ */

const GRID_HORA_INICIO = 10; // 10:00 AM
const GRID_HORA_FIN = 24;    // 00:00 (medianoche)
const GRID_PX_POR_MINUTO = 2; // 1 minuto = 2px → 30 min = 60px

/** Genera un array de slots de 30 min: ['10:00', '10:30', '11:00', ...] */
function generarSlotsHorarios() {
    const slots = [];
    for (let h = GRID_HORA_INICIO; h < GRID_HORA_FIN; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
}

/** Calcula top y height en px a partir de hora inicio y duración en minutos. */
function calcularPosicionCard(horaStr, duracionMinutos) {
    const minutosDesdeInicio = horaAMinutos(horaStr) - (GRID_HORA_INICIO * 60);
    const top = minutosDesdeInicio * GRID_PX_POR_MINUTO;
    const height = duracionMinutos * GRID_PX_POR_MINUTO;
    return { top, height };
}

/** Renderiza la matriz completa: header + columnas con filas + tarjetas posicionadas. */
function renderizarGridHorarios() {
    const grid = document.getElementById('grid-horarios');
    const slots = generarSlotsHorarios();
    const totalFilas = slots.length;
    const alturaTotalPx = totalFilas * 60; // cada slot = 60px

    // --- Header: esquina + 8 salas ---
    let html = '<div class="grid-horarios-header">';
    html += '<div class="grid-horarios-header-cell"><i class="fa-regular fa-clock text-gray-600"></i></div>';
    for (let s = 1; s <= NUMERO_TOTAL_SALAS; s++) {
        const salaConfig = obtenerDatosSalas().salas.find(sc => Number(sc.id_sala.replace('sala_', '')) === s);
        const formatos = (salaConfig && salaConfig.formatosSoportados) ? salaConfig.formatosSoportados : [];
        const formatosTexto = formatos.map(fid => {
            const f = obtenerFormatoPorId(fid);
            return f ? f.nombre : fid;
        }).join(' · ');
        html += `<div class="grid-horarios-header-cell">Sala ${s}${formatosTexto ? `<span class="sala-formato-tag">${formatosTexto}</span>` : ''}</div>`;
    }
    html += '</div>';

    // --- Filas de tiempo + columnas de sala ---
    for (let i = 0; i < slots.length; i++) {
        const horaLabel = slots[i];
        const esFila00 = horaLabel.endsWith(':00');
        // Columna de hora (sticky)
        html += `<div class="grid-hora-label" style="grid-row: ${i + 2}">${esFila00 ? horaLabel : ''}</div>`;
        // 8 columnas de sala (celdas vacías con ghost button)
        for (let s = 1; s <= NUMERO_TOTAL_SALAS; s++) {
            html += `<div class="grid-fila-hora" style="grid-row: ${i + 2}" data-sala="${s}" data-hora="${horaLabel}">`;
            html += `<div class="grid-slot-vacio"><button type="button" class="ghost-add-btn" onclick="abrirModalFuncionDesdeGrid(${s}, '${horaLabel}')" title="Agregar función en Sala ${s} a las ${horaLabel}"><i class="fa-solid fa-plus"></i></button></div>`;
            html += '</div>';
        }
    }

    grid.innerHTML = html;

    // --- Colocar tarjetas posicionadas sobre las columnas ---
    renderizarTarjetasEnGrid(slots);

    // --- Línea de hora actual ---
    renderizarLineaHoraActual();
}

/** Renderiza las tarjetas de funciones posicionadas absolutamente dentro de sus columnas de sala. */
function renderizarTarjetasEnGrid(slots) {
    const grid = document.getElementById('grid-horarios');
    // Necesitamos contenedores por sala para posicionar absolutamente las tarjetas
    // Creamos un overlay por cada sala
    for (let s = 1; s <= NUMERO_TOTAL_SALAS; s++) {
        const overlay = document.createElement('div');
        overlay.className = 'grid-sala-columna';
        overlay.style.gridColumn = `${s + 1}`;
        overlay.style.gridRow = `2 / ${slots.length + 2}`;
        overlay.style.position = 'relative';
        overlay.style.pointerEvents = 'none'; // los botones ghost debajo siguen clickeables

        // Filtrar funciones de esta sala
        const funcionesSala = funcionesDelDiaActual.filter(f => f.sala === s);

        funcionesSala.forEach((f, idx) => {
            const pelicula = baseDatosPeliculas[f.peliculaId];
            const tipoLanzamiento = pelicula ? (pelicula.tipoLanzamiento || 'Regular') : 'Regular';
            const duracion = f.duracionMinutos || 0;
            const { top, height: alturaMovie } = calcularPosicionCard(f.hora, duracion);
            const alturaLimpieza = MARGEN_LIMPIEZA_MINUTOS * GRID_PX_POR_MINUTO;
            const alturaTotal = alturaMovie + alturaLimpieza;

            // Calcular hora de fin
            const minutosInicio = horaAMinutos(f.hora);
            const minutosFin = minutosInicio + duracion;
            const horaFin = `${String(Math.floor(minutosFin / 60) % 24).padStart(2, '0')}:${String(minutosFin % 60).padStart(2, '0')}`;

            // Clase de tipo
            let clasesTipo = 'tipo-regular';
            let tagTipo = '';
            if (tipoLanzamiento === 'Estreno') {
                clasesTipo = 'tipo-estreno';
                tagTipo = '<span class="grid-funcion-card-tag tag-estreno">ESTRENO</span>';
            } else if (tipoLanzamiento === 'Pre-Estreno') {
                clasesTipo = 'tipo-pre-estreno';
                tagTipo = '<span class="grid-funcion-card-tag tag-pre-estreno">PRE-ESTRENO</span>';
            }

            // Encontrar el índice en funcionesDelDiaActual para pasar al modal
            const indiceGlobal = funcionesDelDiaActual.indexOf(f);

            // Formato abreviado
            const formatoCorto = f.formato ? f.formato.replace('Doblada', 'DOB').replace('Subtitulada', 'SUB') : '';

            const card = document.createElement('div');
            card.className = `grid-funcion-card ${clasesTipo}`;
            card.style.top = `${top}px`;
            card.style.height = `${alturaTotal}px`;
            card.style.pointerEvents = 'auto';
            card.style.animationDelay = `${idx * 0.04}s`;

            card.innerHTML = `
                <div class="grid-funcion-card-acciones">
                    <button type="button" class="btn-editar" onclick="event.stopPropagation(); abrirModalFuncion(${indiceGlobal})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn-eliminar" onclick="event.stopPropagation(); eliminarFuncionAdmin(${indiceGlobal})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="grid-funcion-card-body">
                    <p class="grid-funcion-card-hora">${f.hora} – ${horaFin}</p>
                    <p class="grid-funcion-card-titulo">${f.peliculaTitulo}</p>
                    <div class="grid-funcion-card-tags">
                        ${tagTipo}
                        <span class="grid-funcion-card-tag">${formatoCorto}</span>
                    </div>
                </div>
                <div class="grid-funcion-limpieza" style="height: ${alturaLimpieza}px">
                    ${alturaLimpieza >= 20 ? '<span class="grid-funcion-limpieza-label">Limpieza</span>' : ''}
                </div>
            `;

            card.addEventListener('click', () => abrirModalFuncion(indiceGlobal));
            overlay.appendChild(card);
        });

        grid.appendChild(overlay);
    }
}

/** Dibuja una línea roja indicando la hora actual (solo si el día seleccionado es hoy). */
function renderizarLineaHoraActual() {
    if (horariosDiaSeleccionadoISO !== obtenerFechaISOHoy()) return;
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const minutosDesdeInicio = minutosActuales - (GRID_HORA_INICIO * 60);
    if (minutosDesdeInicio < 0 || minutosDesdeInicio > (GRID_HORA_FIN - GRID_HORA_INICIO) * 60) return;

    const topPx = minutosDesdeInicio * GRID_PX_POR_MINUTO;

    // Insertar una línea en cada columna de sala + la de horas
    for (let s = 0; s <= NUMERO_TOTAL_SALAS; s++) {
        const linea = document.createElement('div');
        linea.className = 'grid-linea-ahora';
        linea.style.top = `${topPx}px`;
        if (s === 0) {
            // En la columna de horas: posicionar sobre el grid general
            linea.style.gridColumn = '1';
            linea.style.position = 'absolute';
        }
    }

    // Alternativa más sencilla: una única línea que cruza todo el grid
    const wrapper = document.getElementById('grid-horarios-wrapper');
    const lineaGlobal = document.createElement('div');
    lineaGlobal.className = 'grid-linea-ahora';
    // Calculamos la posición relativa al wrapper considerando el header (aprox 44px)
    lineaGlobal.style.top = `${topPx + 44}px`;
    lineaGlobal.style.position = 'absolute';
    lineaGlobal.style.left = '0';
    lineaGlobal.style.right = '0';
    wrapper.appendChild(lineaGlobal);
}

/** Abre el modal de función precargado con la sala y hora del slot donde se hizo click. */
window.abrirModalFuncionDesdeGrid = (sala, hora) => {
    // Abrir modal en modo "nueva función"
    abrirModalFuncion(null);
    // Precargar la fecha del día seleccionado
    setTimeout(() => {
        const inputFecha = document.getElementById('funcion-fecha');
        const inputHora = document.getElementById('funcion-hora');
        if (inputFecha) inputFecha.value = horariosDiaSeleccionadoISO;
        if (inputHora) inputHora.value = hora;
        // Disparar el recálculo de salas disponibles
        alCambiarDatosFuncion();
        // Preseleccionar la sala si está disponible
        setTimeout(() => {
            const selectSala = document.getElementById('funcion-sala');
            if (selectSala) {
                const opcion = selectSala.querySelector(`option[value="${sala}"]`);
                if (opcion && !opcion.disabled) selectSala.value = sala;
            }
        }, 50);
    }, 100);
};

/* ---------- Compatibilidad: renderizarAgendaHorariosAdmin (ya no se usa, pero otras partes la llaman) ---------- */
function renderizarAgendaHorariosAdmin() {
    // El grid ahora reemplaza la agenda, pero mantenemos la función para compatibilidad
    renderizarGridHorarios();
}

/* ---------- Compatibilidad: renderizarCalendarioHorariosAdmin ---------- */
function renderizarCalendarioHorariosAdmin() {
    // Ahora el datepicker flotante reemplaza el calendario grande
    renderizarDatepicker();
}

/** Navegación directa desde Cartelera: abre Horarios en el día más próximo con función de esa película (o hoy, si aún no tiene ninguna). */
window.irAHorariosDeEstaPelicula = (peliculaId) => {
    const funcionesPorFecha = obtenerFuncionesAgrupadasPorFechaISO();
    const fechas = Object.keys(funcionesPorFecha).filter(f => funcionesPorFecha[f].some(x => x.peliculaId === peliculaId)).sort();
    horariosDiaSeleccionadoISO = fechas[0] || obtenerFechaISOHoy();
    cambiarTabAdmin('horarios');
};

/* --- Modal Agregar/Editar función --- */

window.abrirModalFuncion = (indice = null) => {
    const peliculas = Object.values(baseDatosPeliculas);
    if (peliculas.length === 0) {
        mostrarToast('Primero agrega una película en Cartelera.', 'error');
        return;
    }
    funcionAdminEnEdicion = (indice !== null) ? funcionesDelDiaActual[indice] : null;

    const selectPelicula = document.getElementById('funcion-pelicula');
    selectPelicula.innerHTML = peliculas.map(p => `<option value="${p.id}">${p.titulo}</option>`).join('');
    selectPelicula.value = funcionAdminEnEdicion ? funcionAdminEnEdicion.peliculaId : peliculas[0].id;

    document.getElementById('funcion-fecha').value = funcionAdminEnEdicion ? funcionAdminEnEdicion.fechaISO : horariosDiaSeleccionadoISO;
    document.getElementById('funcion-hora').value = funcionAdminEnEdicion ? funcionAdminEnEdicion.hora : '';
    idiomaFuncionSeleccionado = funcionAdminEnEdicion ? funcionAdminEnEdicion.idioma : 'Doblada';

    document.getElementById('funcion-modal-titulo').textContent = funcionAdminEnEdicion ? 'Editar función' : 'Agregar función';
    document.getElementById('funcion-btn-eliminar').classList.toggle('hidden', !funcionAdminEnEdicion);

    alCambiarPeliculaFuncion(funcionAdminEnEdicion ? funcionAdminEnEdicion.formatoId : null);

    const modal = document.getElementById('modal-funcion');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('funcion-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalFuncion = () => {
    const modal = document.getElementById('modal-funcion');
    modal.classList.add('opacity-0');
    document.getElementById('funcion-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
    funcionAdminEnEdicion = null;
};

window.alCambiarPeliculaFuncion = (formatoIdPreseleccionado = null) => {
    const pelicula = baseDatosPeliculas[document.getElementById('funcion-pelicula').value];
    const catalogo = obtenerCatalogoFormatos();
    const formatosDeLaPelicula = (pelicula.formatosDisponibles && pelicula.formatosDisponibles.length > 0) ? pelicula.formatosDisponibles : catalogo.map(f => f.id);

    const selectFormato = document.getElementById('funcion-formato');
    selectFormato.innerHTML = formatosDeLaPelicula.map(id => {
        const f = obtenerFormatoPorId(id);
        return f ? `<option value="${f.id}">${f.nombre}${f.recargo > 0 ? ` (+S/ ${f.recargo.toFixed(2)})` : ''}</option>` : '';
    }).join('');
    if (formatoIdPreseleccionado && formatosDeLaPelicula.includes(formatoIdPreseleccionado)) selectFormato.value = formatoIdPreseleccionado;

    renderizarChipsIdiomaFuncion();
    alCambiarDatosFuncion();
};

function renderizarChipsIdiomaFuncion() {
    document.getElementById('funcion-idioma-chips').innerHTML = ['Doblada', 'Subtitulada'].map(idioma => `
        <button type="button" onclick="seleccionarIdiomaFuncion('${idioma}')" class="flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${idiomaFuncionSeleccionado === idioma ? 'bg-brand-yellow text-black border-brand-yellow' : 'bg-dark-900 text-gray-300 border-white/10 hover:border-white/30'}">${idioma}</button>
    `).join('');
}

window.seleccionarIdiomaFuncion = (idioma) => {
    idiomaFuncionSeleccionado = idioma;
    renderizarChipsIdiomaFuncion();
};

window.alCambiarDatosFuncion = () => {
    const pelicula = baseDatosPeliculas[document.getElementById('funcion-pelicula').value];
    const formatoId = document.getElementById('funcion-formato').value;
    const fechaISO = document.getElementById('funcion-fecha').value;
    const hora = document.getElementById('funcion-hora').value;
    const duracionMinutos = duracionAMinutos(pelicula.duracion);
    const fechaAmigable = fechaISO ? formatearFechaAmigable(fechaISO) : null;

    const ocupadas = (fechaAmigable && hora)
        ? calcularSalasOcupadasEnFechaHora(fechaAmigable, hora, duracionMinutos, funcionAdminEnEdicion)
        : new Set();

    const numerosCompatibles = obtenerDatosSalas().salas
        .filter(s => (s.formatosSoportados || []).includes(formatoId))
        .map(s => Number(s.id_sala.replace('sala_', '')));

    let html = '';
    for (let i = 1; i <= NUMERO_TOTAL_SALAS; i++) {
        if (!numerosCompatibles.includes(i)) continue;
        const bloqueada = ocupadas.has(i);
        html += `<option value="${i}" ${bloqueada ? 'disabled' : ''} ${funcionAdminEnEdicion && i === funcionAdminEnEdicion.sala && !bloqueada ? 'selected' : ''}>Sala ${i}${bloqueada ? ' (ocupada)' : ''}</option>`;
    }
    document.getElementById('funcion-sala').innerHTML = html || '<option value="">Ninguna sala soporta este formato</option>';

    document.getElementById('funcion-sala-ayuda').textContent = numerosCompatibles.length === 0
        ? 'Ninguna sala tiene habilitado este formato (revisa Admin > Salas).'
        : 'Solo se muestran salas habilitadas para este formato; las ocupadas en ese horario aparecen bloqueadas.';
};

window.guardarFuncionAdmin = async (e) => {
    e.preventDefault();
    const peliculaId = document.getElementById('funcion-pelicula').value;
    const pelicula = baseDatosPeliculas[peliculaId];
    const fechaISO = document.getElementById('funcion-fecha').value;
    const hora = document.getElementById('funcion-hora').value;
    const formatoId = document.getElementById('funcion-formato').value;
    const sala = Number(document.getElementById('funcion-sala').value);

    if (!fechaISO || !hora || !formatoId || !sala) {
        mostrarToast('Completa fecha, hora, formato y sala.', 'error');
        return;
    }
    const fechaAmigable = formatearFechaAmigable(fechaISO);
    const duracionMinutos = duracionAMinutos(pelicula.duracion);

    const ocupadas = calcularSalasOcupadasEnFechaHora(fechaAmigable, hora, duracionMinutos, funcionAdminEnEdicion);
    if (ocupadas.has(sala)) {
        mostrarToast('Esa sala ya tiene otra función en ese horario (con el margen de limpieza de 30 min).', 'error');
        return;
    }
    const salaConfig = obtenerDatosSalas().salas.find(s => Number(s.id_sala.replace('sala_', '')) === sala);
    if (!salaConfig || !(salaConfig.formatosSoportados || []).includes(formatoId)) {
        mostrarToast('Esa sala no soporta el formato elegido.', 'error');
        return;
    }

    const confirmado = await confirmarAccion({
        titulo: funcionAdminEnEdicion ? '¿Guardar cambios?' : '¿Agregar función?',
        mensaje: funcionAdminEnEdicion ? `Se actualizará la función en Sala ${sala} a las ${hora}.` : `Se agregará una nueva función en Sala ${sala} a las ${hora}.`,
        tipo: 'info',
        textoConfirmar: funcionAdminEnEdicion ? 'Sí, guardar' : 'Sí, agregar'
    });
    if (!confirmado) return;

    if (funcionAdminEnEdicion) quitarFuncionDeEstructura(funcionAdminEnEdicion);

    const formatoInfo = obtenerFormatoPorId(formatoId);
    const formatoTexto = `${formatoInfo ? formatoInfo.nombre : formatoId} ${idiomaFuncionSeleccionado}`;

    if (!pelicula.horarios) pelicula.horarios = {};
    if (!pelicula.horarios[fechaAmigable]) pelicula.horarios[fechaAmigable] = [];
    let grupo = pelicula.horarios[fechaAmigable].find(g =>
        (g.formatoId || resolverFormatoIdDesdeTexto(g.formato)) === formatoId && (g.idioma || 'Doblada') === idiomaFuncionSeleccionado);
    if (!grupo) {
        grupo = { formato: formatoTexto, formatoId, idioma: idiomaFuncionSeleccionado, horas: [] };
        pelicula.horarios[fechaAmigable].push(grupo);
    }
    grupo.horas.push({ hora, sala });

    guardarCarteleraEnStorage();
    cerrarModalFuncion();
    horariosDiaSeleccionadoISO = fechaISO;
    renderizarAdminHorarios();
    mostrarToast(funcionAdminEnEdicion ? 'Función actualizada.' : 'Función agregada.', 'exito');
};

window.eliminarFuncionAdminActual = () => {
    if (!funcionAdminEnEdicion) return;
    const referencia = funcionAdminEnEdicion;
    cerrarModalFuncion();
    quitarFuncionDeEstructura(referencia);
    guardarCarteleraEnStorage();
    renderizarAdminHorarios();
    mostrarToast('Función eliminada.', 'exito');
};

window.eliminarFuncionAdmin = async (indice) => {
    const f = funcionesDelDiaActual[indice];
    if (!f) return;
    const confirmado = await confirmarAccion({
        titulo: '¿Eliminar función?',
        mensaje: `${f.peliculaTitulo} — ${f.hora}, Sala ${f.sala}. Las entradas ya vendidas para esta función no se eliminan.`,
        tipo: 'peligro', textoConfirmar: 'Sí, eliminar', textoCancelar: 'Cancelar'
    });
    if (!confirmado) return;
    quitarFuncionDeEstructura(f);
    guardarCarteleraEnStorage();
    renderizarAdminHorarios();
    mostrarToast('Función eliminada.', 'exito');
};

/** Quita una función concreta de pelicula.horarios (limpia el grupo y la fecha si quedan vacíos). */
function quitarFuncionDeEstructura(ref) {
    const pelicula = baseDatosPeliculas[ref.peliculaId];
    if (!pelicula || !pelicula.horarios || !pelicula.horarios[ref.etiquetaFecha]) return;
    const grupos = pelicula.horarios[ref.etiquetaFecha];
    const grupo = grupos[ref.indiceGrupo];
    if (!grupo) return;
    grupo.horas.splice(ref.indiceHora, 1);
    if (grupo.horas.length === 0) grupos.splice(ref.indiceGrupo, 1);
    if (grupos.length === 0) delete pelicula.horarios[ref.etiquetaFecha];
}

/**
 * MÓDULO 9: salas ocupadas en una fecha+hora, cruzando TODAS las películas — incluida la misma
 * película en otro horario ese día (el viejo obtenerSalasOcupadas ignoraba por completo los
 * demás horarios de la propia película, dejando pasar choques consigo misma). `excluir` es la
 * función que se está editando, para no chocar contra sí misma al moverla.
 */
function calcularSalasOcupadasEnFechaHora(fechaAmigable, hora, duracionMinutos, excluir = null) {
    const ocupadas = new Set();
    const inicioNueva = horaAMinutos(hora);
    if (inicioNueva === null) return ocupadas;
    const finNueva = inicioNueva + (duracionMinutos || 0) + MARGEN_LIMPIEZA_MINUTOS;

    Object.values(baseDatosPeliculas).forEach(p => {
        const funciones = (p.horarios && p.horarios[fechaAmigable]) || [];
        const duracionExistente = duracionAMinutos(p.duracion);
        funciones.forEach((grupo, indiceGrupo) => {
            (grupo.horas || []).forEach((horaRaw, indiceHora) => {
                if (excluir && excluir.peliculaId === p.id && excluir.etiquetaFecha === fechaAmigable && excluir.indiceGrupo === indiceGrupo && excluir.indiceHora === indiceHora) return;
                const { hora: h, sala } = normalizarFuncionHorario(horaRaw);
                const inicioExistente = horaAMinutos(h);
                if (inicioExistente === null) return;
                const finExistente = inicioExistente + duracionExistente + MARGEN_LIMPIEZA_MINUTOS;
                if (inicioNueva < finExistente && inicioExistente < finNueva) ocupadas.add(Number(sala));
            });
        });
    });
    return ocupadas;
}

// --- 15.1 Cartelera: CRUD avanzado (persistente, con imágenes y edición) ---
function renderizarAdminCartelera() {
    const lista = document.getElementById('admin-lista-peliculas');

    // FASE 8: filtro de búsqueda por título o género
    const inputBusqueda = document.getElementById('admin-buscar-peliculas');
    const termino = inputBusqueda ? inputBusqueda.value.trim().toLowerCase() : '';
    const coincide = (p) => !termino || p.titulo.toLowerCase().includes(termino) || (p.genero || '').toLowerCase().includes(termino);

    const peliculasFiltradas = Object.values(baseDatosPeliculas).filter(coincide);
    const estrenosFiltrados = Object.values(baseDatosEstrenos).filter(coincide);

    const filasCartelera = peliculasFiltradas.map(p => `
        <div class="flex items-center justify-between bg-dark-900 border border-white/5 rounded-xl p-3">
            <div class="flex items-center gap-3 min-w-0">
                <img src="${p.poster}" class="w-10 h-14 object-cover rounded flex-shrink-0">
                <div class="min-w-0">
                    <p class="text-white font-bold text-sm truncate">${p.titulo}</p>
                    <p class="text-gray-500 text-xs truncate">${p.genero} &bull; ${p.duracion}</p>
                    <span class="inline-block bg-brand-red/10 text-brand-red text-[10px] font-bold px-1.5 py-0.5 rounded mt-1">CARTELERA</span>
                </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <button onclick="irAHorariosDeEstaPelicula('${p.id}')" class="text-gray-500 hover:text-brand-yellow transition-colors" title="Ver funciones en Horarios"><i class="fa-solid fa-calendar-days"></i></button>
                <button onclick="abrirModalEditarPelicula('${p.id}', 'cartelera')" class="text-gray-500 hover:text-brand-yellow transition-colors" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button onclick="eliminarPeliculaAdmin('${p.id}', 'cartelera')" class="text-gray-500 hover:text-brand-red transition-colors" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    const filasEstrenos = estrenosFiltrados.map(p => `
        <div class="flex items-center justify-between bg-dark-900 border border-white/5 rounded-xl p-3">
            <div class="flex items-center gap-3 min-w-0">
                <img src="${p.poster}" class="w-10 h-14 object-cover rounded flex-shrink-0">
                <div class="min-w-0">
                    <p class="text-white font-bold text-sm truncate">${p.titulo}</p>
                    <p class="text-gray-500 text-xs truncate">${p.genero}</p>
                    <span class="inline-block bg-brand-yellow/10 text-brand-yellow text-[10px] font-bold px-1.5 py-0.5 rounded mt-1">ESTRENO</span>
                </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <button onclick="abrirModalEditarPelicula('${p.id}', 'estreno')" class="text-gray-500 hover:text-brand-yellow transition-colors" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button onclick="eliminarPeliculaAdmin('${p.id}', 'estreno')" class="text-gray-500 hover:text-brand-red transition-colors" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    lista.innerHTML = (filasCartelera + filasEstrenos) || `<p class="text-gray-500 text-sm italic">${termino ? 'Sin resultados para tu búsqueda.' : 'Aún no hay películas registradas.'}</p>`;

    // FASE 8: contador total (sobre el catálogo completo, no solo lo filtrado)
    const contador = document.getElementById('admin-contador-peliculas');
    const totalGeneral = Object.keys(baseDatosPeliculas).length + Object.keys(baseDatosEstrenos).length;
    if (contador) contador.textContent = `${totalGeneral} título${totalGeneral === 1 ? '' : 's'}`;
}

// --- FASE 8 / MÓDULO 5: Confirmación genérica antes de eliminar (evita borrados accidentales) ---

/* ============================================================================
   MÓDULO 6 — GESTIÓN DEL BANNER PRINCIPAL (desde Cartelera)
   ------------------------------------------------------------------------
   El admin no sube fotos sueltas: elige películas ya existentes en Cartelera
   o Estrenos para destacarlas. bannerPeliculasIds guarda solo IDs y su orden;
   toda la demás data (título, imagen, clasificación) se hereda en vivo desde
   el catálogo, así que si se edita la película el banner se actualiza solo.
   ============================================================================ */
function renderizarAdminBanner() {
    const contenedor = document.getElementById('admin-lista-banner');
    if (!contenedor) return;

    const todas = [
        ...Object.values(baseDatosPeliculas).map(p => ({ ...p, origen: 'cartelera' })),
        ...Object.values(baseDatosEstrenos).map(p => ({ ...p, origen: 'estreno' }))
    ];

    if (todas.length === 0) {
        contenedor.innerHTML = '<p class="text-gray-500 text-sm italic">Aún no hay películas en Cartelera ni Estrenos para destacar.</p>';
        return;
    }

    // Primero las que ya están en el banner (respetando su orden), luego el resto.
    const enBanner = bannerPeliculasIds.map(id => todas.find(p => p.id === id)).filter(Boolean);
    const fueraBanner = todas.filter(p => !bannerPeliculasIds.includes(p.id));
    const ordenadas = [...enBanner, ...fueraBanner];

    contenedor.innerHTML = ordenadas.map(p => {
        const activo = bannerPeliculasIds.includes(p.id);
        const posicion = bannerPeliculasIds.indexOf(p.id);
        return `
            <div class="flex items-center justify-between bg-dark-900 border border-white/5 rounded-xl p-3 gap-3">
                <label class="flex items-center gap-3 min-w-0 cursor-pointer flex-grow">
                    <input type="checkbox" ${activo ? 'checked' : ''} onchange="toggleBannerPelicula('${p.id}')" class="accent-brand-red w-4 h-4 flex-shrink-0">
                    <img src="${p.poster}" class="w-8 h-11 object-cover rounded flex-shrink-0">
                    <div class="min-w-0">
                        <p class="text-white font-bold text-sm truncate">${p.titulo}</p>
                        <span class="inline-block ${p.origen === 'estreno' ? 'bg-brand-yellow/10 text-brand-yellow' : 'bg-brand-red/10 text-brand-red'} text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5">${p.origen === 'estreno' ? 'ESTRENO' : 'CARTELERA'}</span>
                    </div>
                </label>
                ${activo ? `
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onclick="moverBannerPelicula('${p.id}', -1)" ${posicion === 0 ? 'disabled' : ''} class="w-8 h-8 rounded-lg bg-dark-800 border border-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:text-brand-yellow flex items-center justify-center transition-colors" title="Subir"><i class="fa-solid fa-chevron-up text-xs"></i></button>
                    <button type="button" onclick="moverBannerPelicula('${p.id}', 1)" ${posicion === bannerPeliculasIds.length - 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg bg-dark-800 border border-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:text-brand-yellow flex items-center justify-center transition-colors" title="Bajar"><i class="fa-solid fa-chevron-down text-xs"></i></button>
                </div>` : ''}
            </div>`;
    }).join('');
}

window.toggleBannerPelicula = (id) => {
    const idx = bannerPeliculasIds.indexOf(id);
    if (idx > -1) {
        bannerPeliculasIds.splice(idx, 1);
    } else {
        bannerPeliculasIds.push(id);
    }
    guardarBannerEnStorage();
    renderizarAdminBanner();
    renderizarGridsInicio(); // refresca también el preview real del banner en Inicio
    mostrarToast(idx > -1 ? 'Película quitada del banner.' : 'Película agregada al banner.', 'exito');
};

window.moverBannerPelicula = (id, direccion) => {
    const idx = bannerPeliculasIds.indexOf(id);
    if (idx === -1) return;
    const nuevoIdx = idx + direccion;
    if (nuevoIdx < 0 || nuevoIdx >= bannerPeliculasIds.length) return;
    [bannerPeliculasIds[idx], bannerPeliculasIds[nuevoIdx]] = [bannerPeliculasIds[nuevoIdx], bannerPeliculasIds[idx]];
    guardarBannerEnStorage();
    renderizarAdminBanner();
    renderizarGridsInicio();
};


/** Pide confirmación con el modal reutilizable del Módulo 1 y ejecuta accion() solo si el admin confirma. */
function pedirConfirmacionEliminar(mensaje, accion) {
    confirmarAccion({
        titulo: '¿Eliminar este elemento?',
        mensaje,
        tipo: 'peligro',
        textoConfirmar: 'Sí, eliminar',
        textoCancelar: 'Cancelar'
    }).then((confirmado) => { if (confirmado) accion(); });
}

/** Convierte cualquier función 'eliminarX' en una versión que primero pide confirmación visual. */

window.eliminarPeliculaAdmin = (id, origen = 'cartelera') => {
    const pelicula = origen === 'estreno' ? baseDatosEstrenos[id] : baseDatosPeliculas[id];
    const nombre = pelicula ? pelicula.titulo : 'esta película';
    pedirConfirmacionEliminar(`Se eliminará "${nombre}" permanentemente de ${origen === 'estreno' ? 'Estrenos' : 'la Cartelera'}.`, () => {
        if (origen === 'estreno') {
            delete baseDatosEstrenos[id];
        } else {
            delete baseDatosPeliculas[id];
        }
        guardarCarteleraEnStorage();
        limpiarBannerDeIdsInexistentes(); // Módulo 6: si la película eliminada estaba en el banner, se quita sola
        renderizarAdminCartelera();
        renderizarAdminBanner();
        renderizarGridsInicio();
        mostrarToast('Película eliminada correctamente.', 'info');
    });
};

window.crearPeliculaAdmin = async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('admin-pelicula-titulo');
    const genero = document.getElementById('admin-pelicula-genero'); // input oculto, lo llenan los chips
    const duracion = document.getElementById('admin-pelicula-duracion');
    const edad = document.getElementById('admin-pelicula-edad');
    const lanzamiento = document.getElementById('admin-pelicula-lanzamiento');
    const sinopsis = document.getElementById('admin-pelicula-sinopsis');
    const trailer = document.getElementById('admin-pelicula-trailer');
    const esEstreno = document.getElementById('admin-pelicula-es-estreno').checked;

    const valido = validarFormulario([
        { input: titulo, prueba: () => Validadores.minLength(titulo.value, 2), mensaje: 'Ingresa el título de la película.' },
        { input: document.getElementById('admin-pelicula-genero-chips'), prueba: () => genero.value.trim().length > 0, mensaje: 'Elige al menos un género.' },
        { input: duracion, prueba: () => duracionAMinutos(duracion.value) > 0, mensaje: 'Ingresa una duración válida (ej: 2h 15m).' }
    ]);
    if (!valido) return;

    const confirmado = await confirmarAccion({
        titulo: '¿Agregar película?',
        mensaje: `Se registrará "${titulo.value.trim()}" en el sistema.`,
        tipo: 'info',
        textoConfirmar: 'Sí, agregar'
    });
    if (!confirmado) return;

    // MÓDULO 9: qué formatos de proyección ofrece esta película (2D/3D/4DX/...). Determina en qué
    // salas se le podrá programar función más adelante, desde el tab Horarios.
    const formatosDisponibles = leerFormatosElegidosAdmin('admin-pelicula-formatos');
    if (formatosDisponibles.length === 0) {
        mostrarToast('Elige al menos un formato de proyección (2D, 3D, etc.).', 'error');
        return;
    }

    const imagen = await obtenerImagenDesdeFormulario('pelicula');
    if (!imagen) {
        mostrarToast('Ingresa una URL de imagen o carga un archivo para el póster.', 'error');
        return;
    }
    const imagenBanner = await obtenerImagenBannerDesdeFormulario('pelicula'); // NUEVO: banner independiente (opcional)

    const id = 'peli_' + Date.now();
    const datosBase = {
        id, titulo: titulo.value.trim(), genero: genero.value.trim(), duracion: duracion.value.trim(),
        clasificacion: edad.value,
        poster: imagen,
        banner: imagenBanner || imagen, // si no se cargó un banner propio, se sigue usando el póster (comportamiento anterior)
        sinopsis: sinopsis.value.trim() || 'Sinopsis pendiente de configurar.',
        trailer: trailer.value.trim() || '#',
        formatosDisponibles
    };

    if (esEstreno) {
        baseDatosEstrenos[id] = datosBase;
    } else {
        // MÓDULO 9: ya no se piden funciones aquí — una película se puede crear sin horarios y
        // programarlas cuando se quiera desde el tab "Horarios" (se desacopló a propósito).
        baseDatosPeliculas[id] = {
            ...datosBase,
            tipoLanzamiento: lanzamiento.value, // Módulo 3: solo aplica a películas ya en Cartelera
            horarios: {}
        };
    }

    guardarCarteleraEnStorage();
    renderizarAdminCartelera();
    renderizarGridsInicio();
    e.target.reset();
    document.getElementById('admin-pelicula-poster-url').classList.remove('hidden');
    document.getElementById('admin-pelicula-poster-archivo').classList.add('hidden');
    document.getElementById('admin-pelicula-banner-url').classList.remove('hidden'); // NUEVO: reset del campo de banner
    document.getElementById('admin-pelicula-banner-archivo').classList.add('hidden');
    renderizarSelectorChipsMultiple('admin-pelicula-genero-chips', 'admin-pelicula-genero', GENEROS_DISPONIBLES, ''); // Módulo 3: limpia los chips tras guardar
    pintarCheckboxesFormatosAdmin('admin-pelicula-formatos', []); // MÓDULO 9: limpia los checkboxes de formato tras guardar
    actualizarTipoPeliculaAdmin();
    actualizarPreviewImagenAdmin('admin-pelicula-preview', ''); // FASE 8: limpia la vista previa tras guardar
    actualizarPreviewImagenAdmin('admin-pelicula-banner-preview', ''); // NUEVO: limpia la vista previa del banner
    mostrarToast(esEstreno ? 'Estreno agregado correctamente.' : 'Película agregada a la cartelera. Ahora puedes programarle funciones desde el tab "Horarios".', 'exito');
};

/** FASE 7: abre el modal de edición con los datos actuales de la película/estreno. */
window.abrirModalEditarPelicula = (id, origen) => {
    const pelicula = origen === 'estreno' ? baseDatosEstrenos[id] : baseDatosPeliculas[id];
    if (!pelicula) return;

    document.getElementById('edit-pelicula-id').value = id;
    document.getElementById('edit-pelicula-origen').value = origen;
    document.getElementById('edit-pelicula-titulo').value = pelicula.titulo || '';
    document.getElementById('edit-pelicula-duracion').value = pelicula.duracion || '';
    document.getElementById('edit-pelicula-edad').value = pelicula.clasificacion || 'APT';
    document.getElementById('edit-pelicula-lanzamiento').value = pelicula.tipoLanzamiento || 'Regular';
    document.getElementById('edit-pelicula-sinopsis').value = pelicula.sinopsis || '';
    document.getElementById('edit-pelicula-trailer').value = pelicula.trailer || '';
    document.getElementById('edit-pelicula-poster-url').value = pelicula.poster || '';
    document.getElementById('edit-pelicula-banner-url').value = pelicula.banner || ''; // NUEVO
    document.getElementById('edit-pelicula-es-estreno').checked = origen === 'estreno';
    renderizarSelectorChipsMultiple('edit-pelicula-genero-chips', 'edit-pelicula-genero', GENEROS_DISPONIBLES, pelicula.genero || ''); // Módulo 3
    actualizarLanzamientoVisibleEdicion(); // Módulo 3: oculta "lanzamiento" si es Próximo Estreno

    // Restablece el selector de imagen a "URL" (con el póster actual precargado)
    const radioUrl = document.querySelector('input[name="edit-pelicula-origen-img"][value="url"]');
    if (radioUrl) radioUrl.checked = true;
    alternarOrigenImagenAdmin('edit-pelicula');
    actualizarPreviewImagenAdmin('edit-pelicula-preview', pelicula.poster || ''); // FASE 8: preview del póster actual

    // NUEVO: mismo restablecimiento, pero para el selector de banner
    const radioUrlBanner = document.querySelector('input[name="edit-pelicula-banner-origen-img"][value="url"]');
    if (radioUrlBanner) radioUrlBanner.checked = true;
    alternarOrigenImagenBannerAdmin('edit-pelicula');
    actualizarPreviewImagenAdmin('edit-pelicula-banner-preview', pelicula.banner || '');

    // MÓDULO 9: qué formatos ofrece esta película (checkboxes contra el catálogo)
    pintarCheckboxesFormatosAdmin('edit-pelicula-formatos', pelicula.formatosDisponibles || []);

    // El acceso a "Horarios" solo aplica a películas ya en Cartelera (los estrenos aún no tienen funciones)
    document.getElementById('btn-editar-horarios-desde-edicion').classList.toggle('hidden', origen !== 'cartelera');
    document.getElementById('btn-editar-horarios-desde-edicion').onclick = () => { cerrarModalEditarPelicula(); setTimeout(() => irAHorariosDeEstaPelicula(id), 220); };

    const modal = document.getElementById('modal-editar-pelicula');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('editar-pelicula-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalEditarPelicula = () => {
    const modal = document.getElementById('modal-editar-pelicula');
    modal.classList.add('opacity-0');
    document.getElementById('editar-pelicula-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

window.guardarEdicionPeliculaAdmin = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-pelicula-id').value;
    const origenOriginal = document.getElementById('edit-pelicula-origen').value;

    const titulo = document.getElementById('edit-pelicula-titulo');
    const genero = document.getElementById('edit-pelicula-genero'); // input oculto, lo llenan los chips
    const duracion = document.getElementById('edit-pelicula-duracion');

    const valido = validarFormulario([
        { input: titulo, prueba: () => Validadores.minLength(titulo.value, 2), mensaje: 'Ingresa el título de la película.' },
        { input: document.getElementById('edit-pelicula-genero-chips'), prueba: () => genero.value.trim().length > 0, mensaje: 'Elige al menos un género.' },
        { input: duracion, prueba: () => duracionAMinutos(duracion.value) > 0, mensaje: 'Ingresa una duración válida.' }
    ]);
    if (!valido) return;

    const confirmado = await confirmarAccion({
        titulo: '¿Guardar cambios?',
        mensaje: `Se actualizarán los datos de "${titulo.value.trim()}".`,
        tipo: 'info',
        textoConfirmar: 'Sí, guardar'
    });
    if (!confirmado) return;

    const formatosDisponibles = leerFormatosElegidosAdmin('edit-pelicula-formatos');
    if (formatosDisponibles.length === 0) {
        mostrarToast('Elige al menos un formato de proyección (2D, 3D, etc.).', 'error');
        return;
    }

    const imagenNueva = await obtenerImagenDesdeFormulario('edit-pelicula');
    const imagenBannerNueva = await obtenerImagenBannerDesdeFormulario('edit-pelicula'); // NUEVO
    const peliculaOriginal = origenOriginal === 'estreno' ? baseDatosEstrenos[id] : baseDatosPeliculas[id];
    if (!peliculaOriginal) { cerrarModalEditarPelicula(); return; }

    const esEstrenoAhora = document.getElementById('edit-pelicula-es-estreno').checked;

    const datosActualizados = {
        ...peliculaOriginal,
        titulo: titulo.value.trim(),
        genero: genero.value.trim(),
        duracion: duracion.value.trim(),
        clasificacion: document.getElementById('edit-pelicula-edad').value,
        sinopsis: document.getElementById('edit-pelicula-sinopsis').value.trim(),
        trailer: document.getElementById('edit-pelicula-trailer').value.trim() || '#',
        poster: imagenNueva || peliculaOriginal.poster,
        banner: imagenBannerNueva || peliculaOriginal.banner, // NUEVO: ya no depende del póster
        formatosDisponibles
    };
    if (!esEstrenoAhora) datosActualizados.tipoLanzamiento = document.getElementById('edit-pelicula-lanzamiento').value; // Módulo 3

    const cambioDeTipo = (esEstrenoAhora && origenOriginal !== 'estreno') || (!esEstrenoAhora && origenOriginal === 'estreno');

    if (cambioDeTipo) {
        // Se mueve de Cartelera <-> Estrenos
        if (origenOriginal === 'estreno') delete baseDatosEstrenos[id]; else delete baseDatosPeliculas[id];

        if (esEstrenoAhora) {
            delete datosActualizados.horarios;
            delete datosActualizados.tipoLanzamiento; // Módulo 3: no aplica a Próximos Estrenos
            baseDatosEstrenos[id] = datosActualizados;
        } else {
            datosActualizados.horarios = peliculaOriginal.horarios || {}; // MÓDULO 9: sin función de relleno; se programan desde el tab Horarios
            baseDatosPeliculas[id] = datosActualizados;
        }
    } else {
        if (origenOriginal === 'estreno') baseDatosEstrenos[id] = datosActualizados;
        else baseDatosPeliculas[id] = datosActualizados;
    }

    guardarCarteleraEnStorage();
    renderizarAdminCartelera();
    renderizarGridsInicio();
    cerrarModalEditarPelicula();
    mostrarToast('Cambios guardados correctamente.', 'exito');
};

// --- 15.2 Dulcería: CRUD completo (persistente, con filtros e imágenes) ---
function renderizarAdminDulceria(filtro = filtroAdminDulceriaActual) {
    filtroAdminDulceriaActual = filtro;
    poblarSelectsCategoriaDulceria();          // Módulo 6: selects del form siempre al día con categoriasDulceria
    renderizarFiltrosAdminDulceria(filtro);    // Módulo 6: chips de filtro dinámicos según categoriasDulceria
    const lista = document.getElementById('admin-lista-dulceria');

    // FASE 13: mismo filtro compartido con el cliente (categoría + búsqueda; el admin además ve productos sin stock)
    const inputBusqueda = document.getElementById('admin-buscar-dulceria');
    const termino = inputBusqueda ? inputBusqueda.value : '';
    const entradas = filtrarProductosDulceria({ categoria: filtro, termino });

    lista.innerHTML = entradas.map(([id, p]) => `
        <div class="flex items-center justify-between bg-dark-900 border border-white/5 rounded-xl p-3 gap-2">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center text-brand-yellow flex-shrink-0 overflow-hidden">
                    ${renderizarIconoOImagenProducto(p)}
                </div>
                <div class="min-w-0">
                    <p class="text-white font-bold text-sm truncate">${p.nombre}</p>
                    <p class="text-gray-500 text-xs">${formatearMoneda(p.precio)} &bull; ${obtenerNombreCategoriaDulceria(p.categoria)}</p>
                </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <label class="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer">
                    ${p.stock ? 'Stock' : 'Agotado'}
                    <input type="checkbox" class="toggle-stock" ${p.stock ? 'checked' : ''} onchange="toggleStockDulce('${id}', this.checked)">
                </label>
                <button onclick="editarProductoDulceriaAdmin('${id}')" class="text-gray-500 hover:text-brand-yellow transition-colors" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button onclick="eliminarProductoDulceriaAdmin('${id}')" class="text-gray-500 hover:text-brand-red transition-colors" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('') || `<p class="text-gray-500 text-sm italic">${termino ? 'Sin resultados para tu búsqueda.' : 'No hay productos en esta categoría.'}</p>`;

    // FASE 8: contador total del catálogo completo (no solo lo filtrado/buscado)
    const contador = document.getElementById('admin-contador-dulces');
    const totalGeneral = Object.keys(PRECIOS.dulces).length;
    if (contador) contador.textContent = `${totalGeneral} producto${totalGeneral === 1 ? '' : 's'}`;
}

/** Módulo 6: nombre legible de una categoría a partir de su id (incluye "Sin categoría"). */
function obtenerNombreCategoriaDulceria(categoriaId) {
    const encontrada = obtenerCategoriasDulceriaConSinAsignar().find(c => c.id === categoriaId);
    return encontrada ? encontrada.nombre : categoriaId;
}

window.toggleStockDulce = (id, activo) => {
    PRECIOS.dulces[id].stock = activo;
    guardarDulceriaEnStorage();
    renderizarAdminDulceria();
    mostrarToast(`${PRECIOS.dulces[id].nombre}: ${activo ? 'activado' : 'desactivado'}.`, 'info');
};

/** FASE 7 / MÓDULO 6: filtro por categoría dentro del panel admin de dulcería (chips dinámicos, sin depender de 'event'). */
function renderizarFiltrosAdminDulceria(filtroActivo) {
    const contenedor = document.getElementById('admin-filtros-dulceria');
    if (!contenedor) return;
    const categorias = [{ id: 'all', nombre: 'Todos' }, ...obtenerCategoriasDulceriaConSinAsignar()];
    contenedor.innerHTML = categorias.map(cat => {
        const activo = cat.id === filtroActivo;
        return `<button onclick="filtrarAdminDulceria('${cat.id}')" data-categoria="${cat.id}" class="admin-cat-btn px-3 py-1.5 font-semibold whitespace-nowrap border-b-2 text-sm transition-colors ${activo ? 'text-brand-yellow border-brand-yellow' : 'text-gray-400 hover:text-white border-transparent'}">${cat.nombre}</button>`;
    }).join('');
}

window.filtrarAdminDulceria = (categoria) => {
    renderizarAdminDulceria(categoria);
};

/* ============================================================================
   MÓDULO 6 — CATEGORÍAS DINÁMICAS DE DULCERÍA (CRUD)
   ============================================================================ */

/** Rellena ambos <select> (crear y editar producto) con categoriasDulceria + "Sin categoría", preservando la selección previa si sigue existiendo. */
function poblarSelectsCategoriaDulceria() {
    const opciones = obtenerCategoriasDulceriaConSinAsignar().map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    ['admin-dulce-categoria', 'edit-dulce-categoria'].forEach(idSelect => {
        const select = document.getElementById(idSelect);
        if (!select) return;
        const valorPrevio = select.value;
        select.innerHTML = opciones;
        if (valorPrevio && Array.from(select.options).some(o => o.value === valorPrevio)) {
            select.value = valorPrevio;
        }
    });
}

function renderizarListaCategoriasDulceria() {
    const contenedor = document.getElementById('admin-lista-categorias-dulceria');
    if (!contenedor) return;
    if (categoriasDulceria.length === 0) {
        contenedor.innerHTML = '<p class="text-gray-500 text-sm italic flex-shrink-0">Aún no hay categorías. Crea la primera arriba.</p>';
        return;
    }
    contenedor.innerHTML = categoriasDulceria.map(cat => {
        const cantidad = contarProductosPorCategoria(cat.id);
        return `
            <div class="flex items-center justify-between bg-dark-900 border border-white/5 rounded-xl p-3 gap-2 min-w-0">
                <div class="min-w-0">
                    <p class="text-white font-bold text-sm truncate">${cat.nombre}</p>
                    <p class="text-gray-500 text-xs">${cantidad} producto${cantidad === 1 ? '' : 's'}</p>
                </div>
                <button type="button" onclick="eliminarCategoriaDulceriaAdmin('${cat.id}')" class="text-gray-500 hover:text-brand-red transition-colors flex-shrink-0" title="Eliminar categoría"><i class="fa-solid fa-trash"></i></button>
            </div>`;
    }).join('');
}

window.actualizarCategoriasDulceriaAdmin = () => {
    poblarSelectsCategoriaDulceria();
    renderizarListaCategoriasDulceria();
    renderizarAdminDulceria();
    if (typeof renderizarGridDulceria === 'function') renderizarGridDulceria('all');
    mostrarToast('Categorías actualizadas.', 'info');
};

window.crearCategoriaDulceriaAdmin = async (e) => {
    e.preventDefault();
    const input = document.getElementById('admin-nueva-categoria-nombre');
    const nombre = input.value.trim();

    const valido = validarFormulario([
        { input, prueba: () => Validadores.minLength(nombre, 2), mensaje: 'Ingresa un nombre de categoría (mínimo 2 caracteres).' }
    ]);
    if (!valido) return;

    const yaExiste = obtenerCategoriasDulceriaConSinAsignar().some(c => c.nombre.trim().toLowerCase() === nombre.toLowerCase());
    if (yaExiste) {
        marcarCampoInvalido(input, 'Ya existe una categoría con ese nombre.');
        mostrarToast('Ya existe una categoría con ese nombre.', 'error');
        return;
    }

    const confirmado = await confirmarAccion({
        titulo: '¿Crear categoría?',
        mensaje: `Se agregará "${nombre}" a las categorías de Dulcería.`,
        tipo: 'info',
        textoConfirmar: 'Sí, crear'
    });
    if (!confirmado) return;

    categoriasDulceria.push({ id: `cat_${Date.now()}`, nombre });
    guardarCategoriasDulceriaEnStorage();

    renderizarListaCategoriasDulceria();
    renderizarAdminDulceria();
    if (typeof renderizarGridDulceria === 'function') renderizarGridDulceria('all');
    e.target.reset();
    limpiarCampoInvalido(input);
    mostrarToast(`Categoría "${nombre}" creada correctamente.`, 'exito');
};

/** Módulo 6: borrar categoría — avisa cuántos productos la usan y, si se confirma, los reasigna a "Sin categoría" en vez de bloquear la eliminación sin más. */
window.eliminarCategoriaDulceriaAdmin = async (id) => {
    const categoria = categoriasDulceria.find(c => c.id === id);
    if (!categoria) return;
    const cantidad = contarProductosPorCategoria(id);

    const mensaje = cantidad > 0
        ? `"${categoria.nombre}" tiene ${cantidad} producto${cantidad === 1 ? '' : 's'} asignado${cantidad === 1 ? '' : 's'}. Si continúas, la categoría se eliminará y ese${cantidad === 1 ? ' producto pasará' : 's productos pasarán'} a "Sin categoría".`
        : `Se eliminará la categoría "${categoria.nombre}". No tiene productos asignados actualmente.`;

    const confirmado = await confirmarAccion({
        titulo: '¿Eliminar esta categoría?',
        mensaje,
        tipo: cantidad > 0 ? 'advertencia' : 'peligro',
        textoConfirmar: 'Sí, eliminar',
        textoCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    if (cantidad > 0) {
        Object.values(PRECIOS.dulces).forEach(p => {
            if (p.categoria === id) p.categoria = CATEGORIA_SIN_ASIGNAR;
        });
        guardarDulceriaEnStorage();
    }

    categoriasDulceria = categoriasDulceria.filter(c => c.id !== id);
    guardarCategoriasDulceriaEnStorage();

    renderizarListaCategoriasDulceria();
    renderizarAdminDulceria();
    if (typeof renderizarGridDulceria === 'function') renderizarGridDulceria('all');
    mostrarToast(cantidad > 0
        ? `Categoría eliminada. ${cantidad} producto${cantidad === 1 ? '' : 's'} pasó${cantidad === 1 ? '' : 'aron'} a "Sin categoría".`
        : 'Categoría eliminada correctamente.', 'info');
};

/** FASE 11: el formulario inline ahora es SOLO de creación (la edición se hace en #modal-editar-dulce). */
window.guardarProductoDulceriaAdmin = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('admin-dulce-nombre');
    const desc = document.getElementById('admin-dulce-desc');
    const precio = document.getElementById('admin-dulce-precio');
    const categoria = document.getElementById('admin-dulce-categoria');

    const valido = validarFormulario([
        { input: nombre, prueba: () => Validadores.minLength(nombre.value, 2), mensaje: 'Ingresa el nombre del producto.' },
        { input: precio, prueba: () => Number(precio.value) > 0, mensaje: 'El precio debe ser mayor a 0.' }
    ]);
    if (!valido) return;

    const confirmado = await confirmarAccion({
        titulo: '¿Crear producto?',
        mensaje: `Se agregará "${nombre.value.trim()}" al catálogo de Dulcería.`,
        tipo: 'info',
        textoConfirmar: 'Sí, crear'
    });
    if (!confirmado) return;

    const imagen = await obtenerImagenDesdeFormulario('dulce');
    if (!imagen) {
        mostrarToast('Ingresa una URL de imagen o carga un archivo para el producto.', 'error'); // Módulo 4: ya no hay ícono de respaldo
        return;
    }
    const id = 'dulce_' + Date.now();

    PRECIOS.dulces[id] = {
        nombre: nombre.value.trim(),
        desc: desc.value.trim() || 'Sin descripción.',
        precio: Number(precio.value),
        categoria: categoria.value,
        imagen,
        stock: true
    };

    guardarDulceriaEnStorage();
    renderizarAdminDulceria();
    e.target.reset();
    const radioUrl = document.querySelector('input[name="admin-dulce-origen-img"][value="url"]');
    if (radioUrl) radioUrl.checked = true;
    alternarOrigenImagenAdmin('dulce');
    actualizarPreviewImagenAdmin('admin-dulce-preview', ''); // FASE 8: limpia la vista previa tras guardar
    mostrarToast('Producto agregado correctamente.', 'exito');
};

/** FASE 11: abre el modal de edición con los datos actuales del producto (mismo patrón que "Editar Película"). */
window.editarProductoDulceriaAdmin = (id) => {
    const p = PRECIOS.dulces[id];
    if (!p) return;

    document.getElementById('edit-dulce-id').value = id;
    document.getElementById('edit-dulce-nombre').value = p.nombre;
    document.getElementById('edit-dulce-desc').value = p.desc;
    document.getElementById('edit-dulce-precio').value = p.precio;
    document.getElementById('edit-dulce-categoria').value = p.categoria;
    document.getElementById('edit-dulce-imagen-url').value = p.imagen || '';

    const radioUrl = document.querySelector('input[name="edit-dulce-origen-img"][value="url"]');
    if (radioUrl) radioUrl.checked = true;
    alternarOrigenImagenAdmin('edit-dulce');
    actualizarPreviewImagenAdmin('edit-dulce-preview', p.imagen || '');

    const modal = document.getElementById('modal-editar-dulce');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('editar-dulce-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalEditarDulce = () => {
    const modal = document.getElementById('modal-editar-dulce');
    modal.classList.add('opacity-0');
    document.getElementById('editar-dulce-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

/** FASE 11: guarda los cambios del producto editado en el modal y actualiza el catálogo. */
window.guardarEdicionDulceAdmin = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-dulce-id').value;
    const nombre = document.getElementById('edit-dulce-nombre');
    const precio = document.getElementById('edit-dulce-precio');

    const valido = validarFormulario([
        { input: nombre, prueba: () => Validadores.minLength(nombre.value, 2), mensaje: 'Ingresa el nombre del producto.' },
        { input: precio, prueba: () => Number(precio.value) > 0, mensaje: 'El precio debe ser mayor a 0.' }
    ]);
    if (!valido) return;

    const productoOriginal = PRECIOS.dulces[id];
    if (!productoOriginal) { cerrarModalEditarDulce(); return; }

    const imagenNueva = await obtenerImagenDesdeFormulario('edit-dulce');
    const imagenFinal = imagenNueva || productoOriginal.imagen;
    if (!imagenFinal) {
        mostrarToast('Este producto necesita una imagen (ya no se admite ícono FontAwesome).', 'error'); // Módulo 4
        return;
    }

    const confirmado = await confirmarAccion({
        titulo: '¿Guardar cambios?',
        mensaje: `Se actualizarán los datos de "${nombre.value.trim()}".`,
        tipo: 'info',
        textoConfirmar: 'Sí, guardar'
    });
    if (!confirmado) return;

    PRECIOS.dulces[id] = {
        ...productoOriginal,
        nombre: nombre.value.trim(),
        desc: document.getElementById('edit-dulce-desc').value.trim() || 'Sin descripción.',
        precio: Number(precio.value),
        categoria: document.getElementById('edit-dulce-categoria').value,
        imagen: imagenFinal
    };
    delete PRECIOS.dulces[id].icono; // Módulo 4: limpieza de campo obsoleto si el producto lo traía de antes

    guardarDulceriaEnStorage();
    renderizarAdminDulceria();
    cerrarModalEditarDulce();
    mostrarToast('Producto actualizado correctamente.', 'exito');
};

window.eliminarProductoDulceriaAdmin = (id) => {
    const nombre = PRECIOS.dulces[id] ? PRECIOS.dulces[id].nombre : 'este producto';
    pedirConfirmacionEliminar(`Se eliminará "${nombre}" permanentemente del catálogo de dulcería.`, () => {
        delete PRECIOS.dulces[id];
        guardarDulceriaEnStorage();
        renderizarAdminDulceria();
        mostrarToast(`${nombre} eliminado del catálogo.`, 'info');
    });
};

// --- 15.3 Salas: matriz dinámica de estructura e inventario operativo ---
let pestanaSalaActiva = 'estados';

/* ============================================================================
   MÓDULO 4 — MANTENIMIENTO DE SALAS: patrón de borrador en memoria.
   ------------------------------------------------------------------------
   El admin puede editar libremente la distribución y el estado de las
   butacas (ya NO se bloquea por butacas vendidas, solo se avisa
   visualmente). Nada se persiste en localStorage hasta que el admin
   confirma explícitamente con el botón "Guardar Cambios".
   ============================================================================ */
let borradorSalaActual = null;   // copia de trabajo de la sala visible, no persistida
let borradorSalaNumero = null;   // a qué número de sala pertenece el borrador actual
let haySalaCambiosSinGuardar = false;

function clonarSala(sala) {
    return JSON.parse(JSON.stringify(sala));
}

/** Carga (o recupera) el borrador de trabajo para la sala actualmente seleccionada. */
function obtenerBorradorSalaActual() {
    if (!borradorSalaActual || borradorSalaNumero !== salaMantenimientoActual) {
        borradorSalaActual = clonarSala(obtenerSalaConfigurada(salaMantenimientoActual));
        borradorSalaNumero = salaMantenimientoActual;
        haySalaCambiosSinGuardar = false;
    }
    return borradorSalaActual;
}

function marcarSalaComoModificada() {
    haySalaCambiosSinGuardar = true;
    const btnGuardar = document.getElementById('btn-guardar-cambios-sala');
    if (btnGuardar) btnGuardar.classList.add('boton-cambios-pendientes');
}

function guardarDatos(datos) {
    return guardarDatosSalas(datos);
}

function actualizarContadorSala(sala) {
    const contador = document.getElementById('admin-contador-bloqueadas');
    const texto = document.getElementById('admin-texto-contador-sala');
    const icono = document.getElementById('admin-icono-contador-sala');
    const totales = sala.asientos.reduce((acum, asiento) => ({ ...acum, [asiento.estado]: (acum[asiento.estado] || 0) + 1 }), {});
    if (pestanaSalaActiva === 'estructura') {
        if (contador) contador.textContent = `${totales.pasadizo || 0} / ${sala.asientos.length}`;
        if (texto) texto.innerHTML = `Pasadizos: <span id="admin-contador-bloqueadas" class="contador-bloqueadas text-white font-bold">${totales.pasadizo || 0} / ${sala.asientos.length}</span>`;
        if (icono) icono.className = 'fa-solid fa-road text-brand-yellow text-xs';
    } else {
        if (texto) texto.innerHTML = `Disponibles: <b class="text-green-400">${totales.disponible || 0}</b> · Mantenimiento: <b class="text-brand-red">${totales.mantenimiento || 0}</b> · Accesibles: <b class="text-blue-400">${totales.accesible || 0}</b>`;
        if (icono) icono.className = 'fa-solid fa-chair text-brand-yellow text-xs';
    }
}

window.cambiarPestanaSala = (pestana) => {
    pestanaSalaActiva = pestana;
    document.getElementById('admin-panel-estructura-sala').classList.toggle('hidden', pestana !== 'estructura');
    document.getElementById('admin-panel-estados-sala').classList.toggle('hidden', pestana !== 'estados');
    document.getElementById('admin-pestana-estructura').className = `admin-pestana-sala flex-1 px-4 py-3 text-sm font-bold border-b-2 ${pestana === 'estructura' ? 'text-brand-yellow border-brand-yellow' : 'text-gray-500 border-transparent'}`;
    document.getElementById('admin-pestana-estados').className = `admin-pestana-sala flex-1 px-4 py-3 text-sm font-bold border-b-2 ${pestana === 'estados' ? 'text-brand-yellow border-brand-yellow' : 'text-gray-500 border-transparent'}`;
    renderizarAdminSalas();
};
window.cambiarModoEdicionSala = window.cambiarPestanaSala;
window.cambiarPestaña = window.cambiarPestanaSala;

function renderizarAdminSalas() {
    const selectSala = document.getElementById('admin-select-sala');
    poblarSelectSalas(selectSala, salaMantenimientoActual);
    const sala = obtenerBorradorSalaActual();
    document.getElementById('admin-sala-filas').value = sala.filas;
    document.getElementById('admin-sala-columnas').value = sala.columnas;
    const grid = document.getElementById('admin-grid-salas');
    grid.style.setProperty('--columnas-sala', sala.columnas);

    // MÓDULO 9: qué butacas están comprometidas con una venta futura. Ya no se muestra ningún
    // indicador visual en la matriz (el admin no necesita adivinar); si intenta tocarlas, el
    // clic se bloquea y se explica el motivo (ver editarEstructuraButaca / cambiarEstadoButaca).
    const bloqueadasPorVenta = obtenerButacasVendidasFuturasPorSala(salaMantenimientoActual);
    grid.innerHTML = sala.asientos.map(asiento => {
        const id = `${asiento.f}${asiento.c}`;
        if (asiento.estado === 'pasadizo') return `<button class="butaca-matriz pasadizo" onclick="editarEstructuraButaca('${id}')" title="Pasadizo"></button>`;
        const accion = pestanaSalaActiva === 'estructura' ? `editarEstructuraButaca('${id}', event)` : `cambiarEstadoButaca('${id}')`;
        const icono = asiento.estado === 'accesible' ? '<i class="fa-solid fa-wheelchair"></i>' : id;
        return `<button class="butaca-matriz ${asiento.estado}" onclick="${accion}" title="${id}">${icono}</button>`;
    }).join('');
    actualizarContadorSala(sala);
    renderizarFormatosSalaAdmin(sala);
    renderizarAvisoBloqueoSala(bloqueadasPorVenta);

    const btnGuardar = document.getElementById('btn-guardar-cambios-sala');
    if (btnGuardar) btnGuardar.classList.toggle('boton-cambios-pendientes', haySalaCambiosSinGuardar);
}

/* MÓDULO 9: checkboxes de qué formatos soporta la sala seleccionada (se guardan en el borrador,
   como el resto de la edición de sala: no se persisten hasta "Guardar Cambios"). */
function renderizarFormatosSalaAdmin(sala) {
    const contenedor = document.getElementById('admin-sala-formatos');
    if (!contenedor) return;
    const soportados = sala.formatosSoportados || [];
    contenedor.innerHTML = obtenerCatalogoFormatos().map(f => `
        <label class="flex items-center gap-1.5 bg-dark-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 cursor-pointer hover:border-brand-yellow/50 transition-colors">
            <input type="checkbox" value="${f.id}" onchange="toggleFormatoSalaAdmin('${f.id}', this.checked)" class="accent-brand-yellow" ${soportados.includes(f.id) ? 'checked' : ''}> ${f.nombre}
        </label>
    `).join('');
}

window.toggleFormatoSalaAdmin = (formatoId, marcado) => {
    const sala = obtenerBorradorSalaActual();
    if (!Array.isArray(sala.formatosSoportados)) sala.formatosSoportados = [];
    if (marcado && !sala.formatosSoportados.includes(formatoId)) sala.formatosSoportados.push(formatoId);
    if (!marcado) sala.formatosSoportados = sala.formatosSoportados.filter(id => id !== formatoId);
    marcarSalaComoModificada();
};

/**
 * MÓDULO 9 — POLÍTICA DE EDICIÓN DE SALAS:
 * - Una butaca YA VENDIDA para una función futura nunca se toca (ni su estructura ni su estado):
 *   evita invalidar o cambiar el precio de un ticket que un cliente ya compró.
 * - "Generar Cuadrícula Base" (regenerar toda la sala) se bloquea si la sala tiene AL MENOS UNA
 *   butaca vendida a futuro, porque podría eliminar o renumerar esa butaca comprometida.
 * - Todo lo demás (butacas sin vender: estructura, mantenimiento, tipo, formatos soportados)
 *   se sigue editando libre, aunque otras butacas de la misma sala sí tengan venta futura.
 */
function renderizarAvisoBloqueoSala(bloqueadasPorVenta) {
    const aviso = document.getElementById('admin-sala-bloqueo-aviso');
    if (!aviso) return;
    if (bloqueadasPorVenta.size === 0) { aviso.classList.add('hidden'); return; }
    aviso.classList.remove('hidden');
    aviso.innerHTML = `<i class="fa-solid fa-lock mr-1"></i><b>${bloqueadasPorVenta.size} butaca(s)</b> tienen una venta para una función futura y no se pueden editar. "Generar Cuadrícula Base" también está bloqueado mientras existan.`;
}

window.generarMatriz = async () => {
    if (obtenerButacasVendidasFuturasPorSala(salaMantenimientoActual).size > 0) {
        mostrarToast('No se puede regenerar la cuadrícula: esta sala tiene butacas vendidas para funciones futuras.', 'error');
        return;
    }
    const filas = Number(document.getElementById('admin-sala-filas').value);
    const columnas = Number(document.getElementById('admin-sala-columnas').value);
    if (!Number.isInteger(filas) || filas < 1 || filas > 26 || !Number.isInteger(columnas) || columnas < 1 || columnas > 30) {
        mostrarToast('Filas debe estar entre 1 y 26 y columnas entre 1 y 30.', 'error');
        return;
    }
    const salaActual = obtenerBorradorSalaActual();
    if (salaActual.asientos.length) {
        const confirmar = await confirmarAccion({
            titulo: '¿Regenerar cuadrícula?',
            mensaje: 'Esto reemplazará la estructura y los estados actuales de esta sala en tu borrador (no afecta lo ya guardado hasta que presiones "Guardar Cambios").',
            tipo: 'advertencia',
            textoConfirmar: 'Sí, regenerar',
            textoCancelar: 'Cancelar'
        });
        if (!confirmar) return;
    }
    borradorSalaActual = crearConfiguracionSala(salaMantenimientoActual, filas, columnas);
    marcarSalaComoModificada();
    mostrarToast('Cuadrícula base creada en el borrador. No olvides "Guardar Cambios".', 'info');
    renderizarAdminSalas();
};

window.clickMatrizEstructura = (event) => {
    if (pestanaSalaActiva !== 'estructura' || event.target !== event.currentTarget) return;
    const sala = obtenerBorradorSalaActual();
    const rect = event.currentTarget.getBoundingClientRect();
    const columna = Math.floor(((event.clientX - rect.left) / rect.width) * sala.columnas);
    const fila = Math.floor(((event.clientY - rect.top) / rect.height) * sala.filas);
    const asiento = sala.asientos[fila * sala.columnas + columna];
    if (asiento) editarEstructuraButaca(`${asiento.f}${asiento.c}`);
};

window.editarEstructuraButaca = (id, event) => {
    if (event) event.stopPropagation();
    if (pestanaSalaActiva !== 'estructura') return;
    if (obtenerButacasVendidasFuturasPorSala(salaMantenimientoActual).has(id)) {
        mostrarToast(`La butaca ${id} tiene una venta para una función futura; no se puede editar.`, 'error');
        return;
    }
    const sala = obtenerBorradorSalaActual();
    const asiento = sala.asientos.find(item => `${item.f}${item.c}` === id);
    if (!asiento) return;
    asiento.estado = asiento.estado === 'pasadizo' ? 'disponible' : 'pasadizo';
    marcarSalaComoModificada();
    renderizarAdminSalas();
};

window.cambiarEstadoButaca = (id) => {
    if (pestanaSalaActiva !== 'estados') return;
    if (obtenerButacasVendidasFuturasPorSala(salaMantenimientoActual).has(id)) {
        mostrarToast(`La butaca ${id} tiene una venta para una función futura; no se puede editar.`, 'error');
        return;
    }
    const sala = obtenerBorradorSalaActual();
    const asiento = sala.asientos.find(item => `${item.f}${item.c}` === id);
    if (!asiento || asiento.estado === 'pasadizo') return;
    const siguiente = { disponible: 'mantenimiento', mantenimiento: 'accesible', accesible: 'disponible' };
    asiento.estado = siguiente[asiento.estado] || 'disponible';
    marcarSalaComoModificada();
    renderizarAdminSalas();
};

/** Módulo 4: persiste el borrador de la sala actual, con confirmación previa. */
window.guardarCambiosSala = async () => {
    if (!haySalaCambiosSinGuardar) {
        mostrarToast('No hay cambios sin guardar en esta sala.', 'info');
        return;
    }
    const confirmar = await confirmarAccion({
        titulo: '¿Guardar cambios de la sala?',
        mensaje: `Se guardará la nueva distribución y estado de butacas de la Sala ${salaMantenimientoActual}. Esta acción sobrescribirá la configuración actual guardada.`,
        tipo: 'advertencia',
        textoConfirmar: 'Guardar cambios',
        textoCancelar: 'Seguir editando'
    });
    if (!confirmar) return;

    const datos = obtenerDatosSalas();
    const indice = datos.salas.findIndex(s => Number(s.id_sala.replace('sala_', '')) === salaMantenimientoActual);
    if (indice === -1) datos.salas.push(clonarSala(borradorSalaActual));
    else datos.salas[indice] = clonarSala(borradorSalaActual);
    guardarDatos(datos);
    haySalaCambiosSinGuardar = false;
    renderizarAdminSalas();
    mostrarToast(`Cambios de la Sala ${salaMantenimientoActual} guardados correctamente.`, 'exito');
};

/** Módulo 6: descarta los cambios sin guardar del borrador actual y recarga la sala tal como está guardada en localStorage. */
window.restablecerCambiosSala = async () => {
    if (!haySalaCambiosSinGuardar) {
        mostrarToast('No hay cambios sin guardar para restablecer.', 'info');
        return;
    }
    const confirmar = await confirmarAccion({
        titulo: '¿Restablecer cambios?',
        mensaje: `Se descartarán los cambios sin guardar de la Sala ${salaMantenimientoActual} y volverá a su última versión guardada.`,
        tipo: 'advertencia',
        textoConfirmar: 'Sí, restablecer',
        textoCancelar: 'Seguir editando'
    });
    if (!confirmar) return;

    borradorSalaActual = null;   // fuerza a que obtenerBorradorSalaActual() reconstruya desde lo guardado
    borradorSalaNumero = null;
    haySalaCambiosSinGuardar = false;
    renderizarAdminSalas();
    mostrarToast('Cambios descartados. Se restableció la última versión guardada.', 'info');
};

window.cambiarSalaMantenimiento = async (valor) => {
    const nuevaSala = Number(valor) || 1;
    if (haySalaCambiosSinGuardar) {
        const continuar = await confirmarAccion({
            titulo: '¿Cambiar de sala sin guardar?',
            mensaje: 'Tienes cambios sin guardar en la sala actual. Si cambias de sala ahora, se perderán.',
            tipo: 'advertencia',
            textoConfirmar: 'Descartar y cambiar',
            textoCancelar: 'Seguir editando'
        });
        if (!continuar) {
            document.getElementById('admin-select-sala').value = salaMantenimientoActual; // revierte el <select>
            return;
        }
    }
    salaMantenimientoActual = nuevaSala;
    borradorSalaActual = null; // fuerza a recargar el borrador de la nueva sala
    renderizarAdminSalas();
};

/* ============================================================================
   MÓDULO 4 — CALENDARIO DE FERIADOS (panel admin)
   ------------------------------------------------------------------------
   Reutiliza las funciones de estado.js (obtenerCalendarioFeriados /
   guardarCalendarioFeriados) que ya alimentan el motor de tarifas del
   Módulo 2 — este panel es solo la UI encima de ese mismo localStorage.
   ============================================================================ */
let calendarioAdminMesActual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const NOMBRES_MESES_CALENDARIO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function renderizarAdminTarifas() {
    renderizarFormatosAdmin();
    renderizarTiposEntradaAdmin();
    renderizarAdminCalendario();
}

/* ============================================================================
   MÓDULO 9 — TARIFAS: catálogo de formatos y de tipos de entrada (listas editables)
   ============================================================================ */
function renderizarFormatosAdmin() {
    const contenedor = document.getElementById('admin-formatos-lista');
    const catalogo = obtenerCatalogoFormatos();
    contenedor.innerHTML = catalogo.map((f, i) => `
        <div class="flex items-center gap-2 bg-dark-900 rounded-lg px-3 py-2">
            <input type="text" value="${f.nombre}" onchange="editarFormatoAdmin(${i}, 'nombre', this.value)" class="flex-1 min-w-0 bg-transparent text-white text-sm focus:outline-none border-b border-transparent focus:border-brand-yellow">
            <div class="flex items-center gap-1 text-gray-400 text-sm flex-shrink-0">
                <span>S/</span>
                <input type="number" min="0" step="0.5" value="${f.recargo}" onchange="editarFormatoAdmin(${i}, 'recargo', this.value)" class="w-16 bg-transparent text-white text-sm focus:outline-none border-b border-transparent focus:border-brand-yellow">
            </div>
            <button type="button" onclick="eliminarFormatoAdmin('${f.id}')" ${f.protegido ? `disabled title="Es el formato de entrada, no se puede eliminar"` : 'title="Eliminar"'} class="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${f.protegido ? 'opacity-30 cursor-not-allowed text-gray-500' : 'text-brand-red hover:bg-brand-red/10'}"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>
    `).join('');
}

window.editarFormatoAdmin = (indice, campo, valor) => {
    const catalogo = obtenerCatalogoFormatos();
    if (campo === 'nombre') {
        if (!Validadores.minLength(valor, 1)) { mostrarToast('El nombre no puede estar vacío.', 'error'); renderizarFormatosAdmin(); return; }
        catalogo[indice].nombre = valor.trim();
    } else {
        catalogo[indice].recargo = Math.max(0, Number(valor) || 0);
    }
    guardarCatalogoFormatos(catalogo);
    mostrarToast('Formato actualizado.', 'exito');
};

window.agregarFormatoAdmin = async () => {
    const inputNombre = document.getElementById('nuevo-formato-nombre');
    const inputRecargo = document.getElementById('nuevo-formato-recargo');
    if (!Validadores.minLength(inputNombre.value, 1)) { marcarCampoInvalido(inputNombre, 'Ingresa un nombre.'); return; }
    limpiarCampoInvalido(inputNombre);

    const catalogo = obtenerCatalogoFormatos();
    const id = inputNombre.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `formato-${Date.now()}`;
    if (catalogo.some(f => f.id === id)) { mostrarToast('Ya existe un formato con un nombre muy parecido.', 'error'); return; }

    const confirmado = await confirmarAccion({
        titulo: '¿Agregar formato?',
        mensaje: `Se agregará el formato "${inputNombre.value.trim()}" con S/ ${inputRecargo.value || 0} de recargo.`,
        tipo: 'info',
        textoConfirmar: 'Sí, agregar'
    });
    if (!confirmado) return;

    catalogo.push({ id, nombre: inputNombre.value.trim(), recargo: Math.max(0, Number(inputRecargo.value) || 0) });
    guardarCatalogoFormatos(catalogo);
    inputNombre.value = ''; inputRecargo.value = '';
    renderizarFormatosAdmin();
    mostrarToast('Formato agregado.', 'exito');
};

window.eliminarFormatoAdmin = async (id) => {
    const catalogo = obtenerCatalogoFormatos();
    const formato = catalogo.find(f => f.id === id);
    if (!formato || formato.protegido) return;

    // No se puede eliminar un formato que alguna sala o película ya tiene marcado, o que ya
    // tiene funciones programadas — evita que una función quede con un formato "fantasma".
    const enUso = obtenerDatosSalas().salas.some(s => (s.formatosSoportados || []).includes(id))
        || Object.values(baseDatosPeliculas).some(p => (p.formatosDisponibles || []).includes(id))
        || Object.values(baseDatosEstrenos).some(p => (p.formatosDisponibles || []).includes(id));
    if (enUso) { mostrarToast('Este formato está en uso por alguna sala o película; quítalo de ahí primero.', 'error'); return; }

    const confirmado = await confirmarAccion({ titulo: '¿Eliminar formato?', mensaje: `Se eliminará "${formato.nombre}" del catálogo.`, tipo: 'peligro', textoConfirmar: 'Sí, eliminar', textoCancelar: 'Cancelar' });
    if (!confirmado) return;

    guardarCatalogoFormatos(catalogo.filter(f => f.id !== id));
    renderizarFormatosAdmin();
    mostrarToast('Formato eliminado.', 'exito');
};

function renderizarTiposEntradaAdmin() {
    const contenedor = document.getElementById('admin-tipos-entrada-lista');
    const catalogo = obtenerCatalogoTiposEntrada();
    contenedor.innerHTML = catalogo.map((t, i) => `
        <div class="flex items-center gap-2 bg-dark-900 rounded-lg px-3 py-2">
            <input type="text" value="${t.nombre}" onchange="editarTipoEntradaAdmin(${i}, 'nombre', this.value)" class="flex-1 min-w-0 bg-transparent text-white text-sm focus:outline-none border-b border-transparent focus:border-brand-yellow">
            <div class="flex items-center gap-1 text-gray-400 text-sm flex-shrink-0">
                <input type="number" min="0" max="100" value="${t.descuentoPct}" onchange="editarTipoEntradaAdmin(${i}, 'descuentoPct', this.value)" class="w-14 bg-transparent text-white text-sm focus:outline-none border-b border-transparent focus:border-brand-yellow">
                <span>% dscto.</span>
            </div>
            <button type="button" onclick="eliminarTipoEntradaAdmin('${t.id}')" ${t.protegido ? `disabled title="Es el tipo por defecto, no se puede eliminar"` : 'title="Eliminar"'} class="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${t.protegido ? 'opacity-30 cursor-not-allowed text-gray-500' : 'text-brand-red hover:bg-brand-red/10'}"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>
    `).join('');
}

window.editarTipoEntradaAdmin = (indice, campo, valor) => {
    const catalogo = obtenerCatalogoTiposEntrada();
    if (campo === 'nombre') {
        if (!Validadores.minLength(valor, 1)) { mostrarToast('El nombre no puede estar vacío.', 'error'); renderizarTiposEntradaAdmin(); return; }
        catalogo[indice].nombre = valor.trim();
    } else {
        catalogo[indice].descuentoPct = Math.max(0, Math.min(100, Number(valor) || 0));
    }
    guardarCatalogoTiposEntrada(catalogo);
    mostrarToast('Tipo de entrada actualizado.', 'exito');
};

window.agregarTipoEntradaAdmin = async () => {
    const inputNombre = document.getElementById('nuevo-tipo-entrada-nombre');
    const inputDescuento = document.getElementById('nuevo-tipo-entrada-descuento');
    if (!Validadores.minLength(inputNombre.value, 1)) { marcarCampoInvalido(inputNombre, 'Ingresa un nombre.'); return; }
    limpiarCampoInvalido(inputNombre);

    const catalogo = obtenerCatalogoTiposEntrada();
    const id = inputNombre.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `tipo-${Date.now()}`;
    if (catalogo.some(t => t.id === id)) { mostrarToast('Ya existe un tipo de entrada con un nombre muy parecido.', 'error'); return; }

    const confirmado = await confirmarAccion({
        titulo: '¿Agregar tipo de entrada?',
        mensaje: `Se agregará "${inputNombre.value.trim()}" con un descuento del ${inputDescuento.value || 0}%.`,
        tipo: 'info',
        textoConfirmar: 'Sí, agregar'
    });
    if (!confirmado) return;

    catalogo.push({ id, nombre: inputNombre.value.trim(), descuentoPct: Math.max(0, Math.min(100, Number(inputDescuento.value) || 0)) });
    guardarCatalogoTiposEntrada(catalogo);
    inputNombre.value = ''; inputDescuento.value = '';
    renderizarTiposEntradaAdmin();
    mostrarToast('Tipo de entrada agregado.', 'exito');
};

window.eliminarTipoEntradaAdmin = async (id) => {
    const catalogo = obtenerCatalogoTiposEntrada();
    const tipo = catalogo.find(t => t.id === id);
    if (!tipo || tipo.protegido) return;
    const confirmado = await confirmarAccion({ titulo: '¿Eliminar tipo de entrada?', mensaje: `Se eliminará "${tipo.nombre}" del catálogo. Las compras ya hechas con este tipo no se ven afectadas (quedó guardado el nombre en el ticket).`, tipo: 'peligro', textoConfirmar: 'Sí, eliminar', textoCancelar: 'Cancelar' });
    if (!confirmado) return;

    guardarCatalogoTiposEntrada(catalogo.filter(t => t.id !== id));
    renderizarTiposEntradaAdmin();
    mostrarToast('Tipo de entrada eliminado.', 'exito');
};

window.cambiarMesCalendarioAdmin = (delta) => {
    calendarioAdminMesActual = new Date(calendarioAdminMesActual.getFullYear(), calendarioAdminMesActual.getMonth() + delta, 1);
    renderizarAdminCalendario();
};

function renderizarAdminCalendario() {
    const calendario = obtenerCalendarioFeriados();
    const anio = calendarioAdminMesActual.getFullYear();
    const mes = calendarioAdminMesActual.getMonth();
    document.getElementById('admin-calendario-mes-titulo').textContent = `${NOMBRES_MESES_CALENDARIO[mes]} ${anio}`;

    const primerDiaSemana = new Date(anio, mes, 1).getDay(); // 0 = domingo
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const grid = document.getElementById('admin-calendario-grid');
    let html = '';
    for (let i = 0; i < primerDiaSemana; i++) html += `<div></div>`;
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaISO = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const marca = calendario[fechaISO];
        let clase = 'admin-dia-calendario';
        if (marca && marca.tipo === 'feriado') clase += ' admin-dia-feriado';
        else if (marca && marca.tipo === 'no-laborable') clase += ' admin-dia-no-laborable';
        html += `<button type="button" onclick="abrirModalEditarFeriado('${fechaISO}')" class="${clase}" title="${marca ? marca.nombre : 'Día normal'}">${dia}</button>`;
    }
    grid.innerHTML = html;
}

window.abrirModalEditarFeriado = (fechaISO) => {
    const calendario = obtenerCalendarioFeriados();
    const marca = calendario[fechaISO];
    document.getElementById('feriado-fecha-iso').value = fechaISO;

    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const fechaLegible = new Date(anio, mes - 1, dia).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('feriado-fecha-legible').textContent = fechaLegible.charAt(0).toUpperCase() + fechaLegible.slice(1);
    document.getElementById('feriado-tipo').value = marca ? marca.tipo : '';
    document.getElementById('feriado-nombre').value = marca ? marca.nombre : '';

    const modal = document.getElementById('modal-editar-feriado');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('editar-feriado-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalEditarFeriado = () => {
    const modal = document.getElementById('modal-editar-feriado');
    modal.classList.add('opacity-0');
    document.getElementById('editar-feriado-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

window.guardarEdicionFeriado = () => {
    const fechaISO = document.getElementById('feriado-fecha-iso').value;
    const tipo = document.getElementById('feriado-tipo').value;
    const nombre = document.getElementById('feriado-nombre').value.trim();

    const calendario = obtenerCalendarioFeriados();
    if (!tipo) {
        delete calendario[fechaISO];
    } else {
        calendario[fechaISO] = { tipo, nombre: nombre || (tipo === 'feriado' ? 'Feriado' : 'Día no laborable') };
    }
    guardarCalendarioFeriados(calendario);
    renderizarAdminCalendario();
    cerrarModalEditarFeriado();
    mostrarToast('Calendario actualizado correctamente.', 'exito');
};
window.renderizarSala = renderizarAdminSalas;

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
}

window.crearCuponAdmin = async (e) => {
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
    
    if (cuponesGuardados[codigo]) {
        marcarCampoInvalido(inputCodigo, 'Este código ya está en uso.');
        mostrarToast('El código ya existe.', 'error');
        return;
    }

    const confirmado = await confirmarAccion({
        titulo: '¿Crear cupón?',
        mensaje: `Se creará el cupón "${codigo}" con un ${inputPorcentaje.value}% de descuento.`,
        tipo: 'info',
        textoConfirmar: 'Sí, crear'
    });
    if (!confirmado) return;

    cuponesGuardados[codigo] = { porcentaje: Number(inputPorcentaje.value), descripcion: inputDesc.value.trim() || 'Cupón creado por administrador' };
    localStorage.setItem(LS_CUPONES, JSON.stringify(cuponesGuardados));

    renderizarAdminDescuentos();
    e.target.reset();
    mostrarToast(`Cupón "${codigo}" creado correctamente.`, 'exito');
};

// --- 15.5 Dashboard: métricas simples ---
function renderizarAdminDashboard() {
    // FIX: antes solo sumaba usuarios[].compras, así que las compras de invitados (sin sesión)
    // no se contaban en el dashboard. obtenerVentasGenerales() incluye ambas, y migra sola los
    // datos antiguos la primera vez que se llama (ver utilidades.js) para no "perder" ventas.
    const ventas = obtenerVentasGenerales();
    let totalTickets = 0;
    let totalDulces = 0;
    let totalVentas = 0;
    let totalCompras = 0;

    ventas.forEach(compra => {
        totalCompras++;
        totalTickets += (compra.asientos || []).length;
        totalDulces += (compra.dulces || []).length;
        totalVentas += compra.total || 0;
    });

    document.getElementById('admin-dash-ventas').textContent = formatearMoneda(totalVentas);
    document.getElementById('admin-dash-compras').textContent = totalCompras;
    document.getElementById('admin-dash-tickets').textContent = totalTickets;
    document.getElementById('admin-dash-dulces').textContent = totalDulces;
}

/* ============================================================================
   MÓDULO 7/8 — PESTAÑA "SOCIOS": VISOR de socios (solo lectura + cumpleaños)
   ------------------------------------------------------------------------
   MÓDULO 8: esta pestaña ya NO canjea ni suma puntos a mano. Un canje o un
   puntaje sin una compra real detrás no es auditable y duplicaba el motor de
   puntos del checkout; ahora todo movimiento de puntos nace de una venta real
   (web, o "Nueva Venta" en counter). Aquí solo se busca al socio y se ve su
   carnet, nivel e historial. La única acción que se conserva es marcar la
   entrada de cumpleaños como usada: es un beneficio de una sola vez al año,
   sin monto asociado, no una transacción.
   Las validaciones son las mismas (ValidadoresSocio) que ve el cliente en su
   vista de beneficios y el counter en la venta.
   ============================================================================ */

let correoSocioAdminActivo = null; // recuerda qué socio se está consultando (para la acción de cumpleaños)
let filtroNivelSociosActivo = 'todos'; // 'todos' | 'bronce' | 'plata' | 'oro'

/** Limpia la pestaña Socios al entrar (sin resultado de búsqueda pendiente de una visita anterior). */
function reiniciarPanelSociosAdmin() {
    correoSocioAdminActivo = null;
    filtroNivelSociosActivo = 'todos';
    document.getElementById('admin-socio-resultado').classList.add('hidden');
    const inputBusqueda = document.getElementById('admin-socio-busqueda');
    if (inputBusqueda) inputBusqueda.value = '';
    renderizarListaSociosAdmin();
}

/* ============================================================================
   MÓDULO 9 — Socios: listado completo con filtro por nivel y buscador libre
   ============================================================================ */
window.filtrarNivelSocioAdmin = (nivel) => {
    filtroNivelSociosActivo = nivel;
    renderizarListaSociosAdmin();
};

window.filtrarListaSociosAdmin = () => renderizarListaSociosAdmin();

function renderizarListaSociosAdmin() {
    const todosLosSocios = obtenerUsuarios().filter(usuarioEsSocio);
    const termino = (document.getElementById('admin-socio-busqueda')?.value || '').trim().toLowerCase();

    const conteoPorNivel = { bronce: 0, plata: 0, oro: 0 };
    todosLosSocios.forEach(s => { const key = obtenerNivelSocio(s.puntos || 0).nombre.toLowerCase(); if (conteoPorNivel[key] !== undefined) conteoPorNivel[key]++; });

    const etiquetasFiltro = { todos: `Todos (${todosLosSocios.length})`, bronce: `Bronce (${conteoPorNivel.bronce})`, plata: `Plata (${conteoPorNivel.plata})`, oro: `Oro (${conteoPorNivel.oro})` };
    document.getElementById('admin-socios-filtros-nivel').innerHTML = Object.entries(etiquetasFiltro).map(([id, texto]) => `
        <button type="button" onclick="filtrarNivelSocioAdmin('${id}')" class="px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${filtroNivelSociosActivo === id ? 'bg-brand-yellow text-black border-brand-yellow' : 'bg-dark-900 text-gray-300 border-white/10 hover:border-white/30'}">${texto}</button>
    `).join('');

    const visibles = todosLosSocios.filter(s => {
        if (filtroNivelSociosActivo !== 'todos' && obtenerNivelSocio(s.puntos || 0).nombre.toLowerCase() !== filtroNivelSociosActivo) return false;
        if (!termino) return true;
        return [s.nombre, s.correo, s.codigoSocio, s.dniSimulado].filter(Boolean).some(campo => campo.toLowerCase().includes(termino));
    });

    document.getElementById('admin-socios-contador').textContent = `${visibles.length} de ${todosLosSocios.length} socio(s)`;

    const contenedor = document.getElementById('admin-socios-lista');
    if (visibles.length === 0) {
        contenedor.innerHTML = htmlEstadoVacio({ icono: 'fa-id-card', titulo: 'Sin resultados', subtitulo: 'Prueba con otro nombre, correo, código o filtro de nivel.' });
        return;
    }
    contenedor.innerHTML = visibles.map(s => {
        const nivel = obtenerNivelSocio(s.puntos || 0);
        const activo = s.correo === correoSocioAdminActivo;
        return `
        <button type="button" onclick="verSocioAdmin('${s.correo}')" class="w-full text-left bg-dark-900 hover:bg-dark-700 border ${activo ? 'border-brand-yellow' : 'border-white/5'} rounded-xl p-3 flex items-center gap-3 transition-colors">
            <div class="w-9 h-9 rounded-full bg-dark-800 border flex items-center justify-center flex-shrink-0 text-xs font-bold" style="border-color:${nivel.colorHex}; color:${nivel.colorHex}"><i class="fa-solid fa-user"></i></div>
            <div class="flex-grow min-w-0">
                <p class="text-white font-semibold text-sm truncate">${s.nombre}</p>
                <p class="text-gray-500 text-xs truncate">${s.correo} · <span class="font-mono">${s.codigoSocio || '—'}</span></p>
            </div>
            <div class="text-right flex-shrink-0">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase" style="background:${nivel.colorHex}22; color:${nivel.colorHex}; border:1px solid ${nivel.colorHex}55">${nivel.nombre}</span>
                <p class="text-brand-yellow font-bold text-sm mt-0.5">${s.puntos || 0} pts</p>
            </div>
        </button>`;
    }).join('');
}

/** Abre el detalle completo de un socio (clic en su tarjeta de la lista). */
window.verSocioAdmin = (correo) => {
    const socio = buscarSocio(correo);
    if (!socio) { mostrarToast('El socio ya no existe.', 'error'); return; }
    correoSocioAdminActivo = socio.correo;
    renderizarResultadoSocioAdmin(socio);
    renderizarListaSociosAdmin(); // refresca el resaltado de "seleccionado" en la lista
    document.getElementById('admin-socio-resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** Pinta la tarjeta de resultado con los datos y validadores del socio encontrado. */
function renderizarResultadoSocioAdmin(socio) {
    document.getElementById('admin-socio-resultado').classList.remove('hidden');
    document.getElementById('admin-socio-nombre').textContent = socio.nombre;
    document.getElementById('admin-socio-correo').textContent = socio.correo;
    document.getElementById('admin-socio-codigo').textContent = socio.codigoSocio;
    document.getElementById('admin-socio-puntos').textContent = `${socio.puntos} pts`;

    const nivel = obtenerNivelSocio(socio.puntos);
    const badge = document.getElementById('admin-socio-nivel-badge');
    badge.textContent = `Nivel ${nivel.nombre}`;
    badge.style.backgroundColor = `${nivel.colorHex}22`;
    badge.style.color = nivel.colorHex;
    badge.style.border = `1px solid ${nivel.colorHex}55`;

    // Validador de cumpleaños: mismo texto y misma condición que ve el cliente en su vista de beneficios.
    const cumple = ValidadoresSocio.tieneBeneficioCumpleanosDisponible(socio);
    document.getElementById('admin-socio-cumple-texto').textContent = cumple.ok ? '¡Le corresponde su entrada de cumpleaños!' : cumple.motivo;
    document.getElementById('admin-socio-btn-cumple').classList.toggle('hidden', !cumple.ok);

    // Validador de fila preferencial (según nivel).
    const fila = ValidadoresSocio.tieneFilaPreferencial(socio);
    document.getElementById('admin-socio-fila-texto').textContent = fila.ok ? 'Tiene fila preferencial' : fila.motivo;

    const historial = (socio.historialPuntos || []).slice(0, 10);
    const contenedorHistorial = document.getElementById('admin-socio-historial');
    if (historial.length === 0) {
        contenedorHistorial.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Este socio todavía no tiene movimientos de puntos.</p>';
    } else {
        contenedorHistorial.innerHTML = historial.map(mov => `
            <div class="flex justify-between items-center bg-dark-900 rounded-lg px-3 py-2 text-sm">
                <div>
                    <p class="text-gray-300">${mov.motivo}</p>
                    <p class="text-gray-500 text-xs">${new Date(mov.fecha).toLocaleString('es-PE')}</p>
                </div>
                <span class="font-bold ${mov.cantidad >= 0 ? 'text-green-400' : 'text-brand-red'}">${mov.cantidad >= 0 ? '+' : ''}${mov.cantidad} pts</span>
            </div>
        `).join('');
    }
}

/** Vuelve a cargar y pintar al socio activo desde localStorage (tras validar el cumpleaños). */
function refrescarSocioAdminActivo() {
    if (!correoSocioAdminActivo) return;
    const socio = buscarSocio(correoSocioAdminActivo);
    if (socio) renderizarResultadoSocioAdmin(socio);
}

window.validarCumpleanosAdmin = async () => {
    if (!correoSocioAdminActivo) return;
    const socio = buscarSocio(correoSocioAdminActivo);
    const validacion = ValidadoresSocio.tieneBeneficioCumpleanosDisponible(socio);
    if (!validacion.ok) { mostrarToast(validacion.motivo, 'error'); return; }

    const confirmado = await confirmarAccion({
        titulo: '¿Entregar entrada de cumpleaños?',
        mensaje: `Se marcará como usado el beneficio de cumpleaños de ${socio.nombre} para este año. Esta acción no se puede deshacer.`,
        tipo: 'advertencia',
        textoConfirmar: 'Sí, entregar',
        textoCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    marcarBeneficioCumpleanosUsado(correoSocioAdminActivo);
    mostrarToast('Entrada de cumpleaños entregada. ¡Que disfrute la función!', 'exito');
    refrescarSocioAdminActivo();
};

/* ============================================================================
   MÓDULO 8 — PESTAÑA "PERSONAL": CRUD de cuentas counter y admin
   ------------------------------------------------------------------------
   Solo gestiona cuentas de trabajo (rol 'counter' y 'admin'). Los clientes
   nacen del registro público y no se editan desde aquí. Toda la lógica de
   datos y las reglas (no eliminar/desactivar/degradar al último admin activo,
   nadie se modifica a sí mismo) viven en socios.js sección 8; este bloque
   solo pinta y comunica el resultado con toasts/confirmaciones.
   ============================================================================ */

let filtroPersonalActivo = 'todos'; // 'todos' | 'counter' | 'admin'
let correoPersonalEnEdicion = null;  // null = el modal está creando una cuenta nueva

/** Red de seguridad: cualquier acción de Personal exige una sesión de admin (no solo haber entrado al panel). */
function exigirAdminParaPersonal() {
    if (!usuarioActual || usuarioActual.rol !== 'admin') {
        mostrarToast('Acceso restringido: solo para administradores.', 'error');
        return false;
    }
    return true;
}

function escaparHtmlPersonal(texto) {
    return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

window.filtrarPersonalAdmin = (filtro) => {
    filtroPersonalActivo = filtro;
    renderizarAdminPersonal();
};

/** Pinta la lista de cuentas de personal con sus acciones (deshabilitando las que las reglas prohíben). */
function renderizarAdminPersonal() {
    const contenedor = document.getElementById('admin-personal-lista');
    if (!contenedor || !usuarioActual) return;

    const todos = listarPersonal();
    const cuentaCounter = todos.filter(u => u.rol === 'counter').length;
    const cuentaAdmin = todos.filter(u => u.rol === 'admin').length;

    const etiquetasFiltro = { todos: `Todos (${todos.length})`, counter: `Counter (${cuentaCounter})`, admin: `Administradores (${cuentaAdmin})` };
    document.getElementById('admin-personal-filtros').innerHTML = Object.entries(etiquetasFiltro).map(([id, texto]) => `
        <button type="button" onclick="filtrarPersonalAdmin('${id}')" class="px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${filtroPersonalActivo === id ? 'bg-brand-yellow text-black border-brand-yellow' : 'bg-dark-900 text-gray-300 border-white/10 hover:border-white/30'}">${texto}</button>
    `).join('');

    const termino = (document.getElementById('admin-personal-busqueda')?.value || '').trim().toLowerCase();
    const visibles = todos.filter(u => {
        if (filtroPersonalActivo !== 'todos' && u.rol !== filtroPersonalActivo) return false;
        if (!termino) return true;
        return [u.nombre, u.correo, u.dni].filter(Boolean).some(campo => campo.toLowerCase().includes(termino));
    });
    if (visibles.length === 0) {
        contenedor.innerHTML = htmlEstadoVacio({
            icono: 'fa-users-gear',
            titulo: 'Sin resultados',
            subtitulo: 'Prueba con otro nombre, correo, DNI o filtro de rol.',
            textoBoton: 'Nueva cuenta',
            accionBoton: 'abrirModalPersonal()'
        });
        return;
    }

    contenedor.innerHTML = visibles.map(u => {
        const activa = cuentaEstaActiva(u);
        const esYo = u.correo === usuarioActual.correo;
        const esUltimoAdmin = u.rol === 'admin' && contarAdminsActivos(todos, u.correo) === 0;
        const bloqueadaParaBaja = esYo || esUltimoAdmin;
        const motivoBloqueo = esYo ? 'No puedes hacerlo con tu propia cuenta' : 'Es el único administrador activo';
        const rolInfo = ROLES_PERSONAL[u.rol];
        const correoSeguro = escaparHtmlPersonal(u.correo);
        const claseBloqueado = 'opacity-40 cursor-not-allowed';

        return `
        <div class="bg-dark-800 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-xl ${activa ? '' : 'opacity-60'}">
            <div class="w-11 h-11 rounded-full bg-dark-900 border border-white/10 flex items-center justify-center flex-shrink-0">
                <i class="fa-solid ${u.rol === 'admin' ? 'fa-user-shield text-brand-yellow' : 'fa-cash-register text-brand-red'}"></i>
            </div>
            <div class="flex-grow min-w-0">
                <p class="text-white font-bold truncate">${escaparHtmlPersonal(u.nombre)}${esYo ? ' <span class="text-xs text-brand-yellow font-semibold">(tú)</span>' : ''}</p>
                <p class="text-gray-400 text-sm truncate">${correoSeguro}</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <span class="px-3 py-1 rounded-full text-xs font-bold border ${u.rol === 'admin' ? 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30' : 'bg-brand-red/10 text-brand-red border-brand-red/30'}">${rolInfo.nombre}</span>
                <span class="px-3 py-1 rounded-full text-xs font-bold border ${activa ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}">${activa ? 'Activa' : 'Desactivada'}</span>
            </div>
            <div class="flex gap-2">
                <button type="button" data-correo="${correoSeguro}" onclick="abrirFichaPersonal(this.dataset.correo)" title="Ver ficha" class="w-9 h-9 rounded-lg bg-dark-900 hover:bg-dark-700 border border-white/10 text-white flex items-center justify-center transition-colors"><i class="fa-solid fa-eye"></i></button>
                <button type="button" data-correo="${correoSeguro}" onclick="abrirModalPersonal(this.dataset.correo)" title="Editar" class="w-9 h-9 rounded-lg bg-dark-900 hover:bg-dark-700 border border-white/10 text-white flex items-center justify-center transition-colors"><i class="fa-solid fa-pen"></i></button>
                <button type="button" data-correo="${correoSeguro}" onclick="alternarEstadoPersonalAdmin(this.dataset.correo)" ${(activa && bloqueadaParaBaja) ? `disabled title="${motivoBloqueo}"` : `title="${activa ? 'Desactivar' : 'Activar'}"`} class="w-9 h-9 rounded-lg bg-dark-900 border border-white/10 text-white flex items-center justify-center transition-colors ${(activa && bloqueadaParaBaja) ? claseBloqueado : 'hover:bg-dark-700'}"><i class="fa-solid ${activa ? 'fa-user-slash' : 'fa-user-check'}"></i></button>
                <button type="button" data-correo="${correoSeguro}" onclick="eliminarPersonalAdmin(this.dataset.correo)" ${bloqueadaParaBaja ? `disabled title="${motivoBloqueo}"` : 'title="Eliminar"'} class="w-9 h-9 rounded-lg bg-dark-900 border border-white/10 text-brand-red flex items-center justify-center transition-colors ${bloqueadaParaBaja ? claseBloqueado : 'hover:bg-brand-red/10'}"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

/** Abre el modal en modo "crear" (sin argumento) o "editar" (con el correo de la cuenta). */
window.abrirModalPersonal = (correo = null) => {
    if (!exigirAdminParaPersonal()) return;

    const inputNombre = document.getElementById('personal-nombre');
    const inputCorreo = document.getElementById('personal-correo');
    const selectRol = document.getElementById('personal-rol');
    const inputContrasena = document.getElementById('personal-contrasena');
    const inputDni = document.getElementById('personal-dni');
    const inputTelefono = document.getElementById('personal-telefono');
    const inputNota = document.getElementById('personal-nota');
    [inputNombre, inputCorreo, inputContrasena, inputDni, inputTelefono].forEach(limpiarCampoInvalido);

    correoPersonalEnEdicion = correo;
    if (correo) {
        const cuenta = listarPersonal().find(u => u.correo === correo);
        if (!cuenta) { mostrarToast('La cuenta ya no existe.', 'error'); renderizarAdminPersonal(); return; }
        document.getElementById('personal-modal-titulo').textContent = 'Editar cuenta';
        inputNombre.value = cuenta.nombre;
        inputCorreo.value = cuenta.correo;
        inputCorreo.readOnly = true;
        inputCorreo.classList.add('opacity-60', 'cursor-not-allowed');
        inputDni.value = cuenta.dni || '';
        inputTelefono.value = cuenta.telefono || '';
        inputNota.value = cuenta.nota || '';
        selectRol.value = cuenta.rol;
        selectRol.disabled = cuenta.correo === usuarioActual.correo; // nadie cambia su propio rol
        inputContrasena.value = '';
        inputContrasena.placeholder = 'Dejar vacío para no cambiarla';
        document.getElementById('personal-ayuda-contrasena').textContent = 'Solo escribe algo si quieres restablecer la contraseña. El correo no se puede cambiar.';
    } else {
        document.getElementById('personal-modal-titulo').textContent = 'Nueva cuenta';
        inputNombre.value = '';
        inputCorreo.value = '';
        inputCorreo.readOnly = false;
        inputCorreo.classList.remove('opacity-60', 'cursor-not-allowed');
        inputDni.value = '';
        inputTelefono.value = '';
        inputNota.value = '';
        selectRol.value = 'counter';
        selectRol.disabled = false;
        inputContrasena.value = generarContrasenaTemporal();
        inputContrasena.placeholder = 'Mínimo 6 caracteres';
        document.getElementById('personal-ayuda-contrasena').textContent = 'Se generó una contraseña temporal; puedes cambiarla o generar otra. Anótala para entregársela: al guardar se muestra una sola vez.';
    }

    const modal = document.getElementById('modal-personal');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('personal-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalPersonal = () => {
    const modal = document.getElementById('modal-personal');
    modal.classList.add('opacity-0');
    document.getElementById('personal-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
    correoPersonalEnEdicion = null;
};

window.generarContrasenaPersonalAdmin = () => {
    const input = document.getElementById('personal-contrasena');
    input.value = generarContrasenaTemporal();
    limpiarCampoInvalido(input);
};

window.guardarPersonalAdmin = async (e) => {
    e.preventDefault();
    if (!exigirAdminParaPersonal()) return;

    const inputNombre = document.getElementById('personal-nombre');
    const inputCorreo = document.getElementById('personal-correo');
    const inputDni = document.getElementById('personal-dni');
    const inputTelefono = document.getElementById('personal-telefono');
    const inputNota = document.getElementById('personal-nota');
    const selectRol = document.getElementById('personal-rol');
    const inputContrasena = document.getElementById('personal-contrasena');
    const editando = correoPersonalEnEdicion !== null;

    // 1) Validación "frontend" (campo por campo, con mensaje bajo cada input). MÓDULO 9: DNI y
    // celular son obligatorios siempre (crear y editar), para tener trazabilidad real del personal.
    const reglas = [
        { input: inputNombre, prueba: () => Validadores.soloTexto(inputNombre.value), mensaje: 'Ingresa un nombre válido (solo letras).' },
        { input: inputDni, prueba: () => Validadores.dni(inputDni.value), mensaje: 'Ingresa un DNI válido (8 dígitos).' },
        { input: inputTelefono, prueba: () => Validadores.telefono(inputTelefono.value), mensaje: 'Ingresa un celular válido (9 dígitos, empieza con 9).' }
    ];
    if (!editando) {
        reglas.push({ input: inputCorreo, prueba: () => Validadores.correo(inputCorreo.value), mensaje: 'Ingresa un correo electrónico válido.' });
        reglas.push({ input: inputContrasena, prueba: () => Validadores.contrasena(inputContrasena.value), mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    } else if (inputContrasena.value) {
        reglas.push({ input: inputContrasena, prueba: () => Validadores.contrasena(inputContrasena.value), mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    if (!validarFormulario(reglas)) return;


    const confirmado = await confirmarAccion({
        titulo: editando ? '¿Guardar cambios?' : '¿Registrar personal?',
        mensaje: editando ? `Se actualizarán los datos de ${inputNombre.value.trim()}.` : `Se registrará a ${inputNombre.value.trim()} como nuevo miembro del personal.`,
        tipo: 'info',
        textoConfirmar: editando ? 'Sí, guardar' : 'Sí, registrar'
    });
    if (!confirmado) return;

    const contrasenaEscrita = inputContrasena.value;
    const datosComunes = { nombre: inputNombre.value, dni: inputDni.value, telefono: inputTelefono.value, nota: inputNota.value };

    // 2) Las reglas de negocio (correo duplicado, DNI duplicado, último admin, etc.) se repiten dentro de socios.js
    if (editando) {
        const rolElegido = selectRol.disabled ? undefined : selectRol.value;
        const resultado = actualizarCuentaPersonal(correoPersonalEnEdicion, { ...datosComunes, rol: rolElegido, contrasena: contrasenaEscrita || undefined }, usuarioActual.correo);
        if (!resultado.ok) { mostrarToast(resultado.motivo, 'error'); return; }

        const correoEditado = correoPersonalEnEdicion;
        cerrarModalPersonal();
        renderizarAdminPersonal();
        mostrarToast('Cuenta actualizada.', 'exito');
        if (contrasenaEscrita) {
            await alertaBonita({ titulo: 'Contraseña restablecida', mensaje: `Cuenta: ${correoEditado}
Nueva contraseña: ${contrasenaEscrita}

Entrégasela a la persona: no volverá a mostrarse.`, tipo: 'info' });
        }
        return;
    }

    const resultado = crearCuentaPersonal({ ...datosComunes, correo: inputCorreo.value, contrasena: contrasenaEscrita, rol: selectRol.value }, usuarioActual.correo);
    if (!resultado.ok) {
        if (resultado.motivo.includes('correo ya')) marcarCampoInvalido(inputCorreo, resultado.motivo);
        if (resultado.motivo.includes('DNI')) marcarCampoInvalido(inputDni, resultado.motivo);
        mostrarToast(resultado.motivo, 'error');
        return;
    }

    cerrarModalPersonal();
    renderizarAdminPersonal();
    mostrarToast(`Cuenta ${ROLES_PERSONAL[resultado.usuario.rol].nombre} creada.`, 'exito');
    await alertaBonita({ titulo: 'Cuenta creada', mensaje: `Correo: ${resultado.usuario.correo}
Contraseña: ${contrasenaEscrita}

Entrega estas credenciales a la persona: la contraseña no volverá a mostrarse.`, tipo: 'info' });
};

window.alternarEstadoPersonalAdmin = async (correo) => {
    if (!exigirAdminParaPersonal()) return;
    const cuenta = listarPersonal().find(u => u.correo === correo);
    if (!cuenta) { renderizarAdminPersonal(); return; }
    const activar = !cuentaEstaActiva(cuenta);

    if (!activar) {
        const confirmado = await confirmarAccion({
            titulo: '¿Desactivar cuenta?',
            mensaje: `${cuenta.nombre} no podrá iniciar sesión hasta que la vuelvas a activar. Su historial de ventas se conserva.`,
            tipo: 'advertencia',
            textoConfirmar: 'Sí, desactivar',
            textoCancelar: 'Cancelar'
        });
        if (!confirmado) return;
    }

    const resultado = cambiarEstadoCuentaPersonal(correo, activar, usuarioActual.correo);
    if (!resultado.ok) { mostrarToast(resultado.motivo, 'error'); return; }
    mostrarToast(activar ? 'Cuenta activada.' : 'Cuenta desactivada.', 'exito');
    renderizarAdminPersonal();
};

/* ============================================================================
   MÓDULO 9 — Ficha de detalle de una cuenta de Personal (solo lectura)
   ============================================================================ */
window.abrirFichaPersonal = (correo) => {
    const cuenta = listarPersonal().find(u => u.correo === correo);
    if (!cuenta) { mostrarToast('La cuenta ya no existe.', 'error'); renderizarAdminPersonal(); return; }

    const rolInfo = ROLES_PERSONAL[cuenta.rol];
    document.getElementById('ficha-personal-icono').className = `fa-solid ${cuenta.rol === 'admin' ? 'fa-user-shield text-brand-yellow' : 'fa-cash-register text-brand-red'}`;
    document.getElementById('ficha-personal-nombre').textContent = cuenta.nombre;
    const badge = document.getElementById('ficha-personal-rol-badge');
    badge.textContent = rolInfo.nombre;
    badge.className = `px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${cuenta.rol === 'admin' ? 'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/30' : 'bg-brand-red/10 text-brand-red border border-brand-red/30'}`;

    document.getElementById('ficha-personal-correo').textContent = cuenta.correo;
    document.getElementById('ficha-personal-dni').textContent = cuenta.dni || '—';
    document.getElementById('ficha-personal-telefono').textContent = cuenta.telefono || '—';
    document.getElementById('ficha-personal-contrasena').textContent = '••••••••';
    document.getElementById('ficha-personal-contrasena').dataset.real = cuenta.contrasena || '';
    document.getElementById('ficha-personal-icono-ojo').className = 'fa-solid fa-eye';

    const activa = cuentaEstaActiva(cuenta);
    const estadoEl = document.getElementById('ficha-personal-estado');
    estadoEl.innerHTML = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${activa ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'}">${activa ? 'Activa' : 'Desactivada'}</span>`;

    document.getElementById('ficha-personal-fecha-ingreso').textContent = cuenta.creadoEn ? new Date(cuenta.creadoEn).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    document.getElementById('ficha-personal-creado-por').textContent = cuenta.creadoPor || 'Cuenta original del sistema';
    document.getElementById('ficha-personal-nota').textContent = cuenta.nota || 'Sin notas.';
    document.getElementById('ficha-personal-btn-editar').dataset.correo = cuenta.correo;

    const modal = document.getElementById('modal-ficha-personal');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('ficha-personal-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarFichaPersonal = () => {
    const modal = document.getElementById('modal-ficha-personal');
    modal.classList.add('opacity-0');
    document.getElementById('ficha-personal-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

window.alternarVerContrasenaFicha = () => {
    const span = document.getElementById('ficha-personal-contrasena');
    const icono = document.getElementById('ficha-personal-icono-ojo');
    const oculta = span.textContent === '••••••••';
    span.textContent = oculta ? (span.dataset.real || '—') : '••••••••';
    icono.className = oculta ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
};

window.eliminarPersonalAdmin = async (correo) => {
    if (!exigirAdminParaPersonal()) return;
    const cuenta = listarPersonal().find(u => u.correo === correo);
    if (!cuenta) { renderizarAdminPersonal(); return; }

    const confirmado = await confirmarAccion({
        titulo: '¿Eliminar cuenta?',
        mensaje: `Se eliminará definitivamente la cuenta de ${cuenta.nombre} (${cuenta.correo}). Si solo quieres que no pueda entrar, usa "Desactivar".`,
        tipo: 'peligro',
        textoConfirmar: 'Sí, eliminar',
        textoCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    const resultado = eliminarCuentaPersonal(correo, usuarioActual.correo);
    if (!resultado.ok) { mostrarToast(resultado.motivo, 'error'); return; }
    mostrarToast('Cuenta eliminada.', 'exito');
    renderizarAdminPersonal();
};
