import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { Furniture } from '../hooks/useEditorState';

interface FurnitureItemProps {
  data: Furniture;
  pixelsPerMeter: number;
  onChange: (updates: Partial<Furniture>) => void;
  draggable: boolean;
}

export const FurnitureItem: React.FC<FurnitureItemProps> = React.memo(({ data, pixelsPerMeter, onChange, draggable }) => {
  const widthPx = data.width * pixelsPerMeter;
  const heightPx = data.height * pixelsPerMeter;
  
  const approxCharWidth = 0.6; // Ratio promedio de ancho de caracter vs tamaño de fuente
  const maxFontSizeByWidth = (widthPx * 0.9) / (Math.max(data.label.length, 1) * approxCharWidth);
  const maxFontSizeByHeight = heightPx * 0.6; // 60% del alto para no ocupar todo verticalmente
  const fontSize = Math.min(maxFontSizeByWidth, maxFontSizeByHeight);

  return (
    <Group
      x={data.x}
      y={data.y}
      draggable={draggable}
      onDragEnd={(e) => {
        onChange({
          x: e.target.x(),
          y: e.target.y()
        });
      }}
      rotation={data.rotation}
    >
      <Rect
        width={widthPx}
        height={heightPx}
        fill="rgba(10, 132, 255, 0.4)" // Accent color with transparency
        stroke="rgba(10, 132, 255, 0.8)"
        strokeWidth={2}
        cornerRadius={4}
        perfectDrawEnabled={false}
      />
      <Text
        text={data.label}
        width={widthPx}
        height={heightPx}
        align="center"
        verticalAlign="middle"
        fill="white"
        fontSize={fontSize}
        fontFamily="Inter"
        wrap="none"
        perfectDrawEnabled={false}
        listening={false} // Text doesn't need to intercept touch events
      />
    </Group>
  );
});
