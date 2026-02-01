package models

import (
	"context"
	"time"

	"cinema/internal/service"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SaveOrderMongo(o Order) error {
	if service.MongoDB == nil {
		SaveOrder(o)
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var last Order
	opts := options.FindOne().SetSort(bson.D{{Key: "id", Value: -1}})
	_ = service.OrdersCollection().FindOne(ctx, bson.D{}, opts).Decode(&last)
	o.ID = last.ID + 1

	_, err := service.OrdersCollection().InsertOne(ctx, o)
	return err
}

func GetAllOrdersMongo() ([]Order, error) {
	if service.MongoDB == nil {
		return GetAllOrders(), nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cur, err := service.OrdersCollection().Find(ctx, bson.D{})
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
