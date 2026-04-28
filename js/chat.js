/* =============================================
   The Peoples Butchery — Chat Widget (chat.js)
   ============================================= */

'use strict';

(function () {
  let chatHistory = [];
  let isOpen = false;

  function init() {
    document.getElementById('chat-fab').addEventListener('click', toggleChat);
    document.getElementById('chat-close').addEventListener('click', toggleChat);
    document.getElementById('chat-send').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    appendMessage('bot', "👋 Hey! I'm Lebo, your butchery assistant. What are you looking for today?");
  }

  function toggleChat() {
    isOpen = !isOpen;
    document.getElementById('chat-panel').classList.toggle('open', isOpen);
    document.getElementById('chat-fab').classList.toggle('open', isOpen);
    if (isOpen) document.getElementById('chat-input').focus();
  }

  async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    appendMessage('user', message);
    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: chatHistory })
      });
      const data = await res.json();
      hideTyping();
      const reply = data.reply || data.error || 'Sorry, something went wrong.';
      appendMessage('bot', reply);
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'assistant', content: reply });

      if (data.cartActions && data.cartActions.length > 0) {
        data.cartActions.forEach(a => {
          addToCart(a.productId, a.qty);
          if (a.braai) {
            if (!productExtras[a.productId]) productExtras[a.productId] = {};
            productExtras[a.productId].braai = true;
          }
          if (a.pap) {
            if (!productExtras[a.productId]) productExtras[a.productId] = {};
            productExtras[a.productId].pap = true;
          }
          if (a.braai || a.pap) renderProducts();
        });
      }
    } catch {
      hideTyping();
      appendMessage('bot', 'Connection issue — please try again.');
    }
  }

  function appendMessage(role, text) {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg-${role}`;
    msgs.appendChild(div);
    if (role === 'bot') {
      typeText(div, text, msgs);
    } else {
      div.textContent = text;
      msgs.scrollTop = msgs.scrollHeight;
    }
  }

  function typeText(el, text, scrollEl) {
    let i = 0;
    function tick() {
      if (i < text.length) {
        el.textContent += text[i++];
        scrollEl.scrollTop = scrollEl.scrollHeight;
        setTimeout(tick, 22);
      }
    }
    tick();
  }

  function showTyping() {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.id = 'chat-typing-indicator';
    div.className = 'chat-msg chat-msg-bot chat-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('chat-typing-indicator')?.remove();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
