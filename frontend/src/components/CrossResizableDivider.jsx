import React, { useState, useEffect } from 'react';

const CrossResizableDivider = ({ onHorizontalResize, onVerticalResize, position }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'horizontal', 'vertical', or 'both'
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.preventDefault();
    console.log('CrossResizableDivider: Mouse down at', e.clientX, e.clientY);
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setLastPos({ x: e.clientX, y: e.clientY });
    setDragMode('both'); // Start in both mode, will be refined on first move
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const currentPos = { x: e.clientX, y: e.clientY };
      const deltaX = currentPos.x - lastPos.x;
      const deltaY = currentPos.y - lastPos.y;
      
      console.log('CrossResizableDivider: Mouse move', {
        currentPos,
        lastPos,
        deltaX,
        deltaY,
        position
      });
      
      // Always apply both horizontal and vertical resizing for cross-resize
      if (Math.abs(deltaX) > 0) {
        console.log('CrossResizableDivider: Calling onHorizontalResize with deltaX:', deltaX);
        onHorizontalResize(deltaX);
      }
      if (Math.abs(deltaY) > 0) {
        console.log('CrossResizableDivider: Calling onVerticalResize with deltaY:', deltaY);
        onVerticalResize(deltaY);
      }
      
      // Update lastPos for next move
      setLastPos(currentPos);
    };

    const handleMouseUp = () => {
      console.log('CrossResizableDivider: Mouse up');
      setIsDragging(false);
      setDragMode(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, lastPos, dragMode, onHorizontalResize, onVerticalResize, position]);

  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: '#007bff',
        cursor: 'move',
        zIndex: 1001,
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: '2px solid #fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '8px',
        color: '#fff',
        fontWeight: 'bold'
      }}
      onMouseDown={handleMouseDown}
      title="Drag to resize both directions"
    >
      ↕↔
    </div>
  );
};

export default CrossResizableDivider; 