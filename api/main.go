// Package main Flux WiFi Sniffer API
//
// WiFi presence detection and occupancy analytics API
//
// Terms Of Service:
//
// There are no TOS at this moment, use at your own risk
//
//     Schemes: http, https
//     Host: localhost:8080
//     BasePath: /
//     Version: 1.0.0
//     Contact: Flux Team
//
//     Consumes:
//     - application/json
//
//     Produces:
//     - application/json
//
//     Security:
//     - api_key:
//
//     SecurityDefinitions:
//     api_key:
//          type: apiKey
//          name: Authorization
//          in: header
//
// swagger:meta
package main

import (
	"context"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Get MongoDB URI from environment
	mongoURI := getEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/")

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	// Initialize global database handle
	db = client.Database("flux")

	// Initialize historical data collections with TTL indexes
	if err := initHistoricalCollections(context.Background()); err != nil {
		log.Printf("Warning: Failed to initialize historical collections: %v", err)
	}

	// Load channel hopping configuration
	if err := loadChannelConfig(); err != nil {
		log.Printf("Warning: Failed to load channel config: %v", err)
	}

	// Start background aggregation services
	go startAggregationWorkers()

	// Setup Gin router
	r := gin.Default()

	// Static files and home page
	r.Static("/static", "./static")
	r.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	// Device endpoints
	r.GET("/devices", getDevices)
	r.GET("/devices/active", getActiveDevices)
	r.POST("/ingest/device", ingestDevice)
	r.POST("/ingest/connection", ingestConnection)
	r.POST("/ingest/disconnection", ingestDisconnection)
	r.POST("/ingest/data", ingestData)

	// Access point endpoints
	r.GET("/access-points", getAccessPoints)
	r.GET("/access-points/active", getActiveAccessPoints)
	r.POST("/ingest/access-point", ingestAccessPoint)

	// Stats endpoint
	r.GET("/stats", getStats)

	// Historical data query endpoints
	r.GET("/metrics/history", getMetricsHistory)
	r.GET("/metrics/device/:mac", getDeviceHistory)
	r.GET("/metrics/summary", getMetricsSummary)

	// Channel hopping configuration endpoints
	r.GET("/config/channel-hopping", getChannelConfig)
	r.PUT("/config/channel-hopping", updateChannelConfig)

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("Starting API on :%s", port)
	r.Run(":" + port)
}
