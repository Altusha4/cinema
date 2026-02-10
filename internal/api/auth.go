package api

import (
	"cinema/internal/models"
	"cinema/internal/service"
	"encoding/json"
	"net/http"
)

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "POST only"})
		return
	}

	var input struct {
		Email    string `json:"email"`
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid json"})
		return
	}

	hash, err := service.HashPassword(input.Password)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": "password error"})
		return
	}

	user := models.User{
		Email:    input.Email,
		Username: input.Username,
		Password: hash,
	}

	if err := models.CreateUser(user); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, 201, map[string]string{"status": "registered"})
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "POST only"})
		return
	}

	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid json"})
		return
	}

	user, ok, _ := models.GetUserByEmail(input.Email)
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "invalid credentials"})
		return
	}

	if err := service.CheckPassword(user.Password, input.Password); err != nil {
		writeJSON(w, 401, map[string]string{"error": "invalid credentials"})
		return
	}

	token, _ := service.GenerateJWT(user.Email, user.Username)

	writeJSON(w, 200, map[string]string{
		"token": token,
	})
}
