package models

import (
	"context"
	"errors"
	"time"

	"cinema/internal/service"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreatePaymentMongo(p Payment) (*Payment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	p.CreatedAt = time.Now()
	if p.Status == "" {
		p.Status = PaymentPending
	}

	_, err := service.PaymentsCollection().InsertOne(ctx, p)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func GetPaymentByInvoiceMongo(invoiceID string) (*Payment, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var p Payment
	err := service.PaymentsCollection().
		FindOne(ctx, bson.M{"invoice_id": invoiceID}).
		Decode(&p)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, false, nil
		}
		return nil, false, err
	}
	return &p, true, nil
}

func MarkPaymentPaidMongo(invoiceID string, epayID string, callback any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()

	update := bson.M{
		"$set": bson.M{
			"status":   PaymentPaid,
			"paid_at":  now,
			"epay_id":  epayID,
			"callback": callback,
		},
	}

	_, err := service.PaymentsCollection().UpdateOne(ctx, bson.M{"invoice_id": invoiceID}, update)
	return err
}

func MarkPaymentFailedMongo(invoiceID string, callback any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"status":   PaymentFailed,
			"callback": callback,
		},
	}

	_, err := service.PaymentsCollection().UpdateOne(ctx, bson.M{"invoice_id": invoiceID}, update)
	return err
}
