# Multi-Diagram Viewer

A modern web application for viewing and annotating multiple diagrams simultaneously. Built with React, Python FastAPI, and Docker.

## Features

- **Multi-Panel Viewing**: View up to 4 diagrams simultaneously in resizable panels
- **Interactive Annotations**: Add drawings, shapes, and text annotations to diagrams
- **Zoom and Pan**: Smooth zoom and pan controls with mouse wheel and right-click drag
- **Real-time Collaboration**: WebSocket support for real-time updates
- **Responsive Layout**: Dynamic panel resizing and responsive design
- **Modern UI**: Clean, compact interface optimized for diagram viewing

## Tech Stack

- **Frontend**: React, react-konva (for canvas-based annotations)
- **Backend**: Python FastAPI
- **Containerization**: Docker & Docker Compose
- **Real-time**: WebSocket communication

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd multi-diagram-viewer
```

2. Add your diagram images to the `diagrams/` directory

3. Build and run the application:
```bash
docker-compose up --build
```

4. Open your browser and navigate to `http://localhost:8000`

## Usage

### Adding Diagrams
- Use the dropdown menu to select diagrams from the available list
- Click "Add" to add them to the viewing panels
- You can add up to 4 diagrams simultaneously

### Navigation Controls
- **Mouse Wheel**: Zoom in/out on diagrams
- **Right-Click + Drag**: Pan around diagrams
- **Reset View**: Click the reset button to return to the original view

### Annotations
- **Pen Tool**: Draw freehand lines
- **Rectangle Tool**: Draw rectangles
- **Circle Tool**: Draw circles
- **Text Tool**: Add text annotations (click to place, then enter text)

### Panel Management
- **Resize Panels**: Drag the dividers between panels to resize them
- **Remove Panels**: Use the "Remove" button on each panel header

## Project Structure

```
multi-diagram-viewer/
├── backend/
│   ├── main.py              # FastAPI server
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application component
│   │   ├── components/
│   │   │   └── AnnotatedImageWithZoom.jsx  # Image viewer with annotations
│   │   └── index.js         # React entry point
│   ├── public/
│   └── package.json         # Node.js dependencies
├── diagrams/                # Place your diagram images here
├── docker-compose.yml       # Docker orchestration
├── Dockerfile              # Multi-stage Docker build
└── README.md               # This file
```

## Development

### Local Development Setup

1. **Frontend Development**:
```bash
cd frontend
npm install
npm start
```

2. **Backend Development**:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Building for Production

```bash
docker-compose up --build
```

## API Endpoints

- `GET /api/diagrams` - List available diagrams
- `GET /api/diagrams/{filename}` - Get a specific diagram
- `WebSocket /ws` - Real-time communication

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/) and [react-konva](https://konvajs.org/docs/react/)
- Backend powered by [FastAPI](https://fastapi.tiangolo.com/)
- Containerized with [Docker](https://www.docker.com/) 