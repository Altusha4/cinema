// Админ-панель

async function loadAdminData() {
    await Promise.all([
        loadStatistics(),
        loadSessionsForAdmin(),
        loadOrdersForAdmin()
    ]);
}

async function loadStatistics() {
    try {
        // Загрузка заказов
        const ordersRes = await fetch('/orders');
        const orders = await ordersRes.ok ? await ordersRes.json() : [];
        
        // Расчет статистики
        const totalRevenue = orders.reduce((sum, order) => sum + order.final_price, 0);
        
        // Обновление UI
        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('revenue').textContent = formatPrice(totalRevenue);
        
        // Загрузка сеансов
        const today = new Date().toISOString().slice(0, 10);
        const sessionsRes = await fetch(`/sessions?date=${today}`);
        const sessions = sessionsRes.ok ? await sessionsRes.json() : [];
        
        document.getElementById('totalSessions').textContent = sessions.length;
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

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
    const container = document.getElementById('sessionsManagement');
    
    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<p class="empty">No sessions found for today</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="sessions-table">
            <div class="table-header">
                <span>Movie</span>
                <span>Cinema</span>
                <span>Time</span>
                <span>Price</span>
                <span>Seats</span>
                <span>Actions</span>
            </div>
            ${sessions.map(session => `
                <div class="table-row" data-id="${session.id}">
                    <span class="movie-title">${session.movie_title}</span>
                    <span>${session.cinema_name}</span>
                    <span>${formatDateTime(session.start_time).slice(0, -6)}</span>
                    <span class="price">${formatPrice(session.base_price)}</span>
                    <span class="seats-count">
                        ${session.available_seats?.length || 0} seats
                    </span>
                    <span class="actions">
                        <button onclick="deleteSession(${session.id})" class="danger">Delete</button>
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadOrdersForAdmin() {
    try {
        const res = await fetch('/orders');
        const orders = await res.json();
        
        renderAdminOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderAdminOrders(orders) {
    const container = document.getElementById('adminOrders');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="empty">No orders yet</p>';
        return;
    }
    
    // Показать последние 10 заказов
    const recentOrders = orders.slice(0, 10);
    
    container.innerHTML = `
        <div class="orders-table">
            <div class="table-header">
                <span>ID</span>
                <span>Movie</span>
                <span>Customer</span>
                <span>Price</span>
                <span>Time</span>
            </div>
            ${recentOrders.map(order => `
                <div class="table-row">
                    <span class="order-id">#${order.id}</span>
                    <span class="movie-title">${order.movie_title}</span>
                    <span class="customer">${order.customer_email}</span>
                    <span class="price">${formatPrice(order.final_price)}</span>
                    <span class="time">Just now</span>
                </div>
            `).join('')}
        </div>
    `;
}

function toggleSessionForm() {
    const form = document.getElementById('sessionForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function createSession() {
    const movieTitle = document.getElementById('movieTitle').value.trim();
    const cinemaName = document.getElementById('cinemaName').value;
    const hall = document.getElementById('hall').value.trim();
    const startTime = document.getElementById('startTime').value;
    const basePrice = parseFloat(document.getElementById('basePrice').value);
    const availableSeats = document.getElementById('availableSeats').value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    // Валидация
    if (!movieTitle || !cinemaName || !startTime || !basePrice) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    if (basePrice <= 0) {
        showNotification('Price must be greater than 0', 'error');
        return;
    }
    
    if (availableSeats.length === 0) {
        showNotification('Please specify available seats', 'error');
        return;
    }
    
    // Преобразовать время в ISO строку
    const startDateTime = new Date(startTime);
    
    try {
        const response = await fetch('/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                movie_title: movieTitle,
                cinema_name: cinemaName,
                hall: hall || undefined,
                start_time: startDateTime.toISOString(),
                base_price: basePrice,
                available_seats: availableSeats,
                movie_id: 0 // Можно реализовать поиск по TMDB
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Session created successfully!', 'success');
            toggleSessionForm();
            clearSessionForm();
            loadSessionsForAdmin();
            loadStatistics();
        } else {
            throw new Error(data.error || 'Failed to create session');
        }
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function clearSessionForm() {
    document.getElementById('movieTitle').value = '';
    document.getElementById('cinemaName').value = '';
    document.getElementById('hall').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('basePrice').value = '';
    document.getElementById('availableSeats').value = 'A1,A2,A3,B1,B2,B3,C1,C2,C3';
}

async function deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this session?')) {
        return;
    }
    
    try {
        // Note: You'll need to add a DELETE endpoint to your backend
        // For now, we'll just show a notification
        showNotification(`Delete functionality would remove session #${sessionId}`, 'info');
        // In production: await fetch(`/sessions/${sessionId}`, { method: 'DELETE' });
        
        // Simulate deletion
        loadSessionsForAdmin();
        
    } catch (error) {
        showNotification('Failed to delete session', 'error');
    }
}

// Стили для админ-панели
const adminStyle = document.createElement('style');
adminStyle.textContent = `
    .admin-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 25px;
        margin-bottom: 40px;
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 15px;
        margin-top: 15px;
    }
    
    .stat-card {
        background: var(--color-secondary);
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        border: 2px solid transparent;
        transition: all 0.3s ease;
    }
    
    .stat-card:hover {
        border-color: var(--color-primary);
        transform: translateY(-5px);
    }
    
    .stat-number {
        display: block;
        font-size: 2rem;
        font-weight: 800;
        color: var(--color-dark);
        margin-bottom: 5px;
    }
    
    .stat-label {
        font-size: 0.9rem;
        color: var(--color-muted);
    }
    
    .sessions-management, .orders-table {
        margin-top: 20px;
    }
    
    .sessions-table, .orders-table {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .table-header {
        display: grid;
        grid-template-columns: 2fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr;
        gap: 15px;
        padding: 15px;
        background: var(--color-secondary);
        border-radius: 10px;
        font-weight: 600;
        color: var(--color-muted);
    }
    
    .orders-table .table-header {
        grid-template-columns: 0.5fr 2fr 1.5fr 0.8fr 1fr;
    }
    
    .table-row {
        display: grid;
        grid-template-columns: 2fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr;
        gap: 15px;
        padding: 15px;
        align-items: center;
        background: white;
        border-radius: 10px;
        border: 2px solid var(--color-secondary);
        transition: all 0.2s ease;
    }
    
    .orders-table .table-row {
        grid-template-columns: 0.5fr 2fr 1.5fr 0.8fr 1fr;
    }
    
    .table-row:hover {
        border-color: var(--color-primary);
        transform: translateX(5px);
    }
    
    .movie-title {
        font-weight: 600;
        color: var(--color-dark);
    }
    
    .price {
        font-weight: 700;
        color: var(--color-dark);
    }
    
    .seats-count {
        background: rgba(142, 228, 175, 0.2);
        padding: 5px 10px;
        border-radius: 20px;
        font-weight: 600;
        text-align: center;
        color: var(--color-muted);
    }
    
    .actions {
        display: flex;
        gap: 8px;
    }
    
    .actions button {
        padding: 8px 12px;
        font-size: 0.85rem;
        width: auto;
    }
    
    button.danger {
        background-color: #c0392b;
    }
    
    button.danger:hover {
        background-color: #a93226;
    }
    
    .order-id {
        font-family: monospace;
        background: var(--color-secondary);
        padding: 4px 8px;
        border-radius: 6px;
        font-weight: 600;
    }
    
    .customer {
        font-size: 0.9rem;
        color: var(--color-muted);
    }
    
    .time {
        font-size: 0.85rem;
        color: var(--color-muted);
    }
    
    .empty {
        text-align: center;
        padding: 40px;
        color: var(--color-muted);
        font-style: italic;
    }
    
    .form-actions {
        display: flex;
        gap: 15px;
        margin-top: 25px;
    }
    
    @media (max-width: 768px) {
        .admin-grid {
            grid-template-columns: 1fr;
        }
        
        .table-header, .table-row {
            grid-template-columns: 1fr !important;
            gap: 10px;
        }
        
        .table-header span {
            display: none;
        }
        
        .table-row span::before {
            content: attr(data-label);
            font-weight: 600;
            color: var(--color-muted);
            margin-right: 10px;
            display: inline-block;
            width: 80px;
        }
        
        .table-row {
            padding: 20px;
        }
    }
`;
document.head.appendChild(adminStyle);