package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
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
	TotalDevices  int `json:"total_devices"`
	TotalAPs      int `json:"total_aps"`
	ActiveDevices int `json:"active_devices"`
	ActiveAPs     int `json:"active_aps"`
}

type DeviceSample struct {
	MACAddress string    `bson:"mac_address" json:"mac_address"`
	Timestamp  time.Time `bson:"timestamp" json:"timestamp"`
	RSSI       int       `bson:"rssi" json:"rssi"`
	ProbeSSID  string    `bson:"probe_ssid,omitempty" json:"probe_ssid,omitempty"`
	Vendor     string    `bson:"vendor,omitempty" json:"vendor,omitempty"`
}

type AccessPointSample struct {
	BSSID     string    `bson:"bssid" json:"bssid"`
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
	RSSI      int       `bson:"rssi" json:"rssi"`
	Channel   int       `bson:"channel" json:"channel"`
	SSID      string    `bson:"ssid,omitempty" json:"ssid,omitempty"`
}

type DeviceHistoryPoint struct {
	MACAddress  string    `json:"mac_address"`
	WindowStart time.Time `json:"window_start"`
	WindowEnd   time.Time `json:"window_end"`
	AvgRSSI     float64   `json:"avg_rssi"`
	MinRSSI     int       `json:"min_rssi"`
	MaxRSSI     int       `json:"max_rssi"`
	SampleCount int       `json:"sample_count"`
	ProbeSSIDs  []string  `json:"probe_ssids,omitempty"`
}

type AccessPointHistoryPoint struct {
	BSSID       string    `json:"bssid"`
	WindowStart time.Time `json:"window_start"`
	WindowEnd   time.Time `json:"window_end"`
	AvgRSSI     float64   `json:"avg_rssi"`
	MinRSSI     int       `json:"min_rssi"`
	MaxRSSI     int       `json:"max_rssi"`
	SampleCount int       `json:"sample_count"`
}

var (
	db *mongo.Database
)

const (
	deviceSamplesCollection       = "device_samples"
	deviceSamples5mCollection     = "device_samples_5m"
	deviceSamplesHourlyCollection = "device_samples_hourly"
	apSamplesCollection           = "ap_samples"
	apSamples5mCollection         = "ap_samples_5m"
	apSamplesHourlyCollection     = "ap_samples_hourly"
	rawSampleRetention            = time.Hour
	fiveMinuteRetention           = 7 * 24 * time.Hour
	hourlyRetention               = 90 * 24 * time.Hour
)

type windowConfig struct {
	duration   time.Duration
	collection string
}

type aggregationState struct {
	mu            sync.Mutex
	lastProcessed map[string]time.Time
}

func (s *aggregationState) getLastProcessed(ctx context.Context, collection string) (time.Time, error) {
	s.mu.Lock()
	last, ok := s.lastProcessed[collection]
	s.mu.Unlock()
	if ok && !last.IsZero() {
		return last, nil
	}

	opts := options.FindOne().SetSort(bson.D{{Key: "window_end", Value: -1}})
	var doc struct {
		WindowEnd time.Time `bson:"window_end"`
	}

	err := db.Collection(collection).FindOne(ctx, bson.M{}, opts).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return time.Time{}, nil
		}
		return time.Time{}, err
	}

	s.mu.Lock()
	s.lastProcessed[collection] = doc.WindowEnd
	s.mu.Unlock()
	return doc.WindowEnd, nil
}

func (s *aggregationState) setLastProcessed(collection string, t time.Time) {
	s.mu.Lock()
	s.lastProcessed[collection] = t
	s.mu.Unlock()
}

var (
	deviceWindows = []windowConfig{
		{duration: 5 * time.Minute, collection: deviceSamples5mCollection},
		{duration: time.Hour, collection: deviceSamplesHourlyCollection},
	}
	apWindows = []windowConfig{
		{duration: 5 * time.Minute, collection: apSamples5mCollection},
		{duration: time.Hour, collection: apSamplesHourlyCollection},
	}
	deviceAggregationState = aggregationState{lastProcessed: make(map[string]time.Time)}
	apAggregationState     = aggregationState{lastProcessed: make(map[string]time.Time)}
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

	aggCtx, aggCancel := context.WithCancel(context.Background())
	defer aggCancel()
	startAggregationWorkers(aggCtx)

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
	r.GET("/devices/history", getDeviceHistory)
	r.GET("/access-points/history", getAccessPointHistory)

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

	now := time.Now().UTC()

	filter := bson.M{"mac_address": req.MACAddress}

	setFields := bson.M{"last_seen": now}
	if req.Vendor != "" {
		setFields["vendor"] = req.Vendor
	}

	update := bson.M{
		"$set": setFields,
		"$setOnInsert": bson.M{
			"first_seen": now,
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

	if err := recordDeviceSample(req.MACAddress, req.RSSI, req.ProbeSSID, req.Vendor, now); err != nil {
		log.Printf("Device sample insert error: %v", err)
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

	now := time.Now().UTC()

	filter := bson.M{"bssid": req.BSSID}
	update := bson.M{
		"$set": bson.M{
			"last_seen": now,
			"ssid":      req.SSID,
			"channel":   req.Channel,
		},
		"$setOnInsert": bson.M{
			"first_seen": now,
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

	if err := recordAccessPointSample(req.BSSID, req.RSSI, req.Channel, req.SSID, now); err != nil {
		log.Printf("AP sample insert error: %v", err)
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

func recordDeviceSample(mac string, rssi int, probeSSID, vendor string, ts time.Time) error {
	sample := DeviceSample{
		MACAddress: mac,
		Timestamp:  ts,
		RSSI:       rssi,
	}
	if probeSSID != "" {
		sample.ProbeSSID = probeSSID
	}
	if vendor != "" {
		sample.Vendor = vendor
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := db.Collection(deviceSamplesCollection).InsertOne(ctx, sample)
	return err
}

func recordAccessPointSample(bssid string, rssi, channel int, ssid string, ts time.Time) error {
	sample := AccessPointSample{
		BSSID:     bssid,
		Timestamp: ts,
		RSSI:      rssi,
		Channel:   channel,
	}
	if ssid != "" {
		sample.SSID = ssid
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := db.Collection(apSamplesCollection).InsertOne(ctx, sample)
	return err
}

func startAggregationWorkers(ctx context.Context) {
	go runAggregationLoop(ctx, deviceWindows, &deviceAggregationState, aggregateDeviceSamplesWindow, purgeDeviceSamples)
	go runAggregationLoop(ctx, apWindows, &apAggregationState, aggregateAccessPointSamplesWindow, purgeAccessPointSamples)
}

func runAggregationLoop(ctx context.Context, windows []windowConfig, state *aggregationState, aggregate func(context.Context, time.Time, time.Time, string) error, purge func(context.Context) error) {
	runAggregation(ctx, windows, state, aggregate, purge)

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			runAggregation(ctx, windows, state, aggregate, purge)
		case <-ctx.Done():
			return
		}
	}
}

func runAggregation(ctx context.Context, windows []windowConfig, state *aggregationState, aggregate func(context.Context, time.Time, time.Time, string) error, purge func(context.Context) error) {
	for _, cfg := range windows {
		processAggregationWindow(ctx, cfg, state, aggregate)
	}

	if purge != nil {
		if err := purge(ctx); err != nil {
			log.Printf("aggregation purge error: %v", err)
		}
	}
}

func processAggregationWindow(ctx context.Context, cfg windowConfig, state *aggregationState, aggregate func(context.Context, time.Time, time.Time, string) error) {
	now := time.Now().UTC()
	targetEnd := now.Truncate(cfg.duration)
	if targetEnd.IsZero() {
		return
	}

	queryCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	lastProcessed, err := state.getLastProcessed(queryCtx, cfg.collection)
	cancel()
	if err != nil {
		log.Printf("aggregation state load error (%s): %v", cfg.collection, err)
		return
	}

	if lastProcessed.IsZero() {
		lastProcessed = targetEnd.Add(-cfg.duration)
	}

	for nextEnd := lastProcessed.Add(cfg.duration); !nextEnd.After(targetEnd); nextEnd = nextEnd.Add(cfg.duration) {
		start := nextEnd.Add(-cfg.duration)
		aggCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		if err := aggregate(aggCtx, start, nextEnd, cfg.collection); err != nil {
			cancel()
			log.Printf("aggregation window error (%s): %v", cfg.collection, err)
			return
		}
		cancel()
		state.setLastProcessed(cfg.collection, nextEnd)
	}
}

func aggregateDeviceSamplesWindow(ctx context.Context, start, end time.Time, destCollection string) error {
	raw := db.Collection(deviceSamplesCollection)
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"timestamp": bson.M{
				"$gte": start,
				"$lt":  end,
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"mac_address": "$mac_address",
			},
			"avg_rssi":     bson.M{"$avg": "$rssi"},
			"min_rssi":     bson.M{"$min": "$rssi"},
			"max_rssi":     bson.M{"$max": "$rssi"},
			"sample_count": bson.M{"$sum": 1},
			"probe_ssids":  bson.M{"$addToSet": "$probe_ssid"},
		}}},
	}

	cursor, err := raw.Aggregate(ctx, pipeline)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	dest := db.Collection(destCollection)
	for cursor.Next(ctx) {
		var result struct {
			ID struct {
				MACAddress string `bson:"mac_address"`
			} `bson:"_id"`
			AvgRSSI     float64       `bson:"avg_rssi"`
			MinRSSI     int           `bson:"min_rssi"`
			MaxRSSI     int           `bson:"max_rssi"`
			SampleCount int           `bson:"sample_count"`
			ProbeSSIDs  []interface{} `bson:"probe_ssids"`
		}

		if err := cursor.Decode(&result); err != nil {
			return err
		}

		if result.SampleCount == 0 {
			continue
		}

		probeSet := make([]string, 0, len(result.ProbeSSIDs))
		for _, v := range result.ProbeSSIDs {
			if ssid, ok := v.(string); ok && ssid != "" {
				probeSet = append(probeSet, ssid)
			}
		}

		filter := bson.M{
			"mac_address":  result.ID.MACAddress,
			"window_start": start,
		}
		update := bson.M{
			"$set": bson.M{
				"mac_address":  result.ID.MACAddress,
				"window_start": start,
				"window_end":   end,
				"avg_rssi":     result.AvgRSSI,
				"min_rssi":     result.MinRSSI,
				"max_rssi":     result.MaxRSSI,
				"sample_count": result.SampleCount,
				"probe_ssids":  probeSet,
			},
		}

		opts := options.Update().SetUpsert(true)
		if _, err := dest.UpdateOne(ctx, filter, update, opts); err != nil {
			return err
		}
	}

	return cursor.Err()
}

func aggregateAccessPointSamplesWindow(ctx context.Context, start, end time.Time, destCollection string) error {
	raw := db.Collection(apSamplesCollection)
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"timestamp": bson.M{
				"$gte": start,
				"$lt":  end,
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"bssid": "$bssid",
			},
			"avg_rssi":     bson.M{"$avg": "$rssi"},
			"min_rssi":     bson.M{"$min": "$rssi"},
			"max_rssi":     bson.M{"$max": "$rssi"},
			"sample_count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := raw.Aggregate(ctx, pipeline)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	dest := db.Collection(destCollection)
	for cursor.Next(ctx) {
		var result struct {
			ID struct {
				BSSID string `bson:"bssid"`
			} `bson:"_id"`
			AvgRSSI     float64 `bson:"avg_rssi"`
			MinRSSI     int     `bson:"min_rssi"`
			MaxRSSI     int     `bson:"max_rssi"`
			SampleCount int     `bson:"sample_count"`
		}

		if err := cursor.Decode(&result); err != nil {
			return err
		}

		if result.SampleCount == 0 {
			continue
		}

		filter := bson.M{
			"bssid":        result.ID.BSSID,
			"window_start": start,
		}
		update := bson.M{
			"$set": bson.M{
				"bssid":        result.ID.BSSID,
				"window_start": start,
				"window_end":   end,
				"avg_rssi":     result.AvgRSSI,
				"min_rssi":     result.MinRSSI,
				"max_rssi":     result.MaxRSSI,
				"sample_count": result.SampleCount,
			},
		}

		opts := options.Update().SetUpsert(true)
		if _, err := dest.UpdateOne(ctx, filter, update, opts); err != nil {
			return err
		}
	}

	return cursor.Err()
}

func purgeDeviceSamples(ctx context.Context) error {
	now := time.Now().UTC()
	if err := purgeCollectionBefore(ctx, deviceSamplesCollection, "timestamp", now.Add(-rawSampleRetention)); err != nil {
		return err
	}
	if err := purgeCollectionBefore(ctx, deviceSamples5mCollection, "window_end", now.Add(-fiveMinuteRetention)); err != nil {
		return err
	}
	return purgeCollectionBefore(ctx, deviceSamplesHourlyCollection, "window_end", now.Add(-hourlyRetention))
}

func purgeAccessPointSamples(ctx context.Context) error {
	now := time.Now().UTC()
	if err := purgeCollectionBefore(ctx, apSamplesCollection, "timestamp", now.Add(-rawSampleRetention)); err != nil {
		return err
	}
	if err := purgeCollectionBefore(ctx, apSamples5mCollection, "window_end", now.Add(-fiveMinuteRetention)); err != nil {
		return err
	}
	return purgeCollectionBefore(ctx, apSamplesHourlyCollection, "window_end", now.Add(-hourlyRetention))
}

func purgeCollectionBefore(ctx context.Context, collection, field string, cutoff time.Time) error {
	purgeCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	_, err := db.Collection(collection).DeleteMany(purgeCtx, bson.M{field: bson.M{"$lt": cutoff}})
	return err
}

func getDeviceHistory(c *gin.Context) {
	mac := c.Query("mac_address")
	if mac == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "mac_address is required"})
		return
	}

	start, end, err := parseTimeRange(c.Query("start"), c.Query("end"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	collection := chooseDeviceHistoryCollection(start, end)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	points, err := fetchDeviceHistory(ctx, mac, start, end, collection)
	if err != nil {
		log.Printf("device history error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"collection": collection, "points": points})
}

func getAccessPointHistory(c *gin.Context) {
	bssid := c.Query("bssid")
	if bssid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bssid is required"})
		return
	}

	start, end, err := parseTimeRange(c.Query("start"), c.Query("end"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	collection := chooseAccessPointHistoryCollection(start, end)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	points, err := fetchAccessPointHistory(ctx, bssid, start, end, collection)
	if err != nil {
		log.Printf("ap history error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"collection": collection, "points": points})
}

func fetchDeviceHistory(ctx context.Context, mac string, start, end time.Time, collection string) ([]DeviceHistoryPoint, error) {
	switch collection {
	case deviceSamplesCollection:
		filter := bson.M{
			"mac_address": mac,
			"timestamp": bson.M{
				"$gte": start,
				"$lte": end,
			},
		}
		opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: 1}})
		cursor, err := db.Collection(collection).Find(ctx, filter, opts)
		if err != nil {
			return nil, err
		}
		defer cursor.Close(ctx)

		var points []DeviceHistoryPoint
		for cursor.Next(ctx) {
			var sample DeviceSample
			if err := cursor.Decode(&sample); err != nil {
				return nil, err
			}

			point := DeviceHistoryPoint{
				MACAddress:  sample.MACAddress,
				WindowStart: sample.Timestamp,
				WindowEnd:   sample.Timestamp,
				AvgRSSI:     float64(sample.RSSI),
				MinRSSI:     sample.RSSI,
				MaxRSSI:     sample.RSSI,
				SampleCount: 1,
			}
			if sample.ProbeSSID != "" {
				point.ProbeSSIDs = []string{sample.ProbeSSID}
			}
			points = append(points, point)
		}

		if err := cursor.Err(); err != nil {
			return nil, err
		}

		return points, nil
	case deviceSamples5mCollection, deviceSamplesHourlyCollection:
		filter := bson.M{
			"mac_address":  mac,
			"window_start": bson.M{"$lt": end},
			"window_end":   bson.M{"$gt": start},
		}
		opts := options.Find().SetSort(bson.D{{Key: "window_start", Value: 1}})
		cursor, err := db.Collection(collection).Find(ctx, filter, opts)
		if err != nil {
			return nil, err
		}
		defer cursor.Close(ctx)

		var points []DeviceHistoryPoint
		for cursor.Next(ctx) {
			var doc struct {
				MACAddress  string    `bson:"mac_address"`
				WindowStart time.Time `bson:"window_start"`
				WindowEnd   time.Time `bson:"window_end"`
				AvgRSSI     float64   `bson:"avg_rssi"`
				MinRSSI     int       `bson:"min_rssi"`
				MaxRSSI     int       `bson:"max_rssi"`
				SampleCount int       `bson:"sample_count"`
				ProbeSSIDs  []string  `bson:"probe_ssids"`
			}

			if err := cursor.Decode(&doc); err != nil {
				return nil, err
			}

			points = append(points, DeviceHistoryPoint{
				MACAddress:  doc.MACAddress,
				WindowStart: doc.WindowStart,
				WindowEnd:   doc.WindowEnd,
				AvgRSSI:     doc.AvgRSSI,
				MinRSSI:     doc.MinRSSI,
				MaxRSSI:     doc.MaxRSSI,
				SampleCount: doc.SampleCount,
				ProbeSSIDs:  doc.ProbeSSIDs,
			})
		}

		if err := cursor.Err(); err != nil {
			return nil, err
		}

		return points, nil
	default:
		return nil, fmt.Errorf("unsupported collection %s", collection)
	}
}

func fetchAccessPointHistory(ctx context.Context, bssid string, start, end time.Time, collection string) ([]AccessPointHistoryPoint, error) {
	switch collection {
	case apSamplesCollection:
		filter := bson.M{
			"bssid": bssid,
			"timestamp": bson.M{
				"$gte": start,
				"$lte": end,
			},
		}
		opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: 1}})
		cursor, err := db.Collection(collection).Find(ctx, filter, opts)
		if err != nil {
			return nil, err
		}
		defer cursor.Close(ctx)

		var points []AccessPointHistoryPoint
		for cursor.Next(ctx) {
			var sample AccessPointSample
			if err := cursor.Decode(&sample); err != nil {
				return nil, err
			}

			points = append(points, AccessPointHistoryPoint{
				BSSID:       sample.BSSID,
				WindowStart: sample.Timestamp,
				WindowEnd:   sample.Timestamp,
				AvgRSSI:     float64(sample.RSSI),
				MinRSSI:     sample.RSSI,
				MaxRSSI:     sample.RSSI,
				SampleCount: 1,
			})
		}

		if err := cursor.Err(); err != nil {
			return nil, err
		}

		return points, nil
	case apSamples5mCollection, apSamplesHourlyCollection:
		filter := bson.M{
			"bssid":        bssid,
			"window_start": bson.M{"$lt": end},
			"window_end":   bson.M{"$gt": start},
		}
		opts := options.Find().SetSort(bson.D{{Key: "window_start", Value: 1}})
		cursor, err := db.Collection(collection).Find(ctx, filter, opts)
		if err != nil {
			return nil, err
		}
		defer cursor.Close(ctx)

		var points []AccessPointHistoryPoint
		for cursor.Next(ctx) {
			var doc AccessPointHistoryPoint
			if err := cursor.Decode(&doc); err != nil {
				return nil, err
			}
			points = append(points, doc)
		}

		if err := cursor.Err(); err != nil {
			return nil, err
		}

		return points, nil
	default:
		return nil, fmt.Errorf("unsupported collection %s", collection)
	}
}

func parseTimeRange(startParam, endParam string) (time.Time, time.Time, error) {
	now := time.Now().UTC()

	var end time.Time
	if endParam == "" {
		end = now
	} else {
		parsed, err := time.Parse(time.RFC3339, endParam)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid end time: %w", err)
		}
		end = parsed.UTC()
	}

	var start time.Time
	if startParam == "" {
		start = end.Add(-30 * time.Minute)
	} else {
		parsed, err := time.Parse(time.RFC3339, startParam)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid start time: %w", err)
		}
		start = parsed.UTC()
	}

	if !start.Before(end) {
		return time.Time{}, time.Time{}, errors.New("start must be before end")
	}

	return start, end, nil
}

func chooseDeviceHistoryCollection(start, end time.Time) string {
	duration := end.Sub(start)
	switch {
	case duration <= 30*time.Minute:
		return deviceSamplesCollection
	case duration <= 12*time.Hour:
		return deviceSamples5mCollection
	default:
		return deviceSamplesHourlyCollection
	}
}

func chooseAccessPointHistoryCollection(start, end time.Time) string {
	duration := end.Sub(start)
	switch {
	case duration <= 30*time.Minute:
		return apSamplesCollection
	case duration <= 12*time.Hour:
		return apSamples5mCollection
	default:
		return apSamplesHourlyCollection
	}
}
