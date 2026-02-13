package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Movie struct {
	ID          int     `json:"id" bson:"id"`
	Title       string  `json:"title" bson:"title"`
	Overview    string  `json:"overview" bson:"overview"`
	PosterPath  string  `json:"poster_path" bson:"poster_path"`
	ReleaseDate string  `json:"release_date" bson:"release_date"`
	VoteAverage float64 `json:"vote_average" bson:"vote_average"`
	Adult       bool    `json:"adult" bson:"adult"`
}

type Session struct {
	ID         int     `json:"id" bson:"id"`
	MovieID    int     `json:"movie_id" bson:"movie_id"`
	MovieTitle string  `json:"movie_title" bson:"movie_title"`
	BasePrice  float64 `json:"base_price" bson:"base_price"`

	// Это должен быть динамический слайс, он примет и 9, и 45, и 100 мест
	AvailableSeats []string `json:"available_seats" bson:"available_seats"`

	// Исправляем тип на int. Это просто число для статистики.
	TotalSeats int `json:"total_seats" bson:"total_seats"`

	CinemaName string    `json:"cinema_name" bson:"cinema_name"`
	Hall       string    `json:"hall,omitempty" bson:"hall,omitempty"`
	StartTime  time.Time `json:"start_time" bson:"start_time"`
}

type Order struct {
	// Используем ObjectID, чтобы Mongo и Go понимали друг друга
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	CustomerEmail string             `json:"customer_email" bson:"customer_email"`
	MovieTitle    string             `json:"movie_title" bson:"movie_title"`
	FinalPrice    float64            `json:"final_price" bson:"final_price"`
	PromoCode     string             `json:"promo_code" bson:"promo_code"`
	BonusesEarned int                `json:"bonuses_earned" bson:"bonuses_earned"`
}
