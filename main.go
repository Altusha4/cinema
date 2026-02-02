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
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[%s] %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Note: Using system environment variables")
	}

	// В варианте "всё хранится в Mongo" — Mongo обязательна
	if err := service.ConnectMongo(); err != nil {
		log.Fatal("Mongo connection failed: ", err)
	}
	log.Println("Connected to MongoDB Atlas!")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", serveFrontend)
	fileServer := http.FileServer(http.Dir("./static"))
	mux.Handle("/static/", http.StripPrefix("/static/", fileServer))

	mux.HandleFunc("/movies", getMovieHandler)
	mux.HandleFunc("/book", createBookingHandler)
	mux.HandleFunc("/orders", listOrdersHandler)

	mux.HandleFunc("/sessions", sessionsHandler)
	mux.HandleFunc("/reserve", reserveSeatHandler)

	fmt.Printf("CinemaGo Server running at http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, loggingMiddleware(mux)))
}

func serveFrontend(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "index.html")
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
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Movie not found: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, movie)
}

func createBookingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed. Use POST."})
		return
	}

	var input struct {
		Email     string `json:"email"`
		MovieID   string `json:"movie_id"`
		IsStudent bool   `json:"is_student"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON input"})
		return
	}

	if !service.ValidateBooking(input.Email) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Valid email is required!"})
		return
	}

	movieTitle := "Unknown Movie"
	if _, convErr := strconv.Atoi(input.MovieID); convErr == nil {
		if movie, err := api.FetchMovieDetails(input.MovieID); err == nil && movie != nil {
			movieTitle = movie.Title
		}
	} else {
		if movie, err := api.SearchMovieByName(input.MovieID); err == nil && movie != nil {
			movieTitle = movie.Title
		}
	}

	finalPrice := service.CalculatePrice(2000.0, input.IsStudent)

	order := models.Order{
		CustomerEmail: input.Email,
		MovieTitle:    movieTitle,
		FinalPrice:    finalPrice,
	}

	saved, err := models.SaveOrderMongo(order)
	if err != nil {
		log.Println("Database error:", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}

	service.SendAsyncNotification(saved.CustomerEmail, saved.MovieTitle)

	writeJSON(w, http.StatusCreated, map[string]any{
		"status": "Success",
		"order":  saved,
	})
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
		maxPriceStr := r.URL.Query().Get("max_price")
		onlyStr := r.URL.Query().Get("only_with_seats")

		var maxPrice float64
		if maxPriceStr != "" {
			_, _ = fmt.Sscanf(maxPriceStr, "%f", &maxPrice)
		}
		onlyWithSeats := (onlyStr == "true" || onlyStr == "1")

		list, err := models.FilterSessionsMongo(maxPrice, onlyWithSeats)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, list)
		return
	}

	if r.Method == http.MethodPost {
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
		return
	}

	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
}

func reserveSeatHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
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
