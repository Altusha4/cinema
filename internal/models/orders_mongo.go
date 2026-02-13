package models

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cinema/internal/service"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SaveOrderMongo(o Order) (Order, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	result, err := service.OrdersCollection().InsertOne(ctx, o)
	if err != nil {
		return Order{}, err
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		o.ID = oid
	}

	return o, nil
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

func GetOrderByIDMongo(id primitive.ObjectID) (*Order, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var o Order
	err := service.OrdersCollection().FindOne(ctx, bson.M{"_id": id}).Decode(&o)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, false, nil
		}
		return nil, false, err
	}
	return &o, true, nil
}

func MarkOrderPaidMongo(orderID primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := service.OrdersCollection().UpdateOne(
		ctx,
		bson.M{"_id": orderID},
		bson.M{"$set": bson.M{
			"payment_status": "paid",
			"paid_at":        time.Now(),
		}},
	)
	return err
}
func GetOrdersByEmailMongo(email string) ([]Order, error) {
	var orders []Order
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := service.OrdersCollection()

	filter := bson.M{"customer_email": email}
	fmt.Printf("Search tickets: [%s]\n", email)
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err = cursor.All(ctx, &orders); err != nil {
		return nil, err
	}
	fmt.Printf("Find tickets in database %d\n", len(orders))
	return orders, nil
}
