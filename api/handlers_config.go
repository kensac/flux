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
		Channels:    []int{1, 6, 11, 2, 7, 3, 8, 4, 9, 5, 10}, // Default 2.4GHz channels
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
		ID          string    `bson:"_id"`
		Enabled     bool      `bson:"enabled"`
		TimeoutMs   int       `bson:"timeout_ms"`
		Channels    []int     `bson:"channels"`
		LastUpdated time.Time `bson:"last_updated"`
	}

	err := collection.FindOne(ctx, filter).Decode(&result)
	if err != nil {
		// Config doesn't exist, use defaults and create it
		return saveChannelConfigUnsafe()
	}

	channelHoppingConfig.Enabled = result.Enabled
	channelHoppingConfig.TimeoutMs = result.TimeoutMs
	channelHoppingConfig.Channels = result.Channels
	if len(channelHoppingConfig.Channels) == 0 {
		// Fallback to default channels if empty
		channelHoppingConfig.Channels = []int{1, 6, 11, 2, 7, 3, 8, 4, 9, 5, 10}
	}
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
			"channels":     channelHoppingConfig.Channels,
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

	// Validate channels
	if len(req.Channels) > 0 {
		for _, ch := range req.Channels {
			if ch < 1 || ch > 165 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "channels must be between 1 and 165"})
				return
			}
		}
	}

	configMutex.Lock()
	channelHoppingConfig.Enabled = req.Enabled
	channelHoppingConfig.TimeoutMs = req.TimeoutMs
	if len(req.Channels) > 0 {
		channelHoppingConfig.Channels = req.Channels
	}
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
