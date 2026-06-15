import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import type { ToolType } from './Toolbar';
import { FurnitureItem } from './FurnitureItem';
import { RulerTool } from './RulerTool';
import type { Furniture } from '../hooks/useEditorState';

interface FloorPlanEditorProps {
  activeTool: ToolType;
  image: HTMLImageElement | null;
  pixelsPerMeter: number | null;
  furnitures: Furniture[];
  updateFurniture: (id: string, updates: Partial<Furniture>) => void;
  onAddCalibrationLine?: (distancePx: number) => void;
  unit?: 'm' | 'cm' | 'mm';
}

export const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({
  activeTool,
  image,
  pixelsPerMeter,
  furnitures,
  updateFurniture,
  onAddCalibrationLine,
  unit = 'm'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);

  // Resize observer to keep canvas full screen
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setDimensions({
        width: entries[0].contentRect.width,
        height: entries[0].contentRect.height
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const scaleBy = 1.05;
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // deltaY < 0 means scrolling up / zooming in
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleDragEnd = (e: any) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  };

  const lastCenter = useRef<{x: number, y: number} | null>(null);
  const lastDist = useRef(0);

  const handleTouchMove = (e: any) => {
    e.evt.preventDefault();
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
      // pinch to zoom
      const stage = e.target.getStage();
      if (!stage) return;
      if (stage.isDragging()) {
        stage.stopDrag();
      }

      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };

      const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

      if (!lastDist.current) {
        lastDist.current = dist;
      }

      const newCenter = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };

      if (!lastCenter.current) {
        lastCenter.current = newCenter;
        return;
      }

      const pointTo = {
        x: (newCenter.x - stage.x()) / stage.scaleX(),
        y: (newCenter.y - stage.y()) / stage.scaleY(),
      };

      const scaleBy = dist / lastDist.current;
      let newScale = stage.scaleX() * scaleBy;

      const newPos = {
        x: newCenter.x - pointTo.x * newScale,
        y: newCenter.y - pointTo.y * newScale,
      };

      setStageScale(newScale);
      setStagePos(newPos);
      lastDist.current = dist;
      lastCenter.current = newCenter;
    } else if (touch1 && !touch2) {
      handleStageMouseMove(e);
    }
  };

  const handleTouchEnd = () => {
    lastDist.current = 0;
    lastCenter.current = null;
    handleStageMouseUp();
  };

  const [currentRulerPoints, setCurrentRulerPoints] = useState<number[]>([]);
  const isDrawingRuler = useRef(false);

  useEffect(() => {
    if (activeTool !== 'ruler' && activeTool !== 'calibrate') {
      setCurrentRulerPoints([]);
      isDrawingRuler.current = false;
    }
  }, [activeTool]);

  const handleStageMouseDown = (e: any) => {
    if (activeTool !== 'ruler' && activeTool !== 'calibrate') return;
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    if (pos) {
      setCurrentRulerPoints([pos.x, pos.y, pos.x, pos.y]);
      isDrawingRuler.current = true;
    }
  };

  const handleStageMouseMove = (e: any) => {
    if ((activeTool !== 'ruler' && activeTool !== 'calibrate') || !isDrawingRuler.current || currentRulerPoints.length === 0) return;
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;
    
    const dx = Math.abs(pos.x - currentRulerPoints[0]);
    const dy = Math.abs(pos.y - currentRulerPoints[1]);
    
    let newX = pos.x;
    let newY = pos.y;
    
    if (dx > dy) {
      newY = currentRulerPoints[1];
    } else {
      newX = currentRulerPoints[0];
    }

    setCurrentRulerPoints([currentRulerPoints[0], currentRulerPoints[1], newX, newY]);
  };

  const handleStageMouseUp = () => {
    if (activeTool === 'ruler' || activeTool === 'calibrate') {
      isDrawingRuler.current = false;
      
      const dx = currentRulerPoints[2] - currentRulerPoints[0];
      const dy = currentRulerPoints[3] - currentRulerPoints[1];
      const distancePx = Math.sqrt(dx * dx + dy * dy);
      
      if (activeTool === 'calibrate' && onAddCalibrationLine && distancePx >= 1) {
        onAddCalibrationLine(distancePx);
        setCurrentRulerPoints([]);
      }
    }
  };

  return (
    <div ref={containerRef} className="canvas-container" style={{ cursor: activeTool === 'move' ? 'grab' : 'crosshair' }}>
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={(e) => {
          if (e.evt.touches.length === 1) {
            handleStageMouseDown(e);
          }
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={activeTool === 'move'}
        onDragEnd={handleDragEnd}
        className={activeTool === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}
      >
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              x={0}
              y={0}
            />
          )}
          {furnitures.map(f => (
            <FurnitureItem 
              key={f.id} 
              data={f} 
              pixelsPerMeter={pixelsPerMeter || 100} // Fallback to 100px = 1m if not set
              onChange={(updates) => updateFurniture(f.id, updates)}
              draggable={activeTool === 'furniture' || activeTool === 'move'}
            />
          ))}
          <RulerTool 
             points={currentRulerPoints} 
             pixelsPerMeter={pixelsPerMeter || 100} 
             scale={stageScale}
             unit={unit}
          />
        </Layer>
      </Stage>
    </div>
  );
};
