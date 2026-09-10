/* ============================================================================
   CINERAMA — ADMIN.JS — Panel de administrador completo
   ------------------------------------------------------------------------
   Parte de la arquitectura modular de Cinerama (Fase 14).
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
    const nombresSeccion = { cartelera: 'Cartelera', dulceria: 'Dulcería', salas: 'Salas (Mantenimiento)', calendario: 'Calendario (Feriados)', descuentos: 'Descuentos', dashboard: 'Dashboard' };
    const breadcrumb = document.getElementById('admin-breadcrumb-actual');
    if (breadcrumb) breadcrumb.textContent = nombresSeccion[tab] || tab;

    if (tab === 'cartelera') { renderizarAdminCartelera(); renderizarAdminBanner(); }
    if (tab === 'dulceria') { renderizarAdminDulceria(); renderizarListaCategoriasDulceria(); }
    if (tab === 'salas') renderizarAdminSalas();
    if (tab === 'calendario') renderizarAdminCalendario();
    if (tab === 'descuentos') renderizarAdminDescuentos();
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

/** Duración (en minutos) de la película actualmente cargada en el gestor de horarios, ya sea existente o en borrador. */
function obtenerDuracionActualFormularioHorarios() {
    if (gestorHorariosEsBorrador) {
        const inputDuracion = document.getElementById('admin-pelicula-duracion');
        return duracionAMinutos(inputDuracion ? inputDuracion.value : '');
    }
    const id = document.getElementById('horarios-pelicula-id').value;
    const pelicula = baseDatosPeliculas[id];
    return duracionAMinutos(pelicula ? pelicula.duracion : '');
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

// Estado de trabajo del modal de horarios: lista plana { fecha, formato, hora, sala } pendiente de guardar
let horariosPendientesModal = [];
let funcionesBorradorNuevaPelicula = [];
let gestorHorariosEsBorrador = false;

function construirHorariosDesdeLista(lista) {
    const horarios = {};
    lista.forEach(h => {
        if (!horarios[h.fecha]) horarios[h.fecha] = [];
        let funcion = horarios[h.fecha].find(f => f.formato === h.formato);
        if (!funcion) { funcion = { formato: h.formato, horas: [] }; horarios[h.fecha].push(funcion); }
        funcion.horas.push({ hora: h.hora, sala: h.sala });
    });
    return horarios;
}

/** Inicializa los chips de selección única de Formato (Módulo 3) y sincroniza el input oculto. */
function inicializarChipsFormatoHorario() {
    let dimension = '2D';
    let idioma = 'Doblada';
    const actualizarInputOculto = () => {
        document.getElementById('horario-nuevo-formato').value = `${dimension} / ${idioma}`;
    };
    renderizarGrupoChipsUnico('horario-nuevo-formato-dimension', ['2D', '3D'], '2D', (valor) => { dimension = valor; actualizarInputOculto(); });
    renderizarGrupoChipsUnico('horario-nuevo-formato-idioma', ['Doblada', 'Subtitulada'], 'Doblada', (valor) => { idioma = valor; actualizarInputOculto(); });
}

window.actualizarTipoPeliculaAdmin = async () => {
    const checkboxEstreno = document.getElementById('admin-pelicula-es-estreno');
    const esEstreno = checkboxEstreno.checked;
    const mensaje = document.getElementById('admin-pelicula-tipo-mensaje');
    const botonFunciones = document.getElementById('btn-crear-funciones-nueva-pelicula');

    if (esEstreno && funcionesBorradorNuevaPelicula.length > 0) {
        const continuar = await confirmarAccion({
            titulo: '¿Cambiar a Próximo Estreno?',
            mensaje: 'Al cambiar a Próximo Estreno se descartarán las funciones que ya preparaste para esta película.',
            tipo: 'advertencia',
            textoConfirmar: 'Sí, descartar y continuar',
            textoCancelar: 'Cancelar'
        });
        if (!continuar) {
            checkboxEstreno.checked = false;
            return;
        }
    }
    if (esEstreno) funcionesBorradorNuevaPelicula = [];
    if (mensaje) mensaje.textContent = esEstreno
        ? 'PRÓXIMO ESTRENO: Se publicará sin funciones hasta que pase a cartelera.'
        : 'EN CARTELERA: Debes crear al menos una función.';
    if (botonFunciones) botonFunciones.classList.toggle('hidden', esEstreno);

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

/** Refresca el <select> de sala del modal de horarios, considerando choques globales Y los horarios aún no guardados. */
window.refrescarSalaModalHorarios = () => {
    const fechaInput = document.getElementById('horario-nuevo-fecha');
    const horaInput = document.getElementById('horario-nuevo-hora');
    const selectSala = document.getElementById('horario-nuevo-sala');
    const idActual = document.getElementById('horarios-pelicula-id').value;
    if (!fechaInput || !horaInput || !selectSala) return;

    const fechaAmigable = fechaInput.value ? formatearFechaAmigable(fechaInput.value) : null;
    const duracionMinutos = obtenerDuracionActualFormularioHorarios();
    const ocupadasGlobal = (fechaAmigable && horaInput.value) ? obtenerSalasOcupadas(fechaAmigable, horaInput.value, duracionMinutos, idActual) : new Set();

    const ocupadasPendientes = new Set();
    if (fechaAmigable && horaInput.value) {
        const inicioNueva = horaAMinutos(horaInput.value);
        const finNueva = inicioNueva !== null ? inicioNueva + duracionMinutos + MARGEN_LIMPIEZA_MINUTOS : null;
        horariosPendientesModal.forEach(h => {
            if (h.fecha !== fechaAmigable) return;
            const inicioExistente = horaAMinutos(h.hora);
            if (inicioExistente === null || finNueva === null) return;
            const finExistente = inicioExistente + duracionMinutos + MARGEN_LIMPIEZA_MINUTOS;
            if (inicioNueva < finExistente && inicioExistente < finNueva) ocupadasPendientes.add(h.sala);
        });
    }

    const todasOcupadas = new Set([...ocupadasGlobal, ...ocupadasPendientes]);
    const salaPrevia = Number(selectSala.value) || 1;
    poblarSelectSalasDisponibles(selectSala, todasOcupadas, salaPrevia);

    const opcionSeleccionada = selectSala.options[selectSala.selectedIndex];
    document.getElementById('horario-nuevo-aviso').classList.toggle('hidden', !(opcionSeleccionada && opcionSeleccionada.disabled));
};

/** Agrega el horario del mini-formulario a la lista de trabajo (validando fecha/hora/formato y choque de sala). */
window.agregarHorarioPendiente = () => {
    const fechaInput = document.getElementById('horario-nuevo-fecha');
    const formatoInput = document.getElementById('horario-nuevo-formato');
    const horaInput = document.getElementById('horario-nuevo-hora');
    const salaInput = document.getElementById('horario-nuevo-sala');
    const idActual = document.getElementById('horarios-pelicula-id').value;

    if (!fechaInput.value) { mostrarToast('Selecciona una fecha para la función.', 'error'); return; }
    if (!formatoInput.value.trim()) { mostrarToast('Ingresa el formato (ej: 2D Doblada).', 'error'); return; }
    if (!horaInput.value) { mostrarToast('Selecciona una hora para la función.', 'error'); return; }

    const fechaAmigable = formatearFechaAmigable(fechaInput.value);
    const sala = Number(salaInput.value);
    const duracionMinutos = obtenerDuracionActualFormularioHorarios();

    const ocupadasGlobal = obtenerSalasOcupadas(fechaAmigable, horaInput.value, duracionMinutos, idActual);

    const inicioNueva = horaAMinutos(horaInput.value);
    const finNueva = inicioNueva + duracionMinutos + MARGEN_LIMPIEZA_MINUTOS;
    const chocaConPendiente = horariosPendientesModal.some(h => {
        if (h.fecha !== fechaAmigable || h.sala !== sala) return false;
        const inicioExistente = horaAMinutos(h.hora);
        if (inicioExistente === null) return false;
        const finExistente = inicioExistente + duracionMinutos + MARGEN_LIMPIEZA_MINUTOS;
        return inicioNueva < finExistente && inicioExistente < finNueva;
    });

    if (ocupadasGlobal.has(sala) || chocaConPendiente) {
        mostrarToast(`La Sala ${sala} no está libre a esa hora: se necesitan ${MARGEN_LIMPIEZA_MINUTOS} min de limpieza entre funciones.`, 'error');
        document.getElementById('horario-nuevo-aviso').classList.remove('hidden');
        return;
    }

    horariosPendientesModal.push({ fecha: fechaAmigable, formato: formatoInput.value.trim(), hora: horaInput.value, sala });
    renderizarListaHorariosPendientes();

    horaInput.value = '';
    document.getElementById('horario-nuevo-aviso').classList.add('hidden');
    refrescarSalaModalHorarios();
    mostrarToast('Horario agregado a la lista. No olvides "Guardar Horarios".', 'info');
};

/** Quita un horario pendiente de la lista de trabajo (aún no guardado). */
window.quitarHorarioPendiente = (indice) => {
    horariosPendientesModal.splice(indice, 1);
    renderizarListaHorariosPendientes();
    refrescarSalaModalHorarios();
};

/** Pinta la lista de horarios pendientes, agrupados por fecha, con su botón de quitar. */
function renderizarListaHorariosPendientes() {
    const contenedor = document.getElementById('lista-horarios-pendientes');
    if (!contenedor) return;

    if (horariosPendientesModal.length === 0) {
        contenedor.innerHTML = '<p class="text-gray-500 text-sm italic">Aún no hay horarios. Agrega al menos uno.</p>';
        return;
    }

    const porFecha = {};
    horariosPendientesModal.forEach((h, indice) => {
        if (!porFecha[h.fecha]) porFecha[h.fecha] = [];
        porFecha[h.fecha].push({ ...h, indice });
    });

    let html = '';
    Object.entries(porFecha).forEach(([fecha, horarios]) => {
        html += `<div class="bg-dark-900 border border-white/10 rounded-xl p-3">
            <p class="text-brand-yellow font-bold text-sm mb-2">${fecha}</p>
            <div class="flex flex-wrap gap-2">`;
        horarios.forEach(h => {
            html += `<span class="inline-flex items-center gap-2 bg-dark-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white">
                <span class="font-bold">${h.hora}</span> <span class="text-gray-400">${h.formato}</span> <span class="text-brand-red font-bold">Sala ${h.sala}</span>
                <button type="button" onclick="quitarHorarioPendiente(${h.indice})" class="text-gray-500 hover:text-brand-red ml-1"><i class="fa-solid fa-xmark"></i></button>
            </span>`;
        });
        html += `</div></div>`;
    });
    contenedor.innerHTML = html;
}

/** Abre el modal de horarios de una película, precargando sus funciones actuales como lista de trabajo. */
window.abrirModalHorarios = (peliculaId) => {
    const pelicula = baseDatosPeliculas[peliculaId];
    if (!pelicula) { mostrarToast('Esta película no tiene horarios propios (es un Próximo Estreno).', 'error'); return; }

    gestorHorariosEsBorrador = false;
    document.getElementById('horarios-pelicula-id').value = peliculaId;
    document.getElementById('horarios-pelicula-titulo').textContent = pelicula.titulo;

    // Aplana la estructura fecha -> [{formato, horas}] en una lista de trabajo plana
    horariosPendientesModal = [];
    Object.entries(pelicula.horarios || {}).forEach(([fecha, funciones]) => {
        funciones.forEach(funcion => {
            (funcion.horas || []).forEach(horaRaw => {
                const { hora, sala } = normalizarFuncionHorario(horaRaw);
                horariosPendientesModal.push({ fecha, formato: funcion.formato, hora, sala });
            });
        });
    });

    renderizarListaHorariosPendientes();

    document.getElementById('horario-nuevo-fecha').value = '';
    document.getElementById('horario-nuevo-hora').value = '';
    document.getElementById('horario-nuevo-aviso').classList.add('hidden');
    inicializarChipsFormatoHorario();
    poblarSelectSalasDisponibles(document.getElementById('horario-nuevo-sala'), new Set(), 1);

    const modal = document.getElementById('modal-horarios-pelicula');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('horarios-pelicula-contenido').classList.remove('scale-95'); }, 10);
};

window.cerrarModalHorarios = () => {
    const modal = document.getElementById('modal-horarios-pelicula');
    modal.classList.add('opacity-0');
    document.getElementById('horarios-pelicula-contenido').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

/** Abre el gestor antes de guardar una película nueva y conserva sus funciones como borrador. */
window.abrirCrearFuncionesNuevaPelicula = () => {
    const titulo = document.getElementById('admin-pelicula-titulo');
    const duracion = document.getElementById('admin-pelicula-duracion');
    const esEstreno = document.getElementById('admin-pelicula-es-estreno').checked;
    if (esEstreno) {
        mostrarToast('Los próximos estrenos no requieren funciones. Desactiva el switch para programarlas.', 'info');
        return;
    }
    if (!Validadores.minLength(titulo.value, 2)) {
        validarFormulario([{ input: titulo, prueba: () => Validadores.minLength(titulo.value, 2), mensaje: 'Ingresa el título antes de crear funciones.' }]);
        return;
    }
    if (duracionAMinutos(duracion.value) <= 0) {
        validarFormulario([{ input: duracion, prueba: () => duracionAMinutos(duracion.value) > 0, mensaje: 'Ingresa la duración antes de crear funciones (la necesitamos para el margen de limpieza entre funciones).' }]);
        return;
    }
    gestorHorariosEsBorrador = true;
    document.getElementById('horarios-pelicula-id').value = '';
    document.getElementById('horarios-pelicula-titulo').textContent = `${titulo.value.trim()} — funciones por guardar`;
    horariosPendientesModal = funcionesBorradorNuevaPelicula.map(h => ({ ...h }));
    renderizarListaHorariosPendientes();
    document.getElementById('horario-nuevo-fecha').value = '';
    document.getElementById('horario-nuevo-hora').value = '';
    document.getElementById('horario-nuevo-aviso').classList.add('hidden');
    inicializarChipsFormatoHorario();
    poblarSelectSalasDisponibles(document.getElementById('horario-nuevo-sala'), new Set(), 1);
    const modal = document.getElementById('modal-horarios-pelicula');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('horarios-pelicula-contenido').classList.remove('scale-95'); }, 10);
};

/** Reconstruye el objeto horarios{fecha: [{formato,horas}]} desde la lista de trabajo y lo persiste. */
window.guardarHorariosPelicula = () => {
    if (horariosPendientesModal.length === 0) {
        mostrarToast('Debes dejar al menos un horario programado para esta película.', 'error');
        return;
    }

    if (gestorHorariosEsBorrador) {
        funcionesBorradorNuevaPelicula = horariosPendientesModal.map(h => ({ ...h }));
        cerrarModalHorarios();
        mostrarToast('Funciones preparadas. Ahora confirma con “Agregar a Cartelera”.', 'exito');
        return;
    }

    const id = document.getElementById('horarios-pelicula-id').value;
    const pelicula = baseDatosPeliculas[id];
    if (!pelicula) { cerrarModalHorarios(); return; }
    pelicula.horarios = construirHorariosDesdeLista(horariosPendientesModal);
    guardarCarteleraEnStorage();
    renderizarAdminCartelera();
    renderizarGridsInicio();
    cerrarModalHorarios();
    mostrarToast('Horarios actualizados correctamente.', 'exito');
};

/** Puente desde el modal "Editar Película": cierra ese modal y abre el gestor de horarios de la misma película. */
window.abrirHorariosDesdeEdicion = () => {
    const id = document.getElementById('edit-pelicula-id').value;
    cerrarModalEditarPelicula();
    setTimeout(() => abrirModalHorarios(id), 220); // espera a que termine la animación de cierre
};


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
                <button onclick="abrirModalHorarios('${p.id}')" class="text-gray-500 hover:text-brand-yellow transition-colors" title="Horarios"><i class="fa-solid fa-calendar-days"></i></button>
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
        { input: duracion, prueba: () => duracionAMinutos(duracion.value) > 0, mensaje: 'Ingresa la duración (ej: 02h 10m).' }
    ]);
    if (!valido) return;

    if (!esEstreno && funcionesBorradorNuevaPelicula.length === 0) {
        mostrarToast('Antes de agregar una película de cartelera, usa “Crear Funciones” y guarda al menos una función.', 'error');
        return;
    }

    const imagen = await obtenerImagenDesdeFormulario('pelicula');
    if (!imagen) {
        mostrarToast('Ingresa una URL de imagen o carga un archivo para el póster.', 'error');
        return;
    }

    const id = 'peli_' + Date.now();
    const datosBase = {
        id, titulo: titulo.value.trim(), genero: genero.value.trim(), duracion: duracion.value.trim(),
        clasificacion: edad.value,
        poster: imagen,
        banner: imagen,
        sinopsis: sinopsis.value.trim() || 'Sinopsis pendiente de configurar.',
        trailer: trailer.value.trim() || '#'
    };

    if (esEstreno) {
        baseDatosEstrenos[id] = datosBase;
    } else {
        baseDatosPeliculas[id] = {
            ...datosBase,
            tipoLanzamiento: lanzamiento.value, // Módulo 3: solo aplica a películas ya en Cartelera
            horarios: construirHorariosDesdeLista(funcionesBorradorNuevaPelicula)
        };
    }

    guardarCarteleraEnStorage();
    renderizarAdminCartelera();
    renderizarGridsInicio();
    e.target.reset();
    document.getElementById('admin-pelicula-poster-url').classList.remove('hidden');
    document.getElementById('admin-pelicula-poster-archivo').classList.add('hidden');
    renderizarSelectorChipsMultiple('admin-pelicula-genero-chips', 'admin-pelicula-genero', GENEROS_DISPONIBLES, ''); // Módulo 3: limpia los chips tras guardar
    funcionesBorradorNuevaPelicula = [];
    actualizarTipoPeliculaAdmin();
    actualizarPreviewImagenAdmin('admin-pelicula-preview', ''); // FASE 8: limpia la vista previa tras guardar
    mostrarToast(esEstreno ? 'Estreno agregado correctamente.' : 'Película y funciones agregadas a la cartelera.', 'exito');
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
    document.getElementById('edit-pelicula-es-estreno').checked = origen === 'estreno';
    renderizarSelectorChipsMultiple('edit-pelicula-genero-chips', 'edit-pelicula-genero', GENEROS_DISPONIBLES, pelicula.genero || ''); // Módulo 3
    actualizarLanzamientoVisibleEdicion(); // Módulo 3: oculta "lanzamiento" si es Próximo Estreno

    // Restablece el selector de imagen a "URL" (con el póster actual precargado)
    const radioUrl = document.querySelector('input[name="edit-pelicula-origen-img"][value="url"]');
    if (radioUrl) radioUrl.checked = true;
    alternarOrigenImagenAdmin('edit-pelicula');
    actualizarPreviewImagenAdmin('edit-pelicula-preview', pelicula.poster || ''); // FASE 8: preview del póster actual

    // FASE 12: "Editar Horarios" solo aplica a películas de Cartelera (los estrenos aún no tienen horarios)
    document.getElementById('btn-editar-horarios-desde-edicion').classList.toggle('hidden', origen !== 'cartelera');

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
        { input: duracion, prueba: () => duracionAMinutos(duracion.value) > 0, mensaje: 'Ingresa la duración (ej: 02h 10m).' }
    ]);
    if (!valido) return;

    const imagenNueva = await obtenerImagenDesdeFormulario('edit-pelicula');
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
        banner: imagenNueva || peliculaOriginal.banner
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
            datosActualizados.horarios = peliculaOriginal.horarios || { 'Hoy, 26 Ago': [{ formato: '2D / Doblada', horas: [{ hora: '15:00', sala: 1 }] }] };
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
        contenedor.innerHTML = '<p class="text-gray-500 text-sm italic col-span-full">Aún no hay categorías. Crea la primera arriba.</p>';
        return;
    }
    contenedor.innerHTML = categoriasDulceria.map(cat => {
        const cantidad = contarProductosPorCategoria(cat.id);
        return `
            <div class="flex items-center justify-between bg-dark-900 border border-white/5 rounded-xl p-3 gap-2">
                <div class="min-w-0">
                    <p class="text-white font-bold text-sm truncate">${cat.nombre}</p>
                    <p class="text-gray-500 text-xs">${cantidad} producto${cantidad === 1 ? '' : 's'}</p>
                </div>
                <button type="button" onclick="eliminarCategoriaDulceriaAdmin('${cat.id}')" class="text-gray-500 hover:text-brand-red transition-colors flex-shrink-0" title="Eliminar categoría"><i class="fa-solid fa-trash"></i></button>
            </div>`;
    }).join('');
}

window.crearCategoriaDulceriaAdmin = (e) => {
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

    categoriasDulceria.push({ id: `cat_${Date.now()}`, nombre });
    guardarCategoriasDulceriaEnStorage();

    renderizarListaCategoriasDulceria();
    renderizarAdminDulceria();
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
    const vendidas = obtenerButacasVendidasPorSala(salaMantenimientoActual); // Módulo 4: solo informativo, ya no bloquea
    grid.innerHTML = sala.asientos.map(asiento => {
        const id = `${asiento.f}${asiento.c}`;
        const esVendida = vendidas.has(id);
        if (asiento.estado === 'pasadizo') return `<button class="butaca-matriz pasadizo" onclick="editarEstructuraButaca('${id}')" title="Pasadizo"></button>`;
        const accion = pestanaSalaActiva === 'estructura' ? `editarEstructuraButaca('${id}', event)` : `cambiarEstadoButaca('${id}')`;
        const icono = asiento.estado === 'accesible' ? '<i class="fa-solid fa-wheelchair"></i>' : id;
        const claseVendida = esVendida ? ' vendida-editable' : '';
        const tituloVendida = esVendida ? ' (vendida — puedes editarla igual)' : '';
        return `<button class="butaca-matriz ${asiento.estado}${claseVendida}" onclick="${accion}" title="${id}${tituloVendida}">${icono}</button>`;
    }).join('');
    actualizarContadorSala(sala);

    const btnGuardar = document.getElementById('btn-guardar-cambios-sala');
    if (btnGuardar) btnGuardar.classList.toggle('boton-cambios-pendientes', haySalaCambiosSinGuardar);
}

window.generarMatriz = async () => {
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
    const sala = obtenerBorradorSalaActual();
    const asiento = sala.asientos.find(item => `${item.f}${item.c}` === id);
    if (!asiento) return;
    asiento.estado = asiento.estado === 'pasadizo' ? 'disponible' : 'pasadizo';
    marcarSalaComoModificada();
    renderizarAdminSalas();
};

window.cambiarEstadoButaca = (id) => {
    if (pestanaSalaActiva !== 'estados') return;
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
