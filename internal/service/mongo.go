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

func mustDB() *mongo.Database {
	if MongoDB == nil {
		panic("MongoDB is nil. Did you forget to call ConnectMongo()?")
	}
	return MongoDB
}

func OrdersCollection() *mongo.Collection {
	return mustDB().Collection("orders")
}

func SessionsCollection() *mongo.Collection {
	return mustDB().Collection("sessions")
}

func CountersCollection() *mongo.Collection {
	return mustDB().Collection("counters")
}

func MoviesCollection() *mongo.Collection {
	return mustDB().Collection("movies")
}

func PaymentsCollection() *mongo.Collection {
	return mustDB().Collection("payments")
}

func UsersCollection() *mongo.Collection {
	return mustDB().Collection("users")
}
