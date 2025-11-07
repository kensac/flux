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

// getAccessPoints returns a list of all access points, sorted by last seen
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

// getActiveAccessPoints returns access points that have been seen recently
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

// ingestAccessPoint handles incoming access point beacon data
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
