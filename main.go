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

	if err := service.ConnectMongo(); err != nil {
		log.Println("Mongo disabled (falling back to In-memory):", err)
	} else {
		log.Println("Connected to MongoDB Atlas!")
	}

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

	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Movie not found: " + err.Error()})
		return
	}
	json.NewEncoder(w).Encode(movie)
}

func createBookingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed. Use POST.", http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		Email     string `json:"email"`
		MovieID   string `json:"movie_id"`
		IsStudent bool   `json:"is_student"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid JSON input", http.StatusBadRequest)
		return
	}

	if !service.ValidateBooking(input.Email) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Valid email is required!"})
		return
	}

	var movie *models.Movie
	var err error

	if _, checkErr := fmt.Sscan(input.MovieID, new(int)); checkErr == nil {
		movie, err = api.FetchMovieDetails(input.MovieID)
	} else {
		movie, err = api.SearchMovieByName(input.MovieID)
	}

	movieTitle := "Unknown Movie"
	if err == nil {
		movieTitle = movie.Title
	}

	finalPrice := service.CalculatePrice(2000.0, input.IsStudent)

	newOrder := models.Order{
		CustomerEmail: input.Email,
		MovieTitle:    movieTitle,
		FinalPrice:    finalPrice,
	}

	err = models.SaveOrderMongo(newOrder)
	if err != nil {
		log.Println("Database error:", err)
	}

	service.SendAsyncNotification(input.Email, movieTitle)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "Success",
		"order":  newOrder,
	})
}

func listOrdersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	orders, err := models.GetAllOrdersMongo()
	if err != nil {
		orders = []models.Order{}
	}
	json.NewEncoder(w).Encode(orders)
}

func sessionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodGet {
		maxPriceStr := r.URL.Query().Get("max_price")
		onlyStr := r.URL.Query().Get("only_with_seats")

		var maxPrice float64
		if maxPriceStr != "" {
			fmt.Sscanf(maxPriceStr, "%f", &maxPrice)
		}

		onlyWithSeats := (onlyStr == "true" || onlyStr == "1")

		list := models.FilterSessions(maxPrice, onlyWithSeats)
		json.NewEncoder(w).Encode(list)
		return
	}

	if r.Method == http.MethodPost {
		var s models.Session
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		created := models.AddSession(s)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(created)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func reserveSeatHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		SessionID int    `json:"session_id"`
		Seat      string `json:"seat"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if err := models.ReserveSeat(input.SessionID, input.Seat); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	s, ok := models.GetSessionByID(input.SessionID)
	w.Header().Set("Content-Type", "application/json")
	if !ok {
		json.NewEncoder(w).Encode(map[string]string{"status": "reserved"})
		return
	}
	json.NewEncoder(w).Encode(s)
}
