import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Users, TerminalSquare, Github, Code, Rocket } from 'lucide-react';
import GlowCard from './GlowCard';

const ScrollytellingFeatures = () => {
  const targetRef = useRef(null);
  
  // Track scroll progress of the container
  const { scrollYProgress } = useScroll({ 
    target: targetRef,
    offset: ["start start", "end end"]
  });
  
  // Transform progress [0, 1] mapped to X displacement
  // 3 cards = 1 visible, 2 off-screen => -66.66% shift
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-66.66%"]);

  return (
    <div ref={targetRef} className="h-[400vh] w-[100vw] relative left-1/2 -ml-[50vw] mt-10">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden bg-black/40">
        
        {/* Ambient background text that fades as you scroll */}
        <motion.div 
            style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
            className="absolute top-20 left-0 w-full text-center"
        >
          <h2 className="text-3xl md:text-5xl font-outfit font-bold mb-4 text-white">Engineering serendipity.</h2>
          <p className="text-slate-400 text-lg">Scroll to explore</p>
        </motion.div>

        <motion.div style={{ x }} className="flex w-[300vw] h-full items-center">
            
          {/* Feature 1 */}
          <div className="w-[100vw] h-full flex items-center justify-center shrink-0 px-4 md:px-20">
            <GlowCard className="w-full max-w-5xl h-[60vh] flex flex-col md:flex-row items-center p-8 md:p-16 bento-card gap-10" colorClass="rgba(0, 240, 255, 0.1)">
              <div className="flex-1">
                <div className="w-16 h-16 rounded-2xl bg-neon-teal/10 flex items-center justify-center mb-6">
                  <Users size={32} className="text-neon-teal" />
                </div>
                <h3 className="text-4xl md:text-5xl font-outfit font-bold mb-6 text-white leading-tight">Branch Agnostic <br/><span className="text-neon-teal">Matchmaking</span></h3>
                <p className="text-slate-400 text-lg md:text-xl leading-relaxed relative z-10 font-light">
                  Stop building in an echo chamber. Connect CS students with designers from Arts and marketers from Business. AI algorithms automatically pair you with the exact skillsets your startup needs.
                </p>
              </div>
              <div className="flex-1 relative w-full h-full min-h-[300px] rounded-2xl border border-white/10 bg-[#08080c] overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-50"></div>
                <div className="absolute w-[200%] h-[200%] animate-spin-slow bg-gradient-conic from-transparent via-neon-teal/10 to-transparent"></div>
                <Users size={80} className="text-neon-teal/40 relative z-10" />
              </div>
            </GlowCard>
          </div>

          {/* Feature 2 */}
          <div className="w-[100vw] h-full flex items-center justify-center shrink-0 px-4 md:px-20">
            <GlowCard className="w-full max-w-5xl h-[60vh] flex flex-col md:flex-row items-center p-8 md:p-16 bento-card gap-10" colorClass="rgba(112, 0, 255, 0.1)">
              <div className="flex-1">
                <div className="w-16 h-16 rounded-2xl bg-neon-purple/10 flex items-center justify-center mb-6">
                  <TerminalSquare size={32} className="text-neon-purple" />
                </div>
                <h3 className="text-4xl md:text-5xl font-outfit font-bold mb-6 text-white leading-tight">Persistent <br/><span className="text-neon-purple">War Rooms</span></h3>
                <p className="text-slate-400 text-lg md:text-xl leading-relaxed relative z-10 font-light">
                  Dedicated workspace for your team. Integrated commit feeds, to-do lists, architecture diagrams, and real-time collaboration. Your startup's mission control center.
                </p>
              </div>
              <div className="flex-1 relative w-full h-full min-h-[300px] rounded-2xl border border-white/10 bg-[#08080c] overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-50"></div>
                <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-neon-purple/20 to-transparent"></div>
                <Code size={80} className="text-neon-purple/40 relative z-10" />
              </div>
            </GlowCard>
          </div>

          {/* Feature 3 */}
          <div className="w-[100vw] h-full flex items-center justify-center shrink-0 px-4 md:px-20">
            <GlowCard className="w-full max-w-5xl h-[60vh] flex flex-col md:flex-row items-center p-8 md:p-16 bento-card gap-10" colorClass="rgba(0, 150, 255, 0.1)">
              <div className="flex-1">
                <div className="w-16 h-16 rounded-2xl bg-neon-blue/10 flex items-center justify-center mb-6">
                  <Github size={32} className="text-neon-blue" />
                </div>
                <h3 className="text-4xl md:text-5xl font-outfit font-bold mb-6 text-white leading-tight">Git-Level <br/><span className="text-neon-blue">Analytics</span></h3>
                <p className="text-slate-400 text-lg md:text-xl leading-relaxed relative z-10 font-light">
                  Vet applicants based on actual shipping history, not just words. Connect GitHub to automatically prove your technical expertise through real commits and PRs.
                </p>
              </div>
              <div className="flex-1 relative w-full h-full min-h-[300px] rounded-2xl border border-white/10 bg-[#08080c] overflow-hidden flex items-center justify-center">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-neon-blue/20 rounded-full blur-[80px]"></div>
                 <Rocket size={80} className="text-neon-blue/40 relative z-10" />
              </div>
            </GlowCard>
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default ScrollytellingFeatures;
