package service

import "fmt"

func CalculateFinalPrice(basePrice float64, ticketType string, promoCode string) float64 {
	price := basePrice

	if ticketType == "student" {
		price = basePrice * 0.8
		fmt.Println("Applied student discount: 20%")
	}

	if promoCode == "CINEMA2026" {
		price -= 500
		fmt.Println("Applied promo code discount: -500₸")
	}

	if price < 0 {
		return 0
	}
	return price
}
