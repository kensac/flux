package main

// swagger:route GET /stats stats getStats
//
// Get aggregate statistics
//
// Returns total and active counts for devices and access points
//
// Produces:
// - application/json
//
// Responses:
//   200: statsResponse
//   500: errorResponse

// swagger:route GET /devices devices listDevices
//
// List all devices
//
// Returns a list of all detected WiFi devices, sorted by last seen
//
// Produces:
// - application/json
//
// Parameters:
//   + name: limit
//     in: query
//     description: Maximum number of devices to return
//     required: false
//     type: integer
//     default: 100
//
// Responses:
//   200: devicesResponse
//   500: errorResponse

// swagger:route GET /devices/active devices getActiveDevices
//
// Get active devices
//
// Returns devices that have been seen recently within the specified time window
//
// Produces:
// - application/json
//
// Parameters:
//   + name: minutes
//     in: query
//     description: Time window in minutes
//     required: false
//     type: integer
//     default: 5
//
// Responses:
//   200: devicesResponse
//   500: errorResponse

// swagger:route POST /ingest/device ingest ingestDevice
//
// Ingest device data
//
// Records a detected WiFi device probe or packet
//
// Consumes:
// - application/json
//
// Produces:
// - application/json
//
// Parameters:
//   + name: body
//     in: body
//     description: Device data
//     required: true
//     schema:
//       type: object
//       required:
//         - mac_address
//       properties:
//         mac_address:
//           type: string
//           example: "aa:bb:cc:dd:ee:ff"
//         rssi:
//           type: integer
//           example: -65
//         probe_ssid:
//           type: string
//           example: "MyWiFi"
//         vendor:
//           type: string
//           example: "Apple Inc"
//
// Responses:
//   200: okResponse
//   400: errorResponse
//   500: errorResponse

// swagger:route GET /access-points accessPoints listAccessPoints
//
// List access points
//
// Returns a list of all detected WiFi access points
//
// Produces:
// - application/json
//
// Parameters:
//   + name: limit
//     in: query
//     description: Maximum number of APs to return
//     required: false
//     type: integer
//     default: 100
//
// Responses:
//   200: accessPointsResponse
//   500: errorResponse

// swagger:route GET /config/channel-hopping config getChannelConfig
//
// Get channel hopping configuration
//
// Returns the current channel hopping settings
//
// Produces:
// - application/json
//
// Responses:
//   200: channelConfigResponse
//   500: errorResponse

// swagger:route PUT /config/channel-hopping config updateChannelConfig
//
// Update channel hopping configuration
//
// Updates the channel hopping settings (stored in MongoDB)
//
// Consumes:
// - application/json
//
// Produces:
// - application/json
//
// Parameters:
//   + name: body
//     in: body
//     description: Channel hopping config
//     required: true
//     schema:
//       type: object
//       required:
//         - enabled
//         - timeout_ms
//       properties:
//         enabled:
//           type: boolean
//           example: true
//         timeout_ms:
//           type: integer
//           minimum: 50
//           maximum: 10000
//           example: 300
//
// Responses:
//   200: channelConfigUpdateResponse
//   400: errorResponse
//   500: errorResponse

// swagger:route GET /metrics/history metrics getMetricsHistory
//
// Get historical metrics
//
// Returns time-series snapshots of occupancy and system metrics
//
// Produces:
// - application/json
//
// Parameters:
//   + name: tier
//     in: query
//     description: Time granularity (1m, 5m, 1h)
//     required: false
//     type: string
//     default: "1h"
//   + name: start
//     in: query
//     description: Start timestamp (ISO8601)
//     required: false
//     type: string
//   + name: end
//     in: query
//     description: End timestamp (ISO8601)
//     required: false
//     type: string
//   + name: limit
//     in: query
//     description: Maximum snapshots to return
//     required: false
//     type: integer
//     default: 100
//
// Responses:
//   200: metricsHistoryResponse
//   500: errorResponse

// swagger:route GET /metrics/summary metrics getMetricsSummary
//
// Get metrics summary
//
// Returns aggregated statistics over a time period
//
// Produces:
// - application/json
//
// Parameters:
//   + name: tier
//     in: query
//     description: Time granularity (1m, 5m, 1h)
//     required: false
//     type: string
//     default: "1h"
//   + name: start
//     in: query
//     description: Start timestamp (ISO8601)
//     required: false
//     type: string
//   + name: end
//     in: query
//     description: End timestamp (ISO8601)
//     required: false
//     type: string
//
// Responses:
//   200: metricsSummaryResponse
//   500: errorResponse

// Response models

// swagger:response statsResponse
type statsResponseWrapper struct {
	// in: body
	Body Stats
}

// swagger:response devicesResponse
type devicesResponseWrapper struct {
	// in: body
	Body []Device
}

// swagger:response accessPointsResponse
type accessPointsResponseWrapper struct {
	// in: body
	Body []AccessPoint
}

// swagger:response channelConfigResponse
type channelConfigResponseWrapper struct {
	// in: body
	Body ChannelHoppingConfig
}

// swagger:response channelConfigUpdateResponse
type channelConfigUpdateResponseWrapper struct {
	// in: body
	Body struct {
		Status string               `json:"status"`
		Config ChannelHoppingConfig `json:"config"`
	}
}

// swagger:response metricsHistoryResponse
type metricsHistoryResponseWrapper struct {
	// in: body
	Body struct {
		Snapshots []MetricsSnapshot `json:"snapshots"`
	}
}

// swagger:response metricsSummaryResponse
type metricsSummaryResponseWrapper struct {
	// in: body
	Body struct {
		DataPoints   int `json:"data_points"`
		Devices      struct {
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
	}
}

// swagger:response okResponse
type okResponseWrapper struct {
	// in: body
	Body struct {
		Status string `json:"status"`
	}
}

// swagger:response errorResponse
type errorResponseWrapper struct {
	// in: body
	Body struct {
		Error string `json:"error"`
	}
}
