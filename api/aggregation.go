package main

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

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

	deviceEvents := db.Collection("device_events")
	apEvents := db.Collection("access_point_events")

	// Get aggregate device stats
	if distinctDevices, err := deviceEvents.Distinct(ctx, "mac_address", bson.M{}); err == nil {
		snapshot.Devices.Total = len(distinctDevices)
	}

	activeCutoff := now.Add(-windowDuration)
	activeFilter := bson.M{"timestamp": bson.M{"$gte": activeCutoff}}

	if activeDevices, err := deviceEvents.Distinct(ctx, "mac_address", activeFilter); err == nil {
		snapshot.Devices.Active = len(activeDevices)
	}

	if connectedDevices, err := deviceEvents.Distinct(ctx, "mac_address", bson.M{
		"timestamp": bson.M{"$gte": activeCutoff},
		"connected": true,
	}); err == nil {
		snapshot.Devices.Connected = len(connectedDevices)
	}

	// Get aggregate AP stats
	if distinctAPs, err := apEvents.Distinct(ctx, "bssid", bson.M{}); err == nil {
		snapshot.AccessPoints.Total = len(distinctAPs)
	}

	if activeAPs, err := apEvents.Distinct(ctx, "bssid", activeFilter); err == nil {
		snapshot.AccessPoints.Active = len(activeAPs)
	}

	// Aggregate per-device metrics from recent events
	deviceMetricsPipeline := []bson.M{
		{"$match": bson.M{"timestamp": bson.M{"$gte": activeCutoff}}},
		{"$group": bson.M{
			"_id":          "$mac_address",
			"vendor":       bson.M{"$last": "$vendor"},
			"connected":    bson.M{"$last": "$connected"},
			"packet_count": bson.M{"$sum": 1},
			"data_bytes":   bson.M{"$sum": "$data_byte_count"},
			"rssi_values":  bson.M{"$push": "$rssi"},
		}},
		{"$limit": 500},
	}

	cursor, err := deviceEvents.Aggregate(ctx, deviceMetricsPipeline)
	if err == nil {
		defer cursor.Close(ctx)

		for cursor.Next(ctx) {
			var result bson.M
			if err := cursor.Decode(&result); err != nil {
				continue
			}

			rssiValues := extractIntSlice(result["rssi_values"])
			metric := DeviceMetric{
				MACAddress:  asString(result["_id"]),
				PacketCount: asInt(result["packet_count"]),
				DataBytes:   asInt64(result["data_bytes"]),
				Connected:   asBool(result["connected"]),
				Vendor:      asString(result["vendor"]),
			}

			if len(rssiValues) > 0 {
				metric.RSSIAvg, metric.RSSIMin, metric.RSSIMax = calculateRSSIStats(rssiValues)
			}

			snapshot.DeviceMetrics = append(snapshot.DeviceMetrics, metric)
		}
	}

	// Aggregate per-AP metrics from recent events
	apMetricsPipeline := []bson.M{
		{"$match": bson.M{"timestamp": bson.M{"$gte": activeCutoff}}},
		{"$group": bson.M{
			"_id":          "$bssid",
			"ssid":         bson.M{"$last": "$ssid"},
			"channel":      bson.M{"$last": "$channel"},
			"beacon_count": bson.M{"$sum": 1},
			"rssi_values":  bson.M{"$push": "$rssi"},
		}},
		{"$limit": 500},
	}

	cursor, err = apEvents.Aggregate(ctx, apMetricsPipeline)
	if err == nil {
		defer cursor.Close(ctx)

		for cursor.Next(ctx) {
			var result bson.M
			if err := cursor.Decode(&result); err != nil {
				continue
			}

			rssiValues := extractIntSlice(result["rssi_values"])
			metric := APMetric{
				BSSID:       asString(result["_id"]),
				SSID:        asString(result["ssid"]),
				Channel:     asInt(result["channel"]),
				BeaconCount: asInt(result["beacon_count"]),
			}

			if len(rssiValues) > 0 {
				metric.RSSIAvg, metric.RSSIMin, metric.RSSIMax = calculateRSSIStats(rssiValues)
			}

			snapshot.APMetrics = append(snapshot.APMetrics, metric)
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

func asString(value interface{}) string {
	if value == nil {
		return ""
	}
	if str, ok := value.(string); ok {
		return str
	}
	return ""
}

func asInt(value interface{}) int {
	switch v := value.(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	default:
		return 0
	}
}

func asInt64(value interface{}) int64 {
	switch v := value.(type) {
	case int64:
		return v
	case int32:
		return int64(v)
	case int:
		return int64(v)
	case float64:
		return int64(v)
	default:
		return 0
	}
}

func asBool(value interface{}) bool {
	if b, ok := value.(bool); ok {
		return b
	}
	return false
}

func extractIntSlice(value interface{}) []int {
	raw, ok := value.([]interface{})
	if !ok {
		return nil
	}
	result := make([]int, 0, len(raw))
	for _, item := range raw {
		result = append(result, asInt(item))
	}
	return result
}
