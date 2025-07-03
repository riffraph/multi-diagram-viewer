# AnnotatedImage Component

A React component that provides drawing, shape, and text annotation capabilities using react-konva.

## Features

- **Freehand Drawing**: Pen tool for freehand annotations
- **Basic Shapes**: Rectangle, circle, and line drawing tools
- **Text Annotations**: Add and edit text overlays
- **Color Selection**: Choose colors for all drawing tools
- **Stroke Width**: Adjustable stroke width for drawing tools
- **Export to PNG**: Download the annotated image as PNG
- **Shape Selection**: Click to select and transform shapes
- **Responsive**: Automatically adjusts to container size

## Usage

```jsx
import AnnotatedImage from './components/AnnotatedImage';

function MyComponent() {
  return (
    <div style={{ width: '500px', height: '400px' }}>
      <AnnotatedImage
        imageUrl="https://example.com/image.png"
        width={500}
        height={400}
      />
    </div>
  );
}
```

## Props

- `imageUrl` (string): URL of the background image
- `width` (number): Width of the canvas
- `height` (number): Height of the canvas

## Tools

1. **Pen**: Click and drag to draw freehand lines
2. **Rectangle**: Click and drag to create rectangles
3. **Circle**: Click and drag to create circles
4. **Line**: Click and drag to create straight lines
5. **Text**: Click to place text, double-click to edit

## Controls

- **Color Picker**: Select color for drawing tools
- **Stroke Width Slider**: Adjust line thickness (1-20px)
- **Export PNG**: Download the annotated image
- **Clear All**: Remove all annotations

## Integration with react-grid-layout

The component automatically adjusts to the grid container size. Make sure to:

1. Pass the container dimensions as props
2. Update dimensions when the grid layout changes
3. Use `data-grid-key` attribute for proper dimension calculation

## Example with Grid Layout

```jsx
const DiagramPanel = ({ filename, onRemove }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector(`[data-grid-key="${filename}"]`);
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({
          width: rect.width - 16,
          height: rect.height - 60
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [filename]);

  return (
    <div className="diagram-panel">
      <div className="diagram-panel-header">
        <span>{filename}</span>
        <button onClick={() => onRemove(filename)}>×</button>
      </div>
      <div className="diagram-panel-content">
        <AnnotatedImage 
          imageUrl={imageSrc}
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>
    </div>
  );
};
``` 