package main

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	db *mongo.Database
)

// initHistoricalCollections creates TTL indexes for automatic data expiration
func initHistoricalCollections(ctx context.Context) error {
	// Collection names for different granularities
	collections := []struct {
		name string
		ttl  int32 // seconds
	}{
		{"metrics_1m", 24 * 60 * 60},     // 24 hours
		{"metrics_5m", 3 * 24 * 60 * 60}, // 3 days
		{"metrics_1h", 7 * 24 * 60 * 60}, // 7 days
	}

	for _, coll := range collections {
		indexModel := mongo.IndexModel{
			Keys: bson.D{
				{Key: "timestamp", Value: 1},
			},
			Options: options.Index().
				SetExpireAfterSeconds(coll.ttl).
				SetName("ttl_index"),
		}

		_, err := db.Collection(coll.name).Indexes().CreateOne(ctx, indexModel)
		if err != nil {
			log.Printf("Failed to create TTL index for %s: %v", coll.name, err)
			return err
		}
		log.Printf("Created TTL index for %s (retention: %d seconds)", coll.name, coll.ttl)

		// Create compound index for efficient querying
		compoundIndex := mongo.IndexModel{
			Keys: bson.D{
				{Key: "tier", Value: 1},
				{Key: "timestamp", Value: -1},
			},
			Options: options.Index().SetName("tier_timestamp_index"),
		}
		_, err = db.Collection(coll.name).Indexes().CreateOne(ctx, compoundIndex)
		if err != nil {
			log.Printf("Failed to create compound index for %s: %v", coll.name, err)
		}
	}

	return nil
}
