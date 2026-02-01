async function fetchMovie() {
    const id = document.getElementById('mId').value;
    const output = document.getElementById('movieOut');
    output.innerText = "Searching...";

    try {
        const res = await fetch(`/movies?id=${id}`);
        const data = await res.json();
        output.innerText = JSON.stringify(data, null, 2);
    } catch (err) {
        output.innerText = "Error fetching movie.";
    }
}

async function loadOrders() {
    try {
        const res = await fetch('/orders');
        const orders = await res.json();
        const tbody = document.getElementById('orderList');

        if (orders && orders.length > 0) {
            tbody.innerHTML = orders.map(o => `
                <tr>
                    <td>#${o.id}</td>
                    <td><strong>${o.movie_title}</strong></td>
                    <td>${o.customer_email}</td>
                    <td><span class="status-badge">${o.final_price} ₸</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>No orders found</td></tr>";
        }
    } catch (err) { console.error("Order sync failed"); }
}

async function book() {
    const email = document.getElementById('email').value;
    const movie_id = document.getElementById('mId').value;
    const is_student = document.getElementById('is_student').checked;
    const out = document.getElementById('bookOut');

    if (!email) { alert("Please enter email!"); return; }

    out.innerText = "Processing reservation...";
    out.style.color = "#907163"; // Используем твой коричневый цвет

    try {
        const res = await fetch('/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, movie_id, is_student })
        });

        if (res.ok) {
            out.innerText = "✅ Booking successful!";
            out.style.color = "#379683"; // Используем глубокий зеленый
            loadOrders();
        } else {
            out.innerText = "❌ Failed to book.";
            out.style.color = "#907163";
        }
    } catch (err) { out.innerText = "Server error."; }
}

setInterval(loadOrders, 5000);
document.addEventListener('DOMContentLoaded', loadOrders);