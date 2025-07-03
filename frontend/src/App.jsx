import React, { useState, useEffect, useRef } from 'react';
import AnnotatedImageWithZoom from './components/AnnotatedImageWithZoom';

const DiagramPanel = ({ filename, onRemove }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [error, setError] = useState('');
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  const loadImage = async () => {
    try {
      setError('');
      const response = await fetch(`/api/diagrams/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImageSrc(url);
    } catch (err) {
      setError(err.message);
      console.error('Error loading image:', err);
    }
  };

  useEffect(() => {
    loadImage();
    
    // Cleanup function to revoke object URL
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [filename]);

  const handleReload = () => {
    loadImage();
  };

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector(`[data-panel-key="${filename}"]`);
      if (container) {
        const rect = container.getBoundingClientRect();
        // Set initial dimensions but allow zooming beyond container size
        setDimensions({
          width: Math.max(rect.width - 16, 400), // Minimum width of 400px
          height: Math.max(rect.height - 40, 300) // Minimum height of 300px
        });
      }
    };

    // Initial update with delay to ensure panel is rendered
    const timer = setTimeout(updateDimensions, 100);

    // Update on window resize
    window.addEventListener('resize', updateDimensions);
    
    // Update when layout changes
    const observer = new ResizeObserver(updateDimensions);
    const container = document.querySelector(`[data-panel-key="${filename}"]`);
    if (container) {
      observer.observe(container);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, [filename]);

  return (
    <div className="diagram-panel" data-panel-key={filename} style={{ width: '100%', height: '100%' }}>
      <div className="diagram-panel-header" style={{ 
        padding: '4px 8px', 
        borderBottom: '1px solid #ccc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        fontSize: '12px'
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{filename}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={handleReload} 
            style={{ 
              padding: '2px 4px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '10px',
              borderRadius: '2px'
            }}
          >
            ↻
          </button>
          <button 
            onClick={() => onRemove(filename)}
            style={{
              padding: '2px 4px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '10px',
              borderRadius: '2px'
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div className="diagram-panel-content" style={{ flex: 1, overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
            {error}
          </div>
        ) : imageSrc ? (
          <AnnotatedImageWithZoom 
            imageUrl={imageSrc}
          />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            Loading...
          </div>
        )}
      </div>
    </div>
  );
};

// Resizable divider component
const ResizableDivider = ({ direction, onResize, position }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPos(direction === 'horizontal' ? e.clientX : e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos;
      onResize(delta);
      setStartPos(currentPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startPos, direction, onResize]);

  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: '#ccc',
        cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
        zIndex: 1000,
        ...(direction === 'horizontal' 
          ? { 
              left: position, 
              top: 0, 
              width: '4px', 
              height: '100%',
              cursor: 'col-resize'
            }
          : { 
              top: position, 
              left: 0, 
              height: '4px', 
              width: '100%',
              cursor: 'row-resize'
            }
        )
      }}
      onMouseDown={handleMouseDown}
    />
  );
};

// Split pane container
const SplitPaneContainer = ({ children, onLayoutChange }) => {
  const containerRef = useRef(null);
  const [sizes, setSizes] = useState({});

  useEffect(() => {
    if (children.length === 0) return;

    // Initialize sizes based on number of children
    const newSizes = {};
    if (children.length === 1) {
      newSizes[0] = { width: '100%', height: '100%' };
    } else if (children.length === 2) {
      newSizes[0] = { width: '50%', height: '100%' };
      newSizes[1] = { width: '50%', height: '100%' };
    } else if (children.length === 3) {
      newSizes[0] = { width: '50%', height: '50%' };
      newSizes[1] = { width: '50%', height: '50%' };
      newSizes[2] = { width: '100%', height: '50%' };
    } else if (children.length === 4) {
      newSizes[0] = { width: '50%', height: '50%' };
      newSizes[1] = { width: '50%', height: '50%' };
      newSizes[2] = { width: '50%', height: '50%' };
      newSizes[3] = { width: '50%', height: '50%' };
    }
    setSizes(newSizes);
  }, [children.length]);

  const handleHorizontalResize = (delta) => {
    if (children.length !== 2 && children.length !== 4) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.offsetWidth;
    const percentage = (delta / containerWidth) * 100;
    
    setSizes(prev => {
      const newSizes = { ...prev };
      if (children.length === 2) {
        newSizes[0] = { ...prev[0], width: `${Math.max(20, Math.min(80, parseFloat(prev[0].width) + percentage))}%` };
        newSizes[1] = { ...prev[1], width: `${Math.max(20, Math.min(80, parseFloat(prev[1].width) - percentage))}%` };
      } else if (children.length === 4) {
        newSizes[0] = { ...prev[0], width: `${Math.max(20, Math.min(80, parseFloat(prev[0].width) + percentage))}%` };
        newSizes[1] = { ...prev[1], width: `${Math.max(20, Math.min(80, parseFloat(prev[1].width) - percentage))}%` };
        newSizes[2] = { ...prev[2], width: `${Math.max(20, Math.min(80, parseFloat(prev[2].width) + percentage))}%` };
        newSizes[3] = { ...prev[3], width: `${Math.max(20, Math.min(80, parseFloat(prev[3].width) - percentage))}%` };
      }
      return newSizes;
    });
  };

  const handleVerticalResize = (delta) => {
    if (children.length < 3) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const containerHeight = container.offsetHeight;
    const percentage = (delta / containerHeight) * 100;
    
    setSizes(prev => {
      const newSizes = { ...prev };
      if (children.length === 3) {
        const newTopHeight = Math.max(20, Math.min(80, parseFloat(prev[0].height) + percentage));
        newSizes[0] = { ...prev[0], height: `${newTopHeight}%` };
        newSizes[1] = { ...prev[1], height: `${newTopHeight}%` };
        // Bottom panel height is calculated automatically as 100% - topHeight
      } else if (children.length === 4) {
        const newTopHeight = Math.max(20, Math.min(80, parseFloat(prev[0].height) + percentage));
        newSizes[0] = { ...prev[0], height: `${newTopHeight}%` };
        newSizes[1] = { ...prev[1], height: `${newTopHeight}%` };
        // Bottom panels height is calculated automatically as 100% - topHeight
      }
      return newSizes;
    });
  };

  const handleCrossResize = (delta, isHorizontal) => {
    if (children.length !== 4) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const containerSize = isHorizontal ? container.offsetWidth : container.offsetHeight;
    const percentage = (delta / containerSize) * 100;
    
    setSizes(prev => {
      const newSizes = { ...prev };
      if (isHorizontal) {
        newSizes[0] = { ...prev[0], width: `${Math.max(20, Math.min(80, parseFloat(prev[0].width) + percentage))}%` };
        newSizes[1] = { ...prev[1], width: `${Math.max(20, Math.min(80, parseFloat(prev[1].width) - percentage))}%` };
        newSizes[2] = { ...prev[2], width: `${Math.max(20, Math.min(80, parseFloat(prev[2].width) + percentage))}%` };
        newSizes[3] = { ...prev[3], width: `${Math.max(20, Math.min(80, parseFloat(prev[3].width) - percentage))}%` };
      } else {
        newSizes[0] = { ...prev[0], height: `${Math.max(20, Math.min(80, parseFloat(prev[0].height) + percentage))}%` };
        newSizes[1] = { ...prev[1], height: `${Math.max(20, Math.min(80, parseFloat(prev[1].height) + percentage))}%` };
        newSizes[2] = { ...prev[2], height: `${Math.max(20, Math.min(80, parseFloat(prev[2].height) - percentage))}%` };
        newSizes[3] = { ...prev[3], height: `${Math.max(20, Math.min(80, parseFloat(prev[3].height) - percentage))}%` };
      }
      return newSizes;
    });
  };

  if (children.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px', 
        color: '#6c757d',
        fontSize: '18px',
        height: '100%'
      }}>
        Select diagrams from the dropdown above to start viewing
      </div>
    );
  }

  if (children.length === 1) {
    return (
      <div ref={containerRef} style={{ height: '100%', position: 'relative' }}>
        <div style={{ width: '100%', height: '100%' }}>
          {children[0]}
        </div>
      </div>
    );
  }

  if (children.length === 2) {
    const leftWidth = sizes[0]?.width || '50%';
    const rightWidth = sizes[1]?.width || '50%';
    
    return (
      <div ref={containerRef} style={{ height: '100%', position: 'relative', display: 'flex' }}>
        <div style={{ width: leftWidth, height: '100%' }}>
          {children[0]}
        </div>
        <ResizableDivider 
          direction="horizontal" 
          position={`calc(${leftWidth} - 2px)`}
          onResize={handleHorizontalResize}
        />
        <div style={{ width: rightWidth, height: '100%' }}>
          {children[1]}
        </div>
      </div>
    );
  }

  if (children.length === 3) {
    const topHeight = sizes[0]?.height || '50%';
    const bottomHeight = sizes[2]?.height || '50%';
    
    return (
      <div ref={containerRef} style={{ height: '100%', position: 'relative' }}>
        <div style={{ height: topHeight, display: 'flex' }}>
          <div style={{ width: '50%', height: '100%' }}>
            {children[0]}
          </div>
          <div style={{ width: '50%', height: '100%' }}>
            {children[1]}
          </div>
        </div>
        <ResizableDivider 
          direction="vertical" 
          position={`calc(${topHeight} - 2px)`}
          onResize={handleVerticalResize}
        />
        <div style={{ height: `calc(100% - ${topHeight})`, width: '100%' }}>
          {children[2]}
        </div>
      </div>
    );
  }

  if (children.length === 4) {
    const topHeight = sizes[0]?.height || '50%';
    const leftWidth = sizes[0]?.width || '50%';
    const rightWidth = sizes[1]?.width || '50%';
    
    return (
      <div ref={containerRef} style={{ height: '100%', position: 'relative' }}>
        <div style={{ height: topHeight, display: 'flex' }}>
          <div style={{ width: leftWidth, height: '100%' }}>
            {children[0]}
          </div>
          <ResizableDivider 
            direction="horizontal" 
            position={`calc(${leftWidth} - 2px)`}
            onResize={handleHorizontalResize}
          />
          <div style={{ width: rightWidth, height: '100%' }}>
            {children[1]}
          </div>
        </div>
        <ResizableDivider 
          direction="vertical" 
          position={`calc(${topHeight} - 2px)`}
          onResize={handleVerticalResize}
        />
        <div style={{ height: `calc(100% - ${topHeight})`, display: 'flex' }}>
          <div style={{ width: leftWidth, height: '100%' }}>
            {children[2]}
          </div>
          <ResizableDivider 
            direction="horizontal" 
            position={`calc(${leftWidth} - 2px)`}
            onResize={handleHorizontalResize}
          />
          <div style={{ width: rightWidth, height: '100%' }}>
            {children[3]}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

function App() {
  const [diagrams, setDiagrams] = useState([]);
  const [selectedDiagrams, setSelectedDiagrams] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef(null);

  // Global scroll prevention (but allow wheel events for zooming)
  useEffect(() => {
    const preventScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventTouchScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Only prevent scroll events, not wheel events
    document.addEventListener('scroll', preventScroll, { passive: false, capture: true });
    document.addEventListener('touchmove', preventTouchScroll, { passive: false, capture: true });
    document.addEventListener('touchstart', preventTouchScroll, { passive: false, capture: true });
    document.addEventListener('touchend', preventTouchScroll, { passive: false, capture: true });

    return () => {
      document.removeEventListener('scroll', preventScroll, { capture: true });
      document.removeEventListener('touchmove', preventTouchScroll, { capture: true });
      document.removeEventListener('touchstart', preventTouchScroll, { capture: true });
      document.removeEventListener('touchend', preventTouchScroll, { capture: true });
    };
  }, []);

  // Load available diagrams
  const loadDiagrams = async () => {
    try {
      const response = await fetch('/api/diagrams');
      if (response.ok) {
        const data = await response.json();
        setDiagrams(data.diagrams);
      }
    } catch (error) {
      console.error('Error loading diagrams:', error);
    }
  };

  // WebSocket connection for real-time updates
  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setWsStatus('connected');
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      
      // Reload diagrams list when files change
      if (['file_created', 'file_modified', 'file_deleted'].includes(data.type)) {
        loadDiagrams();
      }
    };
    
    wsRef.current.onclose = () => {
      setWsStatus('disconnected');
      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('error');
    };
  };

  useEffect(() => {
    loadDiagrams();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleAddDiagram = () => {
    if (selectedImage && selectedDiagrams.length < 4 && !selectedDiagrams.includes(selectedImage)) {
      setSelectedDiagrams([...selectedDiagrams, selectedImage]);
      setSelectedImage(''); // Reset selection after adding
    }
  };

  const handleRemoveDiagram = (filename) => {
    setSelectedDiagrams(selectedDiagrams.filter(d => d !== filename));
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="controls" style={{ padding: '8px 12px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>Multi-Diagram Viewer</h1>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={selectedImage}
              onChange={(e) => setSelectedImage(e.target.value)}
              disabled={selectedDiagrams.length >= 4}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '3px'
              }}
            >
              <option value="">Select a diagram to add...</option>
              {diagrams
                .filter(d => !selectedDiagrams.includes(d))
                .map(d => (
                  <option key={d} value={d}>{d}</option>
                ))
              }
            </select>
            <button 
              onClick={handleAddDiagram}
              disabled={!selectedImage || selectedDiagrams.length >= 4}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: selectedImage && selectedDiagrams.length < 4 ? '#007bff' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: selectedImage && selectedDiagrams.length < 4 ? 'pointer' : 'not-allowed'
              }}
            >
              Add Panel
            </button>
            <button 
              onClick={loadDiagrams}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
              {selectedDiagrams.length}/4 diagrams loaded
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            WebSocket: {wsStatus} | Available diagrams: {diagrams.length}
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, padding: '8px' }}>
        <SplitPaneContainer>
          {selectedDiagrams.map((filename) => (
            <DiagramPanel
              key={filename}
              filename={filename}
              onRemove={handleRemoveDiagram}
            />
          ))}
        </SplitPaneContainer>
      </div>
    </div>
  );
}

export default App; 