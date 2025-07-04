import React, { useState, useEffect, useRef } from 'react';
import AnnotatedImageWithZoom from './components/AnnotatedImageWithZoom';
import AnnotationControls from './components/AnnotationControls';
import CrossResizableDivider from './components/CrossResizableDivider';

const DiagramPanel = ({ filename, onRemove, globalAnnotationSettings, preservedAnnotations, preservedZoomState, onAnnotationsUpdate, onZoomStateUpdate }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [error, setError] = useState('');

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
            globalAnnotationSettings={globalAnnotationSettings}
            preservedAnnotations={preservedAnnotations}
            preservedZoomState={preservedZoomState}
            onAnnotationsUpdate={onAnnotationsUpdate}
            onZoomStateUpdate={onZoomStateUpdate}
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

// Enhanced resizable divider component
const ResizableDivider = ({ direction, onResize, position, isCrossResizable = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(0);
  const [lastPos, setLastPos] = useState(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    console.log('ResizableDivider: Mouse down', {
      direction,
      clientPos: direction === 'horizontal' ? e.clientX : e.clientY
    });
    setIsDragging(true);
    const pos = direction === 'horizontal' ? e.clientX : e.clientY;
    setStartPos(pos);
    setLastPos(pos);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - lastPos;
      
      console.log('ResizableDivider: Mouse move', {
        direction,
        currentPos,
        lastPos,
        delta
      });
      
      if (Math.abs(delta) > 0) {
        console.log('ResizableDivider: Calling onResize with delta:', delta);
        onResize(delta);
      }
      
      // Update lastPos for next move
      setLastPos(currentPos);
    };

    const handleMouseUp = () => {
      console.log('ResizableDivider: Mouse up');
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
  }, [isDragging, lastPos, direction, onResize]);

  const cursor = isCrossResizable ? 'move' : (direction === 'horizontal' ? 'col-resize' : 'row-resize');

  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: isCrossResizable ? '#007bff' : '#ccc',
        cursor: cursor,
        zIndex: 1000,
        ...(direction === 'horizontal' 
          ? { 
              left: position, 
              top: 0, 
              width: '4px', 
              height: '100%'
            }
          : { 
              top: position, 
              left: 0, 
              height: '4px', 
              width: '100%'
            }
        )
      }}
      onMouseDown={handleMouseDown}
    />
  );
};

// New flexible panel layout system - always uses 2x2 grid
const FlexiblePanelLayout = ({ panels, onLayoutChange, layout, setLayout, quadrantState }) => {
  const containerRef = useRef(null);

  const handleResize = (dividerId, deltaX, deltaY) => {
    console.log('FlexiblePanelLayout: handleResize called', {
      dividerId,
      deltaX,
      deltaY,
      containerRef: containerRef.current
    });
    
    // Get the container dimensions from the ref
    if (!containerRef.current) {
      console.log('FlexiblePanelLayout: No container ref, returning');
      return;
    }
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    console.log('FlexiblePanelLayout: Container dimensions', {
      containerWidth,
      containerHeight
    });
    
    // Convert pixel delta to percentage delta - follow mouse at same rate
    const deltaXPercent = (deltaX / containerWidth) * 100;
    const deltaYPercent = (deltaY / containerHeight) * 100;
    
    console.log('FlexiblePanelLayout: Calculated percentage deltas', {
      deltaXPercent,
      deltaYPercent
    });
    
    const newLayout = { ...layout };
    
    if (dividerId in newLayout) {
      if (typeof newLayout[dividerId] === 'object') {
        // Cross divider - update both x and y positions
        const oldX = newLayout[dividerId].x;
        const oldY = newLayout[dividerId].y;
        newLayout[dividerId] = {
          x: Math.max(10, Math.min(90, oldX + deltaXPercent)),
          y: Math.max(10, Math.min(90, oldY + deltaYPercent))
        };
        console.log('FlexiblePanelLayout: Updated cross divider', {
          oldX,
          oldY,
          newX: newLayout[dividerId].x,
          newY: newLayout[dividerId].y
        });
      } else {
        // Single axis divider
        const oldValue = newLayout[dividerId];
        newLayout[dividerId] = Math.max(10, Math.min(90, oldValue + deltaXPercent));
        console.log('FlexiblePanelLayout: Updated single axis divider', {
          dividerId,
          oldValue,
          newValue: newLayout[dividerId]
        });
      }
    } else {
      console.log('FlexiblePanelLayout: Divider ID not found in layout', dividerId);
    }
    
    console.log('FlexiblePanelLayout: Setting new layout', newLayout);
    setLayout(newLayout);
    if (onLayoutChange) onLayoutChange(newLayout);
  };

  if (panels.length === 0) return null;
  
  // Count non-null panels
  const activePanels = panels.filter(panel => panel !== null);
  const activeCount = activePanels.length;
  
  // Always use 2x2 grid layout
  const crossDivider = layout.crossDivider || { x: 50, y: 50 };
  const leftWidth = `${crossDivider.x}%`;
  const rightWidth = `${100 - crossDivider.x}%`;
  const topHeight = `${crossDivider.y}%`;
  const bottomHeight = `${100 - crossDivider.y}%`;

  // Determine layout based on active panel count
  // Always maintain 2x2 grid compliance - never exceed 2x2
  if (activeCount === 1) {
    // Single panel - fill entire space
    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        {activePanels[0]}
      </div>
    );
  } else if (activeCount === 2) {
    // Two panels - determine if they're in same row or column
    const hasTopLeft = panels[0] !== null;
    const hasTopRight = panels[1] !== null;
    const hasBottomLeft = panels[2] !== null;
    const hasBottomRight = panels[3] !== null;
    
    if (hasTopLeft && hasTopRight) {
      // Horizontal split - top row
      return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: leftWidth, height: '100%', float: 'left' }}>
            {panels[0]}
          </div>
          <div style={{ width: rightWidth, height: '100%', float: 'left' }}>
            {panels[1]}
          </div>
          <CrossResizableDivider 
            onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
            onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
            position={{ x: crossDivider.x, y: 50 }}
          />
        </div>
      );
    } else if (hasBottomLeft && hasBottomRight) {
      // Horizontal split - bottom row
      return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: leftWidth, height: '100%', float: 'left' }}>
            {panels[2]}
          </div>
          <div style={{ width: rightWidth, height: '100%', float: 'left' }}>
            {panels[3]}
          </div>
          <CrossResizableDivider 
            onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
            onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
            position={{ x: crossDivider.x, y: 50 }}
          />
        </div>
      );
    } else if (hasTopLeft && hasBottomLeft) {
      // Vertical split - left column
      return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: '100%', height: topHeight }}>
            {panels[0]}
          </div>
          <div style={{ width: '100%', height: bottomHeight }}>
            {panels[2]}
          </div>
          <CrossResizableDivider 
            onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
            onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
            position={{ x: 50, y: crossDivider.y }}
          />
        </div>
      );
    } else if (hasTopRight && hasBottomRight) {
      // Vertical split - right column
      return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: '100%', height: topHeight }}>
            {panels[1]}
          </div>
          <div style={{ width: '100%', height: bottomHeight }}>
            {panels[3]}
          </div>
          <CrossResizableDivider 
            onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
            onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
            position={{ x: 50, y: crossDivider.y }}
          />
        </div>
      );
    } else {
      // Diagonal arrangement - expand panels to fill their rows
      if (hasTopLeft && hasBottomRight) {
        // Top-left and bottom-right - expand to fill rows
        return (
          <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ width: '100%', height: topHeight }}>
              {panels[0]}
            </div>
            <div style={{ width: '100%', height: bottomHeight }}>
              {panels[3]}
            </div>
            <CrossResizableDivider 
              onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
              onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
              position={{ x: crossDivider.x, y: crossDivider.y }}
            />
          </div>
        );
      } else if (hasTopRight && hasBottomLeft) {
        // Top-right and bottom-left - expand to fill rows
        return (
          <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ width: '100%', height: topHeight }}>
              {panels[1]}
            </div>
            <div style={{ width: '100%', height: bottomHeight }}>
              {panels[2]}
            </div>
            <CrossResizableDivider 
              onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
              onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
              position={{ x: crossDivider.x, y: crossDivider.y }}
            />
          </div>
        );
      } else {
        // Fallback - use full grid
        return (
          <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ width: leftWidth, height: topHeight, float: 'left' }}>
              {panels[0] || <div style={{ width: '100%', height: '100%', backgroundColor: '#f8f9fa' }} />}
            </div>
            <div style={{ width: rightWidth, height: topHeight, float: 'left' }}>
              {panels[1] || <div style={{ width: '100%', height: '100%', backgroundColor: '#f8f9fa' }} />}
            </div>
            <div style={{ width: leftWidth, height: bottomHeight, float: 'left' }}>
              {panels[2] || <div style={{ width: '100%', height: '100%', backgroundColor: '#f8f9fa' }} />}
            </div>
            <div style={{ width: rightWidth, height: bottomHeight, float: 'left' }}>
              {panels[3] || <div style={{ width: '100%', height: '100%', backgroundColor: '#f8f9fa' }} />}
            </div>
            <CrossResizableDivider 
              onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
              onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
              position={{ x: crossDivider.x, y: crossDivider.y }}
            />
          </div>
        );
      }
    }
  } else if (activeCount === 3) {
    // Three panels - prioritize horizontal expansion
    const hasTopLeft = panels[0] !== null;
    const hasTopRight = panels[1] !== null;
    const hasBottomLeft = panels[2] !== null;
    const hasBottomRight = panels[3] !== null;
    
    // Determine which quadrant is empty
    let emptyQuadrant = -1;
    if (!hasTopLeft) emptyQuadrant = 0;
    else if (!hasTopRight) emptyQuadrant = 1;
    else if (!hasBottomLeft) emptyQuadrant = 2;
    else if (!hasBottomRight) emptyQuadrant = 3;
    
    // Always expand horizontally - single panel in a row should expand to fill the row
    if (emptyQuadrant === 0) {
      // Top-left is empty - expand top-right to fill top row
      return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: '100%', height: topHeight, float: 'left' }}>
            {panels[1]}
          </div>
          <div style={{ width: leftWidth, height: bottomHeight, float: 'left', clear: 'left' }}>
            {panels[2]}
          </div>
          <div style={{ width: rightWidth, height: bottomHeight, float: 'left' }}>
            {panels[3]}
          </div>
          <CrossResizableDivider 
            onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
            onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
            position={{ x: crossDivider.x, y: crossDivider.y }}
          />
        </div>
      );
    } else if (emptyQuadrant === 1) {
      // Top-right is empty - expand top-left to fill top row
      return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: '100%', height: topHeight, float: 'left' }}>
            {panels[0]}
          </div>
          <div style={{ width: leftWidth, height: bottomHeight, float: 'left', clear: 'left' }}>
            {panels[2]}
          </div>
          <div style={{ width: rightWidth, height: bottomHeight, float: 'left' }}>
            {panels[3]}
          </div>
          <CrossResizableDivider 
            onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
            onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
            position={{ x: crossDivider.x, y: crossDivider.y }}
          />
        </div>
      );
    } else if (emptyQuadrant === 2) {
      // Bottom-left is empty - expand bottom-right to fill bottom row
      return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: leftWidth, height: topHeight, float: 'left' }}>
            {panels[0]}
          </div>
          <div style={{ width: rightWidth, height: topHeight, float: 'left' }}>
            {panels[1]}
          </div>
          <div style={{ width: '100%', height: bottomHeight, float: 'left', clear: 'left' }}>
            {panels[3]}
          </div>
          <CrossResizableDivider 
            onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
            onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
            position={{ x: crossDivider.x, y: crossDivider.y }}
          />
        </div>
      );
    } else if (emptyQuadrant === 3) {
      // Bottom-right is empty - expand bottom-left to fill bottom row
      return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: leftWidth, height: topHeight, float: 'left' }}>
            {panels[0]}
          </div>
          <div style={{ width: rightWidth, height: topHeight, float: 'left' }}>
            {panels[1]}
          </div>
          <div style={{ width: '100%', height: bottomHeight, float: 'left', clear: 'left' }}>
            {panels[2]}
          </div>
          <CrossResizableDivider 
            onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
            onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
            position={{ x: crossDivider.x, y: crossDivider.y }}
          />
        </div>
      );
    }
  } else if (activeCount === 4) {
    // Four panels - full 2x2 grid
    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div style={{ width: leftWidth, height: topHeight, float: 'left' }}>
          {panels[0]}
        </div>
        <div style={{ width: rightWidth, height: topHeight, float: 'left' }}>
          {panels[1]}
        </div>
        <div style={{ width: leftWidth, height: bottomHeight, float: 'left' }}>
          {panels[2]}
        </div>
        <div style={{ width: rightWidth, height: bottomHeight, float: 'left' }}>
          {panels[3]}
        </div>
        <CrossResizableDivider 
          onHorizontalResize={(deltaX) => handleResize('crossDivider', deltaX, 0)}
          onVerticalResize={(deltaY) => handleResize('crossDivider', 0, deltaY)}
          position={{ x: crossDivider.x, y: crossDivider.y }}
        />
      </div>
    );
  }

  return null;
};

// Panel addition options component
const PanelAdditionOptions = ({ onAddPanel, selectedImage, panelCount, quadrantState }) => {
  const getOccupiedQuadrants = () => {
    const occupied = [];
    Object.entries(quadrantState).forEach(([quadrant, panel]) => {
      if (panel !== null) {
        occupied.push(parseInt(quadrant));
      }
    });
    return occupied;
  };

  const wouldViolate2x2 = (quadrant) => {
    const occupied = getOccupiedQuadrants();
    if (occupied.length >= 4) return true;
    
    // Check if adding this quadrant would create a 3x1 or 1x3 layout
    const newOccupied = [...occupied, quadrant];
    
    // Check for 3 panels in same row
    const topRow = newOccupied.filter(q => q === 0 || q === 1);
    const bottomRow = newOccupied.filter(q => q === 2 || q === 3);
    if (topRow.length > 2 || bottomRow.length > 2) return true;
    
    // Check for 3 panels in same column
    const leftCol = newOccupied.filter(q => q === 0 || q === 2);
    const rightCol = newOccupied.filter(q => q === 1 || q === 3);
    if (leftCol.length > 2 || rightCol.length > 2) return true;
    
    return false;
  };

  const buttonStyle = (quadrant) => {
    const isOccupied = quadrantState[quadrant] !== null;
    const wouldViolate = wouldViolate2x2(quadrant);
    const isDisabled = isOccupied || wouldViolate || !selectedImage;
    
    return {
      padding: '4px 8px',
      fontSize: '11px',
      backgroundColor: isDisabled ? '#e9ecef' : '#007bff',
      color: isDisabled ? '#6c757d' : 'white',
      border: 'none',
      borderRadius: '3px',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      margin: '0 2px',
      opacity: isDisabled ? 0.6 : 1
    };
  };

  const handleAdd = (quadrant) => {
    if (quadrantState[quadrant] !== null || wouldViolate2x2(quadrant) || !selectedImage) {
      return;
    }
    console.log('Calling onAddPanel with quadrant:', quadrant);
    onAddPanel(quadrant);
  };

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      <button 
        onClick={() => handleAdd(0)}
        disabled={quadrantState[0] !== null || wouldViolate2x2(0) || !selectedImage}
        style={buttonStyle(0)}
        title="Add to top-left quadrant"
      >
        ↖ Top-Left
      </button>
      <button 
        onClick={() => handleAdd(1)}
        disabled={quadrantState[1] !== null || wouldViolate2x2(1) || !selectedImage}
        style={buttonStyle(1)}
        title="Add to top-right quadrant"
      >
        ↗ Top-Right
      </button>
      <button 
        onClick={() => handleAdd(2)}
        disabled={quadrantState[2] !== null || wouldViolate2x2(2) || !selectedImage}
        style={buttonStyle(2)}
        title="Add to bottom-left quadrant"
      >
        ↙ Bottom-Left
      </button>
      <button 
        onClick={() => handleAdd(3)}
        disabled={quadrantState[3] !== null || wouldViolate2x2(3) || !selectedImage}
        style={buttonStyle(3)}
        title="Add to bottom-right quadrant"
      >
        ↘ Bottom-Right
      </button>
    </div>
  );
};

function App() {
  const [diagrams, setDiagrams] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quadrantState, setQuadrantState] = useState({ 0: null, 1: null, 2: null, 3: null });
  const [layout, setLayout] = useState({
    arrangement: 'cross',
    crossDivider: { x: 50, y: 50 }
  });
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef(null);
  
  // Global annotation settings
  const [annotationsEnabled, setAnnotationsEnabled] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  
  // Store annotation state for each panel to preserve across re-renders
  const [panelAnnotations, setPanelAnnotations] = useState({});
  const [panelZoomStates, setPanelZoomStates] = useState({});
  
  // Functions to update annotation and zoom state for specific panels
  const updatePanelAnnotations = (filename, annotations) => {
    setPanelAnnotations(prev => ({
      ...prev,
      [filename]: annotations
    }));
  };
  
  const updatePanelZoomState = (filename, zoomState) => {
    setPanelZoomStates(prev => ({
      ...prev,
      [filename]: zoomState
    }));
  };
  
  // Clean up state when panels are removed
  const cleanupPanelState = (filename) => {
    setPanelAnnotations(prev => {
      const newState = { ...prev };
      delete newState[filename];
      return newState;
    });
    setPanelZoomStates(prev => {
      const newState = { ...prev };
      delete newState[filename];
      return newState;
    });
  };

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

  const handleAddPanel = (quadrant) => {
    if (selectedImage && !Object.values(quadrantState).includes(selectedImage)) {
      // Update quadrant state
      const newQuadrantState = { ...quadrantState };
      newQuadrantState[quadrant] = selectedImage;
      setQuadrantState(newQuadrantState);
      
      // Don't reset layout when adding panels - preserve the current layout
      // This ensures that existing panels keep their zoom, pan, and annotation state
      console.log('Panel added:', selectedImage, 'to quadrant:', quadrant, 'Layout preserved');
      
      // Reset selection after a short delay to ensure state updates are processed
      setTimeout(() => {
        setSelectedImage('');
      }, 100);
    }
  };

  const handleRemoveDiagram = (filename) => {
    // Remove from quadrant state
    const newQuadrantState = { ...quadrantState };
    Object.keys(newQuadrantState).forEach(key => {
      if (newQuadrantState[key] === filename) {
        newQuadrantState[key] = null;
      }
    });
    setQuadrantState(newQuadrantState);
    
    // Clean up panel state for the removed panel
    cleanupPanelState(filename);
    
    // Don't reset layout when removing panels - preserve the current layout
    // This ensures that remaining panels keep their zoom, pan, and annotation state
    console.log('Panel removed:', filename, 'Layout preserved');
  };

  // Get panels in quadrant order
  const getPanelsInOrder = () => {
    const panels = [];
    const quadrants = [0, 1, 2, 3]; // top-left, top-right, bottom-left, bottom-right
    
    quadrants.forEach(quadrant => {
      const filename = quadrantState[quadrant];
      if (filename) {
        panels.push(
          <DiagramPanel
            key={filename}
            filename={filename}
            onRemove={handleRemoveDiagram}
            globalAnnotationSettings={{
              annotationsEnabled,
              tool,
              color,
              strokeWidth
            }}
            preservedAnnotations={panelAnnotations[filename] || null}
            preservedZoomState={panelZoomStates[filename] || null}
            onAnnotationsUpdate={(annotations) => updatePanelAnnotations(filename, annotations)}
            onZoomStateUpdate={(zoomState) => updatePanelZoomState(filename, zoomState)}
          />
        );
      } else {
        panels.push(null);
      }
    });
    
    return panels;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Compact controls bar */}
      <div className="controls" style={{ 
        padding: '4px 8px', 
        borderBottom: '1px solid #ddd',
        backgroundColor: '#fff'
      }}>
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
              disabled={Object.values(quadrantState).filter(p => p !== null).length >= 4}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '3px'
              }}
            >
              <option value="">Select a diagram to add...</option>
              {diagrams
                .filter(d => !Object.values(quadrantState).includes(d))
                .map(d => (
                  <option key={d} value={d}>{d}</option>
                ))
              }
            </select>
                          <PanelAdditionOptions
                onAddPanel={handleAddPanel}
                selectedImage={selectedImage}
                panelCount={Object.values(quadrantState).filter(p => p !== null).length}
                quadrantState={quadrantState}
              />
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
              {Object.values(quadrantState).filter(p => p !== null).length}/4 diagrams loaded
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            WebSocket: {wsStatus} | Available diagrams: {diagrams.length}
          </div>
        </div>
      </div>

      {/* Global annotation controls */}
      <AnnotationControls
        annotationsEnabled={annotationsEnabled}
        setAnnotationsEnabled={setAnnotationsEnabled}
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
      />
      
      {/* Main content area - now takes up most of the screen */}
      <div style={{ flex: 1, padding: '4px' }}>
        <FlexiblePanelLayout 
          panels={getPanelsInOrder()}
          onLayoutChange={setLayout}
          layout={layout}
          setLayout={setLayout}
          quadrantState={quadrantState}
        />
      </div>
    </div>
  );
}

export default App; 