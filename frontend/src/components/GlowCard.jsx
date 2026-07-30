import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const GlowCard = ({ children, className = '', colorClass = 'rgba(255,255,255,0.1)', tilt = true }) => {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [tiltValues, setTiltValues] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });

    if (tilt) {
      // Calculate tilt based on mouse position relative to center
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4; // Max 4deg tilt
      const rotateY = ((x - centerX) / centerX) * 4;
      setTiltValues({ rotateX, rotateY });
    }
  }, [tilt]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTiltValues({ rotateX: 0, rotateY: 0 });
  }, []);

  // Calculate angle for conic gradient rotation
  const angle = cardRef.current
    ? Math.atan2(
        mousePosition.y - cardRef.current.getBoundingClientRect().height / 2,
        mousePosition.x - cardRef.current.getBoundingClientRect().width / 2
      ) * (180 / Math.PI) + 180
    : 0;

  return (
    <motion.div
      ref={cardRef}
      className={`glow-card-interactive relative rounded-3xl overflow-hidden bg-[#0A0A0F] border border-white/5 transition-colors duration-300 group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tiltValues.rotateX,
        rotateY: tiltValues.rotateY,
      }}
      transition={{ type: 'spring', damping: 20, stiffness: 300, mass: 0.3 }}
      style={{
        perspective: 800,
        transformStyle: 'preserve-3d',
        willChange: isHovered ? 'transform' : 'auto',
      }}
    >
      {/* Soft interior radial glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(500px circle at ${mousePosition.x}px ${mousePosition.y}px, ${colorClass.replace(/[\d.]+\)$/, '0.06)')}, transparent 60%)`,
        }}
      />

      {/* Conic gradient border glow (Raycast-style) */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 rounded-3xl"
        style={{
          opacity: isHovered ? 0.7 : 0,
          background: `conic-gradient(from ${angle}deg at ${mousePosition.x}px ${mousePosition.y}px, ${colorClass}, transparent 40%, transparent 60%, ${colorClass.replace(/[\d.]+\)$/, '0.3)')})`,
          WebkitMaskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          padding: '1px',
        }}
      />

      {/* Spotlight edge glow */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 rounded-3xl opacity-0 group-hover:opacity-100"
        style={{
          boxShadow: isHovered 
            ? `inset 0px 0px 60px -25px ${colorClass}` 
            : 'none',
        }}
      />

      {/* Content */}
      <div className="relative z-20 w-full h-full p-px">
        {children}
      </div>
    </motion.div>
  );
};

export default GlowCard;
