package main

import (
	"os"
	"strconv"
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
