import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image, Line, Rect, Circle, Text, Transformer } from 'react-konva';

const AnnotatedImageWithZoom = ({ imageUrl }) => {
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  
  // Annotation states
  const [annotationsEnabled, setAnnotationsEnabled] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  
  // Annotation data
  const [lines, setLines] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [texts, setTexts] = useState([]);
  
  // Selection and editing
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  
  // Refs
  const stageRef = useRef();
  const transformerRef = useRef();
  const containerRef = useRef();

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Handle container sizing
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    // Initial update
    updateContainerSize();

    // Update on window resize
    window.addEventListener('resize', updateContainerSize);
    
    // Update when layout changes
    const observer = new ResizeObserver(updateContainerSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateContainerSize);
      observer.disconnect();
    };
  }, []);

  // Handle transformer updates
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node = stageRef.current.findOne(`#${selectedId}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const getImageScale = () => {
    if (!image || !containerSize.width || !containerSize.height) return 1;
    const imageAspect = image.width / image.height;
    const containerAspect = containerSize.width / containerSize.height;
    
    if (containerAspect > imageAspect) {
      return containerSize.height / image.height;
    } else {
      return containerSize.width / image.width;
    }
  };

  const getImagePosition = () => {
    if (!image || !containerSize.width || !containerSize.height) return { x: 0, y: 0 };
    const scale = getImageScale();
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    return {
      x: (containerSize.width - scaledWidth) / 2,
      y: (containerSize.height - scaledHeight) / 2
    };
  };

  const imageScale = getImageScale();
  const imagePos = getImagePosition();
  const scaledWidth = image ? image.width * imageScale : 0;
  const scaledHeight = image ? image.height * imageScale : 0;
  const imageX = imagePos.x;
  const imageY = imagePos.y;

  const handleMouseDown = (e) => {
    if (e.evt.button === 2) {
      // Right mouse button - start panning
      e.evt.preventDefault();
      e.evt.stopPropagation();
      setIsPanning(true);
      setLastPanPoint(e.target.getStage().getPointerPosition());
      return;
    }
    
    if (!annotationsEnabled || e.evt.button !== 0) return;
    
    e.evt.preventDefault();
    e.evt.stopPropagation();
    
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'pen') {
      setIsDrawing(true);
      setCurrentLine([pos.x, pos.y]);
    } else if (tool === 'rectangle') {
      setCurrentShape({
        id: Date.now().toString(),
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: color,
        strokeWidth: strokeWidth
      });
    } else if (tool === 'circle') {
      setCurrentShape({
        id: Date.now().toString(),
        type: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 0,
        fill: 'transparent',
        stroke: color,
        strokeWidth: strokeWidth
      });
    } else if (tool === 'line') {
      setCurrentShape({
        id: Date.now().toString(),
        type: 'line',
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: color,
        strokeWidth: strokeWidth
      });
    } else if (tool === 'text') {
      // Prompt for text input
      const textInput = prompt('Enter text:');
      if (textInput && textInput.trim()) {
        const newText = {
          id: Date.now().toString(),
          x: pos.x,
          y: pos.y,
          text: textInput.trim(),
          fontSize: 16,
          fill: color,
          draggable: true
        };
        setTexts([...texts, newText]);
        setSelectedId(newText.id);
        setSelectedType('text');
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      // Handle panning
      e.evt.preventDefault();
      e.evt.stopPropagation();
      const pos = e.target.getStage().getPointerPosition();
      const dx = pos.x - lastPanPoint.x;
      const dy = pos.y - lastPanPoint.y;
      
      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      setLastPanPoint(pos);
      return;
    }
    
    if (!annotationsEnabled || (!isDrawing && !currentShape)) return;
    
    e.evt.preventDefault();
    e.evt.stopPropagation();
    
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'pen' && isDrawing) {
      setCurrentLine([...currentLine, pos.x, pos.y]);
    } else if (currentShape) {
      if (currentShape.type === 'rectangle') {
        setCurrentShape({
          ...currentShape,
          width: pos.x - currentShape.x,
          height: pos.y - currentShape.y
        });
      } else if (currentShape.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pos.x - currentShape.x, 2) + Math.pow(pos.y - currentShape.y, 2)
        );
        setCurrentShape({
          ...currentShape,
          radius
        });
      } else if (currentShape.type === 'line') {
        setCurrentShape({
          ...currentShape,
          points: [currentShape.points[0], currentShape.points[1], pos.x, pos.y]
        });
      }
    }
  };

  const handleMouseUp = (e) => {
    if (e.evt.button === 2) {
      // Right mouse button - stop panning
      setIsPanning(false);
      return;
    }
    
    if (!annotationsEnabled || e.evt.button !== 0) return;
    
    e.evt.preventDefault();
    e.evt.stopPropagation();
    
    if (tool === 'pen' && isDrawing) {
      setLines([...lines, { 
        id: Date.now().toString(),
        points: currentLine, 
        stroke: color, 
        strokeWidth,
        draggable: true
      }]);
      setCurrentLine([]);
      setIsDrawing(false);
    } else if (currentShape) {
      setShapes([...shapes, { ...currentShape, draggable: true }]);
      setCurrentShape(null);
    }
  };

  const handleShapeClick = (e) => {
    if (!annotationsEnabled) return;
    
    e.evt.preventDefault();
    e.evt.stopPropagation();
    
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
      setSelectedType(null);
      setShowContextMenu(false);
      return;
    }
    
    const clickedOnTransformer = e.target.getParent().className === 'Transformer';
    if (clickedOnTransformer) {
      return;
    }
    
    const id = e.target.id();
    setSelectedId(id);
    
    // Determine the type of selected annotation
    if (texts.find(t => t.id === id)) {
      setSelectedType('text');
    } else if (shapes.find(s => s.id === id)) {
      setSelectedType('shape');
    } else if (lines.find(l => l.id === id)) {
      setSelectedType('line');
    }
  };

  const handleContextMenu = (e) => {
    if (!annotationsEnabled || !selectedId) return;
    
    e.evt.preventDefault();
    e.evt.stopPropagation();
    
    setShowContextMenu(true);
    setContextMenuPos({ x: e.evt.clientX, y: e.evt.clientY });
  };

  const handleTextDblClick = (e) => {
    if (!annotationsEnabled) return;
    
    e.evt.preventDefault();
    e.evt.stopPropagation();
    
    const textNode = e.target;
    const currentText = textNode.text();
    const newText = prompt('Edit text:', currentText);
    
    if (newText !== null && newText !== currentText) {
      const updatedTexts = texts.map(t => 
        t.id === textNode.id() ? { ...t, text: newText } : t
      );
      setTexts(updatedTexts);
    }
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    
    setTexts(texts.filter(t => t.id !== selectedId));
    setShapes(shapes.filter(s => s.id !== selectedId));
    setLines(lines.filter(l => l.id !== selectedId));
    setSelectedId(null);
    setSelectedType(null);
    setShowContextMenu(false);
  };

  const changeColor = () => {
    if (!selectedId) return;
    
    const newColor = prompt('Enter new color (hex):', color);
    if (newColor && /^#[0-9A-F]{6}$/i.test(newColor)) {
      setTexts(texts.map(t => 
        t.id === selectedId ? { ...t, fill: newColor } : t
      ));
      setShapes(shapes.map(s => 
        s.id === selectedId ? { ...s, stroke: newColor } : s
      ));
      setLines(lines.map(l => 
        l.id === selectedId ? { ...l, stroke: newColor } : l
      ));
    }
  };

  const editText = () => {
    if (!selectedId || selectedType !== 'text') return;
    
    const textObj = texts.find(t => t.id === selectedId);
    if (textObj) {
      const newText = prompt('Edit text:', textObj.text);
      if (newText !== null && newText !== textObj.text) {
        setTexts(texts.map(t => 
          t.id === selectedId ? { ...t, text: newText } : t
        ));
      }
    }
  };

  const exportToPNG = () => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = 'annotated-image.png';
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const clearAll = () => {
    setLines([]);
    setShapes([]);
    setTexts([]);
    setSelectedId(null);
    setSelectedType(null);
    setShowContextMenu(false);
  };

  const renderShape = (shape) => {
    if (shape.type === 'rectangle') {
      return (
        <Rect
          key={shape.id}
          id={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          draggable={shape.draggable}
          onClick={handleShapeClick}
          onTap={handleShapeClick}
          onContextMenu={handleContextMenu}
        />
      );
    } else if (shape.type === 'circle') {
      return (
        <Circle
          key={shape.id}
          id={shape.id}
          x={shape.x}
          y={shape.y}
          radius={shape.radius}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          draggable={shape.draggable}
          onClick={handleShapeClick}
          onTap={handleShapeClick}
          onContextMenu={handleContextMenu}
        />
      );
    } else if (shape.type === 'line') {
      return (
        <Line
          key={shape.id}
          id={shape.id}
          points={shape.points}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          draggable={shape.draggable}
          onClick={handleShapeClick}
          onTap={handleShapeClick}
          onContextMenu={handleContextMenu}
        />
      );
    }
    return null;
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Toolbar */}
      <div style={{ 
        padding: '4px 6px', 
        borderBottom: '1px solid #ccc', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        backgroundColor: '#f8f9fa',
        zIndex: 1000,
        flexWrap: 'wrap',
        minHeight: '32px',
        overflow: 'hidden',
        fontSize: '11px'
      }}>
        {/* Annotation Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '10px' }}>Annotations:</span>
          <button
            onClick={() => setAnnotationsEnabled(!annotationsEnabled)}
            style={{ 
              backgroundColor: annotationsEnabled ? '#28a745' : '#dc3545',
              color: '#fff',
              border: 'none',
              padding: '3px 6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderRadius: '3px',
              minWidth: '30px',
              textAlign: 'center',
              fontSize: '10px'
            }}
          >
            {annotationsEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '3px',
          opacity: annotationsEnabled ? 1 : 0.5,
          pointerEvents: annotationsEnabled ? 'auto' : 'none',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setTool('pen')}
            style={{ 
              backgroundColor: tool === 'pen' ? '#007bff' : '#fff',
              color: tool === 'pen' ? '#fff' : '#000',
              border: '1px solid #ccc',
              padding: '3px 6px',
              cursor: annotationsEnabled ? 'pointer' : 'not-allowed',
              borderRadius: '3px',
              minWidth: '40px',
              textAlign: 'center',
              fontSize: '10px'
            }}
          >
            Pen
          </button>
          <button
            onClick={() => setTool('rectangle')}
            style={{ 
              backgroundColor: tool === 'rectangle' ? '#007bff' : '#fff',
              color: tool === 'rectangle' ? '#fff' : '#000',
              border: '1px solid #ccc',
              padding: '3px 6px',
              cursor: annotationsEnabled ? 'pointer' : 'not-allowed',
              borderRadius: '3px',
              minWidth: '40px',
              textAlign: 'center',
              fontSize: '10px'
            }}
          >
            Rect
          </button>
          <button
            onClick={() => setTool('circle')}
            style={{ 
              backgroundColor: tool === 'circle' ? '#007bff' : '#fff',
              color: tool === 'circle' ? '#fff' : '#000',
              border: '1px solid #ccc',
              padding: '3px 6px',
              cursor: annotationsEnabled ? 'pointer' : 'not-allowed',
              borderRadius: '3px',
              minWidth: '40px',
              textAlign: 'center',
              fontSize: '10px'
            }}
          >
            Circle
          </button>
          <button
            onClick={() => setTool('line')}
            style={{ 
              backgroundColor: tool === 'line' ? '#007bff' : '#fff',
              color: tool === 'line' ? '#fff' : '#000',
              border: '1px solid #ccc',
              padding: '3px 6px',
              cursor: annotationsEnabled ? 'pointer' : 'not-allowed',
              borderRadius: '3px',
              minWidth: '40px',
              textAlign: 'center',
              fontSize: '10px'
            }}
          >
            Line
          </button>
          <button
            onClick={() => setTool('text')}
            style={{ 
              backgroundColor: tool === 'text' ? '#007bff' : '#fff',
              color: tool === 'text' ? '#fff' : '#000',
              border: '1px solid #ccc',
              padding: '3px 6px',
              cursor: annotationsEnabled ? 'pointer' : 'not-allowed',
              borderRadius: '3px',
              minWidth: '40px',
              textAlign: 'center',
              fontSize: '10px'
            }}
          >
            Text
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '3px',
          opacity: annotationsEnabled ? 1 : 0.5,
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '10px' }}>Color:</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ 
              width: '20px', 
              height: '20px', 
              border: 'none', 
              cursor: annotationsEnabled ? 'pointer' : 'not-allowed'
            }}
            disabled={!annotationsEnabled}
          />
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '3px',
          opacity: annotationsEnabled ? 1 : 0.5,
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '10px' }}>Width:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            style={{ width: '40px' }}
            disabled={!annotationsEnabled}
          />
          <span style={{ fontSize: '10px' }}>{strokeWidth}</span>
        </div>

        {/* Selection Controls */}
        {selectedId && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '3px',
            borderLeft: '1px solid #ccc',
            paddingLeft: '8px',
            marginLeft: '8px'
          }}>
            <span style={{ fontSize: '10px', color: '#666' }}>
              Selected: {selectedType}
            </span>
            <button
              onClick={deleteSelected}
              style={{
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                padding: '3px 6px',
                cursor: 'pointer',
                borderRadius: '3px',
                fontSize: '10px'
              }}
            >
              Delete
            </button>
            <button
              onClick={changeColor}
              style={{
                backgroundColor: '#ffc107',
                color: '#000',
                border: 'none',
                padding: '3px 6px',
                cursor: 'pointer',
                borderRadius: '3px',
                fontSize: '10px'
              }}
            >
              Color
            </button>
            {selectedType === 'text' && (
              <button
                onClick={editText}
                style={{
                  backgroundColor: '#17a2b8',
                  color: '#fff',
                  border: 'none',
                  padding: '3px 6px',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  fontSize: '10px'
                }}
              >
                Edit
              </button>
            )}
          </div>
        )}
        
        <button
          onClick={exportToPNG}
          style={{
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            padding: '3px 6px',
            cursor: 'pointer',
            marginLeft: 'auto',
            borderRadius: '3px',
            minWidth: '50px',
            textAlign: 'center',
            fontSize: '10px'
          }}
        >
          Export
        </button>
        
        <button
          onClick={clearAll}
          style={{
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            padding: '3px 6px',
            cursor: annotationsEnabled ? 'pointer' : 'not-allowed',
            opacity: annotationsEnabled ? 1 : 0.5,
            borderRadius: '3px',
            minWidth: '45px',
            textAlign: 'center',
            fontSize: '10px'
          }}
          disabled={!annotationsEnabled}
        >
          Clear
        </button>
        
        <button
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
          style={{
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            padding: '3px 6px',
            cursor: 'pointer',
            borderRadius: '3px',
            minWidth: '50px',
            textAlign: 'center',
            fontSize: '10px'
          }}
        >
          Reset
        </button>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        style={{ 
          flex: 1, 
          position: 'relative', 
          overflow: 'hidden',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          touchAction: 'none'
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${containerSize.width}px`,
          height: `${containerSize.height}px`,
          overflow: 'hidden',
          border: '1px solid #ddd'
        }}>
          <Stage
            ref={stageRef}
            width={containerSize.width}
            height={containerSize.height}
            draggable={false}
            listening={true}
            data-konva-stage="true"
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            onClick={handleShapeClick}
            onTap={handleShapeClick}
            onWheel={(e) => {
              e.evt.preventDefault();
              e.evt.stopPropagation();
              
              const stage = e.target.getStage();
              const oldScale = stage.scaleX();
              const pointer = stage.getPointerPosition();
              
              const mousePointTo = {
                x: (pointer.x - stage.x()) / oldScale,
                y: (pointer.y - stage.y()) / oldScale,
              };
              
              const direction = e.evt.deltaY > 0 ? -1 : 1;
              const scaleBy = 1.1;
              const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
              
              // Limit zoom range
              const clampedScale = Math.max(0.1, Math.min(5, newScale));
              
              setScale(clampedScale);
              setPosition({
                x: pointer.x - mousePointTo.x * clampedScale,
                y: pointer.y - mousePointTo.y * clampedScale,
              });
            }}
          >
            <Layer>
              {/* Background Image */}
              {image && (
                <Image
                  image={image}
                  x={imageX}
                  y={imageY}
                  width={scaledWidth}
                  height={scaledHeight}
                  draggable={false}
                />
              )}
              
              {/* Existing Lines */}
              {lines.map((line) => (
                <Line
                  key={line.id}
                  id={line.id}
                  points={line.points}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={line.draggable}
                  onClick={handleShapeClick}
                  onTap={handleShapeClick}
                  onContextMenu={handleContextMenu}
                />
              ))}
              
              {/* Current Line (while drawing) */}
              {currentLine.length > 0 && (
                <Line
                  points={currentLine}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={false}
                />
              )}
              
              {/* Existing Shapes */}
              {shapes.map(renderShape)}
              
              {/* Current Shape (while drawing) */}
              {currentShape && renderShape(currentShape)}
              
              {/* Text Annotations */}
              {texts.map((text) => (
                <Text
                  key={text.id}
                  id={text.id}
                  x={text.x}
                  y={text.y}
                  text={text.text}
                  fontSize={text.fontSize}
                  fill={text.fill}
                  draggable={text.draggable}
                  onClick={handleShapeClick}
                  onTap={handleShapeClick}
                  onDblClick={handleTextDblClick}
                  onDblTap={handleTextDblClick}
                  onContextMenu={handleContextMenu}
                />
              ))}
              
              {/* Transformer for selected shapes */}
              {annotationsEnabled && <Transformer ref={transformerRef} />}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && selectedId && (
        <div
          style={{
            position: 'fixed',
            top: contextMenuPos.y,
            left: contextMenuPos.x,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 10000,
            padding: '4px 0',
            fontSize: '12px'
          }}
          onClick={() => setShowContextMenu(false)}
        >
          <div
            style={{
              padding: '4px 12px',
              cursor: 'pointer',
              hover: { backgroundColor: '#f0f0f0' }
            }}
            onClick={deleteSelected}
          >
            Delete
          </div>
          <div
            style={{
              padding: '4px 12px',
              cursor: 'pointer',
              hover: { backgroundColor: '#f0f0f0' }
            }}
            onClick={changeColor}
          >
            Change Color
          </div>
          {selectedType === 'text' && (
            <div
              style={{
                padding: '4px 12px',
                cursor: 'pointer',
                hover: { backgroundColor: '#f0f0f0' }
              }}
              onClick={editText}
            >
              Edit Text
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnotatedImageWithZoom; 