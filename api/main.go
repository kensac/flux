package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Device struct {
	MACAddress       string    `bson:"mac_address" json:"mac_address"`
	FirstSeen        time.Time `bson:"first_seen" json:"first_seen"`
	LastSeen         time.Time `bson:"last_seen" json:"last_seen"`
	RSSIValues       []int     `bson:"rssi_values" json:"rssi_values"`
	ProbeSSIDs       []string  `bson:"probe_ssids" json:"probe_ssids"`
	PacketCount      int       `bson:"packet_count" json:"packet_count"`
	Vendor           string    `bson:"vendor" json:"vendor,omitempty"`
	Connected        bool      `bson:"connected" json:"connected"`
	LastConnected    time.Time `bson:"last_connected" json:"last_connected,omitempty"`
	LastDisconnected time.Time `bson:"last_disconnected" json:"last_disconnected,omitempty"`
	DataFrames       int       `bson:"data_frames" json:"data_frames"`
	DataBytes        int64     `bson:"data_bytes" json:"data_bytes"`
}

type AccessPoint struct {
	BSSID       string    `bson:"bssid" json:"bssid"`
	SSID        string    `bson:"ssid" json:"ssid"`
	Channel     int       `bson:"channel" json:"channel"`
	FirstSeen   time.Time `bson:"first_seen" json:"first_seen"`
	LastSeen    time.Time `bson:"last_seen" json:"last_seen"`
	RSSIValues  []int     `bson:"rssi_values" json:"rssi_values"`
	BeaconCount int       `bson:"beacon_count" json:"beacon_count"`
	Encryption  string    `bson:"encryption" json:"encryption,omitempty"`
}

type Stats struct {
	TotalDevices int `json:"total_devices"`
	TotalAPs     int `json:"total_aps"`
	ActiveDevices int `json:"active_devices"`
	ActiveAPs     int `json:"active_aps"`
}

// Historical data structures - Multi-granularity time-series storage
type DeviceMetric struct {
	MACAddress  string  `bson:"mac_address" json:"mac_address"`
	RSSIAvg     float64 `bson:"rssi_avg" json:"rssi_avg"`
	RSSIMin     int     `bson:"rssi_min" json:"rssi_min"`
	RSSIMax     int     `bson:"rssi_max" json:"rssi_max"`
	PacketCount int     `bson:"packet_count" json:"packet_count"`
	DataBytes   int64   `bson:"data_bytes" json:"data_bytes"`
	Connected   bool    `bson:"connected" json:"connected"`
	Vendor      string  `bson:"vendor,omitempty" json:"vendor,omitempty"`
}

type APMetric struct {
	BSSID       string  `bson:"bssid" json:"bssid"`
	SSID        string  `bson:"ssid" json:"ssid"`
	RSSIAvg     float64 `bson:"rssi_avg" json:"rssi_avg"`
	RSSIMin     int     `bson:"rssi_min" json:"rssi_min"`
	RSSIMax     int     `bson:"rssi_max" json:"rssi_max"`
	BeaconCount int     `bson:"beacon_count" json:"beacon_count"`
	Channel     int     `bson:"channel" json:"channel"`
}

type MetricsSnapshot struct {
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
	Tier      string    `bson:"tier" json:"tier"` // "1m", "5m", "1h"

	// Aggregate statistics
	Devices struct {
		Total     int `bson:"total" json:"total"`
		Active    int `bson:"active" json:"active"`
		Connected int `bson:"connected" json:"connected"`
	} `bson:"devices" json:"devices"`

	AccessPoints struct {
		Total  int `bson:"total" json:"total"`
		Active int `bson:"active" json:"active"`
	} `bson:"access_points" json:"access_points"`

	// Per-device/AP metrics (only store active entities to save space)
	DeviceMetrics []DeviceMetric `bson:"device_metrics" json:"device_metrics"`
	APMetrics     []APMetric     `bson:"ap_metrics" json:"ap_metrics"`
}

var (
	db *mongo.Database
)

func main() {
	mongoURI := getEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	db = client.Database("flux")

	// Initialize historical data collections with TTL indexes
	if err := initHistoricalCollections(context.Background()); err != nil {
		log.Printf("Warning: Failed to initialize historical collections: %v", err)
	}

	// Start background aggregation services
	go startAggregationWorkers()

	r := gin.Default()

	r.Static("/static", "./static")
	r.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	r.GET("/devices", getDevices)
	r.GET("/devices/active", getActiveDevices)
	r.GET("/access-points", getAccessPoints)
	r.GET("/access-points/active", getActiveAccessPoints)
	r.GET("/stats", getStats)

	r.POST("/ingest/device", ingestDevice)
	r.POST("/ingest/access-point", ingestAccessPoint)
	r.POST("/ingest/connection", ingestConnection)
	r.POST("/ingest/disconnection", ingestDisconnection)
	r.POST("/ingest/data", ingestData)

	// Historical data query endpoints
	r.GET("/metrics/history", getMetricsHistory)
	r.GET("/metrics/device/:mac", getDeviceHistory)
	r.GET("/metrics/summary", getMetricsSummary)

	port := getEnv("PORT", "8080")
	log.Printf("Starting API on :%s", port)
	r.Run(":" + port)
}

func getDevices(c *gin.Context) {
	limit := parseLimit(c.Query("limit"), 100)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "last_seen", Value: -1}})
	cursor, err := db.Collection("devices").Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var devices []Device
	if err = cursor.All(ctx, &devices); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, devices)
}

func getActiveDevices(c *gin.Context) {
	minutes := parseLimit(c.Query("minutes"), 5)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cutoff := time.Now().Add(-time.Duration(minutes) * time.Minute)
	filter := bson.M{"last_seen": bson.M{"$gte": cutoff}}

	cursor, err := db.Collection("devices").Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var devices []Device
	if err = cursor.All(ctx, &devices); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, devices)
}

func getAccessPoints(c *gin.Context) {
	limit := parseLimit(c.Query("limit"), 100)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "last_seen", Value: -1}})
	cursor, err := db.Collection("access_points").Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var aps []AccessPoint
	if err = cursor.All(ctx, &aps); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, aps)
}

func getActiveAccessPoints(c *gin.Context) {
	minutes := parseLimit(c.Query("minutes"), 5)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cutoff := time.Now().Add(-time.Duration(minutes) * time.Minute)
	filter := bson.M{"last_seen": bson.M{"$gte": cutoff}}

	cursor, err := db.Collection("access_points").Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var aps []AccessPoint
	if err = cursor.All(ctx, &aps); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, aps)
}

func getStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	totalDevices, _ := db.Collection("devices").CountDocuments(ctx, bson.M{})
	totalAPs, _ := db.Collection("access_points").CountDocuments(ctx, bson.M{})

	cutoff := time.Now().Add(-5 * time.Minute)
	activeFilter := bson.M{"last_seen": bson.M{"$gte": cutoff}}

	activeDevices, _ := db.Collection("devices").CountDocuments(ctx, activeFilter)
	activeAPs, _ := db.Collection("access_points").CountDocuments(ctx, activeFilter)

	c.JSON(http.StatusOK, Stats{
		TotalDevices:  int(totalDevices),
		TotalAPs:      int(totalAPs),
		ActiveDevices: int(activeDevices),
		ActiveAPs:     int(activeAPs),
	})
}

func parseLimit(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(s)
	if err != nil || val <= 0 {
		return defaultVal
	}
	if val > 1000 {
		return 1000
	}
	return val
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func ingestDevice(c *gin.Context) {
	var req struct {
		MACAddress string `json:"mac_address" binding:"required"`
		RSSI       int    `json:"rssi"`
		ProbeSSID  string `json:"probe_ssid"`
		Vendor     string `json:"vendor"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"mac_address": req.MACAddress}

	setFields := bson.M{"last_seen": time.Now()}
	if req.Vendor != "" {
		setFields["vendor"] = req.Vendor
	}

	update := bson.M{
		"$set": setFields,
		"$setOnInsert": bson.M{
			"first_seen": time.Now(),
		},
		"$push": bson.M{
			"rssi_values": bson.M{
				"$each":  []int{req.RSSI},
				"$slice": -100,
			},
		},
		"$inc": bson.M{
			"packet_count": 1,
		},
	}

	if req.ProbeSSID != "" {
		update["$addToSet"] = bson.M{
			"probe_ssids": req.ProbeSSID,
		}
	}

	opts := options.Update().SetUpsert(true)
	_, err := db.Collection("devices").UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Device upsert error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func ingestAccessPoint(c *gin.Context) {
	var req struct {
		BSSID   string `json:"bssid" binding:"required"`
		SSID    string `json:"ssid"`
		Channel int    `json:"channel"`
		RSSI    int    `json:"rssi"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"bssid": req.BSSID}
	update := bson.M{
		"$set": bson.M{
			"last_seen": time.Now(),
			"ssid":      req.SSID,
			"channel":   req.Channel,
		},
		"$setOnInsert": bson.M{
			"first_seen": time.Now(),
		},
		"$push": bson.M{
			"rssi_values": bson.M{
				"$each":  []int{req.RSSI},
				"$slice": -100,
			},
		},
		"$inc": bson.M{
			"beacon_count": 1,
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := db.Collection("access_points").UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("AP upsert error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func ingestConnection(c *gin.Context) {
	var req struct {
		MACAddress string `json:"mac_address" binding:"required"`
		BSSID      string `json:"bssid"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"mac_address": req.MACAddress}
	update := bson.M{
		"$set": bson.M{
			"connected":      true,
			"last_connected": time.Now(),
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := db.Collection("devices").UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Connection update error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func ingestDisconnection(c *gin.Context) {
	var req struct {
		MACAddress string `json:"mac_address" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"mac_address": req.MACAddress}
	update := bson.M{
		"$set": bson.M{
			"connected":         false,
			"last_disconnected": time.Now(),
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := db.Collection("devices").UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Disconnection update error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func ingestData(c *gin.Context) {
	var req struct {
		MACAddress string `json:"mac_address" binding:"required"`
		FrameCount int    `json:"frame_count"`
		ByteCount  int64  `json:"byte_count"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"mac_address": req.MACAddress}
	update := bson.M{
		"$set": bson.M{
			"last_seen": time.Now(),
		},
		"$inc": bson.M{
			"data_frames": req.FrameCount,
			"data_bytes":  req.ByteCount,
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := db.Collection("devices").UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Data tracking error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ==================== Historical Data Storage Functions ====================

// initHistoricalCollections creates TTL indexes for automatic data expiration
func initHistoricalCollections(ctx context.Context) error {
	// Collection names for different granularities
	collections := []struct {
		name string
		ttl  int32 // seconds
	}{
		{"metrics_1m", 24 * 60 * 60},      // 24 hours
		{"metrics_5m", 3 * 24 * 60 * 60},  // 3 days
		{"metrics_1h", 7 * 24 * 60 * 60},  // 7 days
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

// startAggregationWorkers starts background goroutines for periodic aggregation
func startAggregationWorkers() {
	log.Println("Starting historical data aggregation workers...")

	// 1-minute aggregation worker
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()

		// Run immediately on startup
		if err := aggregateMetrics("1m", time.Minute); err != nil {
			log.Printf("1m aggregation error: %v", err)
		}

		for range ticker.C {
			if err := aggregateMetrics("1m", time.Minute); err != nil {
				log.Printf("1m aggregation error: %v", err)
			}
		}
	}()

	// 5-minute aggregation worker
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		// Run immediately on startup
		if err := aggregateMetrics("5m", 5*time.Minute); err != nil {
			log.Printf("5m aggregation error: %v", err)
		}

		for range ticker.C {
			if err := aggregateMetrics("5m", 5*time.Minute); err != nil {
				log.Printf("5m aggregation error: %v", err)
			}
		}
	}()

	// 1-hour aggregation worker
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		// Run immediately on startup
		if err := aggregateMetrics("1h", time.Hour); err != nil {
			log.Printf("1h aggregation error: %v", err)
		}

		for range ticker.C {
			if err := aggregateMetrics("1h", time.Hour); err != nil {
				log.Printf("1h aggregation error: %v", err)
			}
		}
	}()
}

// aggregateMetrics creates a snapshot of current metrics
func aggregateMetrics(tier string, windowDuration time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	now := time.Now()
	// Round timestamp to the start of the interval
	var roundedTime time.Time
	switch tier {
	case "1m":
		roundedTime = now.Truncate(time.Minute)
	case "5m":
		roundedTime = now.Truncate(5 * time.Minute)
	case "1h":
		roundedTime = now.Truncate(time.Hour)
	}

	snapshot := MetricsSnapshot{
		Timestamp: roundedTime,
		Tier:      tier,
	}

	// Get aggregate device stats
	totalDevices, _ := db.Collection("devices").CountDocuments(ctx, bson.M{})
	snapshot.Devices.Total = int(totalDevices)

	// Active devices (seen in the last window)
	activeCutoff := now.Add(-windowDuration)
	activeFilter := bson.M{"last_seen": bson.M{"$gte": activeCutoff}}
	activeDevices, _ := db.Collection("devices").CountDocuments(ctx, activeFilter)
	snapshot.Devices.Active = int(activeDevices)

	// Connected devices
	connectedFilter := bson.M{"connected": true}
	connectedDevices, _ := db.Collection("devices").CountDocuments(ctx, connectedFilter)
	snapshot.Devices.Connected = int(connectedDevices)

	// Get aggregate AP stats
	totalAPs, _ := db.Collection("access_points").CountDocuments(ctx, bson.M{})
	snapshot.AccessPoints.Total = int(totalAPs)

	activeAPs, _ := db.Collection("access_points").CountDocuments(ctx, activeFilter)
	snapshot.AccessPoints.Active = int(activeAPs)

	// Get per-device metrics for active devices (to save space)
	cursor, err := db.Collection("devices").Find(ctx, activeFilter)
	if err == nil {
		defer cursor.Close(ctx)

		var devices []Device
		if err := cursor.All(ctx, &devices); err == nil {
			for _, device := range devices {
				metric := DeviceMetric{
					MACAddress:  device.MACAddress,
					PacketCount: device.PacketCount,
					DataBytes:   device.DataBytes,
					Connected:   device.Connected,
					Vendor:      device.Vendor,
				}

				// Calculate RSSI statistics
				if len(device.RSSIValues) > 0 {
					metric.RSSIAvg, metric.RSSIMin, metric.RSSIMax = calculateRSSIStats(device.RSSIValues)
				}

				snapshot.DeviceMetrics = append(snapshot.DeviceMetrics, metric)
			}
		}
	}

	// Get per-AP metrics for active APs
	cursor, err = db.Collection("access_points").Find(ctx, activeFilter)
	if err == nil {
		defer cursor.Close(ctx)

		var aps []AccessPoint
		if err := cursor.All(ctx, &aps); err == nil {
			for _, ap := range aps {
				metric := APMetric{
					BSSID:       ap.BSSID,
					SSID:        ap.SSID,
					BeaconCount: ap.BeaconCount,
					Channel:     ap.Channel,
				}

				// Calculate RSSI statistics
				if len(ap.RSSIValues) > 0 {
					metric.RSSIAvg, metric.RSSIMin, metric.RSSIMax = calculateRSSIStats(ap.RSSIValues)
				}

				snapshot.APMetrics = append(snapshot.APMetrics, metric)
			}
		}
	}

	// Store the snapshot in the appropriate collection
	collectionName := "metrics_" + tier
	_, err = db.Collection(collectionName).InsertOne(ctx, snapshot)
	if err != nil {
		return err
	}

	log.Printf("Created %s metrics snapshot: %d devices, %d APs (active: %d/%d)",
		tier, snapshot.Devices.Total, snapshot.AccessPoints.Total,
		snapshot.Devices.Active, snapshot.AccessPoints.Active)

	return nil
}

// calculateRSSIStats computes average, min, and max RSSI from a slice of values
func calculateRSSIStats(values []int) (avg float64, min int, max int) {
	if len(values) == 0 {
		return 0, 0, 0
	}

	sum := 0
	min = values[0]
	max = values[0]

	for _, val := range values {
		sum += val
		if val < min {
			min = val
		}
		if val > max {
			max = val
		}
	}

	avg = float64(sum) / float64(len(values))
	return
}

// ==================== Historical Data Query Endpoints ====================

// getMetricsHistory returns time-series metrics within a specified time range
// Query params: tier (1m/5m/1h), start (RFC3339), end (RFC3339), limit
func getMetricsHistory(c *gin.Context) {
	tier := c.DefaultQuery("tier", "1m")
	startStr := c.Query("start")
	endStr := c.Query("end")
	limit := parseLimit(c.Query("limit"), 1000)

	// Validate tier
	if tier != "1m" && tier != "5m" && tier != "1h" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tier must be 1m, 5m, or 1h"})
		return
	}

	// Parse time range
	var start, end time.Time
	var err error

	if startStr != "" {
		start, err = time.Parse(time.RFC3339, startStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start time format (use RFC3339)"})
			return
		}
	} else {
		// Default: last 24 hours
		start = time.Now().Add(-24 * time.Hour)
	}

	if endStr != "" {
		end, err = time.Parse(time.RFC3339, endStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end time format (use RFC3339)"})
			return
		}
	} else {
		end = time.Now()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"tier": tier,
		"timestamp": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(int64(limit))

	collectionName := "metrics_" + tier
	cursor, err := db.Collection(collectionName).Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var snapshots []MetricsSnapshot
	if err := cursor.All(ctx, &snapshots); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tier":      tier,
		"start":     start,
		"end":       end,
		"count":     len(snapshots),
		"snapshots": snapshots,
	})
}

// getDeviceHistory returns historical metrics for a specific device
// Query params: tier (1m/5m/1h), start (RFC3339), end (RFC3339)
func getDeviceHistory(c *gin.Context) {
	macAddress := c.Param("mac")
	tier := c.DefaultQuery("tier", "1m")
	startStr := c.Query("start")
	endStr := c.Query("end")

	// Validate tier
	if tier != "1m" && tier != "5m" && tier != "1h" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tier must be 1m, 5m, or 1h"})
		return
	}

	// Parse time range
	var start, end time.Time
	var err error

	if startStr != "" {
		start, err = time.Parse(time.RFC3339, startStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start time format (use RFC3339)"})
			return
		}
	} else {
		start = time.Now().Add(-24 * time.Hour)
	}

	if endStr != "" {
		end, err = time.Parse(time.RFC3339, endStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end time format (use RFC3339)"})
			return
		}
	} else {
		end = time.Now()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Query snapshots and extract device-specific metrics
	filter := bson.M{
		"tier": tier,
		"timestamp": bson.M{
			"$gte": start,
			"$lte": end,
		},
		"device_metrics.mac_address": macAddress,
	}

	collectionName := "metrics_" + tier
	cursor, err := db.Collection(collectionName).Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	type DeviceHistoryPoint struct {
		Timestamp   time.Time    `json:"timestamp"`
		Metric      DeviceMetric `json:"metric"`
	}

	var history []DeviceHistoryPoint
	for cursor.Next(ctx) {
		var snapshot MetricsSnapshot
		if err := cursor.Decode(&snapshot); err != nil {
			continue
		}

		// Find the device in this snapshot
		for _, deviceMetric := range snapshot.DeviceMetrics {
			if deviceMetric.MACAddress == macAddress {
				history = append(history, DeviceHistoryPoint{
					Timestamp: snapshot.Timestamp,
					Metric:    deviceMetric,
				})
				break
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"mac_address": macAddress,
		"tier":        tier,
		"start":       start,
		"end":         end,
		"count":       len(history),
		"history":     history,
	})
}

// getMetricsSummary returns aggregated statistics over a time range
// Query params: tier (1m/5m/1h), start (RFC3339), end (RFC3339)
func getMetricsSummary(c *gin.Context) {
	tier := c.DefaultQuery("tier", "1h")
	startStr := c.Query("start")
	endStr := c.Query("end")

	// Validate tier
	if tier != "1m" && tier != "5m" && tier != "1h" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tier must be 1m, 5m, or 1h"})
		return
	}

	// Parse time range
	var start, end time.Time
	var err error

	if startStr != "" {
		start, err = time.Parse(time.RFC3339, startStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start time format (use RFC3339)"})
			return
		}
	} else {
		start = time.Now().Add(-24 * time.Hour)
	}

	if endStr != "" {
		end, err = time.Parse(time.RFC3339, endStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end time format (use RFC3339)"})
			return
		}
	} else {
		end = time.Now()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"tier": tier,
		"timestamp": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}

	collectionName := "metrics_" + tier
	cursor, err := db.Collection(collectionName).Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	// Calculate summary statistics
	var snapshots []MetricsSnapshot
	if err := cursor.All(ctx, &snapshots); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(snapshots) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"tier":  tier,
			"start": start,
			"end":   end,
			"error": "no data available for this time range",
		})
		return
	}

	// Compute averages and extremes
	summary := struct {
		Tier      string    `json:"tier"`
		Start     time.Time `json:"start"`
		End       time.Time `json:"end"`
		DataPoints int      `json:"data_points"`

		Devices struct {
			AvgTotal     float64 `json:"avg_total"`
			AvgActive    float64 `json:"avg_active"`
			AvgConnected float64 `json:"avg_connected"`
			MaxTotal     int     `json:"max_total"`
			MaxActive    int     `json:"max_active"`
		} `json:"devices"`

		AccessPoints struct {
			AvgTotal  float64 `json:"avg_total"`
			AvgActive float64 `json:"avg_active"`
			MaxTotal  int     `json:"max_total"`
			MaxActive int     `json:"max_active"`
		} `json:"access_points"`
	}{
		Tier:       tier,
		Start:      start,
		End:        end,
		DataPoints: len(snapshots),
	}

	totalDeviceSum := 0
	activeDeviceSum := 0
	connectedDeviceSum := 0
	totalAPSum := 0
	activeAPSum := 0

	for _, snap := range snapshots {
		totalDeviceSum += snap.Devices.Total
		activeDeviceSum += snap.Devices.Active
		connectedDeviceSum += snap.Devices.Connected
		totalAPSum += snap.AccessPoints.Total
		activeAPSum += snap.AccessPoints.Active

		if snap.Devices.Total > summary.Devices.MaxTotal {
			summary.Devices.MaxTotal = snap.Devices.Total
		}
		if snap.Devices.Active > summary.Devices.MaxActive {
			summary.Devices.MaxActive = snap.Devices.Active
		}
		if snap.AccessPoints.Total > summary.AccessPoints.MaxTotal {
			summary.AccessPoints.MaxTotal = snap.AccessPoints.Total
		}
		if snap.AccessPoints.Active > summary.AccessPoints.MaxActive {
			summary.AccessPoints.MaxActive = snap.AccessPoints.Active
		}
	}

	n := float64(len(snapshots))
	summary.Devices.AvgTotal = float64(totalDeviceSum) / n
	summary.Devices.AvgActive = float64(activeDeviceSum) / n
	summary.Devices.AvgConnected = float64(connectedDeviceSum) / n
	summary.AccessPoints.AvgTotal = float64(totalAPSum) / n
	summary.AccessPoints.AvgActive = float64(activeAPSum) / n

	c.JSON(http.StatusOK, summary)
}
