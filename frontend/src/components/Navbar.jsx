import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { isFieldManualRoute } from '../utils/fieldManualRoutes';

/**
 * Masthead.
 *
 * A field manual has a running head, not a floating glass pill: a rule, a
 * wordmark, plain labels. The scroll indicator sits on the masthead's bottom
 * edge rather than as a separate fixed bar, which is where an earlier pass put
 * it — underneath this element, and so never visible.
 *
 * Structure is identical on every route; only the palette swaps, so that pages
 * still awaiting conversion keep a masthead that reads against their dark
 * surface. Remove the branch once every route is converted.
 */
export default function Navbar() {
  const { user, loading, logout, login } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  const navLinks = [
    { name: 'Discover', path: '/discover' },
    { name: 'Community', path: '/community' },
  ];

  const isActive = (path) => location.pathname === path;

  if (loading) return null;

  const fm = isFieldManualRoute(location.pathname);
  const c = {
    bar: fm ? 'border-ink bg-paper' : 'border-white/10 bg-[#0a0a0f]',
    wordmark: fm ? 'text-ink' : 'text-white',
    muted: fm ? 'text-graphite' : 'text-slate-400',
    strong: fm ? '!text-ink' : '!text-white',
    hover: fm ? 'hover:text-blueprint' : 'hover:text-white',
    cta: fm ? 'bg-ink text-paper' : 'bg-white text-black',
    ctaFill: fm ? 'bg-blueprint' : 'bg-neon-blue',
    panel: fm ? 'border-rule bg-paper' : 'border-white/10 bg-[#0a0a0f]',
    divider: fm ? 'border-rule' : 'border-white/10',
  };

  return (
    <nav className={`fixed top-0 z-50 w-full border-b ${c.bar}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-baseline gap-2">
          <span
            className={`fm-condensed text-xl font-black uppercase tracking-tight transition-colors ${c.wordmark} group-hover:text-blueprint`}
          >
            Uni-Verse
          </span>
          <span className={`fm-label hidden sm:inline ${c.muted}`}>Field Manual</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`fm-label relative py-1 transition-colors ${c.hover} ${
                isActive(link.path) ? c.strong : c.muted
              }`}
            >
              {link.name}
              {isActive(link.path) && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-0 -bottom-0.5 h-px bg-signal"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/profile" className={`fm-label transition-colors ${c.strong} ${c.hover}`}>
                {user.display_name?.split(' ')[0] || 'Profile'}
              </Link>
              <button
                onClick={logout}
                title="Sign out"
                className={`p-1.5 transition-colors hover:text-signal ${c.muted}`}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className={`group relative overflow-hidden px-4 py-2 text-[11px] font-semibold uppercase tracking-wider ${c.cta}`}
            >
              <span
                className={`absolute inset-0 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 ${c.ctaFill}`}
              />
              <span className="relative">Sign in</span>
            </button>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className={`p-1.5 md:hidden ${c.wordmark}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Reading position, drawn along the masthead's bottom edge. */}
      <motion.div
        style={{ scaleX: progress }}
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-signal"
        aria-hidden="true"
      />

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`overflow-hidden border-t md:hidden ${c.panel}`}
          >
            <div className="flex flex-col px-4 py-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`fm-label border-b py-3 transition-colors ${c.divider} ${c.muted} ${c.hover}`}
                >
                  {link.name}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className={`fm-label border-b py-3 ${c.divider} ${c.strong}`}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className={`fm-label py-3 text-left transition-colors hover:text-signal ${c.muted}`}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { login(); setMobileOpen(false); }}
                  className={`my-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider ${c.cta}`}
                >
                  Sign in
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
