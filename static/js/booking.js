/**
 * CinemaGo | Light Premium Booking Module
 * Fixed: Displaying the visual seat name in the "Selected Seat" field while sending the correct DB ID.
 */

function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/pages/auth.html";
        return Promise.reject("No auth token");
    }

    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });
}

let selectedSessionData = null;

function formatPrice(price) { return price + " ₸"; }

function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * 1. INITIALIZATION
 * Loads session data from sessionStorage and sets up the UI.
 */
async function loadSelectedSession() {
    console.log("Initializing booking module...");
    const rawData = sessionStorage.getItem('selectedSession');
    const bookingForm = document.getElementById('bookingForm');
    const sessionPreview = document.getElementById('sessionPreview');

    if (!rawData || rawData === "null") {
        console.warn("Session data missing.");
        return;
    }

    try {
        selectedSessionData = JSON.parse(rawData);
    } catch (e) {
        console.error("Parse error:", e);
        return;
    }

    if (bookingForm) bookingForm.style.display = 'block';

    if (sessionPreview) {
        sessionPreview.innerHTML = `
            <div class="session-header-light">
                <div class="header-content">
                    <span class="badge">Selected Movie</span>
                    <h3>${selectedSessionData.title}</h3>
                    <div class="meta-row">
                        <span>📍 ${selectedSessionData.cinema}</span>
                        <span>🕒 ${formatDateTime(selectedSessionData.time)}</span>
                    </div>
                </div>
                <div class="header-price">
                    <span class="badge">Ticket Price</span>
                    <div class="price-val">${formatPrice(selectedSessionData.price)}</div>
                </div>
            </div>
        `;
    }

    await fetchAndRenderSeats();
    updatePriceCalculation();
}

/**
 * 2. SEAT RETRIEVAL AND RENDERING
 */
async function fetchAndRenderSeats() {
    const container = document.getElementById('availableSeats');
    const seatInput = document.getElementById('seat'); // The seat number input field
    if (!container || !selectedSessionData) return;

    try {
        const res = await authFetch(`/sessions?date=all`);
        const sessions = await res.json();
        const dbSession = sessions.find(s => s.id === parseInt(selectedSessionData.id));

        if (!dbSession) {
            container.innerHTML = "<p>Session not found.</p>";
            return;
        }

        const total = dbSession.total_seats || 30;
        const availableList = dbSession.available_seats || [];
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

        const seatsPerRow = 20;
        const remainder = total % seatsPerRow;
        const fullRowsCount = Math.floor(total / seatsPerRow);

        container.innerHTML = `
            <div class="screen-box">
                <div class="screen-line"></div>
                <span class="screen-label">SCREEN</span>
            </div>
            <div class="legend-light">
                <div class="leg-item"><span class="dot free"></span> Free</div>
                <div class="leg-item"><span class="dot taken"></span> Taken</div>
                <div class="leg-item"><span class="dot selected"></span> Selected</div>
            </div>
        `;

        const hallContainer = document.createElement('div');
        hallContainer.className = 'hall-layout-light';

        // Helper function to create seat elements
        const createSeat = (rowLetter, seatNum, originalId) => {
            const seatEl = document.createElement('div');
            const isTaken = !availableList.includes(originalId);
            const visualName = `${rowLetter}${seatNum}`; // e.g., A1

            seatEl.textContent = visualName;

            if (isTaken) {
                seatEl.className = 'seat-node occupied';
            } else {
                seatEl.className = 'seat-node free';
                seatEl.onclick = () => {
                    document.querySelectorAll('.seat-node.selected').forEach(s => s.classList.remove('selected'));
                    seatEl.classList.add('selected');

                    // FIXED: Display visual name for the user, store originalId for the server
                    if (seatInput) {
                        seatInput.value = visualName;
                        seatInput.dataset.originalId = originalId; // Save DB ID in dataset
                    }
                };
            }
            return seatEl;
        };

        let rowTracker = 0;

        // 1. ROW A (Incomplete Row - VIP)
        if (remainder > 0) {
            const row = document.createElement('div');
            row.className = 'row-light centered';
            const rowLetter = alphabet[rowTracker];
            for (let i = 0; i < remainder; i++) {
                const globalIdx = fullRowsCount * seatsPerRow + i;
                const originalId = `${alphabet[Math.floor(globalIdx/10)]}${(globalIdx%10)+1}`;
                row.appendChild(createSeat(rowLetter, i + 1, originalId));
            }
            hallContainer.appendChild(row);
            rowTracker++;
        }

        // 2. FULL ROWS (4-12-4 sections)
        for (let r = 0; r < fullRowsCount; r++) {
            const row = document.createElement('div');
            row.className = 'row-light';
            const rowLetter = alphabet[rowTracker];

            const left = document.createElement('div'); left.className = 'sec-light side';
            const center = document.createElement('div'); center.className = 'sec-light center';
            const right = document.createElement('div'); right.className = 'sec-light side';

            for (let s = 1; s <= 20; s++) {
                const globalIdx = r * 20 + s - 1;
                const originalId = `${alphabet[Math.floor(globalIdx/10)]}${(globalIdx%10)+1}`;
                const seat = createSeat(rowLetter, s, originalId);

                if (s <= 4) left.appendChild(seat);
                else if (s <= 16) center.appendChild(seat);
                else right.appendChild(seat);
            }
            row.append(left, center, right);
            hallContainer.appendChild(row);
            rowTracker++;
        }
        container.appendChild(hallContainer);
    } catch (e) { console.error("Error rendering seats:", e); }
}

/**
 * 3. PRICE CALCULATION AND BOOKING
 */
function updatePriceCalculation() {
    if (!selectedSessionData) return;
    const isStudent = document.getElementById('isStudent').checked;
    const base = selectedSessionData.price;
    const discount = isStudent ? base * 0.2 : 0;
    const total = base - discount;
    document.getElementById('totalPrice').textContent = total + " ₸";
}

async function bookTicket() {
    const email = document.getElementById('email').value.trim();
    const seatInput = document.getElementById('seat');
    const bookButton = document.getElementById('bookButton');

    // Retrieve original DB ID from dataset, fallback to input value
    const seatIdForServer = seatInput.dataset.originalId || seatInput.value;

    if (!email || !seatIdForServer) {
        alert("Please provide an email and select a seat.");
        return;
    }

    bookButton.disabled = true;
    bookButton.textContent = 'Processing...';

    try {
        const res = await authFetch('/book', {
            method: 'POST',
            body: JSON.stringify({
                email,
                session_id: selectedSessionData.id,
                seat: seatIdForServer, // Sending correct ID for MongoDB
                is_student: document.getElementById('isStudent').checked,
                age: 20
            })
        });

        if (res.ok) {
            alert("✨ Booking successful!");
            window.location.href = "/";
        } else {
            const data = await res.json();
            alert(data.error || "Booking error");
        }
    } catch (e) {
        console.error(e);
        alert("A network error occurred.");
    } finally {
        bookButton.disabled = false;
        bookButton.textContent = 'Confirm Booking';
    }
}

document.addEventListener('DOMContentLoaded', loadSelectedSession);

/**
 * 4. STYLES
 */
const styleNode = document.createElement('style');
styleNode.textContent = `
    .seats-container { background: #fff !important; padding: 50px 20px; border-radius: 30px; box-shadow: 0 10px 50px rgba(0,0,0,0.05); border: 1px solid #f0f0f0; overflow-x: auto; }
    .screen-box { margin-bottom: 60px; text-align: center; }
    .screen-line { width: 80%; height: 5px; background: #5dade2; margin: 0 auto 10px; border-radius: 50%; box-shadow: 0 10px 15px rgba(93, 173, 226, 0.2); }
    .screen-label { font-size: 0.7rem; color: #ccc; font-weight: 800; letter-spacing: 10px; }
    .legend-light { display: flex; justify-content: center; gap: 30px; margin-bottom: 40px; }
    .leg-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #777; font-weight: 600; }
    .dot { width: 14px; height: 14px; border-radius: 4px; }
    .dot.free { background: #fff; border: 1px solid #ddd; }
    .dot.taken { background: #fef2f2; border: 1px solid #fecaca; }
    .dot.selected { background: #379683; }
    .hall-layout-light { display: flex; flex-direction: column; gap: 15px; align-items: center; min-width: 850px; }
    .row-light { display: flex; gap: 40px; align-items: center; justify-content: center; width: 100%; }
    .row-light.centered { gap: 10px; }
    .sec-light { display: grid; gap: 10px; }
    .sec-light.side { grid-template-columns: repeat(4, 1fr); }
    .sec-light.center { grid-template-columns: repeat(12, 1fr); padding: 0 20px; border-left: 1px dashed #eee; border-right: 1px dashed #eee; }
    .seat-node { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; border-radius: 6px; transition: 0.2s; cursor: pointer; }
    .seat-node.free { background: #fff; color: #444; border: 1px solid #e0e0e0; }
    .seat-node.free:hover { background: #f8f9fa; transform: translateY(-3px); border-color: #379683; color: #379683; }
    .seat-node.occupied { background: #f9fafb; color: #d1d5db; border: 1px solid #f3f4f6; cursor: not-allowed; }
    .seat-node.selected { background: #379683 !important; color: #fff !important; border-color: #379683; box-shadow: 0 5px 15px rgba(55, 150, 131, 0.4); transform: scale(1.1) translateY(-3px); }
    .session-header-light { background: #fff; padding: 25px; border-radius: 20px; border: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
    .badge { font-size: 0.6rem; text-transform: uppercase; color: #aaa; font-weight: 800; display: block; margin-bottom: 5px; letter-spacing: 1px; }
    .meta-row { display: flex; gap: 20px; font-size: 0.9rem; color: #666; margin-top: 8px; }
    .price-val { font-size: 1.6rem; font-weight: 800; color: #379683; }
`;
document.head.appendChild(styleNode);