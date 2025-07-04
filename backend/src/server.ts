const express = require('express');
const ws = require('ws');
const { createServer } = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const chokidar = require('chokidar');

// Types and interfaces
interface WebSocketMessage {
  type: 'file_created' | 'file_modified' | 'file_deleted';
  filename: string;
}

interface DiagramsResponse {
  diagrams: string[];
}

interface ErrorResponse {
  error: string;
}

// Configuration
const DIAGRAMS_DIR = process.env.DIAGRAMS_DIR || path.join(__dirname, '../diagrams');
const SUPPORTED_EXTENSIONS: readonly string[] = ['.svg', '.png', '.jpg', '.jpeg'];

console.log('Diagrams directory:', DIAGRAMS_DIR);
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// For compiled JavaScript, __dirname points to the dist directory
// So we need to adjust the path for the frontend build
const FRONTEND_BUILD_PATH = path.join(__dirname, '../../frontend/build');

// WebSocket connections
const activeConnections = new Set<any>();

// Express app setup
const app = express();
const server = createServer(app);
const wss = new ws.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_BUILD_PATH));

// File watcher setup
let fileWatcher: any = null;
try {
  fileWatcher = chokidar.watch(DIAGRAMS_DIR, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });
  console.log('File watcher started successfully');
} catch (error) {
  console.error('Error starting file watcher:', error);
  fileWatcher = null;
}



// File watcher events
if (fileWatcher) {
  fileWatcher
    .on('add', (filepath: string) => {
      console.log('File added:', filepath);
      if (isSupportedFile(filepath)) {
        notifyClients('file_created', path.basename(filepath));
      }
    })
    .on('change', (filepath: string) => {
      console.log('File changed:', filepath);
      if (isSupportedFile(filepath)) {
        notifyClients('file_modified', path.basename(filepath));
      }
    })
    .on('unlink', (filepath: string) => {
      console.log('File deleted:', filepath);
      if (isSupportedFile(filepath)) {
        notifyClients('file_deleted', path.basename(filepath));
      }
    });
}

function isSupportedFile(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

function notifyClients(eventType: WebSocketMessage['type'], filename: string): void {
  const message: WebSocketMessage = {
    type: eventType,
    filename: filename
  };

  const messageStr = JSON.stringify(message);

  // Remove disconnected websockets
  const disconnected: any[] = [];
  activeConnections.forEach(ws => {
    if (ws.readyState === 1) { // WebSocket.OPEN = 1
      ws.send(messageStr);
    } else {
      disconnected.push(ws);
    }
  });

  // Remove disconnected connections
  disconnected.forEach(ws => activeConnections.delete(ws));
}

function getDiagramFiles(): string[] {
  console.log('Checking for diagrams in:', DIAGRAMS_DIR);
  
  if (!fs.existsSync(DIAGRAMS_DIR)) {
    console.log('Diagrams directory does not exist');
    return [];
  }

  const files = fs.readdirSync(DIAGRAMS_DIR)
    .filter(filename => {
      const filepath = path.join(DIAGRAMS_DIR, filename);
      const isFile = fs.statSync(filepath).isFile();
      const isSupported = isSupportedFile(filepath);
      console.log(`File: ${filename}, isFile: ${isFile}, isSupported: ${isSupported}`);
      return isFile && isSupported;
    });

  console.log('Found diagram files:', files);
  return files.sort();
}

// API Routes
app.get('/api/diagrams', (req: any, res: any) => {
  console.log('GET /api/diagrams requested');
  try {
    const files = getDiagramFiles();
    console.log('Returning diagrams:', files);
    const response: DiagramsResponse = { diagrams: files };
    res.json(response);
  } catch (error) {
    console.error('Error getting diagrams:', error);
    const errorResponse: ErrorResponse = { error: 'Internal server error' };
    res.status(500).json(errorResponse);
  }
});

app.get('/api/diagrams/:filename', (req: any, res: any) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(DIAGRAMS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      const errorResponse: ErrorResponse = { error: 'Diagram not found' };
      return res.status(404).json(errorResponse);
    }

    if (!isSupportedFile(filepath)) {
      const errorResponse: ErrorResponse = { error: 'Unsupported file type' };
      return res.status(400).json(errorResponse);
    }

    res.sendFile(path.resolve(filepath));
  } catch (error) {
    console.error('Error serving diagram:', error);
    const errorResponse: ErrorResponse = { error: 'Internal server error' };
    res.status(500).json(errorResponse);
  }
});

// WebSocket connection handler
wss.on('connection', (ws: any) => {
  activeConnections.add(ws);

  ws.on('message', (message: any) => {
    // For now, we don't need to handle incoming messages
    // but we can add message handling here if needed
    console.log('Received WebSocket message:', message.toString());
  });

  ws.on('close', () => {
    activeConnections.delete(ws);
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
    activeConnections.delete(ws);
  });
});

// Serve frontend for all other routes
app.get('*', (req: any, res: any) => {
  res.sendFile(path.join(FRONTEND_BUILD_PATH, 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (fileWatcher) {
    fileWatcher.close();
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (fileWatcher) {
    fileWatcher.close();
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = parseInt(process.env.PORT || '8000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}); 