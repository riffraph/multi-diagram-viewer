import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image, Line, Rect, Circle, Text, Transformer } from 'react-konva';

const AnnotatedImageWithZoom = ({ 
  imageUrl, 
  globalAnnotationSettings, 
  preservedAnnotations, 
  preservedZoomState, 
  onAnnotationsUpdate, 
  onZoomStateUpdate 
}) => {
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(preservedZoomState?.scale ?? 1);
  const [position, setPosition] = useState(preservedZoomState?.position ?? { x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use global annotation settings if provided, otherwise use local state
  const annotationsEnabled = globalAnnotationSettings?.annotationsEnabled ?? false;
  const tool = globalAnnotationSettings?.tool ?? 'pen';
  const color = globalAnnotationSettings?.color ?? '#ff0000';
  const strokeWidth = globalAnnotationSettings?.strokeWidth ?? 2;
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [isCreatingText, setIsCreatingText] = useState(false);
  
  // Annotation data - initialize with preserved state if available
  const [lines, setLines] = useState(preservedAnnotations?.lines ?? []);
  const [shapes, setShapes] = useState(preservedAnnotations?.shapes ?? []);
  const [texts, setTexts] = useState(preservedAnnotations?.texts ?? []);
  
  // Selection and editing
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  
  // Refs
  const stageRef = useRef();
  const transformerRef = useRef();
  const containerRef = useRef();

  // Notify parent of annotation changes
  useEffect(() => {
    if (onAnnotationsUpdate) {
      onAnnotationsUpdate({
        lines,
        shapes,
        texts
      });
    }
  }, [lines, shapes, texts, onAnnotationsUpdate]);

  // Notify parent of zoom state changes
  useEffect(() => {
    if (onZoomStateUpdate) {
      onZoomStateUpdate({
        scale,
        position
      });
    }
  }, [scale, position, onZoomStateUpdate]);

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setIsInitialized(false); // Reset initialization flag for new image
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Handle container sizing - measure the actual visible area
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Only update if we have valid dimensions
        if (rect.width > 50 && rect.height > 50) {
          setContainerSize({
            width: rect.width,
            height: rect.height
          });
        }
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      updateContainerSize();
    });

    // Update on window resize
    window.addEventListener('resize', updateContainerSize);
    
    // Update when layout changes
    const observer = new ResizeObserver(updateContainerSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateContainerSize);
      observer.disconnect();
    };
  }, []);

  // Center and fit image when it loads - use the same logic as the working Reset button
  useEffect(() => {
    if (image && !isInitialized) {
      // If we have preserved zoom state, use it; otherwise reset to default
      if (preservedZoomState) {
        setScale(preservedZoomState.scale);
        setPosition(preservedZoomState.position);
      } else {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
      setIsInitialized(true);
    }
  }, [image, isInitialized, preservedZoomState]);

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

  // Handle text creation prompt
  useEffect(() => {
    if (isCreatingText && currentShape && currentShape.type === 'text') {
      const textInput = prompt('Enter text:');
      if (textInput && textInput.trim()) {
        const newText = {
          id: Date.now().toString(),
          x: currentShape.x,
          y: currentShape.y,
          text: textInput.trim(),
          fontSize: 16,
          fill: color,
          draggable: true
        };
        setTexts([...texts, newText]);
        setSelectedId(newText.id);
        setSelectedType('text');
      }
      // Reset text creation mode
      setIsCreatingText(false);
      setCurrentShape(null);
    }
  }, [isCreatingText, currentShape, color, texts]);

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
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    // Transform coordinates from stage space to image space
    // First, convert from stage coordinates to stage-local coordinates
    const stageLocalX = (pointer.x - position.x) / scale;
    const stageLocalY = (pointer.y - position.y) / scale;
    
    // Then convert from stage-local coordinates to image coordinates
    const transformedPos = {
      x: (stageLocalX - imageX) / imageScale,
      y: (stageLocalY - imageY) / imageScale
    };
    
    // Ensure coordinates are within image bounds
    if (transformedPos.x < 0 || transformedPos.x > image.width || 
        transformedPos.y < 0 || transformedPos.y > image.height) {
      return; // Don't create annotations outside the image
    }
    
    if (tool === 'pen') {
      setIsDrawing(true);
      setCurrentLine([transformedPos.x, transformedPos.y]);
    } else if (tool === 'rectangle') {
      setCurrentShape({
        id: Date.now().toString(),
        type: 'rectangle',
        x: transformedPos.x,
        y: transformedPos.y,
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
        x: transformedPos.x,
        y: transformedPos.y,
        radius: 0,
        fill: 'transparent',
        stroke: color,
        strokeWidth: strokeWidth
      });
    } else if (tool === 'line') {
      setCurrentShape({
        id: Date.now().toString(),
        type: 'line',
        points: [transformedPos.x, transformedPos.y, transformedPos.x, transformedPos.y],
        stroke: color,
        strokeWidth: strokeWidth
      });
    } else if (tool === 'text' && !isCreatingText) {
      // Start text creation mode
      setIsCreatingText(true);
      // Store the position for when text is entered
      setCurrentShape({
        id: 'temp-text',
        type: 'text',
        x: transformedPos.x,
        y: transformedPos.y
      });
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
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    // Transform coordinates from stage space to image space
    // First, convert from stage coordinates to stage-local coordinates
    const stageLocalX = (pointer.x - position.x) / scale;
    const stageLocalY = (pointer.y - position.y) / scale;
    
    // Then convert from stage-local coordinates to image coordinates
    const transformedPos = {
      x: (stageLocalX - imageX) / imageScale,
      y: (stageLocalY - imageY) / imageScale
    };
    
    // Ensure coordinates are within image bounds
    if (transformedPos.x < 0 || transformedPos.x > image.width || 
        transformedPos.y < 0 || transformedPos.y > image.height) {
      return; // Don't update annotations outside the image
    }
    
    if (tool === 'pen' && isDrawing) {
      setCurrentLine([...currentLine, transformedPos.x, transformedPos.y]);
    } else if (currentShape) {
      if (currentShape.type === 'rectangle') {
        setCurrentShape({
          ...currentShape,
          width: transformedPos.x - currentShape.x,
          height: transformedPos.y - currentShape.y
        });
      } else if (currentShape.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(transformedPos.x - currentShape.x, 2) + Math.pow(transformedPos.y - currentShape.y, 2)
        );
        setCurrentShape({
          ...currentShape,
          radius
        });
      } else if (currentShape.type === 'line') {
        setCurrentShape({
          ...currentShape,
          points: [currentShape.points[0], currentShape.points[1], transformedPos.x, transformedPos.y]
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
    if (!annotationsEnabled || isCreatingText) return;
    
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
    if (!image || !stageRef.current) return;
    
    // Create a temporary canvas for high-quality export
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Use the original image dimensions for high quality
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
    // Draw the background image at full resolution
    ctx.drawImage(image, 0, 0, originalWidth, originalHeight);
    
    // Draw all annotations at the correct scale
    ctx.strokeStyle = '#000';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw lines
    lines.forEach(line => {
      ctx.strokeStyle = line.stroke;
      ctx.lineWidth = line.strokeWidth;
      ctx.beginPath();
      for (let i = 0; i < line.points.length; i += 2) {
        const x = line.points[i];
        const y = line.points[i + 1];
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });
    
    // Draw shapes
    shapes.forEach(shape => {
      ctx.strokeStyle = shape.stroke;
      ctx.fillStyle = shape.fill;
      ctx.lineWidth = shape.strokeWidth;
      
      if (shape.type === 'rectangle') {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        if (shape.fill !== 'transparent') {
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        }
      } else if (shape.type === 'circle') {
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
        ctx.stroke();
        if (shape.fill !== 'transparent') {
          ctx.fill();
        }
      } else if (shape.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(shape.points[0], shape.points[1]);
        ctx.lineTo(shape.points[2], shape.points[3]);
        ctx.stroke();
      }
    });
    
    // Draw text
    texts.forEach(text => {
      ctx.font = `${text.fontSize}px Arial`;
      ctx.fillStyle = text.fill;
      ctx.fillText(text.text, text.x, text.y);
    });
    
    // Export the high-quality canvas
    const dataURL = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = 'annotated-image.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          x={imageX + (shape.x * imageScale * scale)}
          y={imageY + (shape.y * imageScale * scale)}
          width={shape.width * imageScale * scale}
          height={shape.height * imageScale * scale}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          draggable={shape.draggable}
          onClick={handleShapeClick}
          onTap={handleShapeClick}
          onContextMenu={handleContextMenu}
          onDragEnd={(e) => handleShapeDragEnd(e, shape.id, 'shape')}
        />
      );
    } else if (shape.type === 'circle') {
      return (
        <Circle
          key={shape.id}
          id={shape.id}
          x={imageX + (shape.x * imageScale * scale)}
          y={imageY + (shape.y * imageScale * scale)}
          radius={shape.radius * imageScale * scale}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          draggable={shape.draggable}
          onClick={handleShapeClick}
          onTap={handleShapeClick}
          onContextMenu={handleContextMenu}
          onDragEnd={(e) => handleShapeDragEnd(e, shape.id, 'shape')}
        />
      );
    } else if (shape.type === 'line') {
      return (
        <Line
          key={shape.id}
          id={shape.id}
          points={shape.points.map((point, index) => {
            if (index % 2 === 0) {
              // X coordinate - transform from original image space to display space
              return imageX + (point * imageScale * scale);
            } else {
              // Y coordinate - transform from original image space to display space
              return imageY + (point * imageScale * scale);
            }
          })}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          draggable={shape.draggable}
          onClick={handleShapeClick}
          onTap={handleShapeClick}
          onContextMenu={handleContextMenu}
          onDragEnd={(e) => handleShapeDragEnd(e, shape.id, 'shape')}
        />
      );
    }
    return null;
  };

  const handleShapeDragEnd = (e, shapeId, shapeType) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    // Transform coordinates back to original image space
    const transformedPos = {
      x: (pointer.x - position.x - imageX) / (scale * imageScale),
      y: (pointer.y - position.y - imageY) / (scale * imageScale)
    };
    
    if (shapeType === 'text') {
      setTexts(texts.map(text => 
        text.id === shapeId 
          ? { ...text, x: transformedPos.x, y: transformedPos.y }
          : text
      ));
    } else if (shapeType === 'shape') {
      setShapes(shapes.map(shape => 
        shape.id === shapeId 
          ? { ...shape, x: transformedPos.x, y: transformedPos.y }
          : shape
      ));
    } else if (shapeType === 'line') {
      // For lines, we need to update all points
      const line = lines.find(l => l.id === shapeId);
      if (line) {
        const newPoints = [];
        for (let i = 0; i < line.points.length; i += 2) {
          const oldX = line.points[i];
          const oldY = line.points[i + 1];
          const displayX = imageX + (oldX * imageScale * scale);
          const displayY = imageY + (oldY * imageScale * scale);
          const deltaX = pointer.x - displayX;
          const deltaY = pointer.y - displayY;
          newPoints.push(oldX + (deltaX / (scale * imageScale)));
          newPoints.push(oldY + (deltaY / (scale * imageScale)));
        }
        setLines(lines.map(l => 
          l.id === shapeId 
            ? { ...l, points: newPoints }
            : l
        ));
      }
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Panel controls - export, clear, reset, and zoom slider */}
      <div style={{ 
        padding: '4px 6px', 
        borderBottom: '1px solid #ccc', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        backgroundColor: '#f8f9fa',
        zIndex: 1000,
        fontSize: '11px',
        justifyContent: 'space-between'
      }}>
        {/* Zoom slider */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          flex: 1,
          maxWidth: '200px'
        }}>
          <span style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>Zoom:</span>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={scale}
            onChange={(e) => {
              const newScale = parseFloat(e.target.value);
              // Calculate center of the container
              const centerX = containerSize.width / 2;
              const centerY = containerSize.height / 2;
              
              // Calculate the position to keep the center point fixed
              const mousePointTo = {
                x: (centerX - position.x) / scale,
                y: (centerY - position.y) / scale,
              };
              
              setScale(newScale);
              setPosition({
                x: centerX - mousePointTo.x * newScale,
                y: centerY - mousePointTo.y * newScale,
              });
            }}
            style={{ 
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: `linear-gradient(to right, #007bff 0%, #007bff ${(scale - 0.1) / 4.9 * 100}%, #ddd ${(scale - 0.1) / 4.9 * 100}%, #ddd 100%)`,
              outline: 'none',
              cursor: 'pointer',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
          />
          <span style={{ fontSize: '10px', minWidth: '30px', textAlign: 'right' }}>
            {Math.round(scale * 100)}%
          </span>

        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={exportToPNG}
            style={{
              backgroundColor: '#28a745',
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
            Export
          </button>
          
          <button
            onClick={clearAll}
            style={{
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              padding: '3px 6px',
              cursor: 'pointer',
              borderRadius: '3px',
              minWidth: '45px',
              textAlign: 'center',
              fontSize: '10px'
            }}
          >
            Clear
          </button>
          

        </div>
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
                  points={line.points.map((point, index) => {
                    if (index % 2 === 0) {
                      // X coordinate - transform from original image space to display space
                      return imageX + (point * imageScale * scale);
                    } else {
                      // Y coordinate - transform from original image space to display space
                      return imageY + (point * imageScale * scale);
                    }
                  })}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={line.draggable}
                  onClick={handleShapeClick}
                  onTap={handleShapeClick}
                  onContextMenu={handleContextMenu}
                  onDragEnd={(e) => handleShapeDragEnd(e, line.id, 'line')}
                />
              ))}
              
              {/* Current Line (while drawing) */}
              {currentLine.length > 0 && (
                <Line
                  points={currentLine.map((point, index) => {
                    if (index % 2 === 0) {
                      // X coordinate - transform from original image space to display space
                      return imageX + (point * imageScale * scale);
                    } else {
                      // Y coordinate - transform from original image space to display space
                      return imageY + (point * imageScale * scale);
                    }
                  })}
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
                  x={imageX + (text.x * imageScale * scale)}
                  y={imageY + (text.y * imageScale * scale)}
                  text={text.text}
                  fontSize={text.fontSize}
                  fill={text.fill}
                  draggable={text.draggable}
                  onClick={handleShapeClick}
                  onTap={handleShapeClick}
                  onDblClick={handleTextDblClick}
                  onDblTap={handleTextDblClick}
                  onContextMenu={handleContextMenu}
                  onDragEnd={(e) => handleShapeDragEnd(e, text.id, 'text')}
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