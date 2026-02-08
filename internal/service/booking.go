package service

import "log"

func CalculatePrice(base float64, isStudent bool) float64 {
	if isStudent {
		return base * 0.8
	}
	return base
}

func SendAsyncNotification(email string, movieTitle string, promoCode string) {
	go func() {
		err := SendEmail(
			email,
			"CinemaGo: Booking confirmed",
			"Your ticket for '"+movieTitle+"' is confirmed.\n"+
				"Promo code: "+promoCode+"\n"+
				"Enjoy the movie!",
		)
		if err != nil {
			log.Println("[EMAIL] send failed:", err)
		} else {
			log.Println("[EMAIL] sent to:", email)
		}
	}()
}

func ValidateBooking(email string) bool { return email != "" }
