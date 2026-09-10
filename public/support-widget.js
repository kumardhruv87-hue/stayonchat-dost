// =================================================================
// RoasSiren™ (roassiren.com) - Interactive Help Bot & Support Widget
// Embeddable Floating AI Assistant & Ticket/Bug Resolver
// =================================================================

(function () {
  if (window.__roassiren_widget_loaded) return;
  window.__roassiren_widget_loaded = true;

  const CSS = `
    .rs-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #e11d48, #be123c);
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 10px 25px -5px rgba(225, 29, 72, 0.5), 0 8px 10px -6px rgba(225, 29, 72, 0.4);
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 700;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .rs-widget-btn:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 14px 28px -5px rgba(225, 29, 72, 0.6), 0 10px 10px -5px rgba(225, 29, 72, 0.4);
    }
    .rs-widget-beacon {
      width: 8px;
      height: 8px;
      background: #34d399;
      border-radius: 50%;
      box-shadow: 0 0 8px #34d399;
      animation: rs-pulse 2s infinite;
    }
    @keyframes rs-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.2); }
    }
    .rs-panel {
      position: fixed;
      bottom: 84px;
      right: 24px;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 560px;
      max-height: calc(100vh - 110px);
      background: #090d16;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(225, 29, 72, 0.15);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: all 0.25s ease;
      opacity: 0;
      pointer-events: none;
      transform: translateY(12px) scale(0.98);
    }
    .rs-panel.rs-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }
    .rs-header {
      background: #0f172a;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .rs-tabs {
      display: flex;
      background: #030712;
      padding: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .rs-tab-btn {
      flex: 1;
      padding: 8px 10px;
      border: none;
      background: transparent;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .rs-tab-btn.rs-active {
      background: #1e293b;
      color: #ffffff;
    }
    .rs-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #090d16;
    }
    .rs-chat-msgs {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .rs-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 12.5px;
      line-height: 1.45;
      word-break: break-word;
    }
    .rs-msg-bot {
      background: #1e293b;
      color: #f1f5f9;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .rs-msg-user {
      background: #e11d48;
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .rs-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 14px;
      background: #0c1220;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .rs-chip {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 10.5px;
      padding: 4px 10px;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .rs-chip:hover {
      background: #334155;
      color: #ffffff;
      border-color: #f43f5e;
    }
    .rs-input-bar {
      display: flex;
      padding: 10px 14px;
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      gap: 8px;
    }
    .rs-input-bar input {
      flex: 1;
      background: #030712;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 8px 12px;
      color: #ffffff;
      font-size: 12px;
      outline: none;
    }
    .rs-input-bar input:focus {
      border-color: #f43f5e;
    }
    .rs-input-bar button {
      background: #e11d48;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 8px 14px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .rs-form-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .rs-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .rs-field label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .rs-field input, .rs-field select, .rs-field textarea {
      background: #030712;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 8px 10px;
      color: #ffffff;
      font-size: 12px;
      outline: none;
      font-family: inherit;
    }
    .rs-field input:focus, .rs-field select:focus, .rs-field textarea:focus {
      border-color: #f43f5e;
    }
    .rs-submit-btn {
      background: linear-gradient(135deg, #e11d48, #be123c);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
      margin-top: 6px;
      box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
    }
    .rs-submit-btn:hover {
      opacity: 0.95;
    }
  `;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // Create Widget Root
  const container = document.createElement('div');
  container.id = 'roassiren-support-root';

  container.innerHTML = `
    <!-- Floating Trigger Badge -->
    <button class="rs-widget-btn" id="rs-toggle-btn" title="Need Help or Report Issue?">
      <span class="rs-widget-beacon"></span>
      <span>🚨 Help & Support</span>
    </button>

    <!-- Support Modal Panel -->
    <div class="rs-panel" id="rs-panel">
      <!-- Header -->
      <div class="rs-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; border-radius: 6px; background: #e11d48; display: flex; align-items: center; justify-content: center; font-size: 12px;">🚨</div>
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #ffffff;">RoasSiren™ Help Desk</div>
            <div style="font-size: 10px; color: #34d399; display: flex; align-items: center; gap: 4px;">
              <span style="width: 5px; height: 5px; border-radius: 50%; background: #34d399; display: inline-block;"></span>
              24/7 Watchdog AI & Founder Support
            </div>
          </div>
        </div>
        <button id="rs-close-btn" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 4px;">✕</button>
      </div>

      <!-- Tab Switcher -->
      <div class="rs-tabs">
        <button class="rs-tab-btn rs-active" id="rs-tab-chat-btn">💬 Live Watchdog Chat</button>
        <button class="rs-tab-btn" id="rs-tab-ticket-btn">🎫 Report Problem / Suggest</button>
      </div>

      <!-- Tab 1: AI Chat Body -->
      <div class="rs-body" id="rs-view-chat">
        <div class="rs-chat-msgs" id="rs-chat-box">
          <div class="rs-msg rs-msg-bot">
            Hey Founder! 👋 I'm your RoasSiren autonomous watchdog assistant.<br><br>
            Ask me how our 60-second sirens work, how to connect Meta adsets, or get help with any issue!
          </div>
        </div>

        <!-- Quick chips -->
        <div class="rs-chips">
          <button class="rs-chip" data-query="How does 60s siren work?">⚡ 60s Siren?</button>
          <button class="rs-chip" data-query="How to link Meta Ad Set?">🛑 Meta Auto-Kill?</button>
          <button class="rs-chip" data-query="What are the subscription plans?">💎 Plans & Pricing</button>
          <button class="rs-chip" data-query="I want to report a problem">🚨 Report Bug</button>
        </div>

        <!-- Chat input bar -->
        <div class="rs-input-bar">
          <input type="text" id="rs-chat-input" placeholder="Ask a question or describe issue..." />
          <button id="rs-chat-send-btn">Send</button>
        </div>
      </div>

      <!-- Tab 2: Ticket Form Body -->
      <div class="rs-body" id="rs-view-ticket" style="display: none;">
        <form class="rs-form-container" id="rs-ticket-form">
          <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
            Submit a bug report, suggest a feature, or request custom agency fleet pricing. Our engineering team reviews all tickets directly.
          </div>

          <div class="rs-field">
            <label>Your WhatsApp or Email *</label>
            <input type="text" id="rs-form-contact" required placeholder="+91 98765 43210 or founder@brand.com" />
          </div>

          <div class="rs-field">
            <label>Brand / Store Name</label>
            <input type="text" id="rs-form-brand" placeholder="e.g. Snitch, Minimalist, boAt" />
          </div>

          <div class="rs-field">
            <label>Category *</label>
            <select id="rs-form-cat">
              <option value="PROBLEM">🚨 Problem / Bug Report</option>
              <option value="SUGGESTION">💡 Feature Suggestion</option>
              <option value="SALES_INQUIRY">💼 Sales / Custom Fleet Pricing</option>
              <option value="GENERAL">❓ General Help</option>
            </select>
          </div>

          <div class="rs-field">
            <label>Subject</label>
            <input type="text" id="rs-form-subject" placeholder="Brief 1-line summary" />
          </div>

          <div class="rs-field">
            <label>Details & Message *</label>
            <textarea id="rs-form-msg" required rows="3" placeholder="Explain the problem, suggestion, or URLs affected..."></textarea>
          </div>

          <button type="submit" class="rs-submit-btn" id="rs-form-submit-btn">🚀 Submit Ticket to Engineering</button>

          <div id="rs-form-feedback" style="display: none; padding: 10px; border-radius: 8px; font-size: 11px; text-align: center;"></div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Elements
  const toggleBtn = document.getElementById('rs-toggle-btn');
  const closeBtn = document.getElementById('rs-close-btn');
  const panel = document.getElementById('rs-panel');
  const tabChatBtn = document.getElementById('rs-tab-chat-btn');
  const tabTicketBtn = document.getElementById('rs-tab-ticket-btn');
  const viewChat = document.getElementById('rs-view-chat');
  const viewTicket = document.getElementById('rs-view-ticket');
  const chatBox = document.getElementById('rs-chat-box');
  const chatInput = document.getElementById('rs-chat-input');
  const chatSendBtn = document.getElementById('rs-chat-send-btn');
  const ticketForm = document.getElementById('rs-ticket-form');
  const formContact = document.getElementById('rs-form-contact');
  const formBrand = document.getElementById('rs-form-brand');
  const formCat = document.getElementById('rs-form-cat');
  const formSubject = document.getElementById('rs-form-subject');
  const formMsg = document.getElementById('rs-form-msg');
  const formSubmitBtn = document.getElementById('rs-form-submit-btn');
  const formFeedback = document.getElementById('rs-form-feedback');

  const chatHistory = [];

  // Toggle Panel
  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('rs-open');
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('rs-open');
  });

  // Tab switching
  function switchTab(tab) {
    if (tab === 'chat') {
      tabChatBtn.classList.add('rs-active');
      tabTicketBtn.classList.remove('rs-active');
      viewChat.style.display = 'flex';
      viewTicket.style.display = 'none';
    } else {
      tabChatBtn.classList.remove('rs-active');
      tabTicketBtn.classList.add('rs-active');
      viewChat.style.display = 'none';
      viewTicket.style.display = 'flex';
    }
  }

  tabChatBtn.addEventListener('click', () => switchTab('chat'));
  tabTicketBtn.addEventListener('click', () => switchTab('ticket'));

  // Quick Chips
  document.querySelectorAll('.rs-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (q) {
        chatInput.value = q;
        sendChatMessage();
      }
    });
  });

  // Send Chat Message
  async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Append user message
    appendMessage(text, 'user');
    chatInput.value = '';
    chatHistory.push({ role: 'user', text });

    // Typing indicator
    const typingId = appendTyping();

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatHistory.slice(-6)
        })
      });

      removeTyping(typingId);

      const data = await res.json();
      const reply = data.reply || "I'm having a slight connection blip, but our team is on standby at +91 98705 30066.";
      
      appendMessage(reply, 'bot', data.isIssueOrSuggestion);
      chatHistory.push({ role: 'model', text: reply });

    } catch (err) {
      removeTyping(typingId);
      appendMessage("Network timeout. You can WhatsApp us directly at +91 98705 30066 or submit a ticket in the other tab.", 'bot');
    }
  }

  chatSendBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  function appendMessage(text, sender, showTicketPrompt = false) {
    const msg = document.createElement('div');
    msg.className = `rs-msg ${sender === 'user' ? 'rs-msg-user' : 'rs-msg-bot'}`;
    
    // Simple formatting for bold and links
    let formatted = text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>')
      .replace(/\n/g, '<br>');

    msg.innerHTML = formatted;

    if (showTicketPrompt) {
      const promptBtn = document.createElement('button');
      promptBtn.style = "display: block; margin-top: 8px; background: rgba(225, 29, 72, 0.2); border: 1px solid #f43f5e; color: #f43f5e; font-size: 11px; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-weight: 700;";
      promptBtn.innerHTML = "📋 Open Official Ticket for this Issue";
      promptBtn.onclick = () => {
        switchTab('ticket');
        formSubject.value = text.substring(0, 50);
        formMsg.value = text;
      };
      msg.appendChild(promptBtn);
    }

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function appendTyping() {
    const id = 'typing_' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.className = 'rs-msg rs-msg-bot';
    el.style.opacity = '0.7';
    el.innerHTML = '<span style="font-size: 11px; font-style: italic;">Watchdog AI is typing...</span>';
    chatBox.appendChild(el);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
  }

  function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // Handle Ticket Form Submission
  ticketForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userContact = formContact.value.trim();
    const brandName = formBrand.value.trim();
    const category = formCat.value;
    const subject = formSubject.value.trim();
    const message = formMsg.value.trim();

    formSubmitBtn.disabled = true;
    formSubmitBtn.textContent = 'Submitting Ticket...';
    formFeedback.style.display = 'none';

    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userContact, brandName, category, subject, message })
      });

      const data = await res.json();
      formSubmitBtn.disabled = false;
      formSubmitBtn.textContent = '🚀 Submit Ticket to Engineering';

      if (data.success) {
        formFeedback.style.display = 'block';
        formFeedback.style.background = 'rgba(52, 211, 153, 0.1)';
        formFeedback.style.border = '1px solid #34d399';
        formFeedback.style.color = '#34d399';
        formFeedback.innerHTML = `✅ <strong>Ticket #${data.ticket.id} Submitted!</strong><br>Our engineering team has been alerted and will respond promptly.`;
        ticketForm.reset();
      } else {
        throw new Error(data.error || 'Submission failed');
      }
    } catch (err) {
      formSubmitBtn.disabled = false;
      formSubmitBtn.textContent = '🚀 Submit Ticket to Engineering';
      formFeedback.style.display = 'block';
      formFeedback.style.background = 'rgba(225, 29, 72, 0.1)';
      formFeedback.style.border = '1px solid #e11d48';
      formFeedback.style.color = '#fb7185';
      formFeedback.textContent = '⚠️ ' + err.message;
    }
  });

})();
