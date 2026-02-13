let currentSessionId = null;
let loadedSessions = []; 

async function applyFilters() {
    console.log("Applying search filters...");

    const cinema = document.getElementById('cinemaSelect').value;
    const date = document.getElementById('dateInput').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const onlyWithSeats = document.getElementById('onlyWithSeats').checked;

    if (!date) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a date to find sessions', 'error');
        }
        return;
    }

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
            throw new Error(sessions.error || 'Failed to fetch sessions');
        }

        loadedSessions = sessions;
        saveSessionsToStorage(sessions);

        renderSessions(sessions);

        if (typeof showNotification === 'function') {
            showNotification(`Success! Found ${sessions.length} sessions`, 'success');
        }

    } catch (error) {
        console.error("Session load error:", error);
        if (typeof showNotification === 'function') {
            showNotification(error.message, 'error');
        }
        renderSessions([]); 
    }
}

function renderSessions(sessions) {
    const list = document.getElementById('sessionsList');
    const card = document.getElementById('sessionsCard');
    const sessionCount = document.getElementById('sessionCount');
    const sessionCountBadge = document.getElementById('sessionCountBadge');

    list.innerHTML = '';
    card.style.display = 'block';

    const count = sessions ? sessions.length : 0;
    sessionCount.textContent = count;
    if (sessionCountBadge) sessionCountBadge.textContent = `${count} Found`;

    if (!Array.isArray(sessions) || sessions.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <p style="font-size: 1.2rem; color: #666;">🎭 No movie sessions found for this criteria.</p>
                <button onclick="applyFilters()" class="secondary" style="margin-top:10px;">Try Again</button>
            </div>
        `;
        return;
    }

    const saved = sessionStorage.getItem('selectedSession');
    const savedId = saved ? JSON.parse(saved).id : currentSessionId;

    sessions.forEach(session => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-card';

        const seats = session.available_seats || [];
        const hasSeats = seats.length > 0;
        const isSelected = savedId === session.id;

        const safeTitle = session.movie_title.replace(/'/g, "\\'");
        const safeCinema = session.cinema_name.replace(/'/g, "\\'");

        sessionDiv.innerHTML = `
            <div class="session-main">
                <div class="session-header">
                    <h4 title="${session.movie_title}">${session.movie_title}</h4>
                    <span class="session-tag">#${session.id}</span>
                </div>
                
                <div class="session-grid-details">
                    <div class="grid-item">
                        <span class="icon">📍</span>
                        <span class="text">${session.cinema_name}</span>
                    </div>
                    <div class="grid-item">
                        <span class="icon">🚪</span>
                        <span class="text">${session.hall || 'Standard Hall'}</span>
                    </div>
                    <div class="grid-item">
                        <span class="icon">🕒</span>
                        <span class="text">${formatDateTime(session.start_time)}</span>
                    </div>
                    <div class="grid-item">
                        <span class="icon">💰</span>
                        <span class="text price-text">${formatPrice(session.base_price)}</span>
                    </div>
                </div>

                <div class="seats-info-bar ${hasSeats ? '' : 'sold-out'}">
                    <span>🎟️ ${hasSeats ? `Seats available: ${seats.length}` : 'Sold Out'}</span>
                </div>
            </div>
            
            <div class="session-footer">
                <button onclick="selectSession(${session.id}, '${safeTitle}', '${safeCinema}', '${session.start_time}', ${session.base_price})"
                        class="select-btn ${isSelected ? 'selected' : ''}" 
                        ${!hasSeats ? 'disabled' : ''}>
                    ${!hasSeats ? 'FULLY BOOKED' : isSelected ? '✓ SELECTED' : 'CHOOSE SESSION'}
                </button>
            </div>
        `;

        list.appendChild(sessionDiv);
    });
}

function selectSession(id, title, cinema, time, price) {
    currentSessionId = id;
    const sessionData = {
        id: id,
        title: title,
        cinema: cinema,
        time: time,
        price: price
    };

    sessionStorage.setItem('selectedSession', JSON.stringify(sessionData));
    const movieEl = document.getElementById('selectedMovie');
    const cinemaEl = document.getElementById('selectedCinema');
    const timeEl = document.getElementById('selectedTime');
    const priceEl = document.getElementById('selectedPrice');
    const infoBox = document.getElementById('selectedSessionInfo');

    if (movieEl) movieEl.textContent = title;
    if (cinemaEl) cinemaEl.textContent = cinema;
    if (timeEl) timeEl.textContent = formatDateTime(time);
    if (priceEl) priceEl.textContent = formatPrice(price);
    if (infoBox) infoBox.style.display = 'block';

    renderSessions(loadedSessions);

    if (typeof showNotification === 'function') {
        showNotification(`Selected: ${title}`, 'success');
    }
}


function clearSelection() {
    currentSessionId = null;
    sessionStorage.removeItem('selectedSession');

    const infoBox = document.getElementById('selectedSessionInfo');
    if (infoBox) infoBox.style.display = 'none';

    renderSessions(loadedSessions);

    if (typeof showNotification === 'function') {
        showNotification('Selection cleared', 'info');
    }
}

function saveSessionsToStorage(sessions) {
    sessionStorage.setItem('lastSessions', JSON.stringify(sessions));
}

const extraStyle = document.createElement('style');
extraStyle.textContent = `
    .sessions-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 25px;
        margin-top: 20px;
    }
    .session-card {
        background: #fff !important;
        border: 2px solid var(--color-primary);
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        overflow: hidden;
        box-shadow: 6px 6px 0px var(--color-primary);
    }
    .session-card:hover {
        transform: translateY(-5px);
        box-shadow: 10px 10px 0px var(--color-dark);
        border-color: var(--color-dark);
    }
    .session-main { padding: 20px; flex-grow: 1; }
    .session-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 15px;
        height: 3em;
    }
    .session-header h4 {
        margin: 0; font-size: 1.1rem; font-weight: 800; line-height: 1.3; color: var(--color-dark);
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .session-tag {
        font-size: 0.75rem; background: var(--color-secondary); padding: 4px 8px;
        border-radius: 8px; font-weight: 700; color: var(--color-dark);
    }
    .session-grid-details {
        display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;
    }
    .grid-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--color-muted); font-weight: 600; }
    .price-text { color: var(--color-dark); font-weight: 800; }
    
    .seats-info-bar {
        background: #f0fdf4; padding: 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; color: #166534;
    }
    .seats-info-bar.sold-out { background: #fef2f2; color: #991b1b; }
    
    .session-footer { padding: 0 20px 20px; }

    /* КНОПКА: ИСПРАВЛЕНИЕ ЦЕНТРОВКИ И ЦВЕТА */
    .select-btn {
        width: 100%; 
        height: 50px; 
        border-radius: 14px; 
        border: 2px solid var(--color-dark);
        background-color: var(--color-primary) !important;
        color: var(--color-dark) !important;
        font-weight: 800; 
        font-family: 'Montserrat', sans-serif;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer; 
        transition: 0.2s ease;
        
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    
    .select-btn:hover:not(:disabled) { 
        background-color: var(--color-dark) !important; 
        color: #fff !important; 
        transform: translate(-2px, -2px);
        box-shadow: 4px 4px 0px var(--color-primary);
    }
    
    .select-btn.selected { 
        background-color: var(--color-dark) !important; 
        color: var(--color-primary) !important; 
        border-color: var(--color-dark);
    }
    
    .select-btn:disabled { 
        background-color: #f0f0f0 !important; 
        color: #aaa !important; 
        border-color: #ddd !important;
        cursor: not-allowed; 
    }
`;
document.head.appendChild(extraStyle);