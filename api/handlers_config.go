package main

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	channelHoppingConfig = ChannelHoppingConfig{
		Enabled:     true,
		TimeoutMs:   300,
		LastUpdated: time.Now(),
	}
	configMutex sync.RWMutex
	configKey   = "channel_hopping"
)

// loadChannelConfig loads the channel hopping configuration from MongoDB
func loadChannelConfig() error {
	configMutex.Lock()
	defer configMutex.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Collection("config")
	filter := bson.M{"_id": configKey}

	var result struct {
		ID          string `bson:"_id"`
		Enabled     bool   `bson:"enabled"`
		TimeoutMs   int    `bson:"timeout_ms"`
		LastUpdated time.Time `bson:"last_updated"`
	}

	err := collection.FindOne(ctx, filter).Decode(&result)
	if err != nil {
		// Config doesn't exist, use defaults and create it
		return saveChannelConfigUnsafe()
	}

	channelHoppingConfig.Enabled = result.Enabled
	channelHoppingConfig.TimeoutMs = result.TimeoutMs
	channelHoppingConfig.LastUpdated = result.LastUpdated

	return nil
}

// saveChannelConfig saves the channel hopping configuration to MongoDB
func saveChannelConfig() error {
	configMutex.Lock()
	defer configMutex.Unlock()
	return saveChannelConfigUnsafe()
}

// saveChannelConfigUnsafe saves without locking (caller must hold lock)
func saveChannelConfigUnsafe() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	channelHoppingConfig.LastUpdated = time.Now()

	collection := db.Collection("config")
	filter := bson.M{"_id": configKey}
	update := bson.M{
		"$set": bson.M{
			"_id":          configKey,
			"enabled":      channelHoppingConfig.Enabled,
			"timeout_ms":   channelHoppingConfig.TimeoutMs,
			"last_updated": channelHoppingConfig.LastUpdated,
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := collection.UpdateOne(ctx, filter, update, opts)
	return err
}

// getChannelConfig returns the current channel hopping configuration
func getChannelConfig(c *gin.Context) {
	configMutex.RLock()
	defer configMutex.RUnlock()

	c.JSON(http.StatusOK, channelHoppingConfig)
}

// updateChannelConfig updates the channel hopping configuration
func updateChannelConfig(c *gin.Context) {
	var req ChannelHoppingConfig

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate timeout
	if req.TimeoutMs < 50 || req.TimeoutMs > 10000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "timeout_ms must be between 50 and 10000"})
		return
	}

	configMutex.Lock()
	channelHoppingConfig.Enabled = req.Enabled
	channelHoppingConfig.TimeoutMs = req.TimeoutMs
	configMutex.Unlock()

	if err := saveChannelConfig(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"config": channelHoppingConfig,
	})
}
