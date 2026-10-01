/* ai-chatbot.js
   Floating "AI Career Advisor" chat widget.
   Drop <script src="ai-chatbot.js"></script> before </body> on any page to enable it.
*/
(function () {
  const API_BASE = "http://localhost:5000";
  let history = [];

  const style = document.createElement("style");
  style.textContent = `
    #ai-chat-toggle {
      position: fixed; bottom: 22px; right: 22px; z-index: 9999;
      width: 58px; height: 58px; border-radius: 50%;
      background: #b79cff; color: #0b1024; border: none;
      font-size: 1.5rem; cursor: pointer;
      box-shadow: 0 0 20px rgba(160,168,235,0.6);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    #ai-chat-toggle:hover { transform: scale(1.08); box-shadow: 0 0 30px #8b9bff; background:#8b9bff; }
    #ai-chat-panel {
      position: fixed; bottom: 92px; right: 22px; z-index: 9999;
      width: min(340px, 90vw); height: min(460px, 70vh);
      background: #0a0d18; border: 1px solid rgba(160,168,235,0.35);
      border-radius: 14px; box-shadow: 0 0 30px rgba(160,168,235,0.35);
      display: none; flex-direction: column; overflow: hidden;
      font-family: 'Courier New', Courier, monospace;
    }
    #ai-chat-panel.open { display: flex; }
    #ai-chat-header {
      background: rgba(160,168,235,0.12); color: #8b9bff;
      padding: 12px 14px; font-weight: bold; font-size: 0.95rem;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid rgba(160,168,235,0.25);
    }
    #ai-chat-close { background: none; border: none; color: #d9dcef; cursor: pointer; font-size: 1.1rem; }
    #ai-chat-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .ai-msg { max-width: 85%; padding: 8px 11px; border-radius: 10px; font-size: 0.85rem; line-height: 1.35; white-space: pre-wrap; }
    .ai-msg.user { align-self: flex-end; background: rgba(160,168,235,0.25); color: #eafcff; }
    .ai-msg.bot { align-self: flex-start; background: rgba(139,155,255,0.1); color: #d9dcef; border: 1px solid rgba(139,155,255,0.25); }
    .ai-msg.typing { opacity: 0.6; font-style: italic; }
    #ai-chat-form { display: flex; border-top: 1px solid rgba(160,168,235,0.25); }
    #ai-chat-input {
      flex: 1; background: transparent; border: none; color: #d9dcef;
      padding: 10px; font-size: 0.85rem; outline: none; font-family: inherit;
    }
    #ai-chat-send { background: #b79cff; color: #0b1024; border: none; padding: 0 16px; cursor: pointer; font-weight: bold; }
    #ai-chat-send:hover { background: #8b9bff; }
    #ai-chat-toggle::after { content:""; position:absolute; inset:-6px; border-radius:50%; border:2px solid #b79cff; opacity:.6; animation: aiRing 2s ease-out infinite; }
    @keyframes aiRing { from { transform:scale(.85); opacity:.7 } to { transform:scale(1.5); opacity:0 } }
    #ai-chat-panel.open { animation: aiPop .28s cubic-bezier(.2,.9,.3,1.2); transform-origin: bottom right; }
    @keyframes aiPop { from { opacity:0; transform: scale(.85) translateY(20px) } to { opacity:1; transform:none } }
    .ai-msg { animation: aiMsg .3s ease both; }
    @keyframes aiMsg { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform:none } }
    .ai-dots span { display:inline-block; width:6px; height:6px; margin:0 2px; border-radius:50%; background:#8b9bff; animation: aiDot 1.1s infinite; }
    .ai-dots span:nth-child(2){animation-delay:.15s}.ai-dots span:nth-child(3){animation-delay:.3s}
    @keyframes aiDot { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }
    #ai-chips { display:flex; flex-wrap:wrap; gap:6px; padding:0 12px 10px; }
    #ai-chips button { background:rgba(160,168,235,.1); border:1px solid rgba(160,168,235,.35); color:#d9dcef; border-radius:999px; padding:4px 10px; font-size:.72rem; cursor:pointer; font-family:inherit; transition:.2s; }
    #ai-chips button:hover { background:rgba(139,155,255,.2); border-color:#8b9bff; transform: translateY(-1px); }
    #ai-chat-tools { display:flex; gap:6px; }
    #ai-chat-tools button { background:none; border:none; color:#d9dcef; cursor:pointer; font-size:.95rem; opacity:.75; }
    #ai-chat-tools button:hover { opacity:1; }
    @media (min-width:1200px){ #ai-chat-panel { width:380px; height:540px; } .ai-msg{font-size:.9rem} }
    @media (max-width:600px){
      #ai-chat-toggle { bottom:calc(14px + env(safe-area-inset-bottom,0px)); right:14px; width:54px; height:54px; }
      #ai-chat-panel { left:10px; right:10px; width:auto; bottom:calc(78px + env(safe-area-inset-bottom,0px)); height:min(72vh,560px); height:min(72dvh,560px); }
      #ai-chat-input { font-size:16px; padding:14px 10px; }
      .ai-msg { max-width:92%; font-size:.9rem; }
      #ai-chips button { padding:7px 12px; font-size:.78rem; }
      #ai-chat-close, #ai-chat-clear { padding:8px; }
    }
    @media (max-width:600px) and (max-height:480px){ #ai-chat-panel { height:calc(100dvh - 100px); } }
    @media (hover:none){ #ai-chat-toggle:hover{ transform:none } }
  `;
  document.head.appendChild(style);

  const toggle = document.createElement("button");
  toggle.id = "ai-chat-toggle";
  toggle.setAttribute("aria-label", "Open AI career advisor chat");
  toggle.textContent = "🤖";

  const panel = document.createElement("div");
  panel.id = "ai-chat-panel";
  panel.innerHTML = `
    <div id="ai-chat-header">
      <span>🤖 AI Career Advisor</span>
      <span id="ai-chat-tools"><button id="ai-chat-clear" title="Clear chat" aria-label="Clear chat">🗑</button><button id="ai-chat-close" aria-label="Close chat">✕</button></span>
    </div>
    <div id="ai-chat-messages"></div>
    <div id="ai-chips"></div>
    <form id="ai-chat-form">
      <input id="ai-chat-input" type="text" placeholder="Ask about careers, skills, courses..." autocomplete="off" />
      <button id="ai-chat-send" type="submit">Send</button>
    </form>
  `;

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    const messages = panel.querySelector("#ai-chat-messages");
    const form = panel.querySelector("#ai-chat-form");
    const input = panel.querySelector("#ai-chat-input");
    const closeBtn = panel.querySelector("#ai-chat-close");

    const chips = panel.querySelector("#ai-chips");
    const SUGGESTIONS = ["Best careers for my skills?", "How do I prepare for interviews?", "Skills for AI / ML jobs", "Improve my resume"];
    SUGGESTIONS.forEach(t => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = t;
      b.addEventListener("click", () => { chips.style.display = "none"; sendMessage(t); });
      chips.appendChild(b);
    });
    panel.querySelector("#ai-chat-clear").addEventListener("click", () => {
      history = []; messages.innerHTML = ""; chips.style.display = "flex";
      addMessage("bot", "Chat cleared. What would you like to explore?");
    });
    try { history = JSON.parse(sessionStorage.getItem("aiChatHistory") || "[]"); } catch (e) { history = []; }
    let greeted = false;
    toggle.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) {
        input.focus();
        if (!greeted) {
          addMessage("bot", "Hi! I'm your AI career advisor. Ask me about career paths, skills to learn, courses, resumes, or interviews.");
          greeted = true;
        }
      }
    });
    closeBtn.addEventListener("click", () => panel.classList.remove("open"));

    function addMessage(role, text, animate) {
      const div = document.createElement("div");
      div.className = "ai-msg " + (role === "user" ? "user" : "bot");
      if (animate) {
        let i = 0;
        (function type() { div.textContent = text.slice(0, i); i += 3; messages.scrollTop = messages.scrollHeight; if (i <= text.length + 2) setTimeout(type, 14); })();
      } else div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      return div;
    }

    function localFallback(userText) {
      const t = userText.toLowerCase();
      if (t.includes("resume")) return "For your resume: lead with impact (numbers/results), tailor keywords to the job post, and keep it to one page if you have under 8 years of experience.";
      if (t.includes("interview")) return "For interviews: research the company, prepare 2-3 STAR-format stories about your work, and have 2 thoughtful questions ready for them.";
      if (t.includes("skill") || t.includes("learn")) return "Pick one in-demand skill in your target field, commit to a focused course or project for 4-6 weeks, and build something you can show, not just a certificate.";
      return "I can help with career paths, skills to learn, resumes, and interview prep — try asking something specific, like \"What skills do I need for data analytics?\"";
    }

    async function sendMessage(text) {
      addMessage("user", text);
      history.push({ role: "user", content: text });
      const typingEl = addMessage("bot", "");
      typingEl.classList.add("typing");
      typingEl.innerHTML = '<span class="ai-dots"><span></span><span></span><span></span></span>';

      try {
        const res = await fetch(`${API_BASE}/api/chatbot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: history.slice(-10) }),
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        typingEl.remove();
        const reply = data.reply || localFallback(text);
        addMessage("bot", reply, true);
        history.push({ role: "assistant", content: reply });
        try { sessionStorage.setItem("aiChatHistory", JSON.stringify(history.slice(-20))); } catch (e) {}
      } catch (err) {
        typingEl.remove();
        const reply = localFallback(text);
        addMessage("bot", reply, true);
        history.push({ role: "assistant", content: reply });
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      sendMessage(text);
    });
  });
})();
