import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const hovering = useRef(false);
  const visible = useRef(false);

  useEffect(() => {
    // Skip on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (!visible.current) {
        visible.current = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
    };

    const onOver = (e) => {
      if (e.target.closest('a,button,[role="button"],input,textarea,select,.cursor-expand')) {
        hovering.current = true;
        dot.style.width = '40px';
        dot.style.height = '40px';
        ring.style.width = '56px';
        ring.style.height = '56px';
        ring.style.borderColor = 'rgba(0,240,255,0.3)';
      }
    };

    const onOut = (e) => {
      if (e.target.closest('a,button,[role="button"],input,textarea,select,.cursor-expand')) {
        hovering.current = false;
        dot.style.width = '8px';
        dot.style.height = '8px';
        ring.style.width = '28px';
        ring.style.height = '28px';
        ring.style.borderColor = 'rgba(255,255,255,0.12)';
      }
    };

    const onLeave = () => {
      visible.current = false;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };

    let raf;
    const loop = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.18;
      pos.current.y += (target.current.y - pos.current.y) * 0.18;
      const x = pos.current.x;
      const y = pos.current.y;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      // Ring follows slightly slower for trailing effect
      ring.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });
    document.body.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      document.body.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Hide on touch devices via CSS
  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: 'fixed', top: 0, left: 0, width: 8, height: 8,
          borderRadius: '50%', backgroundColor: 'white',
          pointerEvents: 'none', zIndex: 99999, opacity: 0,
          mixBlendMode: 'difference',
          transition: 'width 0.25s cubic-bezier(.4,0,.2,1), height 0.25s cubic-bezier(.4,0,.2,1), opacity 0.2s',
          willChange: 'transform',
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: 'fixed', top: 0, left: 0, width: 28, height: 28,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)',
          pointerEvents: 'none', zIndex: 99998, opacity: 0,
          transition: 'width 0.3s cubic-bezier(.4,0,.2,1), height 0.3s cubic-bezier(.4,0,.2,1), border-color 0.3s, opacity 0.2s',
          willChange: 'transform',
        }}
      />
    </>
  );
}
