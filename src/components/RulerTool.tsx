import React from 'react';
import { Group, Line, Text, Label, Tag } from 'react-konva';

interface RulerToolProps {
  points: number[];
  pixelsPerMeter: number;
  scale: number;
  unit?: 'm' | 'cm' | 'mm';
}

export const RulerTool: React.FC<RulerToolProps> = ({ points, pixelsPerMeter, scale, unit = 'm' }) => {
  if (points.length < 4) return null;

  const dx = points[2] - points[0];
  const dy = points[3] - points[1];
  const distancePx = Math.sqrt(dx * dx + dy * dy);
  const distanceMeters = distancePx / pixelsPerMeter;

  const midX = (points[0] + points[2]) / 2;
  const midY = (points[1] + points[3]) / 2;

  let displayValue = '';
  if (unit === 'cm') {
    displayValue = `${(distanceMeters * 100).toFixed(1)} cm`;
  } else if (unit === 'mm') {
    displayValue = `${(distanceMeters * 1000).toFixed(0)} mm`;
  } else {
    displayValue = `${distanceMeters.toFixed(2)} m`;
  }

  return (
    <Group>
      <Line
        points={points}
        stroke="#FF453A" // iOS danger/alert red for visibility
        strokeWidth={2 / scale}
        dash={[10 / scale, 5 / scale]}
      />
      {distancePx >= 1 && (
        <Label x={midX} y={midY} opacity={0.85}>
          <Tag fill="#1c1c1e" cornerRadius={4} pointerDirection="down" pointerWidth={10} pointerHeight={10} />
          <Text
            text={displayValue}
            fontFamily="Inter"
            fontSize={14 / scale}
            padding={5 / scale}
            fill="white"
          />
        </Label>
      )}
    </Group>
  );
};
