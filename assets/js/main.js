/* ============================================================================
   CINE NÁUTICA — MAIN.JS — Inicialización general
   ------------------------------------------------------------------------
   Parte de la arquitectura modular de la app (Fase 14).
   Cargado como <script> clásico (no ES module) para funcionar también
   abriendo index.html directamente con file://, sin necesidad de servidor.
   Debe cargarse AL FINAL, después de todos los demás módulos.
   ============================================================================ */

/* ============================================================================
   18. INICIALIZACIÓN GENERAL
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // FASE 7: carga catálogo persistente (o inicializa con datos mock la primera vez)
    inicializarPersistenciaCartelera();
    inicializarPersistenciaDulceria();
    inicializarPersistenciaBanner();               // Módulo 6: banner dinámico
    inicializarPersistenciaCategoriasDulceria();    // Módulo 6: categorías dinámicas
    limpiarBannerDeIdsInexistentes();

    renderizarGridsInicio();
    asegurarAdminDemo();

    const usuarioGuardado = localStorage.getItem(LS_USUARIO_ACTUAL);
    if (usuarioGuardado) {
        usuarioActual = JSON.parse(usuarioGuardado);
    }

    // MÓDULO 7: asegura que todo usuario ya guardado (incluido el admin demo y la sesión
    // recién cargada arriba) tenga los campos del programa de socios (puntos, código, etc.)
    asegurarCamposSocioParaTodos();

    // MÓDULO 8: la sesión guardada se revalida contra la lista de usuarios. Si el admin eliminó o desactivó
    // esa cuenta (ej. un counter con la sesión abierta), la sesión se cierra en vez de seguir viva con una copia vieja.
    const habiaSesionGuardada = Boolean(usuarioActual);
    const sesionSigueValida = revalidarSesionUsuarioActual();

    actualizarNavbarAuth();
    if (habiaSesionGuardada && !sesionSigueValida) mostrarToast('Tu sesión se cerró porque la cuenta ya no está activa.', 'info');

    inicializarChatbot();
});

// MÓDULO 8: el evento 'storage' solo se dispara en OTRAS pestañas. Si el admin desactiva/elimina/cambia de rol
// una cuenta desde una pestaña, la pestaña donde esa persona tiene la sesión abierta se entera al instante.
window.addEventListener('storage', (ev) => {
    if (ev.key !== LS_USUARIOS || !usuarioActual) return;
    const rolAntes = usuarioActual.rol;

    if (!revalidarSesionUsuarioActual()) {
        limpiarEstadoPedido();
        reiniciarFormularioCheckout();
        actualizarNavbarAuth();
        cambiarVista(vistaActualVisible, 'vista-inicio');
        mostrarToast('Tu sesión se cerró porque la cuenta fue desactivada o eliminada.', 'info');
        return;
    }
    if (usuarioActual.rol !== rolAntes) {
        actualizarNavbarAuth();
        if (rolAntes === 'admin') cambiarVista(vistaActualVisible, 'vista-inicio');
        mostrarToast('Tu rol fue actualizado por un administrador.', 'info');
    } else {
        renderizarInsigniaNivelNavbar();
    }
});

