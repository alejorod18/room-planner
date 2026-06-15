import { useState, useEffect } from 'react';

export interface Furniture {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
}

export interface RulerLine {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
}

export interface CalibrationLine {
  id: string;
  distancePx: number;
  valueMeters: number;
}

export const useEditorState = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [pixelsPerMeter, setPixelsPerMeter] = useState<number | null>(null);
  const [furnitures, setFurnitures] = useState<Furniture[]>([]);
  const [rulerLines, setRulerLines] = useState<RulerLine[]>([]);
  
  // Calibration state
  const [calibrationLines, setCalibrationLines] = useState<CalibrationLine[]>([]);

  const handleImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImage(img);
    };
  };

  const addFurniture = (width: number, height: number, label: string) => {
    const newFurniture: Furniture = {
      id: Math.random().toString(36).substr(2, 9),
      x: 100,
      y: 100,
      width,
      height,
      rotation: 0,
      label
    };
    setFurnitures([...furnitures, newFurniture]);
  };

  const updateFurniture = (id: string, updates: Partial<Furniture>) => {
    setFurnitures(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFurniture = (id: string) => {
    setFurnitures(prev => prev.filter(f => f.id !== id));
  };

  const duplicateFurniture = (id: string) => {
    setFurnitures(prev => {
      const original = prev.find(f => f.id === id);
      if (!original) return prev;
      
      const duplicate: Furniture = {
        ...original,
        id: Math.random().toString(36).substr(2, 9),
        x: original.x + 20, // Offset slightly so it's visible
        y: original.y + 20
      };
      return [...prev, duplicate];
    });
  };

  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [unit, setUnit] = useState<'m' | 'cm' | 'mm'>('m');

  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    if (image) {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0);
        setImageBase64(canvas.toDataURL('image/png'));
      }
    } else {
      setImageBase64(null);
    }
  }, [image]);

  const exportState = () => {
    return {
      imageBase64,
      pixelsPerMeter,
      furnitures,
      rulerLines,
      calibrationLines,
      unit
    };
  };

  const importState = (state: any, pId: string, pName: string) => {
    setPixelsPerMeter(state.pixelsPerMeter);
    setFurnitures(state.furnitures);
    setRulerLines(state.rulerLines || []);
    setCalibrationLines(state.calibrationLines || []);
    setProjectId(pId);
    setProjectName(pName);
    setUnit(state.unit || 'm');
    
    if (state.imageBase64) {
      const img = new window.Image();
      img.src = state.imageBase64;
      img.onload = () => setImage(img);
      setImageBase64(state.imageBase64);
    } else {
      setImage(null);
      setImageBase64(null);
    }
  };

  return {
    image,
    pixelsPerMeter,
    setPixelsPerMeter,
    handleImageUpload,
    furnitures,
    addFurniture,
    updateFurniture,
    removeFurniture,
    duplicateFurniture,
    rulerLines,
    setRulerLines,
    calibrationLines,
    setCalibrationLines,
    projectId,
    setProjectId,
    projectName,
    setProjectName,
    exportState,
    importState,
    unit,
    setUnit
  };
};
