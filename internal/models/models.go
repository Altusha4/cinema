package models

type Movie struct {
	ID          int    `json:"id" bson:"id"`
	Title       string `json:"title" bson:"title"`
	Overview    string `json:"overview" bson:"overview"`
	PosterPath  string `json:"poster_path" bson:"poster_path"`
	ReleaseDate string `json:"release_date" bson:"release_date"`
}

type Session struct {
	ID             int      `json:"id" bson:"id"`
	MovieID        int      `json:"movie_id" bson:"movie_id"`
	MovieTitle     string   `json:"movie_title" bson:"movie_title"`
	BasePrice      float64  `json:"base_price" bson:"base_price"`
	AvailableSeats []string `json:"available_seats" bson:"available_seats"`
}

type Order struct {
	ID            int     `json:"id" bson:"id"`
	CustomerEmail string  `json:"customer_email" bson:"customer_email"`
	MovieTitle    string  `json:"movie_title" bson:"movie_title"`
	FinalPrice    float64 `json:"final_price" bson:"final_price"`
}
