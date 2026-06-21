/* =============================================
   The Peoples Butchery — Chat Widget (chat.js)
   Rule-based bot — no server required
   ============================================= */

'use strict';

(function () {
  let isOpen = false;

  const CATALOG = [
    { name: 'Short Rib',            price: 130,   unit: 'per kg',   category: 'Beef' },
    { name: 'Beef Stew',            price: 100,   unit: 'per kg',   category: 'Beef' },
    { name: 'Brisket',              price: 130,   unit: 'per kg',   category: 'Beef' },
    { name: 'Bulk Mince',           price: 80,    unit: 'per kg',   category: 'Beef' },
    { name: 'Chuck',                price: 130,   unit: 'per kg',   category: 'Beef' },
    { name: 'Frozen Chicken Hearts',price: 35,    unit: 'each',     category: 'Chicken' },
    { name: 'Lamb Tripe',           price: 30,    unit: 'per kg',   category: 'Lamb' },
    { name: 'Lamb Chops',           price: 140,   unit: 'per kg',   category: 'Lamb' },
    { name: 'Lamb Stew',            price: 140,   unit: 'per kg',   category: 'Lamb' },
    { name: 'Black Lentils',        price: 10,    unit: 'per 200g', category: 'Other' },
    { name: 'Pink Lentils',         price: 15,    unit: 'per 200g', category: 'Other' },
    { name: 'Boerewors',            price: 95.99, unit: 'per kg',   category: 'Sausages' },
    { name: 'Chilli Bites',         price: 350,   unit: 'each',     category: 'Sides' },
    { name: 'Atchar',               price: 6,     unit: 'each',     category: 'Sides' },
    { name: 'Curry Chillies',       price: 10,    unit: 'each',     category: 'Sides' },
  ];

  const RULES = [
    {
      match: /hi|hello|hey|howzit|hola|sup\b/i,
      reply: () => "Hey! 👋 I'm Lebo, The Peoples Butchery assistant. Ask me about our products, prices, delivery, or how to order."
    },
    {
      match: /price|cost|how much|prices|cheap/i,
      reply: () => {
        const lines = CATALOG.map(p => `• ${p.name} — R${p.price} ${p.unit}`).join('\n');
        return `Here are our current prices:\n\n${lines}`;
      }
    },
    {
      match: /beef/i,
      reply: () => {
        const beef = CATALOG.filter(p => p.category === 'Beef');
        return 'Our beef cuts:\n\n' + beef.map(p => `• ${p.name} — R${p.price} ${p.unit}`).join('\n');
      }
    },
    {
      match: /lamb/i,
      reply: () => {
        const lamb = CATALOG.filter(p => p.category === 'Lamb');
        return 'Our lamb cuts:\n\n' + lamb.map(p => `• ${p.name} — R${p.price} ${p.unit}`).join('\n');
      }
    },
    {
      match: /chicken/i,
      reply: () => 'We have Frozen Chicken Hearts at R35 each. Great for braai!'
    },
    {
      match: /boerewors|wors/i,
      reply: () => 'Boerewors is R95.99 per kg — a braai favourite!'
    },
    {
      match: /mince/i,
      reply: () => 'Bulk Mince is R80 per kg. Perfect for bolognese, burgers, and more.'
    },
    {
      match: /chilli bite/i,
      reply: () => 'Chilli Bites are R350 each — a serious snack!'
    },
    {
      match: /atchar/i,
      reply: () => 'Atchar is only R6 each. Great with any braai.'
    },
    {
      match: /lentil/i,
      reply: () => 'We stock Black Lentils (R10/200g) and Pink Lentils (R15/200g).'
    },
    {
      match: /deliver|delivery|fee|shipping/i,
      reply: () => 'Delivery is free within 5km of our shop (76 Meeu St, East Lynne, Pretoria). Beyond that, a small fee applies based on distance. You can collect for free too!'
    },
    {
      match: /collect|pickup|pick up|pick-up/i,
      reply: () => 'Yes! You can collect your order for free at 76 Meeu St, East Lynne, Pretoria. Just select "Collect" at checkout.'
    },
    {
      match: /address|where|location|find you|shop/i,
      reply: () => 'We are at 76 Meeu St, East Lynne, Pretoria. 📍'
    },
    {
      match: /hour|open|time|when/i,
      reply: () => 'For current trading hours please WhatsApp us at 079 053 4865. 🕐'
    },
    {
      match: /order|how.*order|place.*order/i,
      reply: () => '1️⃣ Register at register.html\n2️⃣ Get your REF number and add credit via the admin\n3️⃣ Browse the shop, add items to your cart\n4️⃣ Checkout — credit is deducted automatically!'
    },
    {
      match: /register|sign up|account|create/i,
      reply: () => 'Register at thepeoplesbutchery.online/register.html — just fill in your name, email, and address. You\'ll get a unique REF number to load credit onto your account.'
    },
    {
      match: /credit|balance|top.?up|load/i,
      reply: () => 'Ask the admin to load credit onto your account using your REF number. Your balance shows at the top of the shop page once you\'re logged in.'
    },
    {
      match: /pay|payment|eft|cash/i,
      reply: () => 'Orders are paid using your pre-loaded credit balance. Ask the admin to top up your account via EFT or cash. Your REF number is needed.'
    },
    {
      match: /whatsapp|contact|call|phone/i,
      reply: () => 'You can WhatsApp us at 079 053 4865 for any questions, large orders, or urgent requests. 💬'
    },
    {
      match: /thank|thanks|dankie|cheers/i,
      reply: () => 'Pleasure! 😊 If you need anything else just ask. Enjoy your braai! 🔥'
    },
    {
      match: /bye|goodbye|lekker|see you/i,
      reply: () => 'Lekker! Come back soon. 🥩'
    },
  ];

  function getReply(message) {
    const msg = message.trim();
    for (const rule of RULES) {
      if (rule.match.test(msg)) return rule.reply();
    }
    // Fuzzy product name match
    const lower = msg.toLowerCase();
    const hit = CATALOG.find(p => lower.includes(p.name.toLowerCase().split(' ')[0]));
    if (hit) return `${hit.name} is R${hit.price} ${hit.unit}.`;
    return "I'm not sure about that one — try asking about our products, prices, delivery, or how to order. Or WhatsApp us at 079 053 4865 for more help!";
  }

  function init() {
    document.getElementById('chat-fab').addEventListener('click', toggleChat);
    document.getElementById('chat-close').addEventListener('click', toggleChat);
    document.getElementById('chat-send').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    appendMessage('bot', "👋 Hey! I'm Lebo, your butchery assistant. Ask me about products, prices, delivery, or how to order!");
  }

  function toggleChat() {
    isOpen = !isOpen;
    document.getElementById('chat-panel').classList.toggle('open', isOpen);
    document.getElementById('chat-fab').classList.toggle('open', isOpen);
    if (isOpen) document.getElementById('chat-input').focus();
  }

  function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    appendMessage('user', message);
    showTyping();
    setTimeout(() => {
      hideTyping();
      appendMessage('bot', getReply(message));
    }, 600 + Math.random() * 400);
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
        setTimeout(tick, 18);
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
