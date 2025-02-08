// chat_app/static/chat_app/js/chat.js
document.addEventListener("DOMContentLoaded", function() {
    const messagesDiv = document.getElementById("messages");
    const sendButton = document.getElementById("sendButton");
    const userInput = document.getElementById("userInput");
    let eventSource = null;

    sendButton.addEventListener("click", function() {
        const query = userInput.value.trim();
        if (!query) return;

        // Append user's message to the chat
        appendMessage("You", query);
        userInput.value = '';

        // If there's an open connection, close it before starting a new one.
        if (eventSource) {
            eventSource.close();
        }

        // Open a new SSE connection to our streaming endpoint.
        eventSource = new EventSource(`/chat/stream/?query=${encodeURIComponent(query)}`);

        eventSource.onmessage = function(event) {
            // If the stream signals that it’s done, close the connection.
            if (event.data === "[DONE]") {
                eventSource.close();
                return;
            }
            appendMessage("Bot", event.data);
        };

        eventSource.onerror = function(err) {
            console.error("EventSource error:", err);
            eventSource.close();
        };
    });

    function appendMessage(sender, text) {
        const messageElem = document.createElement("p");
        messageElem.innerHTML = `<strong>${sender}:</strong> ${text}`;
        messagesDiv.appendChild(messageElem);
        // Auto-scroll to the bottom of the messages container
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
});
