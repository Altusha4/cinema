package service

import (
	"errors"
	"log"
	"os"
	"time"

	"github.com/dgrijalva/jwt-go"
)

var jwtKey []byte

func InitJWT() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET is NOT set in environment")
	}
	jwtKey = []byte(secret)
}

type JWTClaim struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	jwt.StandardClaims
}

func GenerateJWT(email, username, role string) (string, error) {
	expirationTime := time.Now().Add(1 * time.Hour)

	claims := &JWTClaim{
		Email:    email,
		Username: username,
		Role:     role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
			IssuedAt:  time.Now().Unix(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

func ValidateToken(tokenString string) error {
	t, err := jwt.ParseWithClaims(tokenString, &JWTClaim{}, func(t *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil {
		return err
	}
	claims, ok := t.Claims.(*JWTClaim)
	if !ok || !t.Valid {
		return errors.New("invalid token claims")
	}

	if claims.ExpiresAt < time.Now().Unix() {
		return errors.New("token expired")
	}

	return nil
}

func GetClaimsFromToken(tokenString string) (*JWTClaim, error) {
	t, err := jwt.ParseWithClaims(tokenString, &JWTClaim{}, func(t *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := t.Claims.(*JWTClaim)
	if !ok || !t.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
