function $(id){ return document.getElementById(id); }

const CHAT_KEY = "cinemago_ai_chat_v1";

function addMessage(role, text){
  const box = $("chatBox");
  const row = document.createElement("div");
  row.className = "msg " + (role === "me" ? "me" : "bot");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  row.appendChild(bubble);
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;

  const current = loadChat();
  current.push({ role, text });
  localStorage.setItem(CHAT_KEY, JSON.stringify(current));
}

function loadChat(){
  try { return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); }
  catch { return []; }
}

function renderChat(){
  const box = $("chatBox");
  box.innerHTML = "";
  const items = loadChat();
  if(items.length === 0){
    addMessage("bot", "Hi! I can help you with booking, seats, discounts, and payments. Ask me anything 🙂");
    return;
  }
  for(const m of items){
    const row = document.createElement("div");
    row.className = "msg " + (m.role === "me" ? "me" : "bot");
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = m.text;
    row.appendChild(bubble);
    box.appendChild(row);
  }
  box.scrollTop = box.scrollHeight;
}

function clearChat(){
  localStorage.removeItem(CHAT_KEY);
  renderChat();
}

async function sendMsg(){
  const input = $("chatInput");
  const btn = $("sendBtn");
  const text = (input.value || "").trim();
  if(!text) return;

  addMessage("me", text);
  input.value = "";

  btn.disabled = true;
  btn.textContent = "Thinking...";

  try{
    const res = await fetch("/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json().catch(()=> ({}));
    if(!res.ok){
      addMessage("bot", data.error || `Error: ${res.status}`);
      return;
    }

    addMessage("bot", data.reply || "(empty reply)");
  }catch(e){
    addMessage("bot", "Network error. Is the server running?");
  }finally{
    btn.disabled = false;
    btn.textContent = "Send";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderChat();
  $("chatInput").addEventListener("keydown", (e) => {
    if(e.key === "Enter") sendMsg();
  });
});
