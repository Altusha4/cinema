package models

import (
	"context"
	"time"

	"cinema/internal/service"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SaveOrderMongo(o Order) (Order, error) {
	id, err := nextID("orders")
	if err != nil {
		return Order{}, err
	}
	o.ID = id

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = service.OrdersCollection().InsertOne(ctx, o)
	return o, err
}

func GetAllOrdersMongo() ([]Order, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "id", Value: -1}})
	cur, err := service.OrdersCollection().Find(ctx, bson.D{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	out := make([]Order, 0)
	for cur.Next(ctx) {
		var o Order
		if err := cur.Decode(&o); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, cur.Err()
}
