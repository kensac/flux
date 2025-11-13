package main

import (
	"os"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// parseLimit parses a limit query parameter with a default value
// and enforces a maximum limit of 1000
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

// getEnv retrieves an environment variable with a fallback value
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// calculateRSSIStats computes average, min, and max RSSI from a slice of values
func calculateRSSIStats(values []int) (avg float64, min int, max int) {
	if len(values) == 0 {
		return 0, 0, 0
	}

	sum := 0
	min = values[0]
	max = values[0]

	for _, val := range values {
		sum += val
		if val < min {
			min = val
		}
		if val > max {
			max = val
		}
	}

	avg = float64(sum) / float64(len(values))
	return
}

// bsonToTime safely converts MongoDB temporal primitives into time.Time
func bsonToTime(value interface{}) (time.Time, bool) {
	switch v := value.(type) {
	case time.Time:
		return v, true
	case primitive.DateTime:
		return v.Time(), true
	case primitive.Timestamp:
		return time.Unix(int64(v.T), 0), true
	default:
		return time.Time{}, false
	}
}

// toInt safely converts numeric BSON types to int
func toInt(value interface{}) int {
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

// toInt64 safely converts numeric BSON types to int64
func toInt64(value interface{}) int64 {
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
