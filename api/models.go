package main

import "time"

// DeviceEvent represents a single WiFi device detection event
type DeviceEvent struct {
	ID               string    `bson:"_id,omitempty" json:"id,omitempty"`
	Timestamp        time.Time `bson:"timestamp" json:"timestamp"`
	MACAddress       string    `bson:"mac_address" json:"mac_address"`
	EventType        string    `bson:"event_type" json:"event_type"` // "probe", "connection", "disconnection", "data"
	RSSI             int       `bson:"rssi" json:"rssi"`
	ProbeSSID        string    `bson:"probe_ssid,omitempty" json:"probe_ssid,omitempty"`
	Vendor           string    `bson:"vendor,omitempty" json:"vendor,omitempty"`
	Connected        bool      `bson:"connected" json:"connected"`
	BSSID            string    `bson:"bssid,omitempty" json:"bssid,omitempty"`
	DataFrameCount   int       `bson:"data_frame_count,omitempty" json:"data_frame_count,omitempty"`
	DataByteCount    int64     `bson:"data_byte_count,omitempty" json:"data_byte_count,omitempty"`
}

// AccessPointEvent represents a single WiFi access point detection event
type AccessPointEvent struct {
	ID         string    `bson:"_id,omitempty" json:"id,omitempty"`
	Timestamp  time.Time `bson:"timestamp" json:"timestamp"`
	BSSID      string    `bson:"bssid" json:"bssid"`
	EventType  string    `bson:"event_type" json:"event_type"` // "beacon"
	SSID       string    `bson:"ssid" json:"ssid"`
	Channel    int       `bson:"channel" json:"channel"`
	RSSI       int       `bson:"rssi" json:"rssi"`
	Encryption string    `bson:"encryption,omitempty" json:"encryption,omitempty"`
}

// Device represents aggregated device data (computed from events)
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

// AccessPoint represents aggregated access point data (computed from events)
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

// Stats represents aggregate statistics about devices and access points
type Stats struct {
	TotalDevices  int `json:"total_devices"`
	TotalAPs      int `json:"total_aps"`
	ActiveDevices int `json:"active_devices"`
	ActiveAPs     int `json:"active_aps"`
}

// DeviceMetric represents aggregated metrics for a device over a time period
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

// APMetric represents aggregated metrics for an access point over a time period
type APMetric struct {
	BSSID       string  `bson:"bssid" json:"bssid"`
	SSID        string  `bson:"ssid" json:"ssid"`
	RSSIAvg     float64 `bson:"rssi_avg" json:"rssi_avg"`
	RSSIMin     int     `bson:"rssi_min" json:"rssi_min"`
	RSSIMax     int     `bson:"rssi_max" json:"rssi_max"`
	BeaconCount int     `bson:"beacon_count" json:"beacon_count"`
	Channel     int     `bson:"channel" json:"channel"`
}

// MetricsSnapshot represents a time-series snapshot of system metrics
// Used for multi-granularity historical data storage
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

// ChannelHoppingConfig represents the channel hopping configuration
type ChannelHoppingConfig struct {
	Enabled     bool      `json:"enabled"`
	TimeoutMs   int       `json:"timeout_ms"` // Timeout in milliseconds
	Channels    []int     `json:"channels"`   // List of channels to hop (e.g. [1, 6, 11])
	LastUpdated time.Time `json:"last_updated"`
}
