import React from 'react';
import { GlassPanel } from './GlassPanel';
import { Hand, Ruler, PlusSquare, Image as ImageIcon, Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';

export type ToolType = 'move' | 'ruler' | 'furniture' | 'upload' | 'calibrate';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onSelectTool }) => {
  const tools = [
    { id: 'move', icon: Hand, label: 'Mover' },
    { id: 'calibrate', icon: Crosshair, label: 'Calibrar Escala' },
    { id: 'ruler', icon: Ruler, label: 'Regla' },
    { id: 'furniture', icon: PlusSquare, label: 'Mueble' },
    { id: 'upload', icon: ImageIcon, label: 'Plano' },
  ] as const;

  return (
    <GlassPanel variant="pill" className="toolbar-container">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        
        return (
          <motion.button
            key={tool.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectTool(tool.id)}
            className={`toolbar-btn ${isActive ? 'active' : ''}`}
            title={tool.label}
          >
            {isActive && (
              <motion.div
                layoutId="active-pill"
                className="toolbar-btn-active-bg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
          </motion.button>
        );
      })}
    </GlassPanel>
  );
};
