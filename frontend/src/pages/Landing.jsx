import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useAnimation, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code, Users, Zap, Layout, Terminal, Blocks, ChevronRight } from 'lucide-react';
import GlowCard from '../components/GlowCard';
import MagneticButton from '../components/MagneticButton';
import ScrollDots from '../components/ScrollDots';

// --- Reusable Reveal Component ---
function RevealSection({ children, id, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.section
      id={id}
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 50, filter: "blur(10px)" },
        visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] } }
      }}
      initial="hidden"
      animate={controls}
      className={`relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 ${className}`}
    >
      {children}
    </motion.section>
  );
}

// --- Kinetic Typography Word Matrix ---
const HERO_WORDS = ['Hack', 'Connect', 'Ideate'];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen bg-transparent overflow-hidden">
      <ScrollDots sections={['hero', 'bento', 'features', 'stats', 'cta']} />

      {/* --- HERO SECTION --- */}
      <section id="hero" className="relative min-h-[100vh] flex flex-col items-center justify-center text-center px-4 pt-32 pb-20 z-10">


        <h1 className="heading-hero font-outfit mb-6 text-white perspective-[1000px] flex flex-col items-center justify-center gap-1 md:gap-2 leading-tight">
          <span>A Platform For Students To</span>
          <span className="relative flex justify-center items-center min-w-[300px] h-[1.3em]">
            <AnimateWords words={HERO_WORDS} />
          </span>
          <span>And Build Projects</span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          A hackathon project helping students connect across different universities. Find your perfect team, share brilliant ideas, and build the next big thing together.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-6 items-center"
        >
          <MagneticButton as="div">
            <button 
              onClick={() => navigate('/onboarding')}
              className="cursor-expand group relative px-8 py-4 bg-white text-black font-semibold rounded-full text-lg w-full sm:w-auto overflow-hidden btn-linear"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <span className="relative flex items-center gap-2">
                Start Building <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </MagneticButton>
          <MagneticButton as="div">
             <button 
                onClick={() => document.getElementById('bento').scrollIntoView({ behavior: 'smooth' })}
                className="cursor-expand px-8 py-4 glass border border-white/20 text-white font-medium rounded-full hover:bg-white/5 transition-colors text-lg w-full sm:w-auto btn-linear text-shadow-glow"
             >
               Explore Features
             </button>
          </MagneticButton>
        </motion.div>
      </section>

      {/* --- BENTO GRID FEATURE SET --- */}
      <RevealSection id="bento" className="pt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-outfit font-bold mb-4 text-white">Our Core <span className="text-neon-teal">Features</span>.</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Built for students to collaborate during hackathons and beyond.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
           {/* Big left card */}
           <GlowCard className="md:col-span-2 md:row-span-2 bento-card p-10 flex flex-col justify-between" colorClass="rgba(0, 240, 255, 0.1)">
             <div>
                <div className="w-14 h-14 rounded-2xl bg-neon-blue/10 flex items-center justify-center mb-6">
                  <Users className="text-neon-blue" size={28} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">Algorithmic Matchmaking</h3>
                <p className="text-slate-400 text-lg max-w-md">Our AI analyzes your skills, GitHub history, and project goals to instantly match you with the exact co-founders you need—across any department.</p>
             </div>
             <div className="w-full h-48 mt-8 border border-white/10 rounded-xl bg-black/40 relative overflow-hidden flex items-center justify-center group">
               <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30"></div>
               <div className="flex gap-4 items-center relative z-10 transition-transform group-hover:scale-105 duration-500">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple p-[2px] animate-float"><div className="w-full h-full bg-black rounded-full flex items-center justify-center"><Code /></div></div>
                  <div className="h-1 w-12 bg-white/20 rounded-full" />
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-teal to-neon-blue p-[2px] animate-float" style={{ animationDelay: '1s'}}><div className="w-full h-full bg-black rounded-full flex items-center justify-center"><Zap size={32} /></div></div>
                  <div className="h-1 w-12 bg-white/20 rounded-full" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-magenta to-neon-purple p-[2px] animate-float" style={{ animationDelay: '2s'}}><div className="w-full h-full bg-black rounded-full flex items-center justify-center"><Layout /></div></div>
               </div>
             </div>
           </GlowCard>

           {/* Top right card */}
           <GlowCard className="bento-card p-8 flex flex-col" colorClass="rgba(112, 0, 255, 0.1)">
              <div className="w-12 h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center mb-6">
                <Terminal className="text-neon-purple" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Persistent War Rooms</h3>
              <p className="text-slate-400 mb-6 text-sm flex-grow">Dedicated virtual workspaces for your team. Integrated task boards, chat, and architecture diagrams all in one place.</p>

           </GlowCard>

           {/* Bottom right card */}
           <GlowCard className="bento-card p-8 flex flex-col" colorClass="rgba(0, 240, 160, 0.1)">
              <div className="w-12 h-12 rounded-xl bg-neon-teal/10 flex items-center justify-center mb-6">
                <Blocks className="text-neon-teal" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">GitHub Integration</h3>
              <p className="text-slate-400 mb-6 text-sm flex-grow">Connect your repos to automatically display tech stacks and prove your engineering chops through verified commits.</p>

           </GlowCard>
        </div>
      </RevealSection>

      {/* --- FEATURE DEEP DIVES --- */}
      <RevealSection id="features" className="pt-20">
        <div className="flex flex-col md:flex-row gap-16 items-center">
           <div className="flex-1 w-full relative">
              <div className="absolute inset-0 bg-neon-blue/20 blur-[100px] rounded-full" />
              <div className="relative glass border border-white/10 rounded-2xl p-4 overflow-hidden">
                <div className="w-full h-8 flex items-center gap-2 border-b border-white/10 pb-4 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="space-y-3 font-mono text-xs md:text-sm text-slate-300">
                  <p><span className="text-neon-purple">import</span> {'{'} Team {'}'} <span className="text-neon-purple">from</span> <span className="text-neon-teal">'@universe/core'</span>;</p>
                  <br/>
                  <p><span className="text-neon-blue">const</span> project = <span className="text-neon-purple">new</span> Project({'{\n'}  name: <span className="text-neon-teal">'Apollo'</span>,\n  stack: [<span className="text-neon-teal">'React'</span>, <span className="text-neon-teal">'Python'</span>],\n  seeking: [<span className="text-neon-teal">'UI/UX'</span>]\n{'}'});</p>
                  <br/>
                  <p><span className="text-neon-blue">await</span> Team.match(project);</p>
                  <p className="text-green-400 animate-pulse mt-4">&gt;&gt; Match found! 98% compatible designer located.</p>
                </div>
              </div>
           </div>
           <div className="flex-1">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/10 mb-6 text-xs text-neon-blue">
               Developer First
             </div>
             <h2 className="text-3xl md:text-4xl font-outfit font-bold text-white mb-6">Designed for Builders, <br/>by Builders.</h2>
             <p className="text-slate-400 text-lg leading-relaxed mb-8">
               We stripped away the fluff. No corporate jargon, no endless scrolling feeds of self-promotion. Just hardcore builders connecting over shared tech stacks and ambitious goals. Show your actual code, build your reputation, and ship products.
             </p>
             <ul className="space-y-4 text-slate-300">
                <li className="flex items-center gap-3"><Zap className="text-neon-teal" size={20} /> Instant technical vetting</li>
                <li className="flex items-center gap-3"><Zap className="text-neon-teal" size={20} /> Seamless codebase bridging</li>
                <li className="flex items-center gap-3"><Zap className="text-neon-teal" size={20} /> Real-time peer code review matching</li>
             </ul>
           </div>
        </div>
      </RevealSection>

      {/* --- CTA SECTION --- */}
      <RevealSection id="cta" className="pb-32">
        <GlowCard className="w-full p-12 md:p-24 text-center rounded-[3rem] bento-card relative overflow-hidden" colorClass="rgba(112, 0, 255, 0.2)">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-purple/20 blur-[120px] rounded-full pointer-events-none" />
           <h2 className="text-4xl md:text-6xl font-outfit font-bold text-white mb-8 relative z-10">Stop ideating. <br/>Start <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-teal">shipping.</span></h2>
           <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 relative z-10">
             Join the fastest growing network of student builders. Find your co-founder today and launch your next big idea by tomorrow.
           </p>
           <MagneticButton as="div">
             <button 
                onClick={() => navigate('/onboarding')}
                className="cursor-expand relative z-10 px-10 py-5 bg-white text-black font-bold rounded-full text-xl hover:scale-105 transition-transform duration-300 btn-linear shadow-[0_0_40px_rgba(255,255,255,0.3)]"
             >
               Launch Idea
             </button>
           </MagneticButton>
        </GlowCard>
      </RevealSection>
      
      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/50 py-12 text-center text-slate-500 relative z-10">
        <p>© 2026 Uni-Verse. </p>
      </footer>
    </div>
  );
}

// Helper component for the kinetic typography word rotation
function AnimateWords({ words }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500); // 2.5s per word
    return () => clearInterval(timer);
  }, [words.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, filter: 'blur(8px)', x: "-50%", y: "calc(-50% + 15px)" }}
        animate={{ opacity: 1, y: "-50%", filter: 'blur(0px)', x: "-50%" }}
        exit={{ opacity: 0, y: "calc(-50% - 15px)", filter: 'blur(8px)', x: "-50%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute top-1/2 left-1/2 whitespace-nowrap transform-gpu text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-purple to-neon-magenta animate-gradient p-2"
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
}
