// 1. Проверка доступа (Admin Only)
(function checkAdminAccess() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/pages/auth.html";
        return;
    }
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'admin') {
            window.location.href = "/";
        }
    } catch (e) {
        window.location.href = "/pages/auth.html";
    }
})();

// 2. Универсальный fetch с авторизацией
async function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}

// 3. Инициализация данных
document.addEventListener('DOMContentLoaded', loadAdminData);

async function loadAdminData() {
    console.log("🔄 Синхронизация с MongoDB...");
    await Promise.all([
        loadStatistics(),
        loadSessionsForAdmin(),
        loadOrdersForAdmin()
    ]);
}

// 4. Загрузка статистики
async function loadStatistics() {
    try {
        const ordersRes = await authFetch('/orders');
        const orders = ordersRes.ok ? await ordersRes.json() : [];

        const totalRevenue = orders.reduce((sum, order) => sum + (order.final_price || 0), 0);

        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('revenue').textContent = totalRevenue.toLocaleString() + " ₸";

        const today = new Date().toISOString().slice(0, 10);
        // GET сессий обычно публичный, но используем authFetch для консистентности
        const sessionsRes = await fetch(`/sessions?date=${today}`);
        const sessions = sessionsRes.ok ? await sessionsRes.json() : [];

        document.getElementById('totalSessions').textContent = sessions.length;
        document.getElementById('totalMovies').textContent = "TMDB";
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// 5. Управление сессиями (Рендер в таблицу)
async function loadSessionsForAdmin() {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/sessions?date=${today}`);
        const sessions = await res.json();
        renderAdminSessions(sessions);
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

function renderAdminSessions(sessions) {
    const container = document.getElementById('sessionsManagementBody');
    if (!container) return;

    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sessions found</td></tr>';
        return;
    }

    container.innerHTML = sessions.map(session => {
        // Обработка даты из MongoDB {$date: ...} или обычной строки
        const dateVal = session.start_time?.$date || session.start_time;
        const formattedDate = new Date(dateVal).toLocaleString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short'
        });

        return `
            <tr>
                <td><strong>${session.movie_title}</strong></td>
                <td>${session.cinema_name} <br> <small class="badge">${session.hall || 'Standard'}</small></td>
                <td>${formattedDate}</td>
                <td><span class="price">${(session.base_price || 0).toLocaleString()} ₸</span></td>
                <td>
                    <button onclick="deleteSession(${session.id})" class="btn-delete">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 6. Управление заказами (Рендер в таблицу)
async function loadOrdersForAdmin() {
    try {
        const res = await authFetch('/orders');
        if (!res.ok) throw new Error("Unauthorized");
        const orders = await res.json();
        renderAdminOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderAdminOrders(orders) {
    const container = document.getElementById('adminOrdersBody');
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No bookings yet</td></tr>';
        return;
    }

    const recentOrders = orders.slice(-15).reverse();
    container.innerHTML = recentOrders.map(order => `
        <tr>
            <td><span class="badge">${order.customer_email || 'n/a'}</span></td>
            <td><strong>${order.movie_title}</strong></td>
            <td><span class="price">${(order.final_price || 0).toLocaleString()} ₸</span></td>
            <td><code>${order.promo_code || '---'}</code></td>
            <td><span style="color: #27ae60; font-weight: bold;">+${order.bonuses_earned || 0}</span></td>
        </tr>
    `).join('');
}

// 7. Создание новой сессии
async function createSession() {
    const movieTitle = document.getElementById('movieTitle').value.trim();
    const cinemaName = document.getElementById('cinemaName').value;
    const hall = document.getElementById('hall').value.trim();
    const startTime = document.getElementById('startTime').value;
    const basePrice = parseFloat(document.getElementById('basePrice').value);

    if (!movieTitle || !cinemaName || !startTime || !basePrice) {
        alert('Please fill all required fields');
        return;
    }

    try {
        const response = await authFetch('/sessions', {
            method: 'POST',
            body: JSON.stringify({
                movie_title: movieTitle,
                cinema_name: cinemaName,
                hall: hall || "hall 1",
                start_time: new Date(startTime).toISOString(),
                base_price: basePrice,
                available_seats: ["A1","A2","A3","B1","B2","B3","C1","C2","C3"],
                movie_id: 0
            })
        });

        if (response.ok) {
            alert('✨ Session created!');
            loadAdminData();
            // Очистка полей
            document.getElementById('movieTitle').value = '';
            document.getElementById('startTime').value = '';
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to create session');
        }
    } catch (error) {
        alert(error.message);
    }
}

// 8. Удаление сессии
async function deleteSession(sessionId) {
    if (!confirm(`Delete session #${sessionId}?`)) return;
    try {
        const res = await authFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        loadAdminData();
    } catch (error) {
        alert(error.message);
    }
}

window.logout = function() {
    localStorage.clear();
    window.location.href = "/pages/auth.html";
};