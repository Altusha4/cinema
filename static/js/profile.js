document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/pages/auth.html";
        return;
    }

    // 1. Инициализация данных пользователя
    const payload = parseJwt(token); // Твоя функция из кода выше
    if (payload) {
        document.getElementById('userName').textContent = payload.username || 'User';
        document.getElementById('userEmail').textContent = payload.email || '';
        document.getElementById('userInitial').textContent = (payload.username || 'U')[0].toUpperCase();
    }

    // 2. Загрузка билетов пользователя
    loadUserTickets();
});

async function loadUserTickets() {
    const listContainer = document.getElementById('activeTicketsList');
    
    try {
        // 1. Убедись, что путь совпадает с тем, что в main.go
        const res = await authFetch('/user/profile'); 
        const data = await res.json(); // Получаем весь объект целиком

        // 2. Достаем массив билетов из поля "tickets"
        const tickets = data.tickets || [];
        
        // Обновим количество бонусов на странице, раз уж данные пришли
        if (data.total_bonuses !== undefined) {
            const bonusEl = document.getElementById('userBonuses'); // Проверь ID в HTML
            if (bonusEl) bonusEl.textContent = data.total_bonuses;
        }

        if (!res.ok || tickets.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p>You haven't booked any movies yet.</p>
                    <a href="/" class="btn-main" style="color: var(--primary)">Browse Movies</a>
                </div>`;
            return;
        }

        // 3. Отрисовка (проверь названия полей: movie_title, final_price и т.д.)
        list.innerHTML = tickets.map(t => {
  const status = t.payment_status || 'reserved';
  const isPaid = status === 'paid';

  const dateStr = t.start_time ? new Date(t.start_time).toLocaleString() : '—';

  return `
  <div class="session-card" style="margin-bottom: 15px; justify-content: space-between;">
    <div>
      <span class="status-badge" style="background: ${isPaid ? 'var(--color-dark)' : '#f39c12'}">
        ${isPaid ? 'CONFIRMED' : 'RESERVED'}
      </span>

      <h4 style="margin: 10px 0 5px; color: var(--color-dark); font-size: 1.2rem;">
        ${t.movie_title || 'Movie'}
      </h4>

      <div class="helper-text" style="margin-top:6px;">
        🎬 <b>${t.cinema_name || 'Cinema'}</b> • 🏛 ${t.hall || 'Hall'} • 💺 Seat: <b>${t.seat || '—'}</b>
      </div>

      <div class="helper-text" style="margin-top:6px;">
        📅 ${dateStr} • Session #${t.session_id || '—'}
      </div>

      <div class="helper-text" style="margin-top:6px;">
        Promo: <span style="font-family: monospace; font-weight: bold;">${t.promo_code || 'NONE'}</span>
      </div>
    </div>

    <div style="text-align: right;">
      <div style="font-weight: 800; font-size: 1.3rem; color: var(--color-dark);">
        ${(t.final_price || 0).toLocaleString()} ₸
      </div>
      <div style="color: var(--color-accent); font-size: 0.85rem; font-weight: bold;">
        +${t.bonuses_earned || 0} bonuses
      </div>
    </div>
  </div>`;
}).join('');






    } catch (err) {
        console.error("Failed to load tickets:", err);
        listContainer.innerHTML = "<p>Error loading tickets. Please try again later.</p>";
    }
}