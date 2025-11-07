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
