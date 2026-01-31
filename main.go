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

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Note: No .env file found, using system environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/", serveFrontend)
	http.HandleFunc("/movies", getMovieHandler)
	http.HandleFunc("/book", createBookingHandler)
	http.HandleFunc("/orders", listOrdersHandler)

	fmt.Printf("CinemaGo Server started at http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func serveFrontend(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "index.html")
}

func getMovieHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		id = "157336"
	}

	movie, err := api.FetchMovieDetails(id)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
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

	movie, err := api.FetchMovieDetails(input.MovieID)
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

	models.SaveOrder(newOrder)

	service.SendAsyncNotification(input.Email, movieTitle)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "Success",
		"order":  newOrder,
		"note":   "Ticket processing in background. Check terminal.",
	})
}

func listOrdersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.GetAllOrders())
}
