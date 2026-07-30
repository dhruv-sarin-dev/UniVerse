import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Code, Users, Rocket, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
/* eslint-enable no-unused-vars */
import MagneticButton from './MagneticButton';

export default function Navbar() {
  const { user, loading, logout, login } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll progress for the progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'Discover', path: '/discover', icon: Rocket },
    { name: 'Community', path: '/community', icon: Users },
  ];

  if (loading) return null;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${
        scrolled
          ? 'glass-strong border-white/5 py-3'
          : 'bg-transparent border-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-neon-purple to-neon-blue flex items-center justify-center relative overflow-hidden shadow-lg shadow-neon-purple/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <Code size={16} className="text-white relative z-10" />
            </motion.div>
            <span className="text-xl font-outfit font-bold tracking-tight text-white group-hover:text-neon-blue transition-colors duration-300">
              Uni-Verse
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1 glass px-2 py-1.5 rounded-full">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`relative flex items-center gap-2 text-sm font-medium transition-all duration-300 px-4 py-2 rounded-full ${
                      isActive(link.path)
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {/* Active indicator background */}
                    {isActive(link.path) && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 bg-white/10 rounded-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon size={16} className={`relative z-10 ${isActive(link.path) ? 'text-neon-blue' : ''}`} />
                    <span className="relative z-10">{link.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    <motion.div
                      className="w-9 h-9 rounded-full overflow-hidden border-2 border-neon-purple/40 ring-2 ring-neon-purple/10 shrink-0"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                      <img
                        src={user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.email)}&background=7000FF&color=fff&bold=true`}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.email)}&background=7000FF&color=fff&bold=true`;
                        }}
                      />
                    </motion.div>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-slate-400 hover:text-neon-magenta transition-colors p-2 rounded-lg hover:bg-white/5"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={login}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Log In
                  </button>
                  <MagneticButton
                    onClick={login}
                    className="relative group px-6 py-2.5 text-sm font-semibold text-white rounded-full overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-blue transition-all duration-300 group-hover:scale-105"></div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity duration-300"></div>
                    <span className="relative z-10">Get Started</span>
                  </MagneticButton>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Scroll Progress Bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
        style={{
          scaleX,
          background: 'linear-gradient(90deg, #7000FF, #00F0FF)',
          opacity: scrolled ? 1 : 0,
        }}
      />

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-strong border-t border-white/10 absolute top-full left-0 w-full overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-3">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive(link.path)
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={20} className={isActive(link.path) ? 'text-neon-blue' : ''} />
                    <span className="font-medium">{link.name}</span>
                  </Link>
                );
              })}

              <div className="h-px bg-white/10 my-2"></div>

              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <LayoutDashboard size={20} />
                    <span className="font-medium">Profile Dashboard</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-neon-magenta transition-colors text-left"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Log Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { login(); setMobileMenuOpen(false); }}
                  className="flex items-center justify-center py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white font-medium shadow-lg shadow-neon-purple/20"
                >
                  Get Started
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
