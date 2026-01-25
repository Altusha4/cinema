package models

import "time"

type Movie struct {
	TMDBID        string   `json:"tmdb_id"`
	Title         string   `json:"title"`
	AgeRating     int      `json:"age_rating"`
	TrailerURL    string   `json:"trailer_url"`
	StaticReviews []string `json:"static_reviews"`
}

type Session struct {
	ID             string    `json:"id"`
	MovieID        string    `json:"movie_id"`
	CinemaName     string    `json:"cinema_name"`
	StartTime      time.Time `json:"start_time"`
	AvailableSeats []string  `json:"available_seats"`
	BasePrice      float64   `json:"base_price"`
}

type Order struct {
	ID            string  `json:"id"`
	SessionID     string  `json:"session_id"`
	CustomerPhone string  `json:"customer_phone"`
	CustomerEmail string  `json:"customer_email"`
	SeatNumber    string  `json:"seat_number"`
	TicketType    string  `json:"ticket_type"`
	FinalPrice    float64 `json:"final_price"`
}
