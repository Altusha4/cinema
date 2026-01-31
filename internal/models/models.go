package models

import "sync"

type Movie struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Overview string `json:"overview"`
}

type Order struct {
	ID            int     `json:"id"`
	CustomerEmail string  `json:"customer_email"`
	MovieTitle    string  `json:"movie_title"`
	FinalPrice    float64 `json:"final_price"`
}

var (
	orders      []Order
	ordersMutex sync.Mutex
)

func SaveOrder(o Order) {
	ordersMutex.Lock()
	defer ordersMutex.Unlock()
	o.ID = len(orders) + 1
	orders = append(orders, o)
}

func GetAllOrders() []Order {
	ordersMutex.Lock()
	defer ordersMutex.Unlock()
	return orders
}
