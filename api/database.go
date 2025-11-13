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

// initEventCollections creates TTL indexes for automatic event expiration (30 days)
func initEventCollections(ctx context.Context) error {
	// Event collections with 30-day TTL
	collections := []struct {
		name string
		ttl  int32 // seconds
	}{
		{"device_events", 30 * 24 * 60 * 60},       // 30 days
		{"access_point_events", 30 * 24 * 60 * 60}, // 30 days
	}

	for _, coll := range collections {
		// TTL index on timestamp
		ttlIndex := mongo.IndexModel{
			Keys: bson.D{
				{Key: "timestamp", Value: 1},
			},
			Options: options.Index().
				SetExpireAfterSeconds(coll.ttl).
				SetName("ttl_index"),
		}

		_, err := db.Collection(coll.name).Indexes().CreateOne(ctx, ttlIndex)
		if err != nil {
			log.Printf("Failed to create TTL index for %s: %v", coll.name, err)
			return err
		}
		log.Printf("Created TTL index for %s (retention: %d days)", coll.name, coll.ttl/(24*60*60))

		// Index for efficient MAC/BSSID queries
		if coll.name == "device_events" {
			macIndex := mongo.IndexModel{
				Keys: bson.D{
					{Key: "mac_address", Value: 1},
					{Key: "timestamp", Value: -1},
				},
				Options: options.Index().SetName("mac_timestamp_index"),
			}
			_, err = db.Collection(coll.name).Indexes().CreateOne(ctx, macIndex)
			if err != nil {
				log.Printf("Failed to create MAC index for %s: %v", coll.name, err)
			}
		} else {
			bssidIndex := mongo.IndexModel{
				Keys: bson.D{
					{Key: "bssid", Value: 1},
					{Key: "timestamp", Value: -1},
				},
				Options: options.Index().SetName("bssid_timestamp_index"),
			}
			_, err = db.Collection(coll.name).Indexes().CreateOne(ctx, bssidIndex)
			if err != nil {
				log.Printf("Failed to create BSSID index for %s: %v", coll.name, err)
			}
		}

		// Index for event type filtering
		eventTypeIndex := mongo.IndexModel{
			Keys: bson.D{
				{Key: "event_type", Value: 1},
				{Key: "timestamp", Value: -1},
			},
			Options: options.Index().SetName("event_type_timestamp_index"),
		}
		_, err = db.Collection(coll.name).Indexes().CreateOne(ctx, eventTypeIndex)
		if err != nil {
			log.Printf("Failed to create event type index for %s: %v", coll.name, err)
		}
	}

	// Historical metrics collections with tier TTLs
	metricCollections := []struct {
		name string
		ttl  int32
	}{
		{"metrics_1m", 24 * 60 * 60},     // 24 hours
		{"metrics_5m", 3 * 24 * 60 * 60}, // 3 days
		{"metrics_1h", 7 * 24 * 60 * 60}, // 7 days
	}

	for _, coll := range metricCollections {
		ttlIndex := mongo.IndexModel{
			Keys: bson.D{
				{Key: "timestamp", Value: 1},
			},
			Options: options.Index().
				SetExpireAfterSeconds(coll.ttl).
				SetName("ttl_index"),
		}

		if _, err := db.Collection(coll.name).Indexes().CreateOne(ctx, ttlIndex); err != nil {
			log.Printf("Failed to create TTL index for %s: %v", coll.name, err)
			return err
		}

		compoundIndex := mongo.IndexModel{
			Keys: bson.D{
				{Key: "tier", Value: 1},
				{Key: "timestamp", Value: -1},
			},
			Options: options.Index().SetName("tier_timestamp_index"),
		}

		if _, err := db.Collection(coll.name).Indexes().CreateOne(ctx, compoundIndex); err != nil {
			log.Printf("Failed to create compound index for %s: %v", coll.name, err)
		}
	}

	return nil
}
