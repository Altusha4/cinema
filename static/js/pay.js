function getToken() {
  return localStorage.getItem("token");
}

function getOrderId() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("order_id");
  const n = parseInt(raw || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

async function initPayment() {
  const token = getToken();
  if (!token) {
    location.href = "/pages/auth.html";
    return;
  }

  const orderId = getOrderId();
  if (!orderId) {
    document.getElementById("info").textContent = "order_id не найден в URL";
    return;
  }

  document.getElementById("info").textContent = `Создаём оплату для order #${orderId}...`;

  const res = await fetch("/pay/init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ order_id: orderId })
  });

  const data = await res.json();
  if (!res.ok) {
    document.getElementById("info").textContent = "Ошибка /pay/init: " + (data.error || res.status);
    return;
  }

  const paymentObj = data.payment_obj;
  document.getElementById("dbg").textContent = JSON.stringify(paymentObj, null, 2);
  document.getElementById("info").textContent = "Нажми кнопку, чтобы открыть Halyk Payform.";

  const btn = document.getElementById("payBtn");
  btn.disabled = false;

  btn.onclick = () => {
    try {
      // ВАЖНО: payform глобальный объект из payform.min.js
      // Часто у них используется Payform/EpayWidget/payform — зависит от сборки.
      // Самый частый кейс: payform.open(paymentObj)
      if (window.payform && typeof window.payform.open === "function") {
        window.payform.open(paymentObj);
        return;
      }

      // fallback варианты (на всякий)
      if (window.Payform && typeof window.Payform.open === "function") {
        window.Payform.open(paymentObj);
        return;
      }
      if (window.EpayWidget && typeof window.EpayWidget.open === "function") {
        window.EpayWidget.open(paymentObj);
        return;
      }

      alert("Payform script loaded, but open() not found. Скажи мне что в window есть: " + Object.keys(window).slice(0, 50).join(", "));
    } catch (e) {
      console.error(e);
      alert("Ошибка открытия Payform: " + e.message);
    }
  };
}

document.addEventListener("DOMContentLoaded", initPayment);
