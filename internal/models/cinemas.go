package models

var AllowedCinemas = map[string]bool{
	"Chaplin MEGA Silk Way":    true,
	"Chaplin Khan Shatyr":      true,
	"Arman Asia Park":          true,
	"Kinopark 6 Keruencity":    true,
	"Kinopark 8 IMAX Saryarqa": true,
}

func IsCinemaAllowed(name string) bool {
	return AllowedCinemas[name]
}
