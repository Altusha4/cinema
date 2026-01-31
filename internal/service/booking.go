package service

import (
	"fmt"
	"time"
)

func CalculatePrice(base float64, isStudent bool) float64 {
	if isStudent {
		return base * 0.8
	}
	return base
}

func SendAsyncNotification(email string, movieTitle string) {
	go func() {
		fmt.Printf("[SYSTEM] Goroutine started: Processing ticket for %s...\n", email)
		time.Sleep(5 * time.Second)
		fmt.Printf("[SYSTEM] SUCCESS: Email notification for '%s' sent to %s\n", movieTitle, email)
	}()
}
