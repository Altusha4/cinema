package main

import (
	"cinema/internal/api"
	"cinema/internal/models"
	"cinema/internal/service"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// loggingMiddleware логирует каждый входящий запрос
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[%s] %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("Note: Using system environment variables:", err)
	}

	service.InitJWT()

	if err := service.ConnectMongo(); err != nil {
		log.Fatal("Mongo connection failed: ", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// 1. Раздача статических файлов (CSS, JS, Images)
	// Доступны по пути /static/...
	fileServer := http.FileServer(http.Dir("./static"))
	mux.Handle("/static/", http.StripPrefix("/static/", fileServer))

	// 2. Обработка HTML страниц из папки static/pages
	// ВАЖНО: этот хендлер теперь более гибкий к путям
	mux.HandleFunc("/pages/", servePages)

	// 3. Главная страница (Dashboard)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Жесткая проверка: только чистый корень отдаст Dashboard
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "./static/index.html")
	})

	// 4. API Эндпоинты
	mux.HandleFunc("/movies", getMovieHandler)
	mux.HandleFunc("/login", api.LoginHandler)
	mux.HandleFunc("/register", api.RegisterHandler)
	mux.HandleFunc("/sessions", sessionsHandler)

	// Эндпоинты с защитой Auth (JWT)
	mux.Handle("/book", service.AuthMiddleware(http.HandlerFunc(createBookingHandler)))
	mux.Handle("/reserve", service.AuthMiddleware(http.HandlerFunc(reserveSeatHandler)))

	// Эндпоинты только для ADMIN
	mux.Handle("/orders", service.AuthMiddleware(service.AdminMiddleware(http.HandlerFunc(listOrdersHandler))))
	mux.Handle("/sessions/", service.AuthMiddleware(service.AdminMiddleware(http.HandlerFunc(deleteSessionHandler))))

	fmt.Printf("🎬 CinemaGo Server running at http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, loggingMiddleware(mux)))
}

// servePages корректно отдает файлы из static/pages
func servePages(w http.ResponseWriter, r *http.Request) {
	// Убираем префикс /pages/
	path := strings.TrimPrefix(r.URL.Path, "/pages/")

	// Если зашли просто на /pages/ или путь пустой
	if path == "" || path == "/" {
		path = "index.html"
	}

	// Если запрошен файл без расширения .html и это не папка
	if !strings.HasSuffix(path, ".html") && !strings.Contains(path, ".") {
		path += ".html"
	}

	// Итоговый путь к файлу в системе: ./static/pages/ + то, что осталось от URL
	filePath := filepath.Join("./static", "pages", path)

	// Проверка на существование файла
	info, err := os.Stat(filePath)
	if os.IsNotExist(err) || info.IsDir() {
		log.Printf("❌ Файл страницы не найден: %s", filePath)
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	http.ServeFile(w, r, filePath)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func getMovieHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	title := r.URL.Query().Get("title")
	var movie *models.Movie
	var err error

	if title != "" {
		movie, err = api.SearchMovieByName(title)
	} else {
		if id == "" {
			id = "157336"
		}
		movie, err = api.FetchMovieDetails(id)
	}

	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Movie not found"})
		return
	}
	writeJSON(w, http.StatusOK, movie)
}

func createBookingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "POST only"})
		return
	}

	var input struct {
		Email     string `json:"email"`
		SessionID int    `json:"session_id"`
		Seat      string `json:"seat"`
		IsStudent bool   `json:"is_student"`
		Age       int    `json:"age"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}

	session, ok, err := models.GetSessionByIDMongo(input.SessionID)
	if err != nil || !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Session not found"})
		return
	}

	if input.Age < 18 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "18+ only"})
		return
	}

	_, err = models.ReserveSeatMongo(input.SessionID, input.Seat)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	finalPrice := service.CalculatePrice(session.BasePrice, input.IsStudent)
	order := models.Order{
		CustomerEmail: input.Email,
		MovieTitle:    session.MovieTitle,
		FinalPrice:    finalPrice,
		PromoCode:     service.GeneratePromoCode(),
		BonusesEarned: service.CalcBonuses(finalPrice),
	}

	saved, _ := models.SaveOrderMongo(order)
	service.SendAsyncNotification(saved.CustomerEmail, saved.MovieTitle, saved.PromoCode)
	writeJSON(w, http.StatusCreated, map[string]any{"status": "Success", "order": saved})
}

func listOrdersHandler(w http.ResponseWriter, r *http.Request) {
	orders, err := models.GetAllOrdersMongo()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, orders)
}

func sessionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		cinema := r.URL.Query().Get("cinema")
		date := r.URL.Query().Get("date")
		maxPriceStr := r.URL.Query().Get("max_price")
		onlyStr := r.URL.Query().Get("only_with_seats")

		if date == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "date required"})
			return
		}

		var maxPrice float64
		if maxPriceStr != "" {
			maxPrice, _ = strconv.ParseFloat(maxPriceStr, 64)
		}

		list, err := models.FilterSessionsMongo(cinema, date, maxPrice, onlyStr == "true")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, list)
		return
	}

	if r.Method == http.MethodPost {
		adminHandler := service.AuthMiddleware(service.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var s models.Session
			if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
				return
			}
			created, err := models.AddSessionMongo(s)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusCreated, created)
		})))

		adminHandler.ServeHTTP(w, r)
		return
	}
}

func deleteSessionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "DELETE only"})
		return
	}
	idStr := strings.TrimPrefix(r.URL.Path, "/sessions/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
		return
	}
	err = models.DeleteSessionMongo(id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Deleted"})
}

func reserveSeatHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "POST only"})
		return
	}
	var input struct {
		SessionID int    `json:"session_id"`
		Seat      string `json:"seat"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}
	updated, err := models.ReserveSeatMongo(input.SessionID, input.Seat)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}
