package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

// QueryExecuteRequest represents the request body for executing a MongoDB query
type QueryExecuteRequest struct {
	Collection string `json:"collection" binding:"required"`
	Filter     string `json:"filter" binding:"required"`
	Limit      int    `json:"limit"`
	Skip       int    `json:"skip"`
}

// QueryExecuteResponse represents the response for a query execution
type QueryExecuteResponse struct {
	Results       []map[string]interface{} `json:"results"`
	Count         int                      `json:"count"`
	ExecutionTime int64                    `json:"executionTime"` // in milliseconds
	Collection    string                   `json:"collection"`
	Warning       string                   `json:"warning,omitempty"`
}

// dangerousOperators are MongoDB operators that can execute code or modify data
var dangerousOperators = []string{
	"$where",
	"$function",
	"mapReduce",
	"$accumulator",
	"$expr",    // Can be dangerous with $function
	"eval",     // Legacy but block it
	"Function", // JavaScript function constructors
}

// writeOperations are operations that modify data (blocked for safety)
var writeOperations = []string{
	"$set",
	"$unset",
	"$inc",
	"$mul",
	"$rename",
	"$setOnInsert",
	"$push",
	"$pull",
	"$addToSet",
	"$pop",
	"$currentDate",
}

// validateFilter checks if the filter contains dangerous operations
func validateFilter(filterStr string) error {
	lowerFilter := strings.ToLower(filterStr)

	// Check for dangerous operators
	for _, op := range dangerousOperators {
		if strings.Contains(lowerFilter, strings.ToLower(op)) {
			return fmt.Errorf("dangerous operator '%s' is not allowed", op)
		}
	}

	// Check for write operations
	for _, op := range writeOperations {
		if strings.Contains(lowerFilter, strings.ToLower(op)) {
			return fmt.Errorf("write operator '%s' is not allowed - only read queries permitted", op)
		}
	}

	// Check for JavaScript keywords that could be dangerous
	jsKeywords := []string{"function", "eval", "new function", "constructor"}
	for _, kw := range jsKeywords {
		if strings.Contains(lowerFilter, kw) {
			return fmt.Errorf("JavaScript code execution is not allowed")
		}
	}

	return nil
}

// parseFilter safely parses a MongoDB filter string into a BSON document
func parseFilter(filterStr string) (bson.M, error) {
	// First validate for dangerous content
	if err := validateFilter(filterStr); err != nil {
		return nil, err
	}

	// Try to parse as JSON into bson.M
	var filter bson.M
	if err := json.Unmarshal([]byte(filterStr), &filter); err != nil {
		return nil, fmt.Errorf("invalid filter JSON: %v", err)
	}

	// Additional validation: recursively check the parsed BSON for dangerous operators
	if err := validateBSONDocument(filter); err != nil {
		return nil, err
	}

	return filter, nil
}

// validateBSONDocument recursively validates a BSON document for dangerous operations
func validateBSONDocument(doc interface{}) error {
	switch v := doc.(type) {
	case map[string]interface{}:
		for key, value := range v {
			// Check if key is a dangerous operator
			for _, op := range append(dangerousOperators, writeOperations...) {
				if strings.EqualFold(key, op) {
					return fmt.Errorf("operator '%s' is not allowed", key)
				}
			}
			// Recursively validate nested documents
			if err := validateBSONDocument(value); err != nil {
				return err
			}
		}
	case []interface{}:
		for _, item := range v {
			if err := validateBSONDocument(item); err != nil {
				return err
			}
		}
	}
	return nil
}

// executeQuery handles POST /api/query/execute
// @Summary Execute a MongoDB read query
// @Description Execute a custom MongoDB filter query on a specified collection (read-only)
// @Tags query
// @Accept json
// @Produce json
// @Param query body QueryExecuteRequest true "Query parameters"
// @Success 200 {object} QueryExecuteResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/query/execute [post]
func executeQuery(c *gin.Context) {
	var req QueryExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate collection name (whitelist approach)
	allowedCollections := map[string]bool{
		"device_events":       true,
		"access_point_events": true,
		"devices":             true,
		"access_points":       true,
		"metrics_1m":          true,
		"metrics_5m":          true,
		"metrics_1h":          true,
		"channel_config":      true,
	}

	if !allowedCollections[req.Collection] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("collection '%s' is not allowed. Allowed: device_events, access_point_events, devices, access_points, metrics_*", req.Collection),
		})
		return
	}

	// Parse and validate filter
	filter, err := parseFilter(req.Filter)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid filter: %v", err)})
		return
	}

	// Set default limit if not provided
	if req.Limit == 0 {
		req.Limit = 100
	}

	// Cap maximum limit to prevent DoS
	if req.Limit > 1000 {
		req.Limit = 1000
	}

	// Track execution time
	startTime := time.Now()

	// Execute query with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Build find options
	findOptions := bson.M{}
	if req.Limit > 0 {
		findOptions["limit"] = req.Limit
	}
	if req.Skip > 0 {
		findOptions["skip"] = req.Skip
	}

	// Execute the find query
	collection := db.Collection(req.Collection)
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Query execution failed: %v", err)})
		return
	}
	defer cursor.Close(ctx)

	// Decode results
	var results []map[string]interface{}
	if err := cursor.All(ctx, &results); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to decode results: %v", err)})
		return
	}

	// If no results, return empty array instead of nil
	if results == nil {
		results = []map[string]interface{}{}
	}

	executionTime := time.Since(startTime).Milliseconds()

	// Build response
	response := QueryExecuteResponse{
		Results:       results,
		Count:         len(results),
		ExecutionTime: executionTime,
		Collection:    req.Collection,
	}

	// Add warning if we hit the limit
	if len(results) == req.Limit {
		response.Warning = fmt.Sprintf("Result set limited to %d documents. Use skip/limit for pagination.", req.Limit)
	}

	c.JSON(http.StatusOK, response)
}
