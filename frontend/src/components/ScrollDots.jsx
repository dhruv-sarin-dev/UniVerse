import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SECTIONS = [
  { id: 'hero', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'tech', label: 'Stack' },
  { id: 'footer', label: 'Footer' },
];

export default function ScrollDots() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Only show after first 100px of scroll
      setVisible(scrollY > 100);
      
      // Calculate which section is active based on scroll percentage
      const progress = scrollY / docHeight;
      const idx = Math.min(
        SECTIONS.length - 1,
        Math.floor(progress * SECTIONS.length)
      );
      setActiveIdx(idx);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (idx) => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const targetScroll = (idx / SECTIONS.length) * docHeight;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  return (
    <motion.div
      className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col gap-3 hidden lg:flex"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 20 }}
      transition={{ duration: 0.4 }}
    >
      {SECTIONS.map((section, i) => (
        <button
          key={section.id}
          onClick={() => scrollToSection(i)}
          className="group relative flex items-center justify-end"
          title={section.label}
        >
          {/* Label tooltip */}
          <span className="absolute right-6 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70 bg-dark-surface/80 backdrop-blur-sm rounded-md border border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none translate-x-2 group-hover:translate-x-0">
            {section.label}
          </span>

          {/* Dot */}
          <motion.div
            className="rounded-full transition-colors duration-300"
            animate={{
              width: activeIdx === i ? 10 : 6,
              height: activeIdx === i ? 10 : 6,
              backgroundColor: activeIdx === i ? '#00F0FF' : 'rgba(255,255,255,0.2)',
              boxShadow: activeIdx === i ? '0 0 12px rgba(0,240,255,0.6)' : '0 0 0 transparent',
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          />
        </button>
      ))}

      {/* Connecting line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2 -z-10" />
    </motion.div>
  );
}
