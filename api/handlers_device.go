package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

// getDevices aggregates device data from events on demand
func getDevices(c *gin.Context) {
	limit := parseLimit(c.Query("limit"), 100)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Aggregate device data from events
	pipeline := []bson.M{
		// Group by MAC address
		{
			"$group": bson.M{
				"_id":          "$mac_address",
				"first_seen":   bson.M{"$min": "$timestamp"},
				"last_seen":    bson.M{"$max": "$timestamp"},
				"rssi_values":  bson.M{"$push": "$rssi"},
				"probe_ssids":  bson.M{"$addToSet": "$probe_ssid"},
				"vendor":       bson.M{"$last": "$vendor"},
				"packet_count": bson.M{"$sum": 1},
				"data_frames":  bson.M{"$sum": "$data_frame_count"},
				"data_bytes":   bson.M{"$sum": "$data_byte_count"},
				"events": bson.M{"$push": bson.M{
					"event_type": "$event_type",
					"timestamp":  "$timestamp",
					"connected":  "$connected",
				}},
			},
		},
		// Sort by last seen
		{
			"$sort": bson.M{"last_seen": -1},
		},
		// Limit results
		{
			"$limit": int64(limit),
		},
	}

	cursor, err := db.Collection("device_events").Aggregate(ctx, pipeline)
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

	// Transform aggregation results into Device struct
	devices := make([]Device, 0, len(results))
	for _, result := range results {
		firstSeen, _ := bsonToTime(result["first_seen"])
		lastSeen, _ := bsonToTime(result["last_seen"])

		device := Device{
			MACAddress:  result["_id"].(string),
			FirstSeen:   firstSeen,
			LastSeen:    lastSeen,
			PacketCount: int(result["packet_count"].(int32)),
			DataFrames:  int(result["data_frames"].(int32)),
			DataBytes:   result["data_bytes"].(int64),
		}

		// Extract vendor
		if vendor, ok := result["vendor"].(string); ok && vendor != "" {
			device.Vendor = vendor
		}

		// Extract RSSI values (limited to last 100)
		if rssiVals, ok := result["rssi_values"].([]interface{}); ok {
			start := 0
			if len(rssiVals) > 100 {
				start = len(rssiVals) - 100
			}
			for _, val := range rssiVals[start:] {
				if rssi, ok := val.(int32); ok {
					device.RSSIValues = append(device.RSSIValues, int(rssi))
				}
			}
		}

		// Extract probe SSIDs (filter out empty strings)
		if probeSSIDs, ok := result["probe_ssids"].([]interface{}); ok {
			for _, ssid := range probeSSIDs {
				if s, ok := ssid.(string); ok && s != "" {
					device.ProbeSSIDs = append(device.ProbeSSIDs, s)
				}
			}
		}

		// Determine connection status from events
		if events, ok := result["events"].([]interface{}); ok {
			for i := len(events) - 1; i >= 0; i-- {
				if event, ok := events[i].(bson.M); ok {
					eventType := event["event_type"].(string)
					if eventType == "connection" {
						device.Connected = true
						if ts, ok := bsonToTime(event["timestamp"]); ok {
							device.LastConnected = ts
						}
						break
					} else if eventType == "disconnection" {
						device.Connected = false
						if ts, ok := bsonToTime(event["timestamp"]); ok {
							device.LastDisconnected = ts
						}
						break
					}
				}
			}
		}

		devices = append(devices, device)
	}

	c.JSON(http.StatusOK, devices)
}

// getActiveDevices returns devices that have been seen recently (aggregated from events)
func getActiveDevices(c *gin.Context) {
	minutes := parseLimit(c.Query("minutes"), 5)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cutoff := time.Now().Add(-time.Duration(minutes) * time.Minute)

	// Aggregate only recent events
	pipeline := []bson.M{
		// Filter recent events
		{
			"$match": bson.M{
				"timestamp": bson.M{"$gte": cutoff},
			},
		},
		// Group by MAC address
		{
			"$group": bson.M{
				"_id":          "$mac_address",
				"last_seen":    bson.M{"$max": "$timestamp"},
				"rssi_values":  bson.M{"$push": "$rssi"},
				"vendor":       bson.M{"$last": "$vendor"},
				"packet_count": bson.M{"$sum": 1},
			},
		},
		// Sort by last seen
		{
			"$sort": bson.M{"last_seen": -1},
		},
	}

	cursor, err := db.Collection("device_events").Aggregate(ctx, pipeline)
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

	// Transform to Device structs
	devices := make([]Device, 0, len(results))
	for _, result := range results {
		lastSeen, _ := bsonToTime(result["last_seen"])

		device := Device{
			MACAddress:  result["_id"].(string),
			LastSeen:    lastSeen,
			PacketCount: int(result["packet_count"].(int32)),
		}
		if vendor, ok := result["vendor"].(string); ok {
			device.Vendor = vendor
		}
		if rssiVals, ok := result["rssi_values"].([]interface{}); ok {
			for _, val := range rssiVals {
				if rssi, ok := val.(int32); ok {
					device.RSSIValues = append(device.RSSIValues, int(rssi))
				}
			}
		}
		devices = append(devices, device)
	}

	c.JSON(http.StatusOK, devices)
}

// getStats returns aggregate statistics about devices and access points (from events)
func getStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cutoff := time.Now().Add(-5 * time.Minute)

	// Count unique devices (all time)
	totalDevicesPipeline := []bson.M{
		{"$group": bson.M{"_id": "$mac_address"}},
		{"$count": "total"},
	}
	cursor, _ := db.Collection("device_events").Aggregate(ctx, totalDevicesPipeline)
	var totalDevicesResult []bson.M
	totalDevices := 0
	if err := cursor.All(ctx, &totalDevicesResult); err == nil && len(totalDevicesResult) > 0 {
		totalDevices = int(totalDevicesResult[0]["total"].(int32))
	}
	cursor.Close(ctx)

	// Count unique active devices (last 5 minutes)
	activeDevicesPipeline := []bson.M{
		{"$match": bson.M{"timestamp": bson.M{"$gte": cutoff}}},
		{"$group": bson.M{"_id": "$mac_address"}},
		{"$count": "active"},
	}
	cursor, _ = db.Collection("device_events").Aggregate(ctx, activeDevicesPipeline)
	var activeDevicesResult []bson.M
	activeDevices := 0
	if err := cursor.All(ctx, &activeDevicesResult); err == nil && len(activeDevicesResult) > 0 {
		activeDevices = int(activeDevicesResult[0]["active"].(int32))
	}
	cursor.Close(ctx)

	// Count unique APs (all time)
	totalAPsPipeline := []bson.M{
		{"$group": bson.M{"_id": "$bssid"}},
		{"$count": "total"},
	}
	cursor, _ = db.Collection("access_point_events").Aggregate(ctx, totalAPsPipeline)
	var totalAPsResult []bson.M
	totalAPs := 0
	if err := cursor.All(ctx, &totalAPsResult); err == nil && len(totalAPsResult) > 0 {
		totalAPs = int(totalAPsResult[0]["total"].(int32))
	}
	cursor.Close(ctx)

	// Count unique active APs (last 5 minutes)
	activeAPsPipeline := []bson.M{
		{"$match": bson.M{"timestamp": bson.M{"$gte": cutoff}}},
		{"$group": bson.M{"_id": "$bssid"}},
		{"$count": "active"},
	}
	cursor, _ = db.Collection("access_point_events").Aggregate(ctx, activeAPsPipeline)
	var activeAPsResult []bson.M
	activeAPs := 0
	if err := cursor.All(ctx, &activeAPsResult); err == nil && len(activeAPsResult) > 0 {
		activeAPs = int(activeAPsResult[0]["active"].(int32))
	}
	cursor.Close(ctx)

	c.JSON(http.StatusOK, Stats{
		TotalDevices:  totalDevices,
		TotalAPs:      totalAPs,
		ActiveDevices: activeDevices,
		ActiveAPs:     activeAPs,
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

	// Create raw event
	event := DeviceEvent{
		Timestamp:  time.Now(),
		MACAddress: req.MACAddress,
		EventType:  "probe",
		RSSI:       req.RSSI,
		ProbeSSID:  req.ProbeSSID,
		Vendor:     req.Vendor,
		Connected:  false,
	}

	// Store raw event
	_, err := db.Collection("device_events").InsertOne(ctx, event)
	if err != nil {
		log.Printf("Device event insertion error: %v", err)
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
		RSSI       int    `json:"rssi"`
		Vendor     string `json:"vendor"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Create raw event
	event := DeviceEvent{
		Timestamp:  time.Now(),
		MACAddress: req.MACAddress,
		EventType:  "connection",
		RSSI:       req.RSSI,
		Vendor:     req.Vendor,
		Connected:  true,
		BSSID:      req.BSSID,
	}

	// Store raw event
	_, err := db.Collection("device_events").InsertOne(ctx, event)
	if err != nil {
		log.Printf("Connection event insertion error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ingestDisconnection handles device disconnection events
func ingestDisconnection(c *gin.Context) {
	var req struct {
		MACAddress string `json:"mac_address" binding:"required"`
		RSSI       int    `json:"rssi"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Create raw event
	event := DeviceEvent{
		Timestamp:  time.Now(),
		MACAddress: req.MACAddress,
		EventType:  "disconnection",
		RSSI:       req.RSSI,
		Connected:  false,
	}

	// Store raw event
	_, err := db.Collection("device_events").InsertOne(ctx, event)
	if err != nil {
		log.Printf("Disconnection event insertion error: %v", err)
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
		RSSI       int    `json:"rssi"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Create raw event
	event := DeviceEvent{
		Timestamp:      time.Now(),
		MACAddress:     req.MACAddress,
		EventType:      "data",
		RSSI:           req.RSSI,
		DataFrameCount: req.FrameCount,
		DataByteCount:  req.ByteCount,
	}

	// Store raw event
	_, err := db.Collection("device_events").InsertOne(ctx, event)
	if err != nil {
		log.Printf("Data event insertion error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
