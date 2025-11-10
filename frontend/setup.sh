#!/bin/bash

# Flux Frontend Development Setup Script

echo " Setting up Flux Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo " Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo " Node.js version: $(node --version)"

# Navigate to frontend directory
cd "$(dirname "$0")"

# Install dependencies
echo " Installing dependencies..."
npm install

# Check if backend is running
echo " Checking if backend API is running on port 8080..."
if curl -s http://localhost:8080/stats > /dev/null 2>&1; then
    echo "✅ Backend API is running"
else
    echo "  Warning: Backend API doesn't seem to be running on port 8080"
    echo "   Start it with: docker-compose up -d api"
fi

echo ""
echo " Setup complete!"
echo ""
echo " Available commands:"
echo "   npm run dev      - Start development server (http://localhost:3000)"
echo "   npm run build    - Build for production"
echo "   npm run preview  - Preview production build"
echo ""
echo " To start developing, run: npm run dev"
