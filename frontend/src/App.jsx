import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WarRoomProvider } from './context/WarRoomContext';
import MiniCallOverlay from './components/MiniCallOverlay';
import { useLocation, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Lenis from 'lenis';
import { AnimatePresence, motion } from 'framer-motion';

import CommandPalette from './components/CommandPalette';
import { setupGlobalHaptics } from './utils/haptics';

// Lazy-load route components
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
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-blueprint" />
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

function Shell() {
  return (
    // fm-scope carries the Field Manual focus ring and the reduced-motion
    // opt-out for everything inside it.
    <div className="fm-scope fm-paper relative min-h-screen overflow-x-hidden font-sans text-ink">
      <CommandPalette />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="relative flex-grow">
          <AnimatedRoutes />
        </main>
      </div>

      {/* Persistent floating call overlay */}
      <MiniCallOverlay />
    </div>
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
        <Shell />
        </WarRoomProvider>
      </Router>
    </AuthProvider>
  );
}
