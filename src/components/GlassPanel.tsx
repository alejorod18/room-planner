import React, { useRef } from 'react';
import { motion } from 'framer-motion';

interface GlassPanelProps extends React.ComponentProps<typeof motion.div> {
  children: React.ReactNode;
  className?: string;
  variant?: 'panel' | 'pill';
}

export const GlassPanel: React.FC<GlassPanelProps> = React.memo(({ 
  children, 
  className = '', 
  variant = 'panel',
  ...props 
}) => {
  const baseClass = variant === 'pill' ? 'glass-pill' : 'glass-panel';
  const hasAnimated = useRef(false);

  // Only animate on first mount, skip on subsequent re-renders
  const shouldAnimate = !hasAnimated.current;
  if (shouldAnimate) hasAnimated.current = true;
  
  return (
    <motion.div 
      className={`${baseClass} ${className}`}
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
});
