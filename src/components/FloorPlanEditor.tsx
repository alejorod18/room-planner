import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
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

/** Stable per-item onChange wrapper */
const FurnitureItemWrapper = React.memo(({ data, pixelsPerMeter, updateFurniture, draggable }: {
  data: Furniture;
  pixelsPerMeter: number;
  updateFurniture: (id: string, updates: Partial<Furniture>) => void;
  draggable: boolean;
}) => {
  const onChange = useCallback((updates: Partial<Furniture>) => {
    updateFurniture(data.id, updates);
  }, [data.id, updateFurniture]);

  return (
    <FurnitureItem
      data={data}
      pixelsPerMeter={pixelsPerMeter}
      onChange={onChange}
      draggable={draggable}
    />
  );
});

function getDistance(p1: Touch, p2: Touch) {
  return Math.sqrt(
    (p2.clientX - p1.clientX) ** 2 + (p2.clientY - p1.clientY) ** 2
  );
}

function getCenter(p1: Touch, p2: Touch) {
  return {
    x: (p1.clientX + p2.clientX) / 2,
    y: (p1.clientY + p2.clientY) / 2,
  };
}

export const FloorPlanEditor: React.FC<FloorPlanEditorProps> = React.memo(({
  activeTool,
  image,
  pixelsPerMeter,
  furnitures,
  updateFurniture,
  onAddCalibrationLine,
  unit = 'm'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);

  // Resize observer
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

  // ========== WHEEL ZOOM (desktop) — imperative for smoothness ==========
  const wheelTimeout = useRef<any>(null);

  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.05;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    // Apply directly to stage — no React re-render
    stage.scaleX(newScale);
    stage.scaleY(newScale);
    stage.x(newPos.x);
    stage.y(newPos.y);
    stage.batchDraw();

    // Debounce React state sync to avoid lag during scroll
    if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
    wheelTimeout.current = setTimeout(() => {
      setStageScale(stage.scaleX());
      setStagePos({ x: stage.x(), y: stage.y() });
    }, 100);
  }, []);

  // ========== STAGE DRAG (move tool) ==========
  const handleDragEnd = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  }, []);

  // ========== TOUCH: pinch-to-zoom ==========
  const lastDist = useRef(0);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const isPinching = useRef(false);

  const handleTouchStart = useCallback((e: any) => {
    const touches = e.evt.touches;
    if (touches.length === 2) {
      isPinching.current = true;
      lastDist.current = getDistance(touches[0], touches[1]);
      lastCenter.current = getCenter(touches[0], touches[1]);
    } else if (touches.length === 1) {
      handleStageMouseDown(e);
    }
  }, []);

  const handleTouchMove = useCallback((e: any) => {
    e.evt.preventDefault();
    const touches = e.evt.touches;
    const stage = stageRef.current;
    if (!stage) return;

    if (touches.length === 2 && isPinching.current) {
      if (stage.isDragging()) {
        stage.stopDrag();
      }

      const t1 = touches[0];
      const t2 = touches[1];
      const dist = getDistance(t1, t2);
      const center = getCenter(t1, t2);

      if (!lastCenter.current || !lastDist.current) {
        lastDist.current = dist;
        lastCenter.current = center;
        return;
      }

      const oldScale = stage.scaleX();
      const pointTo = {
        x: (lastCenter.current.x - stage.x()) / oldScale,
        y: (lastCenter.current.y - stage.y()) / oldScale,
      };

      const scaleBy = dist / lastDist.current;
      // Clamp scale to prevent extreme zoom
      let newScale = oldScale * scaleBy;
      if (newScale < 0.1) newScale = 0.1;
      if (newScale > 20) newScale = 20;

      // Pan: follow the center of the two fingers
      const dx = center.x - lastCenter.current.x;
      const dy = center.y - lastCenter.current.y;

      const newPos = {
        x: center.x - pointTo.x * newScale + dx,
        y: center.y - pointTo.y * newScale + dy,
      };

      // Apply directly — no React render cycle
      stage.scaleX(newScale);
      stage.scaleY(newScale);
      stage.x(newPos.x);
      stage.y(newPos.y);
      stage.batchDraw();

      lastDist.current = dist;
      lastCenter.current = center;
    } else if (touches.length === 1 && !isPinching.current) {
      handleStageMouseMove(e);
    }
  }, []);

  const handleTouchEnd = useCallback((e: any) => {
    if (isPinching.current && e.evt.touches.length < 2) {
      isPinching.current = false;
      lastDist.current = 0;
      lastCenter.current = null;

      // Sync React state after gesture ends
      const stage = stageRef.current;
      if (stage) {
        setStageScale(stage.scaleX());
        setStagePos({ x: stage.x(), y: stage.y() });
      }
    } else if (!isPinching.current) {
      handleStageMouseUp();
    }
  }, []);

  // ========== RULER / CALIBRATION DRAWING ==========
  const [currentRulerPoints, setCurrentRulerPoints] = useState<number[]>([]);
  const isDrawingRuler = useRef(false);
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const onAddCalibrationLineRef = useRef(onAddCalibrationLine);
  onAddCalibrationLineRef.current = onAddCalibrationLine;
  const currentRulerPointsRef = useRef(currentRulerPoints);
  currentRulerPointsRef.current = currentRulerPoints;

  useEffect(() => {
    if (activeTool !== 'ruler' && activeTool !== 'calibrate') {
      setCurrentRulerPoints([]);
      isDrawingRuler.current = false;
    }
  }, [activeTool]);

  const handleStageMouseDown = useCallback((e: any) => {
    if (isPinching.current) return;
    if (activeToolRef.current !== 'ruler' && activeToolRef.current !== 'calibrate') return;
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    if (pos) {
      setCurrentRulerPoints([pos.x, pos.y, pos.x, pos.y]);
      isDrawingRuler.current = true;
    }
  }, []);

  const handleStageMouseMove = useCallback((e: any) => {
    if (isPinching.current) return;
    const tool = activeToolRef.current;
    if ((tool !== 'ruler' && tool !== 'calibrate') || !isDrawingRuler.current) return;
    const pts = currentRulerPointsRef.current;
    if (pts.length === 0) return;

    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    const dx = Math.abs(pos.x - pts[0]);
    const dy = Math.abs(pos.y - pts[1]);

    let newX = pos.x;
    let newY = pos.y;

    if (dx > dy) {
      newY = pts[1];
    } else {
      newX = pts[0];
    }

    setCurrentRulerPoints([pts[0], pts[1], newX, newY]);
  }, []);

  const handleStageMouseUp = useCallback(() => {
    const tool = activeToolRef.current;
    if (tool === 'ruler' || tool === 'calibrate') {
      isDrawingRuler.current = false;
      const pts = currentRulerPointsRef.current;
      if (pts.length < 4) return;

      const dx = pts[2] - pts[0];
      const dy = pts[3] - pts[1];
      const distancePx = Math.sqrt(dx * dx + dy * dy);

      if (tool === 'calibrate' && onAddCalibrationLineRef.current && distancePx >= 1) {
        onAddCalibrationLineRef.current(distancePx);
        setCurrentRulerPoints([]);
      }
    }
  }, []);

  const isDraggable = activeTool === 'move';
  const isFurnitureDraggable = activeTool === 'furniture' || activeTool === 'move';
  const ppm = pixelsPerMeter || 100;

  return (
    <div ref={containerRef} className="canvas-container" style={{ cursor: isDraggable ? 'grab' : 'crosshair', touchAction: 'none' }}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={isDraggable}
        onDragEnd={handleDragEnd}
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
            <FurnitureItemWrapper
              key={f.id}
              data={f}
              pixelsPerMeter={ppm}
              updateFurniture={updateFurniture}
              draggable={isFurnitureDraggable}
            />
          ))}
          <RulerTool
             points={currentRulerPoints}
             pixelsPerMeter={ppm}
             scale={stageScale}
             unit={unit}
          />
        </Layer>
      </Stage>
    </div>
  );
});
