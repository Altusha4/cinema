// Логика бронирования билетов

let selectedSessionData = null;
let availableSeats = [];

async function loadSelectedSession() {
    const sessionData = sessionStorage.getItem('selectedSession');
    const bookingForm = document.getElementById('bookingForm');
    const sessionPreview = document.getElementById('sessionPreview');
    
    if (!sessionData) {
        bookingForm.style.display = 'none';
        return;
    }
    
    selectedSessionData = JSON.parse(sessionData);
    bookingForm.style.display = 'block';
    
    // Отобразить информацию о сеансе
    sessionPreview.innerHTML = `
        <div class="selected-session">
            <h4>${selectedSessionData.title}</h4>
            <div class="session-info-grid">
                <div class="info-item">
                    <span class="label">Cinema:</span>
                    <span class="value">${selectedSessionData.cinema}</span>
                </div>
                <div class="info-item">
                    <span class="label">Time:</span>
                    <span class="value">${formatDateTime(selectedSessionData.time)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Base Price:</span>
                    <span class="value price">${formatPrice(selectedSessionData.price)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Session ID:</span>
                    <span class="value">#${selectedSessionData.id}</span>
                </div>
            </div>
        </div>
    `;
    
    // Загрузить доступные места
    await loadAvailableSeats();
    // Обновить расчет цены
    updatePriceCalculation();
}

async function loadAvailableSeats() {
    if (!selectedSessionData) return;
    
    try {
        const res = await fetch(`/sessions?date=${selectedSessionData.time.slice(0, 10)}&cinema=${encodeURIComponent(selectedSessionData.cinema)}`);
        const sessions = await res.json();
        
        if (sessions && sessions.length > 0) {
            const currentSession = sessions.find(s => s.id === selectedSessionData.id);
            if (currentSession) {
                availableSeats = currentSession.available_seats || [];
                renderAvailableSeats();
            }
        }
    } catch (error) {
        console.error('Error loading seats:', error);
        availableSeats = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']; // Демо-места
        renderAvailableSeats();
    }
}

function renderAvailableSeats() {
    const container = document.getElementById('availableSeats');
    container.innerHTML = '';
    
    if (availableSeats.length === 0) {
        container.innerHTML = '<p class="no-seats">No seats available for this session</p>';
        return;
    }
    
    const seatInput = document.getElementById('seat');
    
    availableSeats.forEach(seat => {
        const seatElement = document.createElement('div');
        seatElement.className = 'seat-option';
        seatElement.textContent = seat;
        seatElement.onclick = () => {
            // Убрать выделение со всех мест
            document.querySelectorAll('.seat-option').forEach(s => s.classList.remove('selected'));
            // Выделить выбранное место
            seatElement.classList.add('selected');
            // Заполнить поле ввода
            seatInput.value = seat;
        };
        
        container.appendChild(seatElement);
    });
    
    // Выбрать первое место по умолчанию
    if (availableSeats.length > 0 && !seatInput.value) {
        seatInput.value = availableSeats[0];
        container.children[0].classList.add('selected');
    }
}

function updatePriceCalculation() {
    if (!selectedSessionData) return;
    
    const isStudent = document.getElementById('isStudent').checked;
    const basePrice = selectedSessionData.price;
    const discount = isStudent ? basePrice * 0.2 : 0;
    const totalPrice = basePrice - discount;
    
    document.getElementById('basePrice').textContent = formatPrice(basePrice);
    document.getElementById('discountAmount').textContent = formatPrice(-discount);
    document.getElementById('totalPrice').textContent = formatPrice(totalPrice);
}

async function bookTicket() {
    const email = document.getElementById('email').value.trim();
    const age = Number(document.getElementById('age').value);
    const seat = document.getElementById('seat').value.trim().toUpperCase();
    const isStudent = document.getElementById('isStudent').checked;
    const bookButton = document.getElementById('bookButton');
    const bookingResult = document.getElementById('bookingResult');
    
    // Валидация
    if (!email || !isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    if (age < 18) {
        showNotification('You must be at least 18 years old to book tickets', 'error');
        return;
    }
    
    if (!seat || !availableSeats.includes(seat)) {
        showNotification('Please select a valid seat from available options', 'error');
        return;
    }
    
    if (!selectedSessionData) {
        showNotification('No session selected', 'error');
        return;
    }
    
    // Показать загрузку
    bookButton.disabled = true;
    bookButton.textContent = 'Processing...';
    bookingResult.innerHTML = '<div class="loading">Processing your booking...</div>';
    
    try {
        const response = await fetch('/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                session_id: selectedSessionData.id,
                seat,
                is_student: isStudent,
                age
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccessBooking(data.order);
            showNotification('Booking successful!', 'success');
        } else {
            throw new Error(data.error || 'Booking failed');
        }
        
    } catch (error) {
        bookingResult.innerHTML = `
            <div class="error-message">
                ❌ ${error.message}
            </div>
        `;
        showNotification(error.message, 'error');
    } finally {
        bookButton.disabled = false;
        bookButton.textContent = 'Confirm Booking';
    }
}

function showSuccessBooking(order) {
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('successBooking').style.display = 'block';
    
    document.getElementById('ticketDetails').innerHTML = `
        <div class="ticket">
            <div class="ticket-header">
                <h4>🎟️ Ticket #${order.id}</h4>
                <span class="ticket-id">REF: ${Date.now()}</span>
            </div>
            <div class="ticket-body">
                <div class="ticket-row">
                    <span>Movie:</span>
                    <strong>${order.movie_title}</strong>
                </div>
                <div class="ticket-row">
                    <span>Cinema:</span>
                    <span>${selectedSessionData.cinema}</span>
                </div>
                <div class="ticket-row">
                    <span>Time:</span>
                    <span>${formatDateTime(selectedSessionData.time)}</span>
                </div>
                <div class="ticket-row">
                    <span>Seat:</span>
                    <span class="seat-badge">${document.getElementById('seat').value}</span>
                </div>
                <div class="ticket-row">
                    <span>Email:</span>
                    <span>${order.customer_email}</span>
                </div>
                <div class="ticket-row total">
                    <span>Paid:</span>
                    <strong>${formatPrice(order.final_price)}</strong>
                </div>
            </div>
            <div class="ticket-footer">
                <p>Present this ticket at the cinema entrance. Have a great show! 🍿</p>
            </div>
        </div>
    `;
}

function printTicket() {
    const ticketContent = document.querySelector('.ticket').outerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Ticket - CinemaGo</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .ticket { border: 2px solid #000; padding: 20px; max-width: 400px; }
                    .ticket-header { border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .ticket-row { display: flex; justify-content: space-between; margin: 10px 0; }
                    .seat-badge { background: #000; color: white; padding: 2px 8px; border-radius: 4px; }
                    .total { border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; }
                </style>
            </head>
            <body>${ticketContent}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Навесить слушатели событий
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('isStudent').addEventListener('change', updatePriceCalculation);
    document.getElementById('age').addEventListener('input', updatePriceCalculation);
    document.getElementById('seat').addEventListener('input', () => {
        document.querySelectorAll('.seat-option').forEach(seat => {
            seat.classList.toggle('selected', seat.textContent === document.getElementById('seat').value);
        });
    });
});

// Стили для бронирования
const bookingStyle = document.createElement('style');
bookingStyle.textContent = `
    .session-preview {
        padding: 20px;
        background: var(--color-secondary);
        border-radius: 12px;
    }
    
    .preview-text {
        text-align: center;
        color: var(--color-muted);
    }
    
    .selected-session h4 {
        margin-top: 0;
        color: var(--color-dark);
    }
    
    .session-info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-top: 15px;
    }
    
    .info-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    
    .label {
        font-weight: 600;
        color: var(--color-muted);
        font-size: 0.9rem;
    }
    
    .value {
        font-size: 1.1rem;
    }
    
    .value.price {
        color: var(--color-dark);
        font-weight: 700;
    }
    
    .form-group {
        margin-bottom: 25px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: var(--color-muted);
    }
    
    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }
    
    small {
        display: block;
        margin-top: 5px;
        color: var(--color-muted);
        font-size: 0.8rem;
    }
    
    .seats-container {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
        padding: 15px;
        background: rgba(142, 228, 175, 0.1);
        border-radius: 12px;
    }
    
    .seat-option {
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border: 2px solid var(--color-primary);
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
    }
    
    .seat-option:hover {
        background: var(--color-primary);
        color: white;
        transform: scale(1.05);
    }
    
    .seat-option.selected {
        background: var(--color-dark);
        color: white;
        border-color: var(--color-dark);
    }
    
    .no-seats {
        color: #c0392b;
        text-align: center;
        width: 100%;
        padding: 20px;
    }
    
    .price-summary {
        background: var(--color-secondary);
        padding: 20px;
        border-radius: 12px;
        margin: 25px 0;
    }
    
    .price-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px dashed var(--color-primary);
    }
    
    .price-row.discount {
        color: var(--color-accent);
    }
    
    .price-row.total {
        border-bottom: none;
        border-top: 2px solid var(--color-dark);
        font-weight: 700;
        font-size: 1.2rem;
        color: var(--color-dark);
    }
    
    .booking-actions {
        display: flex;
        gap: 15px;
        margin-top: 25px;
    }
    
    .booking-actions button {
        flex: 1;
    }
    
    .loading {
        text-align: center;
        padding: 20px;
        color: var(--color-muted);
    }
    
    .error-message {
        background: rgba(192, 57, 43, 0.1);
        color: #c0392b;
        padding: 15px;
        border-radius: 12px;
        margin-top: 15px;
        border-left: 4px solid #c0392b;
    }
    
    .success-message {
        text-align: center;
    }
    
    .success-actions {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: 25px;
    }
    
    .ticket {
        max-width: 500px;
        margin: 20px auto;
        border: 3px solid var(--color-dark);
        border-radius: 15px;
        overflow: hidden;
        background: white;
    }
    
    .ticket-header {
        background: var(--color-dark);
        color: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .ticket-id {
        font-family: monospace;
        background: rgba(255,255,255,0.2);
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 0.9rem;
    }
    
    .ticket-body {
        padding: 25px;
    }
    
    .ticket-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
        padding-bottom: 15px;
        border-bottom: 1px dashed #eee;
    }
    
    .seat-badge {
        background: var(--color-dark);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 600;
    }
    
    .ticket-footer {
        background: var(--color-secondary);
        padding: 15px;
        text-align: center;
        font-size: 0.9rem;
        color: var(--color-muted);
    }
    
    @media (max-width: 600px) {
        .form-row {
            grid-template-columns: 1fr;
        }
        
        .success-actions {
            flex-direction: column;
        }
    }
`;
document.head.appendChild(bookingStyle);