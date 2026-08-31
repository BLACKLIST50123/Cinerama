/* ============================================================================
   CINERAMA — CHATBOT.JS — CineBot (asistente simulado)
   ------------------------------------------------------------------------
   Parte de la arquitectura modular de Cinerama (Fase 14).
   Cargado como <script> clásico (no ES module) para funcionar también
   abriendo index.html directamente con file://, sin necesidad de servidor.

   ============================================================================ */

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

        // FASE 8: indicador "escribiendo..." mientras se arma la respuesta (mejor percepción de progreso)
        const idTyping = 'typing-' + Date.now();
        contenedorMensajes.insertAdjacentHTML('beforeend', `
            <div id="${idTyping}" class="flex gap-2 chat-bubble-enter">
                <div class="w-6 h-6 rounded-full bg-brand-red flex-shrink-0 flex items-center justify-center mt-1"><i class="fa-solid fa-robot text-[10px] text-white"></i></div>
                <div class="bg-dark-700 p-3 rounded-xl rounded-tl-none self-start border border-white/5 shadow-sm flex items-center gap-1.5">
                    <span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span>
                </div>
            </div>`);
        contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

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
            const burbujaTyping = document.getElementById(idTyping);
            if (burbujaTyping) burbujaTyping.remove();
            agregarMensaje(respuesta, true);
        }, 900);
    };

    btnEnviar.addEventListener('click', procesarChat);
    inputChat.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') procesarChat();
    });
}


