package models

import (
	"context"
	"errors"
	"log"
	"time"

	"cinema/internal/service"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type User struct {
	ID        int       `json:"id" bson:"id"`
	Email     string    `json:"email" bson:"email"`
	Username  string    `json:"username" bson:"username"`
	Password  string    `json:"-" bson:"password"`
	Role      string    `json:"role" bson:"role"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}

func UsersCollection() *mongo.Collection {
	return service.MongoDB.Collection("users")
}

func CreateUser(u User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := UsersCollection().CountDocuments(ctx, bson.M{"email": u.Email})
	if count > 0 {
		return errors.New("email already exists")
	}

	id, err := nextID("users")
	if err != nil {
		return err
	}
	u.ID = id

	if u.Role == "" {
		u.Role = "user"
	}

	u.CreatedAt = time.Now()

	_, err = UsersCollection().InsertOne(ctx, u)
	return err
}

func GetUserByEmail(email string) (User, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var u User
	err := UsersCollection().FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return User{}, false, nil
		}
		return User{}, false, err
	}

	log.Printf("DEBUG: Found user %s with role [%s]", u.Email, u.Role)
	
	return u, true, nil
}
