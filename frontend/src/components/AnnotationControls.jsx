import React from 'react';

const AnnotationControls = ({ 
  annotationsEnabled, 
  setAnnotationsEnabled, 
  tool, 
  setTool, 
  color, 
  setColor, 
  strokeWidth, 
  setStrokeWidth 
}) => {
  return (
    <div style={{ 
      padding: '4px 8px', 
      borderBottom: '1px solid #ddd',
      backgroundColor: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          type="checkbox"
          id="annotations-enabled"
          checked={annotationsEnabled}
          onChange={(e) => setAnnotationsEnabled(e.target.checked)}
          style={{ margin: 0 }}
        />
        <label htmlFor="annotations-enabled" style={{ margin: 0, cursor: 'pointer' }}>
          Annotations
        </label>
      </div>

      {annotationsEnabled && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Tool:</span>
            <select
              value={tool}
              onChange={(e) => setTool(e.target.value)}
              style={{
                padding: '2px 4px',
                fontSize: '11px',
                border: '1px solid #ddd',
                borderRadius: '2px'
              }}
            >
              <option value="pen">Pen</option>
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="line">Line</option>
              <option value="text">Text</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Color:</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: '20px',
                height: '20px',
                border: '1px solid #ddd',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Width:</span>
            <input
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              style={{
                width: '60px',
                height: '4px',
                borderRadius: '2px',
                background: `linear-gradient(to right, #007bff 0%, #007bff ${(strokeWidth - 1) / 9 * 100}%, #ddd ${(strokeWidth - 1) / 9 * 100}%, #ddd 100%)`,
                outline: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                appearance: 'none'
              }}
            />
            <span style={{ fontSize: '10px', minWidth: '15px' }}>{strokeWidth}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default AnnotationControls; 