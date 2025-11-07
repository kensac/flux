package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// getDevices returns a list of all devices, sorted by last seen
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

// getActiveDevices returns devices that have been seen recently
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

// getStats returns aggregate statistics about devices and access points
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

// ingestDevice handles incoming device probe data
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

// ingestConnection handles device connection events
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

// ingestDisconnection handles device disconnection events
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

// ingestData handles data frame statistics for devices
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
