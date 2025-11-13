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

	// Initialize event collections with TTL indexes (30-day retention)
	if err := initEventCollections(context.Background()); err != nil {
		log.Printf("Warning: Failed to initialize event collections: %v", err)
	}

	// Load channel hopping configuration
	if err := loadChannelConfig(); err != nil {
		log.Printf("Warning: Failed to load channel config: %v", err)
	}

	// Setup Gin router
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Static files (operations dashboard, swagger docs)
	r.Static("/static", "./static")

	// Serve React frontend
	r.Static("/app", "./static/app")
	r.NoRoute(func(c *gin.Context) {
		// If path starts with /api, it's a missing API route
		if len(c.Request.URL.Path) >= 4 && c.Request.URL.Path[:4] == "/api" {
			c.JSON(404, gin.H{"error": "API endpoint not found"})
			return
		}
		// Otherwise serve the React app (SPA routing)
		c.File("./static/app/index.html")
	})

	// Legacy: redirect root to app
	r.GET("/", func(c *gin.Context) {
		c.Redirect(302, "/app")
	})

	// API endpoints - available at both root and /api prefix for compatibility
	api := r.Group("/api")

	// Device endpoints
	r.GET("/devices", getDevices)
	r.GET("/devices/active", getActiveDevices)
	r.POST("/ingest/device", ingestDevice)
	r.POST("/ingest/connection", ingestConnection)
	r.POST("/ingest/disconnection", ingestDisconnection)
	r.POST("/ingest/data", ingestData)
	api.GET("/devices", getDevices)
	api.GET("/devices/active", getActiveDevices)
	api.POST("/ingest/device", ingestDevice)
	api.POST("/ingest/connection", ingestConnection)
	api.POST("/ingest/disconnection", ingestDisconnection)
	api.POST("/ingest/data", ingestData)

	// Access point endpoints
	r.GET("/access-points", getAccessPoints)
	r.GET("/access-points/active", getActiveAccessPoints)
	r.POST("/ingest/access-point", ingestAccessPoint)
	api.GET("/access-points", getAccessPoints)
	api.GET("/access-points/active", getActiveAccessPoints)
	api.POST("/ingest/access-point", ingestAccessPoint)

	// Stats endpoint
	r.GET("/stats", getStats)
	api.GET("/stats", getStats)

	// Historical data query endpoints
	r.GET("/metrics/history", getMetricsHistory)
	r.GET("/metrics/device/:mac", getDeviceHistory)
	r.GET("/metrics/summary", getMetricsSummary)
	api.GET("/metrics/history", getMetricsHistory)
	api.GET("/metrics/device/:mac", getDeviceHistory)
	api.GET("/metrics/summary", getMetricsSummary)

	// Channel hopping configuration endpoints
	r.GET("/config/channel-hopping", getChannelConfig)
	r.PUT("/config/channel-hopping", updateChannelConfig)
	api.GET("/config/channel-hopping", getChannelConfig)
	api.PUT("/config/channel-hopping", updateChannelConfig)

	// Query execution endpoint (read-only MongoDB queries)
	r.POST("/query/execute", executeQuery)
	api.POST("/query/execute", executeQuery)

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("Starting API on :%s", port)
	r.Run(":" + port)
}
