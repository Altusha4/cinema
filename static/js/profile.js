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
        listContainer.innerHTML = tickets.map(ticket => `
            <div class="ticket-card animate-in">
                <div class="ticket-info">
                    <span class="ticket-status pending">Reserved</span>
                    <h3>${ticket.movie_title || 'Movie'}</h3>
                    <div class="ticket-details">
                        <span>💰 Price: <strong>${ticket.final_price} ₸</strong></span>
                        <span>🎟 ID: ${ticket.id.substring(0, 8)}...</span>
                    </div>
                </div>
                <div class="ticket-qr">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${ticket.id}" alt="QR">
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Failed to load tickets:", err);
        listContainer.innerHTML = "<p>Error loading tickets. Please try again later.</p>";
    }
}