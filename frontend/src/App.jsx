import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WarRoomProvider } from './context/WarRoomContext';
import MiniCallOverlay from './components/MiniCallOverlay';
import { useLocation, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Lenis from 'lenis';
/* eslint-disable no-unused-vars */
import { AnimatePresence, motion } from 'framer-motion';

import CommandPalette from './components/CommandPalette';
import { setupGlobalHaptics } from './utils/haptics';
import MeshGradient from './components/MeshGradient';

// Lazy-load heavy components
const CosmicBackground = lazy(() => import('./components/CosmicBackground'));
const Landing = lazy(() => import('./pages/Landing'));
const Community = lazy(() => import('./pages/Community'));
const Discover = lazy(() => import('./pages/Discover'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Profile = lazy(() => import('./pages/Profile'));
const ProjectLayout = lazy(() => import('./pages/project/ProjectLayout'));
const Overview = lazy(() => import('./pages/project/Overview'));
const Discussion = lazy(() => import('./pages/project/Discussion'));
const WarRoom = lazy(() => import('./pages/project/WarRoom'));
const Contributions = lazy(() => import('./pages/project/Contributions'));
const Members = lazy(() => import('./pages/project/Members'));
const CompatibilityExam = lazy(() => import('./pages/CompatibilityExam'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin" />
    </div>
  );
}

function OnboardingGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user && !user.has_profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function AnimatedRoutes() {
  const location = useLocation();
  // Use a stable key for project sub-routes so ProjectLayout doesn't remount on tab switches
  const routeKey = location.pathname.match(/^\/projects\/[^/]+/)
    ? location.pathname.match(/^\/projects\/[^/]+/)[0]
    : location.pathname;
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeKey}>
        <Route path="/" element={<Suspense fallback={<PageFallback />}><motion.div {...pageVariants}><Landing /></motion.div></Suspense>} />
        <Route path="/discover" element={<Suspense fallback={<PageFallback />}><motion.div {...pageVariants}><Discover /></motion.div></Suspense>} />
        <Route path="/community" element={<Suspense fallback={<PageFallback />}><motion.div {...pageVariants}><Community /></motion.div></Suspense>} />
        <Route path="/onboarding" element={<Suspense fallback={<PageFallback />}><motion.div {...pageVariants}><Onboarding /></motion.div></Suspense>} />
        <Route path="/projects/:id" element={<Suspense fallback={<PageFallback />}><motion.div {...pageVariants}><ProjectLayout /></motion.div></Suspense>}>
          <Route index element={<Overview />} />
          <Route path="discussion" element={<Discussion />} />
          <Route path="warroom" element={<WarRoom />} />
          <Route path="contributions" element={<Contributions />} />
          <Route path="members" element={<Members />} />
        </Route>
        <Route path="/compatibility-exam" element={<Suspense fallback={<PageFallback />}><motion.div {...pageVariants}><CompatibilityExam /></motion.div></Suspense>} />
        <Route path="/profile" element={
          <OnboardingGuard><Suspense fallback={<PageFallback />}><motion.div {...pageVariants}><Profile /></motion.div></Suspense></OnboardingGuard>
        } />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.2,
      touchMultiplier: 2,
    });
    let rafId;
    function raf(time) { lenis.raf(time); rafId = requestAnimationFrame(raf); }
    rafId = requestAnimationFrame(raf);
    const cleanupHaptics = setupGlobalHaptics();
    return () => { cancelAnimationFrame(rafId); lenis.destroy(); cleanupHaptics(); };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <WarRoomProvider>
        <div className="min-h-screen bg-[#030303] text-slate-100 font-sans relative overflow-x-hidden">
          {/* Subtle cosmic background layer */}
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none mix-blend-screen">
             <Suspense fallback={null}><CosmicBackground /></Suspense>
             <MeshGradient />
          </div>

          <CommandPalette />
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow relative">
              <AnimatedRoutes />
            </main>
          </div>

          {/* Persistent floating call overlay */}
          <MiniCallOverlay />
        </div>
        </WarRoomProvider>
      </Router>
    </AuthProvider>
  );
}
