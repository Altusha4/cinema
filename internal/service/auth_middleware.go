package service

import (
	"context"
	"log"
	"net/http"
	"strings"
)

type contextKey string

const (
	RoleKey  contextKey = "role"
	EmailKey contextKey = "email" // Добавляем это
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]
		claims, err := GetClaimsFromToken(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// --- ВОТ ЭТО МЕСТО НУЖНО ИЗМЕНИТЬ ---
		// Сначала кладем роль
		ctx := context.WithValue(r.Context(), RoleKey, claims.Role)
		// Затем в этот же контекст добавляем email
		ctx = context.WithValue(ctx, EmailKey, claims.Email)

		// Передаем обновленный ctx дальше
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(RoleKey).(string)

		log.Printf("Checking admin access. Role found in context: '%s'", role)

		if !ok || role != "admin" {
			http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
