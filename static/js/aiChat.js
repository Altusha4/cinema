async function aiSendMessage(text) {
  const res = await fetch("/ai/chat", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ message: text })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "AI request failed");
  }

  return res.json();
}

function createAIWidget() {
  const btn = document.createElement("button");
  btn.innerText = "AI";
  btn.style.position = "fixed";
  btn.style.right = "20px";
  btn.style.bottom = "20px";
  btn.style.zIndex = "9999";
  btn.style.padding = "12px 14px";
  btn.style.borderRadius = "999px";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.fontWeight = "700";

  const box = document.createElement("div");
  box.style.position = "fixed";
  box.style.right = "20px";
  box.style.bottom = "70px";
  box.style.width = "340px";
  box.style.height = "420px";
  box.style.background = "white";
  box.style.border = "1px solid #ddd";
  box.style.borderRadius = "16px";
  box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
  box.style.zIndex = "9999";
  box.style.display = "none";
  box.style.overflow = "hidden";

  box.innerHTML = `
    <div style="padding:12px 14px; font-weight:700; border-bottom:1px solid #eee;">
      CinemaGo Assistant
    </div>
    <div id="aiMessages" style="padding:12px; height:310px; overflow:auto; font-size:14px;"></div>
    <div style="display:flex; gap:8px; padding:12px; border-top:1px solid #eee;">
      <input id="aiInput" placeholder="Ask me anything..." style="flex:1; padding:10px; border:1px solid #ddd; border-radius:10px;" />
      <button id="aiSend" style="padding:10px 12px; border:0; border-radius:10px; cursor:pointer; font-weight:700;">Send</button>
    </div>
  `;

  function addMsg(role, text) {
    const wrap = document.getElementById("aiMessages");
    const el = document.createElement("div");
    el.style.marginBottom = "10px";
    el.innerHTML = `<b>${role}:</b> ${text}`;
    wrap.appendChild(el);
    wrap.scrollTop = wrap.scrollHeight;
  }

  btn.onclick = () => {
    box.style.display = box.style.display === "none" ? "block" : "none";
  };

  document.body.appendChild(btn);
  document.body.appendChild(box);

  box.querySelector("#aiSend").onclick = async () => {
    const input = box.querySelector("#aiInput");
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg("You", text);
    addMsg("AI", "Thinking...");

    try {
      const data = await aiSendMessage(text);
      const msgs = document.getElementById("aiMessages");
      msgs.lastChild.innerHTML = `<b>AI:</b> ${data.reply}`;
    } catch (e) {
      const msgs = document.getElementById("aiMessages");
      msgs.lastChild.innerHTML = `<b>AI:</b> Error: ${String(e.message || e)}`;
    }
  };
}

window.addEventListener("DOMContentLoaded", createAIWidget);
