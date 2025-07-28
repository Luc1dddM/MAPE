#!/bin/bash

# MAPE - Setup and Development Script
# This script helps you set up and run the MAPE application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or later is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    print_success "npm $(npm -v) is installed"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    # Copy environment file
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        print_warning "Please update the .env file with your Google AI API key"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    cd ..
    print_success "Backend setup complete"
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Copy environment file
    if [ ! -f .env.local ]; then
        print_status "Creating .env.local file from template..."
        cp .env.local.example .env.local
    fi
    
    cd ..
    print_success "Frontend setup complete"
}

# Start development servers
start_dev() {
    print_status "Starting development servers..."
    
    # Check if .env files exist
    if [ ! -f backend/.env ]; then
        print_error "Backend .env file not found. Please run './scripts/setup.sh' first."
        exit 1
    fi
    
    if [ ! -f frontend/.env.local ]; then
        print_error "Frontend .env.local file not found. Please run './scripts/setup.sh' first."
        exit 1
    fi
    
    # Start backend in background
    print_status "Starting backend server on port 3001..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    print_status "Starting frontend server on port 3000..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    print_success "Development servers started!"
    print_status "Backend: http://localhost:3001"
    print_status "Frontend: http://localhost:3000"
    print_status "Press Ctrl+C to stop both servers"
    
    # Wait for user interrupt
    trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT
    wait
}

# Build production
build_prod() {
    print_status "Building for production..."
    
    # Build backend
    print_status "Backend is ready for production (no build step required)"
    
    # Build frontend
    print_status "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    print_success "Production build complete"
}

# Start production servers
start_prod() {
    print_status "Starting production servers..."
    
    # Start backend
    print_status "Starting backend server..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend
    print_status "Starting frontend server..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    print_success "Production servers started!"
    print_status "Backend: http://localhost:3001"
    print_status "Frontend: http://localhost:3000"
    
    # Wait for user interrupt
    trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT
    wait
}

# Docker setup
docker_setup() {
    print_status "Setting up with Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Building and starting Docker containers..."
    docker-compose up --build -d
    
    print_success "Docker containers started!"
    print_status "Backend: http://localhost:3001"
    print_status "Frontend: http://localhost:3000"
    print_status "Redis: localhost:6379"
}

# Show usage
show_usage() {
    echo "MAPE - Automatic Prompt Engineer Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup      Setup both backend and frontend"
    echo "  dev        Start development servers"
    echo "  build      Build for production"
    echo "  start      Start production servers"
    echo "  docker     Setup and start with Docker"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup    # Initial setup"
    echo "  $0 dev      # Start development"
    echo "  $0 docker   # Run with Docker"
}

# Main script logic
main() {
    case "${1:-}" in
        "setup")
            check_node
            check_npm
            setup_backend
            setup_frontend
            print_success "Setup complete! Run '$0 dev' to start development servers."
            ;;
        "dev")
            check_node
            check_npm
            start_dev
            ;;
        "build")
            check_node
            check_npm
            build_prod
            ;;
        "start")
            check_node
            check_npm
            start_prod
            ;;
        "docker")
            docker_setup
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: ${1:-}"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
