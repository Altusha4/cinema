package models

import "time"

type PaymentStatus string

const (
	PaymentPending PaymentStatus = "pending"
	PaymentPaid    PaymentStatus = "paid"
	PaymentFailed  PaymentStatus = "failed"
)

type Payment struct {
	ID        string        `bson:"_id,omitempty" json:"id,omitempty"`
	InvoiceID string        `bson:"invoice_id" json:"invoice_id"`
	OrderID   int           `bson:"order_id" json:"order_id"`
	Amount    float64       `bson:"amount" json:"amount"`
	Currency  string        `bson:"currency" json:"currency"`
	Status    PaymentStatus `bson:"status" json:"status"`

	EpayID    string    `bson:"epay_id,omitempty" json:"epay_id,omitempty"`
	Callback  any       `bson:"callback,omitempty" json:"callback,omitempty"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`

	TerminalID string `bson:"terminal_id" json:"terminal_id"`
	SecretHash string `bson:"secret_hash" json:"secret_hash"`
}
