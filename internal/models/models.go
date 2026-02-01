package models

type Movie struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Overview string `json:"overview"`
}

type Session struct {
	ID             int      `json:"id"`
	MovieID        int      `json:"movie_id"`
	MovieTitle     string   `json:"movie_title"`
	BasePrice      float64  `json:"base_price"`
	AvailableSeats []string `json:"available_seats"`
}

type Order struct {
	ID            int     `json:"id"`
	CustomerEmail string  `json:"customer_email"`
	MovieTitle    string  `json:"movie_title"`
	FinalPrice    float64 `json:"final_price"`
}
