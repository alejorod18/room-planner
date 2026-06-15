import React from 'react';
import { motion } from 'framer-motion';

interface GlassPanelProps extends React.ComponentProps<typeof motion.div> {
  children: React.ReactNode;
  className?: string;
  variant?: 'panel' | 'pill';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ 
  children, 
  className = '', 
  variant = 'panel',
  ...props 
}) => {
  const baseClass = variant === 'pill' ? 'glass-pill' : 'glass-panel';
  
  return (
    <motion.div 
      className={`${baseClass} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
