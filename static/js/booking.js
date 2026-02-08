/**
 * CinemaGo - Final Professional Booking & PDF Module
 * Разработано для Алтынай (AITU)
 * Исправлено: Динамическая сетка, генерация PDF с постером, расчет скидок.
 */

// Глобальные переменные состояния
let selectedSessionData = null;
let availableSeats = [];

/**
 * Вспомогательные функции (Утилиты)
 */
function formatPrice(price) {
    return price + " ₸";
}

function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * 1. ИНИЦИАЛИЗАЦИЯ
 * Подгружает данные из sessionStorage и настраивает UI.
 */
async function loadSelectedSession() {
    console.log("Initializing booking module...");

    const rawData = sessionStorage.getItem('selectedSession');
    const bookingForm = document.getElementById('bookingForm');
    const sessionPreview = document.getElementById('sessionPreview');

    if (!rawData || rawData === "null") {
        console.warn("Session data missing in sessionStorage.");
        if (bookingForm) bookingForm.style.display = 'none';
        if (sessionPreview) {
            sessionPreview.innerHTML = `
                <div class="empty-state" style="text-align:center; padding:40px; border:2px dashed #379683; border-radius:15px;">
                    <p style="color:#666; font-size:1.1rem; font-weight:600;">No movie session selected.</p>
                    <a href="/pages/sessions.html" class="btn-primary" style="display:inline-block; margin-top:10px; text-decoration:none; padding:12px 25px; background:#379683; color:white; border-radius:10px; font-weight:800;">
                        ← Back to Sessions
                    </a>
                </div>`;
        }
        return;
    }

    try {
        selectedSessionData = JSON.parse(rawData);
    } catch (e) {
        console.error("Error parsing session data:", e);
        return;
    }

    if (bookingForm) bookingForm.style.display = 'block';

    if (sessionPreview) {
        sessionPreview.innerHTML = `
            <div class="selected-session" style="border-left: 6px solid #379683; padding:15px; background:#f9f9f9; border-radius:0 15px 15px 0; box-shadow: 2px 2px 10px rgba(0,0,0,0.05);">
                <h4 style="margin:0; color:#1a1a1a; font-weight:800; font-size:1.3rem;">${selectedSessionData.title}</h4>
                <div style="margin-top:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.95rem; color:#666;">
                    <span>📍 ${selectedSessionData.cinema}</span>
                    <span>🕒 ${formatDateTime(selectedSessionData.time)}</span>
                    <span style="color:#1a1a1a; font-weight:700; grid-column: 1/-1;">💰 Base Price: ${formatPrice(selectedSessionData.price)}</span>
                </div>
            </div>
        `;
    }

    await fetchAvailableSeats();
    updatePriceCalculation();
}

/**
 * 2. ПОЛУЧЕНИЕ МЕСТ С СЕРВЕРА
 */
async function fetchAvailableSeats() {
    if (!selectedSessionData) return;
    try {
        const dateStr = selectedSessionData.time.slice(0, 10);
        const res = await fetch(`/sessions?date=${dateStr}`);
        if (!res.ok) throw new Error("Server response not ok");

        const sessions = await res.json();
        const session = sessions.find(s => s.id === selectedSessionData.id);

        availableSeats = session ? session.available_seats : [];
        renderSeatMap();

    } catch (e) {
        console.error("Failed to load seats from DB:", e);
        // Резерв для теста
        availableSeats = ["A1", "A2", "B1", "B2", "C1", "D1", "E1"];
        renderSeatMap();
    }
}

/**
 * 3. ОТРИСОВКА СЕТКИ МЕСТ
 */
function renderSeatMap() {
    const container = document.getElementById('availableSeats');
    if (!container) return;

    container.innerHTML = `
        <div class="cinema-screen">SCREEN</div>
        <p style="font-size: 0.75rem; color: #aaa; margin-bottom: 25px; font-weight:700; text-transform:uppercase; letter-spacing:2px;">
            Grey seats are already taken
        </p>
    `;

    const grid = document.createElement('div');
    grid.className = 'dynamic-seats-grid';

    // Используем TotalSeats для отрисовки всех кресел
    // Если TotalSeats нет в ответе, используем заглушку или текущий доступный список
    const allSeats = selectedSessionData.total_seats || ["A1","A2","A3","B1","B2","B3","C1","C2","C3"];

    allSeats.forEach(seatId => {
        const seatEl = document.createElement('div');
        const isAvailable = availableSeats.includes(seatId);

        seatEl.className = isAvailable ? 'seat-node free' : 'seat-node occupied';
        seatEl.textContent = seatId;

        if (isAvailable) {
            seatEl.onclick = () => {
                document.querySelectorAll('.seat-node.selected').forEach(s => s.classList.remove('selected'));
                seatEl.classList.add('selected');
                const seatInput = document.getElementById('seat');
                if (seatInput) seatInput.value = seatId;
            };
        } else {
            // Стиль для занятого места
            seatEl.style.opacity = "0.3";
            seatEl.style.cursor = "not-allowed";
            seatEl.style.background = "#907163"; // Цвет var(--color-muted)
        }
        grid.appendChild(seatEl);
    });

    container.appendChild(grid);
}

/**
 * 4. ДИНАМИЧЕСКИЙ РАСЧЕТ ЦЕНЫ
 */
function updatePriceCalculation() {
    if (!selectedSessionData) return;
    const isStudent = document.getElementById('isStudent').checked;
    const base = selectedSessionData.price;
    const discount = isStudent ? base * 0.2 : 0;
    const total = base - discount;

    const baseEl = document.getElementById('basePrice');
    const discountEl = document.getElementById('discountAmount');
    const totalEl = document.getElementById('totalPrice');

    if (baseEl) baseEl.textContent = formatPrice(base);
    if (discountEl) discountEl.textContent = formatPrice(-discount);
    if (totalEl) totalEl.textContent = formatPrice(total);
}

/**
 * 5. БРОНИРОВАНИЕ
 */
async function bookTicket() {
    const email = document.getElementById('email').value.trim();
    const age = Number(document.getElementById('age').value);
    const seat = document.getElementById('seat').value;
    const isStudent = document.getElementById('isStudent').checked;
    const bookButton = document.getElementById('bookButton');

    if (!email || !seat || age < 18) {
        alert("Please fill all fields correctly (Age 18+, Email, Seat).");
        return;
    }

    bookButton.disabled = true;
    bookButton.textContent = 'Processing...';

    try {
        const res = await fetch('/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email, session_id: selectedSessionData.id, seat, is_student: isStudent, age
            })
        });

        const data = await res.json();
        if (res.ok) {
            showSuccessBooking(data.order);
        } else {
            throw new Error(data.error || 'Server rejected booking');
        }
    } catch (e) {
        alert(e.message);
    } finally {
        bookButton.disabled = false;
        bookButton.textContent = 'Confirm & Pay';
    }
}

/**
 * 6. ОТОБРАЖЕНИЕ БИЛЕТА (Инлайновые стили для PDF)
 */
function showSuccessBooking(order) {
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('successBooking').style.display = 'block';

    const posterUrl = selectedSessionData.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600';
    const ticketDetails = document.getElementById('ticketDetails');

    if (ticketDetails) {
        ticketDetails.innerHTML = `
            <div id="captureTicket" style="width: 380px; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #eee; font-family: sans-serif; margin: 20px auto; text-align: left;">
                <div style="height: 160px; background: url('${posterUrl}') center/cover no-repeat; position: relative;">
                    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(transparent, white);"></div>
                </div>
                <div style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #999; text-transform: uppercase; font-weight: bold; margin-bottom: 10px;">
                        <span>CinemaGo Digital</span>
                        <span>#${order.id || 'AITU-2026'}</span>
                    </div>
                    <h2 style="margin: 0 0 15px 0; font-size: 1.4rem; color: #1a1a1a; font-weight: 800;">${order.movie_title}</h2>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px dashed #eee; padding-bottom: 15px;">
                        <div style="text-align:left;">
                            <small style="color:#aaa; display:block; font-size:0.6rem; text-transform:uppercase;">Seat</small>
                            <span style="font-weight: 800; font-size: 0.9rem;">${document.getElementById('seat').value}</span>
                        </div>
                        <div style="text-align:center;">
                            <small style="color:#aaa; display:block; font-size:0.6rem; text-transform:uppercase;">Time</small>
                            <span style="font-weight: 800; font-size: 0.9rem;">${selectedSessionData.time.slice(11, 16)}</span>
                        </div>
                        <div style="text-align:right;">
                            <small style="color:#aaa; display:block; font-size:0.6rem; text-transform:uppercase;">Date</small>
                            <span style="font-weight: 800; font-size: 0.9rem;">${selectedSessionData.time.slice(0, 10)}</span>
                        </div>
                    </div>
                    <div style="text-align: center; font-size: 1.6rem; font-weight: 800; color: #379683;">
                        ${formatPrice(order.final_price)}
                    </div>
                    <div style="text-align: center; font-size: 0.75rem; color: #999; margin-top: 10px;">
                        Enjoy! Bonuses earned: +${order.bonuses_earned} 🍿
                    </div>
                </div>
            </div>
        `;
    }
}

/**
 * 7. ФУНКЦИЯ СКАЧИВАНИЯ (Исправлено)
 */
async function downloadTicket() {
    const element = document.getElementById('captureTicket');
    if (!element) return;

    // Показываем лоадер или меняем текст кнопки
    const btn = document.querySelector('.primary-action');
    const originalText = btn.textContent;
    btn.textContent = "Generating PDF...";

    const opt = {
        margin: 0,
        filename: 'CinemaGo_Ticket.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
            scale: 3, // Увеличиваем качество
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            scrollY: 0,
            scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
    };

    try {
        // Принудительно ждем загрузки картинок внутри элемента
        const images = element.getElementsByTagName('img');
        const imagePromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        });
        await Promise.all(imagePromises);

        // Сама генерация
        await html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error("PDF Error:", err);
        alert("Error generating PDF. Try taking a screenshot instead.");
    } finally {
        btn.textContent = originalText;
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Слушатели событий
document.addEventListener('DOMContentLoaded', () => {
    loadSelectedSession();
    const isStudent = document.getElementById('isStudent');
    if (isStudent) isStudent.addEventListener('change', updatePriceCalculation);
});

/**
 * 8. ДИНАМИЧЕСКИЕ СТИЛИ (Инъекция)
 */
const styleNode = document.createElement('style');
styleNode.textContent = `
    .dynamic-seats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(65px, 1fr)); gap: 12px; max-width: 800px; margin: 0 auto; }
    .seat-node { height: 55px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 800; border-radius: 10px; cursor: pointer; background: #379683; color: white; transition: 0.2s; border: 2px solid #2d7a6a; }
    .seat-node.selected { background: #1a1a1a !important; color: #8ee4af !important; transform: scale(1.1); }
    .seat-node.occupied {
    background: #ccc !important;
    border-color: #bbb !important;
    color: #999 !important;
    cursor: not-allowed;
    transform: none !important; /* Отключаем анимацию при наведении */
}
`;
document.head.appendChild(styleNode);