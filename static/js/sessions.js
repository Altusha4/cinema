// Работа с сеансами и фильтрами

async function applyFilters() {
    const cinema = document.getElementById('cinemaSelect').value;
    const date = document.getElementById('dateInput').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const onlyWithSeats = document.getElementById('onlyWithSeats').checked;
    
    if (!date) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    // Обновить информацию в quick info
    document.getElementById('currentCinema').textContent = cinema || 'All Cinemas';
    document.getElementById('currentDate').textContent = date;
    
    try {
        let url = `/sessions?date=${date}`;
        if (cinema) url += `&cinema=${encodeURIComponent(cinema)}`;
        if (maxPrice) url += `&max_price=${maxPrice}`;
        if (onlyWithSeats) url += `&only_with_seats=true`;
        
        const res = await fetch(url);
        const sessions = await res.json();
        
        if (!res.ok) {
            throw new Error(sessions.error || 'Failed to load sessions');
        }
        
        renderSessions(sessions);
        showNotification(`Found ${sessions.length} sessions`, 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
        renderSessions([]);
    }
}

function renderSessions(sessions) {
    const list = document.getElementById('sessionsList');
    const card = document.getElementById('sessionsCard');
    const sessionCount = document.getElementById('sessionCount');
    
    list.innerHTML = '';
    card.style.display = 'block';
    sessionCount.textContent = sessions.length;
    
    if (!Array.isArray(sessions) || sessions.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>🎭 No sessions found for selected criteria</p>
                <button onclick="applyFilters()" class="secondary">Try Again</button>
            </div>
        `;
        return;
    }
    
    sessions.forEach(session => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-card';
        
        const seats = session.available_seats || [];
        const hasSeats = seats.length > 0;
        const isSelected = currentSession === session.id;
        
        sessionDiv.innerHTML = `
            <div class="session-header">
                <strong>${session.movie_title}</strong>
                <span class="session-id">#${session.id}</span>
            </div>
            
            <div class="session-details">
                <div class="detail">
                    <span class="emoji">🎦</span>
                    <span>${session.cinema_name}</span>
                </div>
                <div class="detail">
                    <span class="emoji">🏛</span>
                    <span>${session.hall || 'Main Hall'}</span>
                </div>
                <div class="detail">
                    <span class="emoji">🕒</span>
                    <span>${formatDateTime(session.start_time)}</span>
                </div>
                <div class="detail">
                    <span class="emoji">💰</span>
                    <span class="price">${formatPrice(session.base_price)}</span>
                </div>
            </div>
            
            <div class="session-seats">
                <span class="emoji">🎟</span>
                <span class="${hasSeats ? 'seats-available' : 'no-seats'}">
                    ${hasSeats ? `Available seats: ${seats.join(', ')}` : 'No available seats'}
                </span>
            </div>
            
            <div class="session-actions">
                ${hasSeats ? `
                    <button onclick="selectSession(${session.id}, '${session.movie_title}', '${session.cinema_name}', '${session.start_time}', ${session.base_price})"
                            class="${isSelected ? 'selected' : ''}">
                        ${isSelected ? '✓ Selected' : 'Select Session'}
                    </button>
                ` : `
                    <button disabled class="disabled">Sold Out</button>
                `}
            </div>
        `;
        
        list.appendChild(sessionDiv);
    });
}

function selectSession(id, title, cinema, time, price) {
    currentSession = id;
    
    // Сохранить в sessionStorage для использования на странице бронирования
    sessionStorage.setItem('selectedSession', JSON.stringify({
        id,
        title,
        cinema,
        time,
        price
    }));
    
    // Обновить информацию о выбранном сеансе
    document.getElementById('selectedMovie').textContent = title;
    document.getElementById('selectedCinema').textContent = cinema;
    document.getElementById('selectedTime').textContent = formatDateTime(time);
    document.getElementById('selectedPrice').textContent = formatPrice(price);
    document.getElementById('selectedSessionInfo').style.display = 'block';
    
    // Обновить кнопки
    renderSessions(JSON.parse(sessionStorage.getItem('lastSessions') || '[]'));
    
    showNotification(`Session selected: ${title}`, 'success');
}

function clearSelection() {
    currentSession = null;
    sessionStorage.removeItem('selectedSession');
    document.getElementById('selectedSessionInfo').style.display = 'none';
    renderSessions(JSON.parse(sessionStorage.getItem('lastSessions') || '[]'));
    showNotification('Selection cleared', 'info');
}

// Сохраняем последние загруженные сеансы
let lastSessions = [];
function saveSessions(sessions) {
    lastSessions = sessions;
    sessionStorage.setItem('lastSessions', JSON.stringify(sessions));
}

// Стили для сеансов
const sessionsStyle = document.createElement('style');
sessionsStyle.textContent = `
    .session-info {
        background: var(--color-secondary);
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        border-left: 4px solid var(--color-accent);
    }
    
    .session-info h4 {
        margin-top: 0;
        color: var(--color-dark);
    }
    
    .quick-info {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .info-item {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px dashed var(--color-primary);
    }
    
    .info-label {
        font-weight: 600;
        color: var(--color-muted);
    }
    
    .empty-state {
        text-align: center;
        padding: 40px;
        color: var(--color-muted);
    }
    
    .empty-state p {
        margin-bottom: 15px;
    }
    
    .session-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .session-id {
        background: var(--color-muted);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8rem;
    }
    
    .session-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 10px 0;
    }
    
    .detail {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .emoji {
        font-size: 1.1rem;
    }
    
    .price {
        font-weight: 700;
        color: var(--color-dark);
    }
    
    .session-seats {
        margin: 10px 0;
        padding: 8px;
        background: rgba(142, 228, 175, 0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .seats-available {
        color: var(--color-dark);
        font-weight: 600;
    }
    
    .no-seats {
        color: #c0392b;
        font-weight: 600;
    }
    
    .session-actions {
        margin-top: 10px;
    }
    
    button.selected {
        background-color: var(--color-accent) !important;
        color: var(--color-muted) !important;
    }
    
    button.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
document.head.appendChild(sessionsStyle);