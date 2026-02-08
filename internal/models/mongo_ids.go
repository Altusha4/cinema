package models

import (
	"context"
	"time"

	"cinema/internal/service"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type counterDoc struct {
	Name string `bson:"_id"`
	Seq  int    `bson:"seq"`
}

func nextID(counterName string) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"_id": counterName}
	update := bson.M{"$inc": bson.M{"seq": 1}}

	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	var doc counterDoc
	err := service.CountersCollection().FindOneAndUpdate(ctx, filter, update, opts).Decode(&doc)
	if err != nil {
		return 0, err
	}
	return doc.Seq, nil
}
