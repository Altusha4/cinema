package service

import (
	"net/http"
	"strings"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "missing authorization header", http.StatusUnauthorized)
			return
		}

		// Ожидаем: Bearer TOKEN
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "invalid authorization format", http.StatusUnauthorized)
			return
		}

		token := parts[1]

		if err := ValidateToken(token); err != nil {
			http.Error(w, "invalid or expired token", http.StatusUnauthorized)
			return
		}

		// всё ок — пускаем дальше
		next.ServeHTTP(w, r)
	})
}
