let currentMovie = {
    id: "157336",
    title: "Interstellar"
};

let currentSession = null;

async function fetchMovie() {
    const query = document.getElementById('mId').value.trim();
    const movieDetails = document.getElementById('movieDetails');
    const output = document.getElementById('movieOut');
    const posterImg = document.getElementById('moviePoster');

    const displayTitle = document.getElementById('displayTitle');
    const displayRelease = document.getElementById('displayRelease');
    const displayOverview = document.getElementById('displayOverview');
    const displayId = document.getElementById('displayId');

    if (!query) return;

    output.innerText = "🔍 Searching TMDb...";
    movieDetails.style.display = "none";

    const isId = /^\d+$/.test(query);
    const param = isId ? `id=${query}` : `title=${encodeURIComponent(query)}`;

    try {
        const res = await fetch(`/movies?${param}`);

        if (!res.ok) {
            output.innerHTML = `<b style="color: #d63031;">Nothing found for: "${query}".<br>По вашему запросу ничего не найдено.</b>`;
            return;
        }

        const data = await res.json();

        if (!data || data.error) {
            output.innerHTML = `<b style="color: #d63031;">Sorry, this movie is not in our database.</b>`;
            return;
        }

        currentMovie.id = data.id.toString();
        currentMovie.title = data.title;

        displayTitle.innerText = data.title;
        displayRelease.innerText = "Release: " + (data.release_date || "Unknown");
        displayOverview.innerText = data.overview || "No description available.";
        displayId.innerText = "TMDb ID: " + data.id;

        if (data.poster_path) {
            posterImg.src = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
        } else {
            posterImg.src = "https://via.placeholder.com/500x750?text=No+Poster";
        }

        output.innerText = JSON.stringify(data, null, 2);
        movieDetails.style.display = "flex";

    } catch (err) {
        output.innerHTML = `<b style="color: #d63031;">Connection error. Please try again later.</b>`;
        console.error("Fetch error:", err);
    }
}

loadSessions(currentMovie.id);

async function loadSessions(movieId, query = "") {
    const card = document.getElementById("sessionsCard");
    const list = document.getElementById("sessionsList");

    list.innerHTML = "Loading sessions...";
    card.style.display = "block";

    try {
        const url = query
            ? `/sessions?movie_id=${movieId}&${query}`
            : `/sessions?movie_id=${movieId}`;

        const res = await fetch(url);
        if (!res.ok) {
            list.innerHTML = "<p>No sessions available.</p>";
            return;
        }

        const sessions = await res.json();

        if (!sessions.length) {
            list.innerHTML = "<p>No sessions available.</p>";
            return;
        }

        list.innerHTML = sessions.map(s => `
            <div class="session-item">
                <div>
                    <strong>Session #${s.id}</strong><br>
                    💰 ${s.base_price} ₸ |
                    🎟️ ${s.available_seats.length} seats
                </div>
                <button onclick="selectSession(${s.id})">
                    Book
                </button>
            </div>
        `).join("");

    } catch (e) {
        list.innerHTML = "<p>Error loading sessions.</p>";
    }
}

function selectSession(sessionId) {
    currentSession = sessionId;
    alert("Session selected. Now you can proceed to booking.");
}

async function loadOrders() {
    try {
        const res = await fetch('/orders');
        if (!res.ok) return;

        const orders = await res.json();
        const tbody = document.getElementById('orderList');

        if (orders && orders.length > 0) {
            tbody.innerHTML = orders.map(o => `
                <tr style="animation: fadeIn 0.4s ease-in">
                    <td>#${o.id}</td>
                    <td><strong>${o.movie_title}</strong></td>
                    <td>${o.customer_email}</td>
                    <td><span class="status-badge">${o.final_price.toLocaleString()} ₸</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; color: #907163;'>No recent bookings found</td></tr>";
        }
    } catch (err) {
        console.error("Order sync failed:", err);
    }
}

async function book() {
    const email = document.getElementById('email').value.trim();
    const age = Number(document.getElementById('age').value);
    const seat = document.getElementById('seat').value.trim().toUpperCase();
    const is_student = document.getElementById('is_student').checked;
    const out = document.getElementById('bookOut');

    if (!currentSession) {
        alert("Please select a session first!");
        return;
    }

    if (!email || !seat || !age) {
        alert("Please fill all fields!");
        return;
    }

    // 🔞 age check (frontend)
    if (age < 18) {
        out.innerText = "❌ Booking denied: age restriction (18+)";
        out.style.color = "#d63031";
        return;
    }

    out.innerText = "⏳ Processing booking...";
    out.style.color = "#907163";

    try {
        const res = await fetch('/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                session_id: currentSession,
                seat,
                is_student,
                age
            })
        });

        const data = await res.json();

        if (res.ok) {
            out.innerText = `✅ Seat ${seat} reserved successfully`;
            out.style.color = "#379683";

            // обновляем сессии (место убралось)
            loadSessions(currentMovie.id);

            document.getElementById('seat').value = "";
            document.getElementById('age').value = "";
        } else {
            out.innerText = "❌ " + (data.error || "Booking failed");
            out.style.color = "#d63031";
        }

    } catch (err) {
        out.innerText = "❌ Server connection error";
        out.style.color = "#d63031";
    }
}

async function applyFilters() {
    const maxPrice = document.getElementById("maxPrice").value;
    const onlyWithSeats = document.getElementById("onlyWithSeats").checked;

    const params = new URLSearchParams();

    if (maxPrice) {
        params.append("max_price", maxPrice);
    }
    if (onlyWithSeats) {
        params.append("only_with_seats", "true");
    }

    loadSessions(currentMovie.id, params.toString());
}

setInterval(loadOrders, 5000);
document.addEventListener('DOMContentLoaded', loadOrders);