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
