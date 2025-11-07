package main

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

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
		Timestamp time.Time    `json:"timestamp"`
		Metric    DeviceMetric `json:"metric"`
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
		Tier       string    `json:"tier"`
		Start      time.Time `json:"start"`
		End        time.Time `json:"end"`
		DataPoints int       `json:"data_points"`

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
