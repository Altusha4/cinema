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

        // Считаем выручку
        const totalRevenue = orders.reduce((sum, order) => sum + (order.final_price || 0), 0);

        const totalOrdersEl = document.getElementById('totalOrders');
        const revenueEl = document.getElementById('revenue');

        if(totalOrdersEl) totalOrdersEl.textContent = orders.length;
        if(revenueEl) revenueEl.textContent = totalRevenue.toLocaleString() + " ₸";

        // Получаем все сессии для счетчика
        const sessionsRes = await fetch(`/sessions?date=all`);
        const sessions = sessionsRes.ok ? await sessionsRes.json() : [];

        const totalSessionsEl = document.getElementById('totalSessions');
        if(totalSessionsEl) totalSessionsEl.textContent = sessions.length;

        // Имитируем количество фильмов на основе уникальных названий в сессиях
        const uniqueMovies = [...new Set(sessions.map(s => s.movie_title))];
        const totalMoviesEl = document.getElementById('totalMovies');
        if(totalMoviesEl) totalMoviesEl.textContent = uniqueMovies.length;

    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// 5. Управление сессиями
async function loadSessionsForAdmin() {
    try {
        // Запрашиваем "all", чтобы видеть созданные сессии на любую дату
        const res = await fetch(`/sessions?date=all`);
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
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sessions found.</td></tr>';
        return;
    }

    // Сортировка: новые/будущие сверху
    const sortedSessions = sessions.sort((a, b) => {
        const dateA = new Date(a.start_time?.$date || a.start_time);
        const dateB = new Date(b.start_time?.$date || b.start_time);
        return dateB - dateA;
    });

    container.innerHTML = sortedSessions.map(session => {
        const dateVal = session.start_time?.$date || session.start_time;
        const formattedDate = new Date(dateVal).toLocaleString('ru-RU', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric'
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

// 6. Управление заказами
async function loadOrdersForAdmin() {
    try {
        const res = await authFetch('/orders');
        if (res.ok) {
            const orders = await res.json();
            renderAdminOrders(orders);
        }
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

    container.innerHTML = orders.slice(-15).reverse().map(order => `
        <tr>
            <td><span class="badge">${order.customer_email || 'n/a'}</span></td>
            <td><strong>${order.movie_title}</strong></td>
            <td><span class="price">${(order.final_price || 0).toLocaleString()} ₸</span></td>
            <td><code>${order.promo_code || '---'}</code></td>
            <td><span style="color: #27ae60; font-weight: bold;">+${order.bonuses_earned || 0}</span></td>
        </tr>
    `).join('');
}

// 7. Создание новой сессии (С ЛОГИКОЙ РЯДОВ)
async function createSession() {
    const movieTitle = document.getElementById('movieTitle').value.trim();
    const cinemaName = document.getElementById('cinemaName').value;
    const hall = document.getElementById('hall').value.trim();
    const startTime = document.getElementById('startTime').value;
    const basePrice = parseFloat(document.getElementById('basePrice').value);

    // ПРОВЕРКА: Получаем количество мест из нового инпута
    const seatCountInput = document.getElementById('seatCount');
    if (!seatCountInput) {
        alert("System error: 'seatCount' input not found in HTML!");
        return;
    }

    const seatCount = parseInt(seatCountInput.value) || 30;
    const generatedSeats = [];
    const rows = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    // ГЕНЕРАЦИЯ: Ряды по 10 мест
    // Если seatCount = 45, создаст A1-A10, B1-B10, C1-C10, D1-D10, E1-E5
    for (let i = 0; i < seatCount; i++) {
        const rowIdx = Math.floor(i / 10);
        const seatNum = (i % 10) + 1;
        generatedSeats.push(`${rows[rowIdx]}${seatNum}`);
    }

    if (!movieTitle || !startTime || !basePrice) {
        alert('Please fill all required fields');
        return;
    }

    const payload = {
        movie_title: movieTitle,
        cinema_name: cinemaName,
        hall: hall || "hall 1",
        start_time: new Date(startTime).toISOString(),
        base_price: basePrice,
        available_seats: generatedSeats, // Здесь теперь точно нужный массив
        movie_id: 0
    };

    console.log("📤 Отправка в MongoDB:", payload);

    try {
        const response = await authFetch('/sessions', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert(`✨ Success! Session created with ${generatedSeats.length} seats.`);
            loadAdminData();
            // Сброс формы
            document.getElementById('movieTitle').value = '';
            document.getElementById('startTime').value = '';
            document.getElementById('hall').value = '';
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
        if (res.ok) {
            alert("Session deleted.");
            loadAdminData();
        }
    } catch (error) {
        console.error(error);
    }
}

window.logout = function() {
    localStorage.clear();
    window.location.href = "/pages/auth.html";
};