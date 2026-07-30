import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

const MAGNETIC_RADIUS = 120;
const MAGNETIC_STRENGTH = 0.35;

export default function MagneticButton({ children, className = '', as = 'button', ...props }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MAGNETIC_RADIUS) {
      const pull = (1 - dist / MAGNETIC_RADIUS) * MAGNETIC_STRENGTH;
      setPos({ x: dx * pull, y: dy * pull });
    } else {
      setPos({ x: 0, y: 0 });
    }
  };

  const handleMouseLeave = () => {
    setPos({ x: 0, y: 0 });
  };

  const Component = motion[as] || motion.button;

  return (
    <Component
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', damping: 15, stiffness: 300, mass: 0.2 }}
      {...props}
    >
      {children}
    </Component>
  );
}
