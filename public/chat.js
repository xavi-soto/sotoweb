// ===============================================
// 1. VARIABLES GLOBALES Y UTILIDADES DE MEMORIA
// ===============================================
let chatHistory = [];
const CHAT_STATE_KEY = 'sotoChatVisible'; 
const CHAT_BOX = document.getElementById("soto-chat");

// Crear o cargar user_id único por visitante (Persistencia de usuario)
let userId = localStorage.getItem("soto_user_id");
if (!userId) {
    // Generación de ID único y aleatorio
    userId = "user_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("soto_user_id", userId);
}

// Función para guardar el historial en localStorage
function saveChatHistory() {
    localStorage.setItem('sotoChatHistory', JSON.stringify(chatHistory));
}

// Función para hacer scroll al final de la conversación
function scrollToBottom() {
    const chatMessages = document.getElementById("chat-messages");
    if (chatMessages) {
        // Asegura que el scroll se va al final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Función para renderizar el historial del chat en la interfaz
function renderChatHistory() {
    const chatMessages = document.getElementById("chat-messages");
    // Usamos el HTML que ya existe en el index (el mensaje de bienvenida)
    // Borramos solo si queremos evitar duplicados, o añadimos.
    // Aquí limpiamos y renderizamos todo el historial guardado
    chatMessages.innerHTML = ''; 
    chatHistory.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(msg.sender === 'user' ? 'user-message' : 'bot-message');
        messageDiv.innerHTML = msg.html; // Usamos el HTML guardado
        chatMessages.appendChild(messageDiv);
    });
    // El scroll se llama después de que todo se ha renderizado
    // en loadChatHistoryAndState()
}

// Función principal para cargar el historial y el estado (Abierto/Cerrado)
function loadChatHistoryAndState() {
    const savedHistory = localStorage.getItem('sotoChatHistory');
    const notif = document.getElementById("soto-notification");
    const savedState = localStorage.getItem(CHAT_STATE_KEY);

    // 1. Cargar historial
    if (savedHistory) {
        chatHistory = JSON.parse(savedHistory);
        renderChatHistory(); // Renderiza el historial guardado
    } else {
        // Si no hay historial, se asume que el mensaje de bienvenida 
        // está ya en el HTML y se añade al historial para la próxima vez
        const initialMessage = document.querySelector('.bot-message strong').parentElement.innerHTML;
        chatHistory.push({ sender: 'soto', html: initialMessage });
        saveChatHistory();
    }
    
    // 2. Cargar estado (Abierto/Cerrado)
    if (savedState === 'open') {
        CHAT_BOX.style.display = "block";
        if (notif) notif.style.display = "none";
    } else {
        CHAT_BOX.style.display = "none";
        if (notif) notif.style.display = "block";
    }

    // 3. Aplicar scroll al último mensaje al cargar la página (SOLUCIÓN DEFINITIVA)
    scrollToBottom(); 
}


// ===============================================
// 2. LÓGICA DE LA INTERFAZ
// ===============================================

// Función auxiliar para guardar estado del chat
function setChatState(state) {
    const notif = document.getElementById("soto-notification");
    localStorage.setItem(CHAT_STATE_KEY, state);

    if (state === 'open') {
        CHAT_BOX.style.display = "block";
        if (notif) notif.style.display = "none";
        scrollToBottom();
    } else {
        CHAT_BOX.style.display = "none";
        if (notif) notif.style.display = "block";
    }
}


// Mostrar u ocultar el chat cuando se hace clic en la burbuja
document.getElementById("soto-launcher").addEventListener("click", function () {
    const currentState = CHAT_BOX.style.display === "none" || CHAT_BOX.style.display === "" ? 'open' : 'closed';
    setChatState(currentState);
});

// Mostrar u ocultar el chat cuando se hace clic en la notificación
document.getElementById("soto-notification").addEventListener("click", function () {
    setChatState('open');
});

// Cerrar el chat cuando se hace clic en la "X"
document.getElementById("close-chat").addEventListener("click", function () {
    setChatState('closed');
});


// ===============================================
// 3. LÓGICA DE MENSAJES Y CONEXIÓN A API
// ===============================================

// Manejar los mensajes y respuestas
document.getElementById("user-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        const message = this.value;
        const chatMessages = document.getElementById("chat-messages");

        if (message.trim() === "") return;

        // Añadir el mensaje del usuario al historial y a la interfaz
        const userHtml = `<div>${message}</div>`;
        const userMessageDiv = document.createElement("div");
        userMessageDiv.classList.add("user-message");
        userMessageDiv.innerHTML = userHtml;
        chatMessages.appendChild(userMessageDiv);
        
        chatHistory.push({ sender: 'user', html: userHtml });
        this.value = "";
        saveChatHistory();

        // Mensaje de carga temporal
        const sotoLoadingMessage = document.createElement("div");
        sotoLoadingMessage.classList.add("bot-message", "loading");
        sotoLoadingMessage.innerHTML = "<span>...</span>";
        chatMessages.appendChild(sotoLoadingMessage);
        
        scrollToBottom(); 

        const coldStartTimer = setTimeout(() => {
            sotoLoadingMessage.innerHTML = `<span>soto está dormido, tardará unos 30-50 segundos en despertar. Mientras, puedes revisar más sobre este proyecto <a href="https://sotosotosoto.com/soto-artista-virtual" target="_blank">soto artista virtual</a></span>`;
            sotoLoadingMessage.classList.remove("loading");
            // No hacemos scroll aquí para no mover la vista si el usuario está leyendo
        }, 5000);

        // Hacer fetch al backend con user_id único
        fetch("https://soto-ai.onrender.com/preguntar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                pregunta: message,
                user_id: userId // Usamos la variable global
            }),
        })
        .then((res) => res.json())
        .then((data) => {
            clearTimeout(coldStartTimer);

            // Añadir la respuesta de soto al historial (guardando el HTML)
            const sotoHtml = `<strong>${data.respuesta}</strong>`;
            chatHistory.push({ sender: 'soto', html: sotoHtml });
            sotoLoadingMessage.innerHTML = sotoHtml;
            sotoLoadingMessage.classList.remove("loading");
            saveChatHistory();
            
            scrollToBottom(); // Scroll después de la respuesta final
        })
        .catch((err) => {
            clearTimeout(coldStartTimer);
            console.error("Error al conectar con el servidor:", err);
            const errorHtml = `<span>Error de conexión.</span>`;
            sotoLoadingMessage.innerHTML = errorHtml;
            sotoLoadingMessage.classList.remove("loading");
            chatHistory.push({ sender: 'soto', html: errorHtml });
            saveChatHistory();
            scrollToBottom(); 
        });
    }
});

// ===============================================
// INICIO DEL SCRIPT
// ===============================================
loadChatHistoryAndState();