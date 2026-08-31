/* ============================================================================
   CINERAMA — MAIN.JS — Inicialización general
   ------------------------------------------------------------------------
   Parte de la arquitectura modular de Cinerama (Fase 14).
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

    renderizarGridsInicio();
    asegurarAdminDemo();

    const usuarioGuardado = localStorage.getItem(LS_USUARIO_ACTUAL);
    if (usuarioGuardado) {
        usuarioActual = JSON.parse(usuarioGuardado);
    }
    actualizarNavbarAuth();

    inicializarChatbot();
});

