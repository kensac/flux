FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.21-alpine AS api-builder

WORKDIR /app
COPY api/go.mod ./
COPY api/*.go ./
RUN go mod tidy && go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o api .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy API binary
COPY --from=api-builder /app/api .

# Copy original static files (operations dashboard, swagger, etc)
COPY api/static ./static

# Copy built frontend (will be served from /app or / route)
COPY --from=frontend-builder /app/frontend/dist ./static/app

EXPOSE 8080
CMD ["./api"]
