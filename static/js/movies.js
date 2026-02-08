// Работа с фильмами и TMDB API

async function searchMovie() {
    const query = document.getElementById('movieQuery').value.trim();
    if (!query) {
        showNotification('Please enter a movie title or ID', 'error');
        return;
    }

    const isId = /^\d+$/.test(query);
    const param = isId ? `id=${query}` : `title=${encodeURIComponent(query)}`;

    try {
        const res = await fetch(`/movies?${param}`);
        const data = await res.json();

        if (!res.ok || data.error) {
            throw new Error(data.error || 'Movie not found');
        }

        displayMovie(data);
        showNotification(`Found: ${data.title}`, 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
        document.getElementById('movieDetails').style.display = 'none';
    }
}

function displayMovie(data) {
    document.getElementById('movieTitle').textContent = data.title;
    document.getElementById('movieRelease').textContent = 
        `Release: ${data.release_date || 'Unknown'}`;
    document.getElementById('movieOverview').textContent = 
        data.overview || 'No description available';
    document.getElementById('movieId').textContent = `TMDb ID: ${data.id}`;
    document.getElementById('movieAdult').textContent = 
        data.adult ? '18+' : 'All Ages';
    document.getElementById('movieAdult').style.background = 
        data.adult ? '#c0392b' : '#5CDB95';

    const poster = document.getElementById('moviePoster');
    poster.src = data.poster_path 
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Poster';
    poster.alt = `${data.title} Poster`;

    document.getElementById('movieJson').textContent = 
        JSON.stringify(data, null, 2);

    document.getElementById('movieDetails').style.display = 'flex';
}

async function loadFeaturedMovies() {
    try {
        // Пример популярных фильмов (можно расширить для реального API)
        const featuredIds = [157336, 27205, 155, 680, 238];
        const container = document.getElementById('featuredMovies');
        
        container.innerHTML = '<div class="loading">Loading...</div>';
        
        // Для демо покажем статические данные
        setTimeout(() => {
            container.innerHTML = `
                <div class="featured-grid">
                    <div class="featured-card" onclick="searchMovieById(157336)">
                        <img src="https://image.tmdb.org/t/p/w300/8b8R8l88Qje9dn9OE8PY05Nx1S8.jpg" alt="Interstellar">
                        <h4>Interstellar</h4>
                        <p>2014 • Sci-Fi</p>
                    </div>
                    <div class="featured-card" onclick="searchMovieById(27205)">
                        <img src="https://image.tmdb.org/t/p/w300/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" alt="Inception">
                        <h4>Inception</h4>
                        <p>2010 • Action</p>
                    </div>
                    <div class="featured-card" onclick="searchMovieById(155)">
                        <img src="https://image.tmdb.org/t/p/w300/3h1JZGDhZ8nzxdgvkxha0qBqi05.jpg" alt="The Dark Knight">
                        <h4>The Dark Knight</h4>
                        <p>2008 • Action</p>
                    </div>
                </div>
            `;
        }, 500);
        
    } catch (error) {
        console.error('Error loading featured movies:', error);
    }
}

function searchMovieById(id) {
    document.getElementById('movieQuery').value = id;
    searchMovie();
}

// Стили для сетки фильмов
const moviesStyle = document.createElement('style');
moviesStyle.textContent = `
    .movies-grid {
        display: grid;
        gap: 20px;
        margin-top: 20px;
    }
    
    .featured-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
    }
    
    .featured-card {
        background: var(--color-secondary);
        border-radius: 15px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .featured-card:hover {
        transform: translateY(-10px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    
    .featured-card img {
        width: 100%;
        height: 250px;
        object-fit: cover;
    }
    
    .featured-card h4 {
        margin: 15px;
        color: var(--color-dark);
    }
    
    .featured-card p {
        margin: 0 15px 15px;
        color: var(--color-muted);
        font-size: 0.9rem;
    }
    
    .loading {
        text-align: center;
        padding: 40px;
        color: var(--color-muted);
    }
`;
document.head.appendChild(moviesStyle);