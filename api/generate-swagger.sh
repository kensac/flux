#!/bin/bash
set -e

# Install swagger if not present
if ! command -v swagger &> /dev/null; then
    echo "Installing swagger..."
    go install github.com/go-swagger/go-swagger/cmd/swagger@latest
fi

# Generate swagger spec
echo "Generating swagger spec..."
swagger generate spec -o ./static/swagger.json --scan-models

echo "Swagger spec generated at ./static/swagger.json"
echo "You can view it at: http://localhost:8080/static/swagger.json"
echo "Or use Swagger UI at: https://petstore.swagger.io/?url=http://localhost:8080/static/swagger.json"
