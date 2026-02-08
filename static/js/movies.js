/**
 * ============================================================
 * CinemaGo - Movies & Discovery Module
 * ============================================================
 * Разработано для Astana IT University.
 * Синхронизировано с моделями Go: ID, Title, Overview, PosterPath,
 * ReleaseDate, Adult, VoteAverage
 * ============================================================
 */

/**
 * 1. ОСНОВНАЯ ФУНКЦИЯ ПОИСКА (searchMovie)
 */
async function searchMovie() {
    console.log("Инициализация поиска фильма...");

    const queryInput = document.getElementById('movieQuery');
    if (!queryInput) return;

    const query = queryInput.value.trim();
    if (!query) {
        if (typeof showNotification === 'function') {
            showNotification('Please enter a movie title or TMDb ID', 'error');
        }
        return;
    }

    const isId = /^\d+$/.test(query);
    const param = isId ? `id=${query}` : `title=${encodeURIComponent(query)}`;

    try {
        const res = await fetch(`/movies?${param}`);
        const rawData = await res.json();

        if (!res.ok || rawData.error) {
            throw new Error(rawData.error || 'Movie not found');
        }

        // Поддержка вложенности данных от Go-бэкенда
        const movieData = rawData.movie || rawData.data || rawData;

        displayMovie(movieData);

        if (typeof showNotification === 'function') {
            showNotification(`Success: ${movieData.title} loaded`, 'success');
        }

    } catch (error) {
        console.error("Ошибка поиска:", error);
        if (typeof showNotification === 'function') {
            showNotification(error.message, 'error');
        }
        const detailsBox = document.getElementById('movieDetails');
        if (detailsBox) detailsBox.style.display = 'none';
    }
}

/**
 * 2. ФУНКЦИЯ ОТОБРАЖЕНИЯ (displayMovie)
 */
function displayMovie(data) {
    console.log("Отрисовка данных фильма...");

    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    // Сопоставление с твоей Go-моделью
    safeSetText('movieTitle', data.title || 'Unknown Title');
    safeSetText('movieRelease', `Release Date: ${data.release_date || 'N/A'}`);
    safeSetText('movieOverview', data.overview || 'No description available.');
    safeSetText('movieId', `ID: ${data.id}`);

    // Логика рейтинга (используем новое поле vote_average)
    const ratingEl = document.getElementById('movieRating');
    if (ratingEl) {
        const score = data.vote_average || 0;
        ratingEl.style.display = 'inline-block';
        ratingEl.innerHTML = `⭐ ${parseFloat(score).toFixed(1)}`;
    }

    // Логика Adult (bool из модели)
    const adultEl = document.getElementById('movieAdult');
    if (adultEl) {
        adultEl.textContent = data.adult ? '18+' : 'All Ages';
        adultEl.style.backgroundColor = data.adult ? '#c0392b' : '#379683';
    }

    // Постер
    const poster = document.getElementById('moviePoster');
    if (poster) {
        const posterPath = data.poster_path;
        const cb = `?t=${new Date().getTime()}`;
        poster.src = posterPath
            ? `https://image.tmdb.org/t/p/w500${posterPath}${cb}`
            : 'https://via.placeholder.com/500x750?text=No+Poster';
    }

    // Плавное появление контейнера
    const detailsBox = document.getElementById('movieDetails');
    if (detailsBox) {
        detailsBox.style.display = 'flex';
        setTimeout(() => { detailsBox.style.opacity = '1'; }, 10);
    }
}

/**
 * 3. ЗАГРУЗКА ПОПУЛЯРНОГО (loadFeaturedMovies)
 */
async function loadFeaturedMovies() {
    console.log("Загрузка карусели...");
    const container = document.getElementById('featuredMovies');
    if (!container) return;

    const featuredIds = [1156593, 698687, 129, 1391511, 372058];
    container.innerHTML = '';

    for (const id of featuredIds) {
        try {
            const res = await fetch(`/movies?id=${id}`);
            const rawData = await res.json();
            const movie = rawData.movie || rawData.data || rawData;

            if (movie && !movie.error) {
                renderFeaturedCard(movie, container);
            }
        } catch (error) {
            console.error(`Ошибка загрузки ID ${id}:`, error);
        }
    }
}

/**
 * 4. ОТРИСОВКА КАРТОЧКИ КАРУСЕЛИ (renderFeaturedCard)
 */
function renderFeaturedCard(movie, container) {
    const card = document.createElement('div');
    card.className = 'featured-card';
    card.onclick = () => searchMovieById(movie.id);

    const year = movie.release_date ? movie.release_date.split('-')[0] : '2026';
    const score = movie.vote_average ? movie.vote_average.toFixed(1) : '0.0';

    const posterPath = movie.poster_path;
    const imgUrl = posterPath
        ? `https://image.tmdb.org/t/p/w500${posterPath}`
        : 'https://via.placeholder.com/500x750';

    card.innerHTML = `
        <img src="${imgUrl}" alt="Poster" 
             onerror="this.src='https://via.placeholder.com/500x750?text=Image+Not+Found'">
        <div class="card-info">
            <h4>${movie.title || 'Movie'}</h4>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                <p style="margin: 0;">${year}</p>
                <span class="card-rating">⭐ ${score}</span>
            </div>
        </div>
    `;

    container.appendChild(card);
}

/**
 * 5. ПОИСК ПО КЛИКУ
 */
function searchMovieById(id) {
    const queryInput = document.getElementById('movieQuery');
    if (queryInput) {
        queryInput.value = id;
        searchMovie();
        window.scrollTo({ top: 100, behavior: 'smooth' });
    }
}

/**
 * 6. ИНЪЕКЦИЯ СТИЛЕЙ
 */
const styleInject = document.createElement('style');
styleInject.textContent = `
    .featured-card {
        background: #ffffff;
        border: 2px solid var(--color-primary);
        border-radius: 20px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        min-width: 220px;
        max-width: 220px;
        box-shadow: 6px 6px 0px var(--color-primary);
        display: flex;
        flex-direction: column;
        margin-bottom: 10px;
    }
    .featured-card:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 10px 10px 0px var(--color-dark);
        border-color: var(--color-dark);
    }
    .featured-card img {
        width: 100%;
        height: 300px;
        object-fit: cover;
        border-bottom: 2px solid var(--color-primary);
    }
    .card-info { padding: 15px; flex-grow: 1; }
    .featured-card h4 {
        margin: 0; font-size: 1rem; font-weight: 800; color: var(--color-dark);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .featured-card p { color: var(--color-muted); font-size: 0.85rem; font-weight: 600; margin: 0; }
    .card-rating {
        color: #f1c40f; 
        font-weight: 800; 
        font-size: 0.85rem;
        background: rgba(241, 196, 15, 0.1);
        padding: 2px 6px;
        border-radius: 6px;
    }
`;

// Функция Debounce (задержка)
function debounce(func, timeout = 400) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// Поиск для подсказок
async function liveSearch(query) {
    const box = document.getElementById('searchSuggestions');
    if (query.length < 2) {
        box.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`/movies?title=${encodeURIComponent(query)}`);
        const movie = await res.json();

        // TMDB при поиске по названию часто возвращает один лучший результат,
        // но наше API настроено на FetchMovieDetails или SearchMovieByName.
        // Если твой бэкенд возвращает список, пройдись циклом. Если один — выведи его:

        if (movie && movie.title) {
            box.innerHTML = `
                <div class="suggestion-item" onclick="selectSuggestion('${movie.id}')">
                    <img src="https://image.tmdb.org/t/p/w92${movie.poster_path}" alt="">
                    <div class="suggestion-info">
                        <span class="suggestion-title">${movie.title}</span>
                        <span class="suggestion-year">${movie.release_date ? movie.release_date.split('-')[0] : ''}</span>
                    </div>
                </div>
            `;
            box.style.display = 'block';
        }
    } catch (e) {
        console.error("Live search error", e);
    }
}

// Функция при клике на подсказку
function selectSuggestion(id) {
    const input = document.getElementById('movieQuery');
    input.value = id;
    document.getElementById('searchSuggestions').style.display = 'none';
    searchMovie(); // Запускаем основной поиск
}

// Навешиваем обработчик на ввод
document.addEventListener('DOMContentLoaded', () => {
    const queryInput = document.getElementById('movieQuery');
    if (queryInput) {
        const processInput = debounce((e) => liveSearch(e.target.value));
        queryInput.addEventListener('input', processInput);
    }

    // Закрывать подсказки при клике вне поля
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('searchSuggestions').style.display = 'none';
        }
    });
});

document.head.appendChild(styleInject);

console.log("movies.js синхронизирован с обновленной моделью Go (с рейтингом).");