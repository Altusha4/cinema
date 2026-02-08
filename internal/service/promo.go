package service

import (
	"crypto/rand"
	"encoding/base32"
	"strings"
)

func GeneratePromoCode() string {
	b := make([]byte, 5)
	_, _ = rand.Read(b)

	code := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
	code = strings.ToUpper(code)

	return "CINEMA-" + code
}

func CalcBonuses(price float64) int {
	return int(price * 0.05)
}
