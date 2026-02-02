package service

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	MongoClient *mongo.Client
	MongoDB     *mongo.Database
)

func ConnectMongo() error {
	uri := os.Getenv("MONGO_URI")
	dbName := os.Getenv("MONGO_DB")
	if uri == "" || dbName == "" {
		return fmt.Errorf("missing MONGO_URI or MONGO_DB in env")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return err
	}

	MongoClient = client
	MongoDB = client.Database(dbName)
	return nil
}

func OrdersCollection() *mongo.Collection {
	return MongoDB.Collection("orders")
}

func SessionsCollection() *mongo.Collection {
	return MongoDB.Collection("sessions")
}

func CountersCollection() *mongo.Collection {
	return MongoDB.Collection("counters")
}

func MoviesCollection() *mongo.Collection {
	return MongoDB.Collection("movies")
}

