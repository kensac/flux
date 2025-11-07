package main

import (
	"encoding/json"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	channelHoppingConfig = ChannelHoppingConfig{
		Enabled:     true,
		TimeoutMs:   300,
		LastUpdated: time.Now(),
	}
	configMutex sync.RWMutex
	configPath  = "/tmp/flux_channel_config.json"
)

// loadChannelConfig loads the channel hopping configuration from file
func loadChannelConfig() error {
	configMutex.Lock()
	defer configMutex.Unlock()

	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			// File doesn't exist, use defaults and create it
			return saveChannelConfigUnsafe()
		}
		return err
	}

	return json.Unmarshal(data, &channelHoppingConfig)
}

// saveChannelConfig saves the channel hopping configuration to file
func saveChannelConfig() error {
	configMutex.Lock()
	defer configMutex.Unlock()
	return saveChannelConfigUnsafe()
}

// saveChannelConfigUnsafe saves without locking (caller must hold lock)
func saveChannelConfigUnsafe() error {
	channelHoppingConfig.LastUpdated = time.Now()
	data, err := json.MarshalIndent(channelHoppingConfig, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath, data, 0644)
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
