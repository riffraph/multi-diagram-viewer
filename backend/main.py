from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os
import json
import asyncio
from typing import List, Set
import uvicorn
from pathlib import Path
from contextlib import asynccontextmanager

# Configuration
DIAGRAMS_DIR = "./diagrams"
SUPPORTED_EXTENSIONS = {'.svg', '.png', '.jpg', '.jpeg'}

# WebSocket connections
active_connections: Set[WebSocket] = set()

class DiagramFileHandler(FileSystemEventHandler):
    def __init__(self):
        self.observer = None
    
    def start_watching(self):
        if not os.path.exists(DIAGRAMS_DIR):
            os.makedirs(DIAGRAMS_DIR)
        
        self.observer = Observer()
        self.observer.schedule(self, DIAGRAMS_DIR, recursive=False)
        self.observer.start()
    
    def stop_watching(self):
        if self.observer:
            self.observer.stop()
            self.observer.join()
    
    def on_created(self, event):
        if not event.is_directory and self._is_supported_file(event.src_path):
            asyncio.create_task(self._notify_clients("file_created", os.path.basename(event.src_path)))
    
    def on_modified(self, event):
        if not event.is_directory and self._is_supported_file(event.src_path):
            asyncio.create_task(self._notify_clients("file_modified", os.path.basename(event.src_path)))
    
    def on_deleted(self, event):
        if not event.is_directory and self._is_supported_file(event.src_path):
            asyncio.create_task(self._notify_clients("file_deleted", os.path.basename(event.src_path)))
    
    def _is_supported_file(self, filepath: str) -> bool:
        return Path(filepath).suffix.lower() in SUPPORTED_EXTENSIONS
    
    async def _notify_clients(self, event_type: str, filename: str):
        message = json.dumps({
            "type": event_type,
            "filename": filename
        })
        
        # Remove disconnected websockets
        disconnected = set()
        for connection in active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.add(connection)
        
        active_connections.difference_update(disconnected)

# Initialize file watcher
file_handler = DiagramFileHandler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    file_handler.start_watching()
    yield
    # Shutdown
    file_handler.stop_watching()

app = FastAPI(title="Multi-Diagram Viewer API", lifespan=lifespan)

def get_diagram_files() -> List[str]:
    """Get list of supported diagram files in the diagrams directory."""
    if not os.path.exists(DIAGRAMS_DIR):
        return []
    
    files = []
    for filename in os.listdir(DIAGRAMS_DIR):
        filepath = os.path.join(DIAGRAMS_DIR, filename)
        if os.path.isfile(filepath) and Path(filepath).suffix.lower() in SUPPORTED_EXTENSIONS:
            files.append(filename)
    
    return sorted(files)

@app.get("/api/diagrams")
async def get_diagrams():
    """Get list of available diagram files."""
    files = get_diagram_files()
    return {"diagrams": files}

@app.get("/api/diagrams/{filename}")
async def get_diagram(filename: str):
    """Get a specific diagram file."""
    filepath = os.path.join(DIAGRAMS_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Diagram not found")
    
    if Path(filepath).suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    return FileResponse(filepath)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            # For now, we don't need to handle incoming messages
    except WebSocketDisconnect:
        active_connections.remove(websocket)

# Serve static files (frontend)
app.mount("/", StaticFiles(directory="./frontend/build", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False) 