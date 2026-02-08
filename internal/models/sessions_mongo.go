package models

import (
	"context"
	"errors"
	"time"

	"cinema/internal/service"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func AddSessionMongo(s Session) (Session, error) {
	id, err := nextID("sessions")
	if err != nil {
		return Session{}, err
	}
	s.ID = id

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = service.SessionsCollection().InsertOne(ctx, s)
	return s, err
}

func GetSessionByIDMongo(id int) (Session, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var s Session
	err := service.SessionsCollection().FindOne(ctx, bson.M{"id": id}).Decode(&s)
	if err == mongo.ErrNoDocuments {
		return Session{}, false, nil
	}
	if err != nil {
		return Session{}, false, err
	}
	return s, true, nil
}

func FilterSessionsMongo(cinema string, date string, maxPrice float64, onlyWithSeats bool) ([]Session, error) {
	if service.MongoDB == nil {
		return FilterSessions(maxPrice, onlyWithSeats), nil
	}

	loc, _ := time.LoadLocation("Asia/Almaty")
	dayStart, err := time.ParseInLocation("2006-01-02", date, loc)
	if err != nil {
		return nil, err
	}
	dayEnd := dayStart.Add(24 * time.Hour)

	filter := bson.M{}

	if cinema != "" {
		filter["cinema_name"] = cinema
	}
	filter["start_time"] = bson.M{"$gte": dayStart, "$lt": dayEnd}

	if maxPrice > 0 {
		filter["base_price"] = bson.M{"$lte": maxPrice}
	}
	if onlyWithSeats {
		filter["available_seats.0"] = bson.M{"$exists": true}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cur, err := service.SessionsCollection().Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	out := make([]Session, 0)
	for cur.Next(ctx) {
		var s Session
		if err := cur.Decode(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, cur.Err()
}

func ReserveSeatMongo(sessionID int, seat string) (Session, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"id": sessionID, "available_seats": seat}
	update := bson.M{"$pull": bson.M{"available_seats": seat}}

	res, err := service.SessionsCollection().UpdateOne(ctx, filter, update)
	if err != nil {
		return Session{}, err
	}
	if res.ModifiedCount == 0 {
		_, ok, _ := GetSessionByIDMongo(sessionID)
		if !ok {
			return Session{}, errors.New("session not found")
		}
		return Session{}, errors.New("seat not available")
	}

	updated, ok, err := GetSessionByIDMongo(sessionID)
	if err != nil {
		return Session{}, err
	}
	if !ok {
		return Session{}, errors.New("session not found")
	}
	return updated, nil
}
