package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

// getAccessPoints aggregates AP data from events on demand
func getAccessPoints(c *gin.Context) {
	limit := parseLimit(c.Query("limit"), 100)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Aggregate AP data from events
	pipeline := []bson.M{
		{
			"$group": bson.M{
				"_id":          "$bssid",
				"first_seen":   bson.M{"$min": "$timestamp"},
				"last_seen":    bson.M{"$max": "$timestamp"},
				"ssid":         bson.M{"$last": "$ssid"},
				"channel":      bson.M{"$last": "$channel"},
				"encryption":   bson.M{"$last": "$encryption"},
				"rssi_values":  bson.M{"$push": "$rssi"},
				"beacon_count": bson.M{"$sum": 1},
			},
		},
		{"$sort": bson.M{"last_seen": -1}},
		{"$limit": int64(limit)},
	}

	cursor, err := db.Collection("access_point_events").Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	aps := make([]AccessPoint, 0, len(results))
	for _, result := range results {
		firstSeen, _ := bsonToTime(result["first_seen"])
		lastSeen, _ := bsonToTime(result["last_seen"])

		ap := AccessPoint{
			BSSID:       result["_id"].(string),
			FirstSeen:   firstSeen,
			LastSeen:    lastSeen,
			BeaconCount: int(result["beacon_count"].(int32)),
		}
		if ssid, ok := result["ssid"].(string); ok {
			ap.SSID = ssid
		}
		if channel, ok := result["channel"].(int32); ok {
			ap.Channel = int(channel)
		}
		if encryption, ok := result["encryption"].(string); ok {
			ap.Encryption = encryption
		}
		if rssiVals, ok := result["rssi_values"].([]interface{}); ok {
			start := 0
			if len(rssiVals) > 100 {
				start = len(rssiVals) - 100
			}
			for _, val := range rssiVals[start:] {
				if rssi, ok := val.(int32); ok {
					ap.RSSIValues = append(ap.RSSIValues, int(rssi))
				}
			}
		}
		aps = append(aps, ap)
	}

	c.JSON(http.StatusOK, aps)
}

// getActiveAccessPoints returns access points that have been seen recently (from events)
func getActiveAccessPoints(c *gin.Context) {
	minutes := parseLimit(c.Query("minutes"), 5)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cutoff := time.Now().Add(-time.Duration(minutes) * time.Minute)

	pipeline := []bson.M{
		{"$match": bson.M{"timestamp": bson.M{"$gte": cutoff}}},
		{
			"$group": bson.M{
				"_id":          "$bssid",
				"last_seen":    bson.M{"$max": "$timestamp"},
				"ssid":         bson.M{"$last": "$ssid"},
				"channel":      bson.M{"$last": "$channel"},
				"rssi_values":  bson.M{"$push": "$rssi"},
				"beacon_count": bson.M{"$sum": 1},
			},
		},
		{"$sort": bson.M{"last_seen": -1}},
	}

	cursor, err := db.Collection("access_point_events").Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	aps := make([]AccessPoint, 0, len(results))
	for _, result := range results {
		lastSeen, _ := bsonToTime(result["last_seen"])

		ap := AccessPoint{
			BSSID:       result["_id"].(string),
			LastSeen:    lastSeen,
			BeaconCount: int(result["beacon_count"].(int32)),
		}
		if ssid, ok := result["ssid"].(string); ok {
			ap.SSID = ssid
		}
		if channel, ok := result["channel"].(int32); ok {
			ap.Channel = int(channel)
		}
		if rssiVals, ok := result["rssi_values"].([]interface{}); ok {
			for _, val := range rssiVals {
				if rssi, ok := val.(int32); ok {
					ap.RSSIValues = append(ap.RSSIValues, int(rssi))
				}
			}
		}
		aps = append(aps, ap)
	}

	c.JSON(http.StatusOK, aps)
}

// ingestAccessPoint handles incoming access point beacon data
func ingestAccessPoint(c *gin.Context) {
	var req struct {
		BSSID      string `json:"bssid" binding:"required"`
		SSID       string `json:"ssid"`
		Channel    int    `json:"channel"`
		RSSI       int    `json:"rssi"`
		Encryption string `json:"encryption"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Create raw event
	event := AccessPointEvent{
		Timestamp:  time.Now(),
		BSSID:      req.BSSID,
		EventType:  "beacon",
		SSID:       req.SSID,
		Channel:    req.Channel,
		RSSI:       req.RSSI,
		Encryption: req.Encryption,
	}

	// Store raw event
	_, err := db.Collection("access_point_events").InsertOne(ctx, event)
	if err != nil {
		log.Printf("AP event insertion error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
