package models

import (
	"errors"
	"sync"
)

var (
	mu sync.RWMutex

	movies   = make([]Movie, 0)
	sessions = make([]Session, 0)
	orders   = make([]Order, 0)

	nextOrderID   = 1
	nextSessionID = 1
)

func AddMovie(m Movie) Movie {
	mu.Lock()
	defer mu.Unlock()

	if m.ID == 0 {
		m.ID = len(movies) + 1
	}

	movies = append(movies, m)
	return m
}

func GetAllMovies() []Movie {
	mu.RLock()
	defer mu.RUnlock()

	out := make([]Movie, len(movies))
	copy(out, movies)
	return out
}

func AddSession(s Session) Session {
	mu.Lock()
	defer mu.Unlock()

	if s.ID == 0 {
		s.ID = nextSessionID
		nextSessionID++
	}

	sessions = append(sessions, s)
	return s
}

func GetSessionByID(id int) (Session, bool) {
	mu.RLock()
	defer mu.RUnlock()

	for _, s := range sessions {
		if s.ID == id {
			return s, true
		}
	}
	return Session{}, false
}

func ReserveSeat(sessionID int, seat string) error {
	mu.Lock()
	defer mu.Unlock()

	for i := range sessions {
		if sessions[i].ID != sessionID {
			continue
		}

		seats := sessions[i].AvailableSeats
		pos := -1
		for j := range seats {
			if seats[j] == seat {
				pos = j
				break
			}
		}

		if pos == -1 {
			return errors.New("seat not available")
		}

		sessions[i].AvailableSeats = append(seats[:pos], seats[pos+1:]...)
		return nil
	}

	return errors.New("session not found")
}

func SaveOrder(o Order) Order {
	mu.Lock()
	defer mu.Unlock()

	o.ID = nextOrderID
	nextOrderID++

	orders = append(orders, o)
	return o
}

func GetAllOrders() []Order {
	mu.RLock()
	defer mu.RUnlock()

	out := make([]Order, len(orders))
	copy(out, orders)
	return out
}

func GetOrderCount() int {
	mu.RLock()
	defer mu.RUnlock()
	return len(orders)
}
