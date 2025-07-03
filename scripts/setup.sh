#!/bin/bash

# Multi-Diagram Viewer Setup Script

echo "🚀 Setting up Multi-Diagram Viewer..."

# Create diagrams directory
echo "📁 Creating diagrams directory..."
mkdir -p diagrams

# Backend setup
echo "🐍 Setting up Python backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

cd ..

# Frontend setup
echo "⚛️ Setting up React frontend..."
cd frontend

echo "Installing Node.js dependencies..."
npm install

cd ..

echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "1. Backend: cd backend && source venv/bin/activate && python main.py"
echo "2. Frontend: cd frontend && npm start"
echo ""
echo "Or use Docker: docker-compose up --build"
echo ""
echo "Add your diagram files (SVG, PNG, JPG) to the diagrams/ directory" 