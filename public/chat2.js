// Variable para almacenar todo el historial del chat
let chatHistory = [];

// Crear o cargar user_id único por visitante
let userId = localStorage.getItem("soto_user_id");
if (!userId) {
    userId = "user_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("soto_user_id", userId);
}

// Función para guardar el historial en localStorage
function saveChatHistory() {
    localStorage.setItem('sotoChatHistory', JSON.stringify(chatHistory));
}

// Función para cargar el historial desde localStorage
function loadChatHistory() {
    const savedHistory = localStorage.getItem('sotoChatHistory');
    if (savedHistory) {
        chatHistory = JSON.parse(savedHistory);
        renderChatHistory();
    }
}

// Función para renderizar el historial del chat en la interfaz
function renderChatHistory() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.innerHTML = '';
    chatHistory.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(msg.sender === 'user' ? 'user-message' : 'bot-message');
        messageDiv.innerHTML = msg.html;
        chatMessages.appendChild(messageDiv);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 👉 Mostrar u ocultar el chat cuando se hace clic en la burbuja de soto
document.querySelector(".chat-avatar").addEventListener("click", function () {
    const chat = document.getElementById("soto-chat");
    chat.style.display = (chat.style.display === "none" || chat.style.display === "") ? "flex" : "none";
});

// 👉 Manejar el envío de mensajes
document.getElementById("user-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        const message = this.value.trim();
        if (!message) return;

        const chatMessages = document.getElementById("chat-messages");

        // Guardar y mostrar mensaje del usuario
        const userHtml = `<div>${message}</div>`;
        chatHistory.push({ sender: 'user', html: userHtml });
        chatMessages.innerHTML += `<div class="user-message">${userHtml}</div>`;
        this.value = "";
        saveChatHistory();

        // 🌟 Mensaje de carga
        const sotoLoadingMessage = document.createElement("div");
        sotoLoadingMessage.classList.add("bot-message", "loading");
        sotoLoadingMessage.innerHTML = "<span>...</span>";
        chatMessages.appendChild(sotoLoadingMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // 🌟 Temporizador para cold start
        const coldStartTimer = setTimeout(() => {
            sotoLoadingMessage.innerHTML = `<span>soto está dormido, tardará unos 30-50 segundos en despertar. Mientras, puedes revisar más sobre este proyecto <a href="https://sotosotosoto.com/soto-artista-virtual" target="_blank">soto artista virtual</a></span>`;
        }, 5000);

        // 🌟 Llamada al backend con userId dinámico
        fetch("https://soto-ai.onrender.com/preguntar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pregunta: message, user_id: userId }),
        })
        .then(res => res.json())
        .then(data => {
            clearTimeout(coldStartTimer);
            const sotoHtml = `<strong>${data.respuesta}</strong>`;
            chatHistory.push({ sender: 'soto', html: sotoHtml });
            sotoLoadingMessage.innerHTML = sotoHtml;
            sotoLoadingMessage.classList.remove("loading");
            chatMessages.scrollTop = chatMessages.scrollHeight;
            saveChatHistory();
        })
        .catch(err => {
            clearTimeout(coldStartTimer);
            console.error("Error al conectar con el servidor:", err);
            const errorHtml = `<span>Error de conexión</span>`;
            sotoLoadingMessage.innerHTML = errorHtml;
            sotoLoadingMessage.classList.remove("loading");
            chatHistory.push({ sender: 'soto', html: errorHtml });
            saveChatHistory();
        });
    }
});

// Cargar historial al abrir la página
loadChatHistory();
