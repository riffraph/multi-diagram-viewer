# Multi-Diagram Viewer

A modern web application for viewing and annotating multiple diagrams simultaneously. Built with React, Node.js Express (TypeScript), and Docker.

## Features

- **Quadrant-Based Panel System**: View up to 4 diagrams simultaneously in a flexible 2x2 grid layout
- **Interactive Annotations**: Add drawings, shapes, and text annotations to diagrams with precise coordinate tracking
- **State Preservation**: Annotations, zoom, and pan state are preserved when adding/removing panels
- **Cross-Resizable Dividers**: Drag the intersection point to resize both horizontal and vertical panels simultaneously
- **Zoom and Pan**: Smooth zoom and pan controls with mouse wheel and right-click drag
- **Real-time Collaboration**: WebSocket support for real-time updates
- **Responsive Layout**: Dynamic panel resizing with horizontal expansion priority
- **Modern UI**: Clean, compact interface with static quadrant addition buttons
- **Export Functionality**: Export annotated diagrams as high-quality PNG files

## Tech Stack

- **Frontend**: React, react-konva (for canvas-based annotations)
- **Backend**: Node.js Express with TypeScript
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

### Panel Management
- **Quadrant Buttons**: Use the static buttons (top-left, top-right, bottom-left, bottom-right) to add diagrams to specific quadrants
- **Cross-Resizable Dividers**: Drag the intersection point to resize both horizontal and vertical panels simultaneously
- **Horizontal Expansion**: Single panels in a row automatically expand to fill available width
- **Remove Panels**: Use the "Remove" button on each panel header

### Navigation Controls
- **Mouse Wheel**: Zoom in/out on diagrams
- **Right-Click + Drag**: Pan around diagrams
- **Reset View**: Click the reset button to return to the original view

### Annotations
- **Global Controls**: Use the global annotation controls to enable/disable annotations and select tools
- **Pen Tool**: Draw freehand lines with precise coordinate tracking
- **Rectangle Tool**: Draw rectangles
- **Circle Tool**: Draw circles
- **Text Tool**: Add text annotations (click to place, then enter text)
- **Export**: Export annotated diagrams as high-quality PNG files

### Layout Behavior
- **1 Panel**: Expands to fill the entire viewport
- **2 Panels**: Side-by-side layout with resizable divider
- **3 Panels**: Two panels in one row, one panel in the other row (expands horizontally)
- **4 Panels**: 2x2 grid with cross-resizable dividers

## Project Structure

```
multi-diagram-viewer/
├── backend/
│   ├── src/
│   │   └── server.ts        # Express server (TypeScript)
│   ├── package.json         # Node.js dependencies
│   └── tsconfig.json        # TypeScript configuration
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application component with quadrant logic
│   │   ├── components/
│   │   │   ├── AnnotatedImageWithZoom.jsx  # Image viewer with annotations
│   │   │   └── CrossResizableDivider.jsx   # Cross-resizable divider component
│   │   └── index.js         # React entry point
│   ├── public/
│   └── package.json         # Node.js dependencies
├── diagrams/                # Place your diagram images here
├── docker-compose.yml       # Docker orchestration
├── Dockerfile              # Multi-stage Docker build
└── README.md               # This file
```

## Key Improvements

### Recent Updates
- **Quadrant Model**: Implemented a clean quadrant-based panel system for predictable layout behavior
- **State Preservation**: Annotations, zoom, and pan state are now preserved when adding/removing panels
- **Coordinate System**: Fixed annotation coordinate tracking for precise drawing across all panels
- **Resizing Logic**: Improved cross-resizable dividers that follow mouse cursor naturally
- **Layout Priority**: Horizontal expansion takes priority over vertical expansion for better UX
- **Export Quality**: High-quality PNG export with proper annotation scaling

### Technical Architecture
- **Lifted State Management**: Annotation and zoom state moved to App level for better persistence
- **Coordinate Transformation**: Proper coordinate system handling for accurate annotations
- **Layout Validation**: Ensures valid 2x2 grid layouts with proper constraints
- **Performance Optimizations**: Efficient re-rendering and state updates

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
npm install
npm run dev
```

**Note**: The backend uses TypeScript. For production builds, run `npm run build` to compile TypeScript to JavaScript.

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
- Backend powered by [Node.js Express](https://expressjs.com/) with TypeScript
- Containerized with [Docker](https://www.docker.com/) 

## Real-Time Image Reload

When a diagram file is modified on the server, any panel displaying that image in the frontend will automatically reload to show the latest version. This is achieved by:
- The backend sending a WebSocket notification (`file_modified`) to the frontend when a file changes.
- The frontend tracking which images are loaded in panels and incrementing a reload key for affected panels.
- The panel fetches a fresh image from the server using a cache-busting query parameter, ensuring the latest version is displayed without browser caching issues. 