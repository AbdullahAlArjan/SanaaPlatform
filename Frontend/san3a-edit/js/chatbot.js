/**
 * chatbot.js — Sanaa Platform Chatbot Widget
 * Calls POST https://localhost:7101/api/chatbot/ask
 * Loaded as a plain <script> (not an ES module).
 */

// ── Toggle the chat window ────────────────────────────────────────────────────
window.toggleChatWindow = function () {
    const card = document.getElementById('chatCard');
    if (!card) return;
    card.classList.toggle('is-visible');
    if (card.classList.contains('is-visible')) {
        setTimeout(function () {
            var inp = document.getElementById('userInput');
            if (inp) inp.focus();
        }, 300);
    }
};

// ── Send a suggestion chip text ───────────────────────────────────────────────
window.sendSuggestion = function (text) {
    var input = document.getElementById('userInput');
    if (input) input.value = text;
    sendMessage();
};

// ── Core send function ────────────────────────────────────────────────────────
function sendMessage() {
    var input   = document.getElementById('userInput');
    var content = document.getElementById('chatContent');

    if (!input || !content) {
        console.error('Chatbot: DOM elements #userInput or #chatContent not found.');
        return;
    }

    var userText = input.value.trim();
    if (!userText) return;

    // 1. Append user message
    appendMessage(content, userText, 'user');
    input.value = '';

    // 2. Show typing indicator
    var typingDiv = document.createElement('div');
    typingDiv.className  = 'msg bot-msg';
    typingDiv.id         = 'typing-indicator';
    typingDiv.textContent = '...صنّاع يكتب';
    content.appendChild(typingDiv);
    scrollBottom(content);

    // 3. Fetch — explicit .then() chain for easy console tracing
    console.log('Chatbot: sending →', userText);

    fetch('https://localhost:7101/api/chatbot/ask', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: userText })
    })
    .then(function (response) {
        console.log('Chatbot: HTTP status →', response.status);
        if (!response.ok) {
            throw new Error('Server returned ' + response.status);
        }
        return response.json();
    })
    .then(function (data) {
        console.log('Chatbot: parsed response →', data);

        // Remove typing indicator
        var indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();

        // Read the reply — handle both { response } (mock) and { reply } (Gemini)
        var botText = data.response || data.reply || data.Reply ||
                      'عذراً، لم يصل رد من السيرفر.';

        appendMessage(content, botText, 'bot');
    })
    .catch(function (err) {
        console.error('Chatbot Fetch Failed:', err);

        var indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();

        appendMessage(
            content,
            'تعذّر الاتصال بالسيرفر. افتح Console وتحقق من الخطأ.',
            'bot'
        );
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function appendMessage(container, text, role) {
    var div = document.createElement('div');
    div.className     = 'msg ' + (role === 'user' ? 'user-msg' : 'bot-msg');
    div.style.cssText = 'white-space:pre-wrap;';
    div.textContent   = text;
    container.appendChild(div);
    scrollBottom(container);
}

function scrollBottom(container) {
    container.scrollTop = container.scrollHeight;
}

// ── Wire events once DOM is ready ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    var sendBtn = document.querySelector('.send-icon-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    } else {
        console.warn('Chatbot: .send-icon-btn not found in DOM.');
    }

    var input = document.getElementById('userInput');
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});
