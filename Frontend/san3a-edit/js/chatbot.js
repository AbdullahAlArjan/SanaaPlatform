function toggleChatWindow() {
        const chatCard = document.getElementById('chatCard');
        chatCard.classList.toggle('is-visible');

        function sendSuggestion(text) {
        const chatContent = document.getElementById('chatContent');
        const userMsg = document.createElement('div');
        userMsg.className = 'msg user-msg'; // سنضيف تنسيقها في الـ CSS
        userMsg.innerText = text;
        chatContent.appendChild(userMsg);
        
        // التمرير لأسفل تلقائياً
        chatContent.scrollTop = chatContent.scrollHeight;

        // رد آلي بسيط كمثال
        setTimeout(() => {
            const botMsg = document.createElement('div');
            botMsg.className = 'msg bot-msg';
            botMsg.innerText = "أبشر، جاري تحويلك للمختص بـ: " + text;
            chatContent.appendChild(botMsg);
            chatContent.scrollTop = chatContent.scrollHeight;
        }, 1000);
    }
    }