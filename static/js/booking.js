/**
 * CinemaGo | Light Premium Booking Module
 * Keeps your logic: seat select -> /book -> /pay/init -> open Halyk widget
 */

function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/pages/auth.html";
    return Promise.reject("No auth token");
  }

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
}

let selectedSessionData = null;

function formatPrice(price) { return price + " ₸"; }

function formatDateTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * 1) INITIALIZATION
 */
async function loadSelectedSession() {
  console.log("Initializing booking module...");
  const rawData = sessionStorage.getItem("selectedSession");
  const bookingForm = document.getElementById("bookingForm");
  const sessionPreview = document.getElementById("sessionPreview");

  if (!rawData || rawData === "null") {
    console.warn("Session data missing.");
    return;
  }

  try {
    selectedSessionData = JSON.parse(rawData);
  } catch (e) {
    console.error("Parse error:", e);
    return;
  }

  if (bookingForm) bookingForm.style.display = "block";

  if (sessionPreview) {
    sessionPreview.innerHTML = `
      <div class="session-header-light">
        <div class="header-content">
          <span class="badge">Selected Movie</span>
          <h3>${selectedSessionData.title}</h3>
          <div class="meta-row">
            <span>📍 ${selectedSessionData.cinema}</span>
            <span>🕒 ${formatDateTime(selectedSessionData.time)}</span>
          </div>
        </div>
        <div class="header-price">
          <span class="badge">Ticket Price</span>
          <div class="price-val">${formatPrice(selectedSessionData.price)}</div>
        </div>
      </div>
    `;
  }

  await fetchAndRenderSeats();
  updatePriceCalculation();
}

/**
 * 2) SEAT RETRIEVAL AND RENDERING
 */
async function fetchAndRenderSeats() {
  const container = document.getElementById("availableSeats");
  const seatInput = document.getElementById("seat");
  if (!container || !selectedSessionData) return;

  try {
    const res = await authFetch(`/sessions?date=all`);
    const sessions = await res.json();
    const dbSession = sessions.find((s) => s.id === parseInt(selectedSessionData.id));

    if (!dbSession) {
      container.innerHTML = "<p>Session not found.</p>";
      return;
    }

    const total = dbSession.total_seats || 30;
    const availableList = dbSession.available_seats || [];
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    const seatsPerRow = 20;
    const remainder = total % seatsPerRow;
    const fullRowsCount = Math.floor(total / seatsPerRow);

    container.innerHTML = `
      <div class="screen-box">
        <div class="screen-line"></div>
        <span class="screen-label">SCREEN</span>
      </div>
      <div class="legend-light">
        <div class="leg-item"><span class="dot free"></span> Free</div>
        <div class="leg-item"><span class="dot taken"></span> Taken</div>
        <div class="leg-item"><span class="dot selected"></span> Selected</div>
      </div>
    `;

    const hallContainer = document.createElement("div");
    hallContainer.className = "hall-layout-light";

    const createSeat = (rowLetter, seatNum, originalId) => {
      const seatEl = document.createElement("div");
      const isTaken = !availableList.includes(originalId);
      const visualName = `${rowLetter}${seatNum}`;

      seatEl.textContent = visualName;

      if (isTaken) {
        seatEl.className = "seat-node occupied";
      } else {
        seatEl.className = "seat-node free";
        seatEl.onclick = () => {
          document.querySelectorAll(".seat-node.selected").forEach((s) => s.classList.remove("selected"));
          seatEl.classList.add("selected");

          if (seatInput) {
            seatInput.value = visualName;
            seatInput.dataset.originalId = originalId; // DB id for server
          }
        };
      }
      return seatEl;
    };

    let rowTracker = 0;

    // Incomplete top row (VIP)
    if (remainder > 0) {
      const row = document.createElement("div");
      row.className = "row-light centered";
      const rowLetter = alphabet[rowTracker];

      for (let i = 0; i < remainder; i++) {
        const globalIdx = fullRowsCount * seatsPerRow + i;
        const originalId = `${alphabet[Math.floor(globalIdx / 10)]}${(globalIdx % 10) + 1}`;
        row.appendChild(createSeat(rowLetter, i + 1, originalId));
      }

      hallContainer.appendChild(row);
      rowTracker++;
    }

    // Full rows
    for (let r = 0; r < fullRowsCount; r++) {
      const row = document.createElement("div");
      row.className = "row-light";
      const rowLetter = alphabet[rowTracker];

      const left = document.createElement("div"); left.className = "sec-light side";
      const center = document.createElement("div"); center.className = "sec-light center";
      const right = document.createElement("div"); right.className = "sec-light side";

      for (let s = 1; s <= 20; s++) {
        const globalIdx = r * 20 + s - 1;
        const originalId = `${alphabet[Math.floor(globalIdx / 10)]}${(globalIdx % 10) + 1}`;
        const seat = createSeat(rowLetter, s, originalId);

        if (s <= 4) left.appendChild(seat);
        else if (s <= 16) center.appendChild(seat);
        else right.appendChild(seat);
      }

      row.append(left, center, right);
      hallContainer.appendChild(row);
      rowTracker++;
    }

    container.appendChild(hallContainer);
  } catch (e) {
    console.error("Error rendering seats:", e);
  }
}

/**
 * 3) PRICE CALCULATION
 */
function updatePriceCalculation() {
  if (!selectedSessionData) return;
  const isStudent = document.getElementById("isStudent").checked;
  const base = Number(selectedSessionData.price) || 0;
  const discount = isStudent ? base * 0.2 : 0;
  const total = base - discount;
  document.getElementById("totalPrice").textContent = total + " ₸";
}

/**
 * helpers: load widget script once
 */
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

async function openHalykPaymentWidget(auth, paymentObj) {
  // Правильный домен из документации:
  const widgetSrc = "https://test-epay.epayment.kz/payform/payment-api.js"; // TEST :contentReference[oaicite:1]{index=1}
  // Для PROD обычно: "https://epay.epayment.kz/payform/payment-api.js"

  await loadScriptOnce(widgetSrc);

  if (!window.halyk || typeof window.halyk.showPaymentWidget !== "function") {
    alert("Halyk widget loaded, but API not found (halyk.showPaymentWidget).");
    return;
  }

  // На всякий случай — доклеим auth в объект
  paymentObj.auth = auth;

  // Откроет форму оплаты (виджет сам рисует UI)
  window.halyk.showPaymentWidget(paymentObj, function (result) {
    // result обычно { success: true/false }
    if (result && result.success) {
      // можно редиректнуть на success page (или просто ждать backLink)
      // window.location.href = "/static/pages/success.html";
      console.log("Payment success:", result);
    } else {
      console.log("Payment failed/cancelled:", result);
      // window.location.href = "/static/pages/failure.html";
    }
  });
}

async function bookTicket() {
  const email = document.getElementById('email').value.trim();
  const seatInput = document.getElementById('seat');
  const bookButton = document.getElementById('bookButton');

  const seatIdForServer = seatInput.dataset.originalId || seatInput.value;

  if (!email || !seatIdForServer) {
    alert("Please provide an email and select a seat.");
    return;
  }

  bookButton.disabled = true;
  bookButton.textContent = 'PROCESSING...';

  try {
    // 1) BOOK
    const bookRes = await authFetch('/book', {
      method: 'POST',
      body: JSON.stringify({
        email,
        session_id: selectedSessionData.id,
        seat: seatIdForServer,
        is_student: document.getElementById('isStudent').checked,
        age: Number(document.getElementById('age')?.value || 20),
      })
    });

    const bookData = await bookRes.json();
    if (!bookRes.ok) {
      alert(bookData.error || "Booking error");
      return;
    }

    const orderId = bookData?.order?.id;
    if (!orderId) {
      alert("Order created but order_id missing");
      return;
    }

    // 2) PAY INIT
    const payRes = await authFetch('/pay/init', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId })
    });

    const payData = await payRes.json();
    if (!payRes.ok) {
      alert(payData.error || "Pay init error");
      return;
    }

    // 3) OPEN HALYK WIDGET
    await openHalykPaymentWidget(payData.auth, payData.payment_obj);

  } catch (e) {
    console.error(e);
    alert("A network error occurred.");
  } finally {
    bookButton.disabled = false;
    bookButton.textContent = '🚀 CONFIRM & PAY';
  }
}


document.addEventListener("DOMContentLoaded", loadSelectedSession);

// optional: update price on checkbox change
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "isStudent") updatePriceCalculation();
});

/**
 * 5) STYLES (your existing)
 */
const styleNode = document.createElement("style");
styleNode.textContent = `
  .seats-container { background: #fff !important; padding: 50px 20px; border-radius: 30px; box-shadow: 0 10px 50px rgba(0,0,0,0.05); border: 1px solid #f0f0f0; overflow-x: auto; }
  .screen-box { margin-bottom: 60px; text-align: center; }
  .screen-line { width: 80%; height: 5px; background: #5dade2; margin: 0 auto 10px; border-radius: 50%; box-shadow: 0 10px 15px rgba(93, 173, 226, 0.2); }
  .screen-label { font-size: 0.7rem; color: #ccc; font-weight: 800; letter-spacing: 10px; }
  .legend-light { display: flex; justify-content: center; gap: 30px; margin-bottom: 40px; }
  .leg-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #777; font-weight: 600; }
  .dot { width: 14px; height: 14px; border-radius: 4px; }
  .dot.free { background: #fff; border: 1px solid #ddd; }
  .dot.taken { background: #fef2f2; border: 1px solid #fecaca; }
  .dot.selected { background: #379683; }
  .hall-layout-light { display: flex; flex-direction: column; gap: 15px; align-items: center; min-width: 850px; }
  .row-light { display: flex; gap: 40px; align-items: center; justify-content: center; width: 100%; }
  .row-light.centered { gap: 10px; }
  .sec-light { display: grid; gap: 10px; }
  .sec-light.side { grid-template-columns: repeat(4, 1fr); }
  .sec-light.center { grid-template-columns: repeat(12, 1fr); padding: 0 20px; border-left: 1px dashed #eee; border-right: 1px dashed #eee; }
  .seat-node { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; border-radius: 6px; transition: 0.2s; cursor: pointer; }
  .seat-node.free { background: #fff; color: #444; border: 1px solid #e0e0e0; }
  .seat-node.free:hover { background: #f8f9fa; transform: translateY(-3px); border-color: #379683; color: #379683; }
  .seat-node.occupied { background: #f9fafb; color: #d1d5db; border: 1px solid #f3f4f6; cursor: not-allowed; }
  .seat-node.selected { background: #379683 !important; color: #fff !important; border-color: #379683; box-shadow: 0 5px 15px rgba(55, 150, 131, 0.4); transform: scale(1.1) translateY(-3px); }
  .session-header-light { background: #fff; padding: 25px; border-radius: 20px; border: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
  .badge { font-size: 0.6rem; text-transform: uppercase; color: #aaa; font-weight: 800; display: block; margin-bottom: 5px; letter-spacing: 1px; }
  .meta-row { display: flex; gap: 20px; font-size: 0.9rem; color: #666; margin-top: 8px; }
  .price-val { font-size: 1.6rem; font-weight: 800; color: #379683; }
`;
document.head.appendChild(styleNode);
