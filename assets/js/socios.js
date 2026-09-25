/* ============================================================================
   CINE NÁUTICA — SOCIOS.JS — Programa de Lealtad "Socio Náutica"
   ------------------------------------------------------------------------
   MÓDULO 7 (nuevo). Toda la lógica de negocio de puntos, niveles y
   validadores de beneficios vive AQUÍ, separada de cliente.js/admin.js.

   *** NOTA PARA LA MIGRACIÓN A SUPABASE ***
   Hoy todo se lee/escribe de LS_USUARIOS (localStorage). El día que se
   conecte Supabase, lo único que debería cambiar es el INTERIOR de las
   funciones de la sección "1. ACCESO A DATOS" (reemplazar
   localStorage.getItem/setItem por await supabase.from('usuarios')... y
   el historial de puntos por su propia tabla `historial_puntos`). La FIRMA
   de cada función (qué recibe y qué devuelve) está pensada para NO cambiar,
   así que cliente.js y admin.js no tendrían que tocarse. Donde haga falta
   convertir esto a async/await para Supabase, se marca con "ASYNC-READY".

   MÓDULO 8 (roles): la app ahora tiene TRES roles de negocio —
     'cliente' -> es el ÚNICO rol que es "socio" (puntos, nivel, código, cumpleaños).
     'counter' -> staff de caja del local físico. Herramienta de trabajo, NO es socio.
     'admin'   -> administración. Tampoco es socio.
   usuarioEsSocio() es el único punto de verdad para saber si algo del programa de
   lealtad aplica; cliente.js/admin.js lo usan en vez de mirar solo `usuarioActual`.
   La sección 8 (cuentas de Personal) también vive aquí, con el mismo patrón de acceso
   a datos, para que migrar a Supabase siga siendo cambiar solo el interior de estas funciones.
   ============================================================================ */

/* ============================================================================
   0. CONFIGURACIÓN DEL PROGRAMA (un solo lugar para ajustar las reglas)
   ============================================================================ */
const PUNTOS_POR_SOL_GASTADO = 1;              // 1 punto por cada S/ 1 del total pagado (redondeado hacia abajo)
const PUNTOS_MINIMOS_PARA_CANJEAR = 50;        // no se puede canjear por debajo de este saldo
const VALOR_SOLES_POR_PUNTO = 0.10;            // cada punto canjeado equivale a S/ 0.10 de descuento
const MAX_PORCENTAJE_DESCUENTO_POR_PUNTOS = 0.5; // los puntos no pueden cubrir más del 50% del subtotal de una compra

// Niveles del programa, ordenados de menor a mayor. `multiplicador` se aplica
// a los puntos que se GANAN en cada compra (no a los ya acumulados).
const NIVELES_SOCIO = [
    { id: 'bronce', nombre: 'Bronce', minPuntos: 0, multiplicador: 1, colorHex: '#CD7F32', filaPreferencial: false },
    { id: 'plata', nombre: 'Plata', minPuntos: 300, multiplicador: 1.10, colorHex: '#C0C0C0', filaPreferencial: true },
    { id: 'oro', nombre: 'Oro', minPuntos: 800, multiplicador: 1.25, colorHex: '#FFD700', filaPreferencial: true }
];

// MÓDULO 8: cuentas de trabajo que gestiona Admin > Personal (los clientes NO se gestionan ahí).
const ROLES_PERSONAL = {
    counter: { id: 'counter', nombre: 'Counter (caja)' },
    admin: { id: 'admin', nombre: 'Administrador' }
};

// MÓDULO 8: campos que pertenecen SOLO a un socio. Si una cuenta de personal los trae de una
// versión anterior (ej. el admin demo), se eliminan al arrancar (ver asegurarCamposSocioParaTodos).
const CAMPOS_SOCIO = ['codigoSocio', 'puntos', 'historialPuntos', 'fechaNacimiento', 'cumpleUsadoEnAnio', 'dniSimulado'];

/* ============================================================================
   1. ACCESO A DATOS (hoy: LS_USUARIOS. Mañana: tabla `usuarios` de Supabase)
   ============================================================================ */

function obtenerUsuarios() {
    return JSON.parse(localStorage.getItem(LS_USUARIOS)) || [];
}

function guardarUsuarios(usuarios) {
    return guardarEnLocalStorageSeguro(LS_USUARIOS, usuarios);
}

/** MÓDULO 8: ¿este usuario es un SOCIO del programa de lealtad? Solo el rol 'cliente'. Counter y admin nunca. */
function usuarioEsSocio(usuario) {
    return Boolean(usuario && usuario.rol === 'cliente');
}

/** MÓDULO 8: ¿es una cuenta de personal (counter o admin)? */
function usuarioEsPersonal(usuario) {
    return Boolean(usuario && ROLES_PERSONAL[usuario.rol]);
}

/** MÓDULO 8: una cuenta está activa salvo que tenga `activo === false` (las cuentas viejas no traen el campo). */
function cuentaEstaActiva(usuario) {
    return Boolean(usuario) && usuario.activo !== false;
}

/** Sincroniza usuarioActual/LS_USUARIO_ACTUAL cuando el socio modificado es el que tiene la sesión abierta. */
function sincronizarUsuarioActualSiCorresponde(usuarioActualizado) {
    if (usuarioActual && usuarioActual.correo === usuarioActualizado.correo) {
        usuarioActual = usuarioActualizado;
        localStorage.setItem(LS_USUARIO_ACTUAL, JSON.stringify(usuarioActual));
    }
}

/** Genera un código de socio único (ej. CIN-8F3A21), verificando que no choque con uno ya existente. */
function generarCodigoSocioUnico(usuariosExistentes) {
    let codigo;
    do {
        codigo = `CIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    } while (usuariosExistentes.some(u => u.codigoSocio === codigo));
    return codigo;
}

/** Rellena en un usuario los campos del programa de socios que no tenga (retrocompatibilidad). Muta el objeto y devuelve true si hubo cambios. */
function normalizarCamposSocio(usuario, usuariosExistentes) {
    if (!usuarioEsSocio(usuario)) return false; // MÓDULO 8: counter/admin se saltan por completo (nunca reciben código, puntos ni nivel)
    let cambio = false;
    if (!usuario.codigoSocio) { usuario.codigoSocio = generarCodigoSocioUnico(usuariosExistentes); cambio = true; }
    if (typeof usuario.puntos !== 'number') { usuario.puntos = 0; cambio = true; }
    if (!Array.isArray(usuario.historialPuntos)) { usuario.historialPuntos = []; cambio = true; }
    if (usuario.fechaNacimiento === undefined) { usuario.fechaNacimiento = null; cambio = true; }
    if (usuario.cumpleUsadoEnAnio === undefined) { usuario.cumpleUsadoEnAnio = null; cambio = true; }
    return cambio;
}

/** MÓDULO 8: quita de una cuenta de personal los campos que solo tiene un socio. Muta el objeto y devuelve true si hubo cambios. */
function limpiarCamposSocio(usuario) {
    let cambio = false;
    CAMPOS_SOCIO.forEach(campo => {
        if (campo in usuario) { delete usuario[campo]; cambio = true; }
    });
    return cambio;
}

/** Se llama una vez al arrancar la app (main.js): completa los campos de socio de los CLIENTES y limpia los que hayan quedado en cuentas de personal (admin demo de versiones anteriores). */
function asegurarCamposSocioParaTodos() {
    const usuarios = obtenerUsuarios();
    let huboCambios = false;
    usuarios.forEach(u => {
        if (!u.rol) { u.rol = 'cliente'; huboCambios = true; } // cuentas muy antiguas sin rol: eran clientes
        if (usuarioEsSocio(u)) {
            if (normalizarCamposSocio(u, usuarios)) huboCambios = true;
        } else if (usuarioEsPersonal(u)) {
            if (limpiarCamposSocio(u)) huboCambios = true;
        }
    });
    if (huboCambios) guardarUsuarios(usuarios);

    // Si ya hay sesión iniciada (localStorage LS_USUARIO_ACTUAL) desde antes de este módulo, se normaliza también.
    if (usuarioActual) {
        const enLista = usuarios.find(u => u.correo === usuarioActual.correo);
        if (enLista) { usuarioActual = enLista; localStorage.setItem(LS_USUARIO_ACTUAL, JSON.stringify(usuarioActual)); }
    }
}

/* ============================================================================
   2. NIVELES
   ============================================================================ */

/** Devuelve el objeto de nivel (bronce/plata/oro) que corresponde a un saldo de puntos. */
function obtenerNivelSocio(puntos) {
    let actual = NIVELES_SOCIO[0];
    for (const nivel of NIVELES_SOCIO) if (puntos >= nivel.minPuntos) actual = nivel;
    return actual;
}

/** Devuelve el siguiente nivel a alcanzar, o null si ya está en el nivel máximo. */
function obtenerSiguienteNivelSocio(puntos) {
    return NIVELES_SOCIO.find(nivel => nivel.minPuntos > puntos) || null;
}

/* ============================================================================
   3. BÚSQUEDA DE SOCIOS (la usan Admin > Socios y la venta en counter, en el checkout)
   ============================================================================ */

/** Busca un socio por código de socio, correo o DNI simulado (insensible a mayúsculas/espacios). Devuelve el usuario o null.
 *  MÓDULO 8: solo devuelve SOCIOS (rol 'cliente'); una cuenta de counter/admin nunca es un resultado válido. */
function buscarSocio(termino) {
    if (!termino) return null;
    const t = String(termino).trim().toLowerCase();
    const usuarios = obtenerUsuarios();
    return usuarios.find(u =>
        usuarioEsSocio(u) && (
            (u.codigoSocio && u.codigoSocio.toLowerCase() === t) ||
            (u.correo && u.correo.toLowerCase() === t) ||
            (u.dniSimulado && u.dniSimulado === t)
        )
    ) || null;
}

/** MÓDULO 8: devuelve el DNI simulado de un socio; si aún no tiene uno, lo genera (único) y lo guarda. Devuelve null si no es socio. */
function asegurarDniSimuladoDeSocio(correoUsuario) {
    const usuarios = obtenerUsuarios();
    const indice = usuarios.findIndex(u => u.correo === correoUsuario);
    if (indice === -1 || !usuarioEsSocio(usuarios[indice])) return null;
    if (usuarios[indice].dniSimulado) return usuarios[indice].dniSimulado;

    let dni;
    do {
        dni = String(Math.floor(10000000 + Math.random() * 89999999));
    } while (usuarios.some(u => u.dniSimulado === dni));

    usuarios[indice].dniSimulado = dni;
    guardarUsuarios(usuarios);
    sincronizarUsuarioActualSiCorresponde(usuarios[indice]);
    return dni;
}

/** MÓDULO 8: agrega una compra al historial personal ("Mis compras") de un usuario. Devuelve el usuario actualizado o null. */
function agregarCompraAUsuario(correoUsuario, compra) {
    const usuarios = obtenerUsuarios();
    const indice = usuarios.findIndex(u => u.correo === correoUsuario);
    if (indice === -1) return null;
    if (!Array.isArray(usuarios[indice].compras)) usuarios[indice].compras = [];
    usuarios[indice].compras.unshift(compra);
    guardarUsuarios(usuarios);
    sincronizarUsuarioActualSiCorresponde(usuarios[indice]);
    return usuarios[indice];
}

/* ============================================================================
   4. OTORGAR PUNTOS
   ------------------------------------------------------------------------
   Un solo punto de entrada para sumar puntos, se use desde donde se use:
   - cliente.js -> guardarCompraEnHistorial(): compra hecha por el propio socio en la app,
                   O compra hecha por un COUNTER vinculada a un socio (MÓDULO 8). En ambos
                   casos los puntos van al socio (nunca a la cuenta del counter/admin).
   (Antes admin.js podía sumar puntos a mano; se eliminó: sin una compra real detrás no era auditable.)
   ============================================================================ */

/**
 * Otorga puntos a un socio por un monto gastado.
 * @param {string} correoUsuario
 * @param {number} montoTotal - monto sobre el que se calculan los puntos (ya con descuentos aplicados)
 * @param {string} motivo - texto que queda en el historial (ej. "Compra CR-1234567890", "Compra en counter")
 * @returns {{puntosGanados:number, subioDeNivel:boolean, nivelNuevo:object}|null}
 */
function otorgarPuntosPorCompra(correoUsuario, montoTotal, motivo = 'Compra') {
    if (!correoUsuario || !(montoTotal > 0)) return null;

    const usuarios = obtenerUsuarios();
    const indice = usuarios.findIndex(u => u.correo === correoUsuario);
    if (indice === -1 || !usuarioEsSocio(usuarios[indice])) return null; // MÓDULO 8: counter/admin nunca acumulan puntos

    normalizarCamposSocio(usuarios[indice], usuarios);
    const nivelAntes = obtenerNivelSocio(usuarios[indice].puntos);
    const puntosGanados = Math.floor(montoTotal * PUNTOS_POR_SOL_GASTADO * nivelAntes.multiplicador);

    usuarios[indice].puntos += puntosGanados;
    usuarios[indice].historialPuntos.unshift({
        fecha: new Date().toISOString(),
        motivo,
        cantidad: puntosGanados,
        saldoResultante: usuarios[indice].puntos
    });

    guardarUsuarios(usuarios);
    sincronizarUsuarioActualSiCorresponde(usuarios[indice]);

    const nivelDespues = obtenerNivelSocio(usuarios[indice].puntos);
    return { puntosGanados, subioDeNivel: nivelDespues.id !== nivelAntes.id, nivelNuevo: nivelDespues };
}

/* ============================================================================
   5. CANJE DE PUNTOS POR DESCUENTO
   ============================================================================ */

/** Calcula a cuánto descuento en soles equivalen N puntos, respetando el tope sobre un subtotal dado. */
function calcularDescuentoPorPuntos(puntos, subtotal) {
    const descuentoBruto = puntos * VALOR_SOLES_POR_PUNTO;
    const tope = subtotal * MAX_PORCENTAJE_DESCUENTO_POR_PUNTOS;
    return Math.min(descuentoBruto, tope);
}

/**
 * Descuenta puntos del saldo de un socio (se llama recién al CONFIRMAR el pago, nunca al solo aplicar en pantalla).
 * @returns {boolean} true si se pudo descontar
 */
function canjearPuntosDeSocio(correoUsuario, puntosACanjear, motivo = 'Canje por descuento') {
    if (!correoUsuario || !(puntosACanjear > 0)) return false;

    const usuarios = obtenerUsuarios();
    const indice = usuarios.findIndex(u => u.correo === correoUsuario);
    if (indice === -1 || !usuarioEsSocio(usuarios[indice])) return false; // MÓDULO 8

    normalizarCamposSocio(usuarios[indice], usuarios);
    if (usuarios[indice].puntos < puntosACanjear) return false;

    usuarios[indice].puntos -= puntosACanjear;
    usuarios[indice].historialPuntos.unshift({
        fecha: new Date().toISOString(),
        motivo,
        cantidad: -puntosACanjear,
        saldoResultante: usuarios[indice].puntos
    });

    guardarUsuarios(usuarios);
    sincronizarUsuarioActualSiCorresponde(usuarios[indice]);
    return true;
}

/* ============================================================================
   6. BENEFICIO DE CUMPLEAÑOS
   ============================================================================ */

/** Marca usado el beneficio de cumpleaños del año actual (lo llaman Admin > Socios y la venta en counter cuando el cliente lo reclama). */
function marcarBeneficioCumpleanosUsado(correoUsuario) {
    const usuarios = obtenerUsuarios();
    const indice = usuarios.findIndex(u => u.correo === correoUsuario);
    if (indice === -1 || !usuarioEsSocio(usuarios[indice])) return false; // MÓDULO 8

    usuarios[indice].cumpleUsadoEnAnio = new Date().getFullYear();
    guardarUsuarios(usuarios);
    sincronizarUsuarioActualSiCorresponde(usuarios[indice]);
    return true;
}

/* ============================================================================
   7. VALIDADORES DE CONDICIONES DE BENEFICIOS
   ------------------------------------------------------------------------
   Cada uno responde "¿puede este socio usar este beneficio AHORA?" con un
   motivo legible cuando la respuesta es no, en vez de solo ocultar un botón
   a secas. Así tanto la vista de beneficios (cliente) como el panel de
   Socios (admin, counter físico) muestran el mismo mensaje.
   ============================================================================ */
const ValidadoresSocio = {
    /** ¿Puede canjear N puntos por descuento ahora mismo? */
    puedeCanjearPuntos(usuario, puntosACanjear) {
        if (!usuario) return { ok: false, motivo: 'Debes iniciar sesión para canjear puntos.' };
        if (!usuarioEsSocio(usuario)) return { ok: false, motivo: 'Solo los socios pueden canjear puntos.' }; // MÓDULO 8
        if (!(Number(puntosACanjear) > 0)) return { ok: false, motivo: 'Ingresa una cantidad de puntos válida.' };
        if (usuario.puntos < PUNTOS_MINIMOS_PARA_CANJEAR) return { ok: false, motivo: `Necesitas acumular al menos ${PUNTOS_MINIMOS_PARA_CANJEAR} puntos para poder canjear.` };
        if (Number(puntosACanjear) > usuario.puntos) return { ok: false, motivo: 'No tienes suficientes puntos para ese canje.' };
        return { ok: true, motivo: null };
    },

    /** ¿Le corresponde el beneficio de cumpleaños en este momento? */
    tieneBeneficioCumpleanosDisponible(usuario) {
        if (!usuario) return { ok: false, motivo: 'Debes iniciar sesión.' };
        if (!usuarioEsSocio(usuario)) return { ok: false, motivo: 'Este beneficio es solo para socios.' }; // MÓDULO 8
        if (!usuario.fechaNacimiento) return { ok: false, motivo: 'Registra tu fecha de nacimiento en tu perfil para activar este beneficio.' };

        const hoy = new Date();
        const nacimiento = new Date(`${usuario.fechaNacimiento}T00:00:00`);
        if (hoy.getMonth() !== nacimiento.getMonth()) {
            return { ok: false, motivo: 'Este beneficio solo está disponible durante el mes de tu cumpleaños.' };
        }
        if (usuario.cumpleUsadoEnAnio === hoy.getFullYear()) {
            return { ok: false, motivo: 'Ya reclamaste tu entrada de cumpleaños este año.' };
        }
        return { ok: true, motivo: null };
    },

    /** ¿Tiene acceso a la fila preferencial (según su nivel)? Beneficio 100% físico: solo indica sí/no para que el staff lo reconozca. */
    tieneFilaPreferencial(usuario) {
        if (!usuario) return { ok: false, motivo: 'Debes iniciar sesión.' };
        if (!usuarioEsSocio(usuario)) return { ok: false, motivo: 'Este beneficio es solo para socios.' }; // MÓDULO 8
        const nivel = obtenerNivelSocio(usuario.puntos);
        if (!nivel.filaPreferencial) return { ok: false, motivo: `Disponible desde el nivel Plata. Te faltan ${NIVELES_SOCIO[1].minPuntos - usuario.puntos} puntos.` };
        return { ok: true, motivo: null };
    },

    /** ¿Puede comprar entradas de Pre-Estreno en preventa exclusiva de socios? */
    puedeComprarPreventaExclusiva(usuario) {
        // Cualquier socio con sesión iniciada accede a la preventa (independiente del nivel).
        // Queda como función aparte para poder subir el requisito a un nivel específico
        // más adelante sin tener que tocar el resto de la app.
        if (!usuario) return { ok: false, motivo: 'La preventa es exclusiva para Socios Náutica. Inicia sesión o regístrate para acceder.' };
        return { ok: true, motivo: null };
    }
};

/* ============================================================================
   8. MÓDULO 8 — CUENTAS DE PERSONAL (counter y admin) + VALIDEZ DE SESIÓN
   ------------------------------------------------------------------------
   Lo usa Admin > Personal. Cada función devuelve { ok, motivo, usuario? } en
   vez de mostrar toasts, para que socios.js siga siendo solo lógica de datos
   (el "backend" del futuro Supabase) y admin.js decida cómo comunicarlo.
   Reglas: el correo es el identificador y NO se edita; nadie se elimina,
   desactiva ni cambia el rol a sí mismo; siempre debe quedar al menos un
   administrador ACTIVO.
   ============================================================================ */

/** Lista las cuentas de personal (counter y admin). Los clientes nunca aparecen aquí. */
function listarPersonal() {
    return obtenerUsuarios().filter(usuarioEsPersonal);
}

/** Cuántos administradores activos hay, opcionalmente sin contar a uno (el que se está por eliminar/desactivar/degradar). */
function contarAdminsActivos(usuarios, correoExcluido = null) {
    return usuarios.filter(u => u.rol === 'admin' && cuentaEstaActiva(u) && u.correo !== correoExcluido).length;
}

/** Contraseña temporal legible (sin caracteres que se confunden: 0/O, 1/l/I). */
function generarContrasenaTemporal(longitud = 10) {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let resultado = '';
    for (let i = 0; i < longitud; i++) {
        const indice = (window.crypto && window.crypto.getRandomValues)
            ? window.crypto.getRandomValues(new Uint32Array(1))[0] % alfabeto.length
            : Math.floor(Math.random() * alfabeto.length);
        resultado += alfabeto[indice];
    }
    return resultado;
}

/** Crea una cuenta de counter o admin. NUNCA recibe campos de socio.
 *  MÓDULO 9: dni y telefono son obligatorios (para tener trazabilidad real de a quién pertenece
 *  la cuenta); nota es libre y opcional; creadoPor guarda el correo del admin que la dio de alta. */
function crearCuentaPersonal({ nombre, correo, contrasena, rol, dni, telefono, nota }, creadoPor = null) {
    const nombreLimpio = String(nombre || '').trim();
    const correoLimpio = String(correo || '').trim().toLowerCase();
    const dniLimpio = String(dni || '').trim();
    const telefonoLimpio = String(telefono || '').trim();

    if (!ROLES_PERSONAL[rol]) return { ok: false, motivo: 'Selecciona un rol válido.' };
    if (!Validadores.soloTexto(nombreLimpio)) return { ok: false, motivo: 'Ingresa un nombre válido (solo letras).' };
    if (!Validadores.correo(correoLimpio)) return { ok: false, motivo: 'Ingresa un correo electrónico válido.' };
    if (!Validadores.contrasena(contrasena)) return { ok: false, motivo: 'La contraseña debe tener al menos 6 caracteres.' };
    if (!Validadores.dni(dniLimpio)) return { ok: false, motivo: 'Ingresa un DNI válido (8 dígitos).' };
    if (!Validadores.telefono(telefonoLimpio)) return { ok: false, motivo: 'Ingresa un celular válido (9 dígitos, empieza con 9).' };

    const usuarios = obtenerUsuarios();
    if (usuarios.some(u => u.correo === correoLimpio)) return { ok: false, motivo: 'Ese correo ya está registrado en el sistema.' };
    if (usuarios.some(u => usuarioEsPersonal(u) && u.dni === dniLimpio)) return { ok: false, motivo: 'Ya existe una cuenta de personal con ese DNI.' };

    const nuevo = {
        nombre: nombreLimpio, correo: correoLimpio, contrasena, rol,
        dni: dniLimpio, telefono: telefonoLimpio, nota: String(nota || '').trim(),
        activo: true, compras: [], metodoPago: null, creadoEn: new Date().toISOString(), creadoPor
    };
    usuarios.push(nuevo);
    if (!guardarUsuarios(usuarios)) return { ok: false, motivo: 'No se pudo guardar la cuenta.' };
    return { ok: true, motivo: null, usuario: nuevo };
}

/** Edita nombre, rol, dni/teléfono/nota y (opcionalmente) contraseña de una cuenta de personal. El correo no se puede cambiar. */
function actualizarCuentaPersonal(correo, { nombre, rol, contrasena, dni, telefono, nota }, correoActor) {
    const usuarios = obtenerUsuarios();
    const indice = usuarios.findIndex(u => u.correo === correo && usuarioEsPersonal(u));
    if (indice === -1) return { ok: false, motivo: 'La cuenta no existe.' };
    const actual = usuarios[indice];

    const nombreLimpio = String(nombre ?? actual.nombre).trim();
    const nuevoRol = rol ?? actual.rol;
    const dniLimpio = String(dni ?? actual.dni ?? '').trim();
    const telefonoLimpio = String(telefono ?? actual.telefono ?? '').trim();
    if (!ROLES_PERSONAL[nuevoRol]) return { ok: false, motivo: 'Selecciona un rol válido.' };
    if (!Validadores.soloTexto(nombreLimpio)) return { ok: false, motivo: 'Ingresa un nombre válido (solo letras).' };
    if (!Validadores.dni(dniLimpio)) return { ok: false, motivo: 'Ingresa un DNI válido (8 dígitos).' };
    if (!Validadores.telefono(telefonoLimpio)) return { ok: false, motivo: 'Ingresa un celular válido (9 dígitos, empieza con 9).' };
    if (contrasena && !Validadores.contrasena(contrasena)) return { ok: false, motivo: 'La contraseña debe tener al menos 6 caracteres.' };
    if (usuarios.some(u => u.correo !== correo && usuarioEsPersonal(u) && u.dni === dniLimpio)) return { ok: false, motivo: 'Ya existe otra cuenta de personal con ese DNI.' };

    if (nuevoRol !== actual.rol) {
        if (correo === correoActor) return { ok: false, motivo: 'No puedes cambiar tu propio rol.' };
        if (actual.rol === 'admin' && cuentaEstaActiva(actual) && contarAdminsActivos(usuarios, correo) === 0) {
            return { ok: false, motivo: 'Debe quedar al menos un administrador activo.' };
        }
    }

    actual.nombre = nombreLimpio;
    actual.rol = nuevoRol;
    actual.dni = dniLimpio;
    actual.telefono = telefonoLimpio;
    actual.nota = String(nota ?? actual.nota ?? '').trim();
    if (contrasena) actual.contrasena = contrasena;
    limpiarCamposSocio(actual); // por si la cuenta traía campos de socio de una versión anterior

    if (!guardarUsuarios(usuarios)) return { ok: false, motivo: 'No se pudo guardar el cambio.' };
    sincronizarUsuarioActualSiCorresponde(actual);
    return { ok: true, motivo: null, usuario: actual };
}

/** Activa o desactiva una cuenta de personal (desactivada = no puede iniciar sesión; se conserva su historial de ventas). */
function cambiarEstadoCuentaPersonal(correo, activo, correoActor) {
    const usuarios = obtenerUsuarios();
    const indice = usuarios.findIndex(u => u.correo === correo && usuarioEsPersonal(u));
    if (indice === -1) return { ok: false, motivo: 'La cuenta no existe.' };

    if (!activo) {
        if (correo === correoActor) return { ok: false, motivo: 'No puedes desactivar tu propia cuenta.' };
        if (usuarios[indice].rol === 'admin' && contarAdminsActivos(usuarios, correo) === 0) {
            return { ok: false, motivo: 'No se puede desactivar al único administrador activo.' };
        }
    }

    usuarios[indice].activo = Boolean(activo);
    if (!guardarUsuarios(usuarios)) return { ok: false, motivo: 'No se pudo guardar el cambio.' };
    return { ok: true, motivo: null, usuario: usuarios[indice] };
}

/** Elimina definitivamente una cuenta de personal. */
function eliminarCuentaPersonal(correo, correoActor) {
    const usuarios = obtenerUsuarios();
    const indice = usuarios.findIndex(u => u.correo === correo && usuarioEsPersonal(u));
    if (indice === -1) return { ok: false, motivo: 'La cuenta no existe.' };

    if (correo === correoActor) return { ok: false, motivo: 'No puedes eliminar tu propia cuenta.' };
    if (usuarios[indice].rol === 'admin' && contarAdminsActivos(usuarios, correo) === 0) {
        return { ok: false, motivo: 'No se puede eliminar la única cuenta de administrador que queda.' };
    }

    usuarios.splice(indice, 1);
    if (!guardarUsuarios(usuarios)) return { ok: false, motivo: 'No se pudo eliminar la cuenta.' };
    return { ok: true, motivo: null };
}

/** Comprueba que la sesión guardada (LS_USUARIO_ACTUAL) siga siendo válida contra la lista de usuarios:
 *  si la cuenta fue eliminada o desactivada, cierra la sesión; si sigue viva, refresca la copia (el rol pudo cambiar).
 *  Devuelve false si la sesión dejó de ser válida. */
function revalidarSesionUsuarioActual() {
    if (!usuarioActual) return true;
    const enLista = obtenerUsuarios().find(u => u.correo === usuarioActual.correo);
    if (!enLista || !cuentaEstaActiva(enLista)) {
        usuarioActual = null;
        localStorage.removeItem(LS_USUARIO_ACTUAL);
        return false;
    }
    usuarioActual = enLista;
    localStorage.setItem(LS_USUARIO_ACTUAL, JSON.stringify(usuarioActual));
    return true;
}
