import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../api';

/**
 * ProjectLayout — the cover sheet of a project's section in the manual.
 *
 * The tab rail is drawn as the section's contents list rather than a row of
 * pills: numbered entries, a rule that fills toward the sheet number, and the
 * current sheet marked in blueprint. Tabs are still gated on membership
 * exactly as before; only the drawing changed.
 */

const EASE = [0.16, 1, 0.3, 1];

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

export default function ProjectLayout() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoised so the mount effect can list it as a dependency without re-firing
  // on every render. Members.jsx also polls it on an interval.
  const fetchProject = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(`${API_URL}/api/projects/${id}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setProject(data.project);
        setError(null);
      } else {
        setError(data.error || 'Project not found');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.name === 'AbortError') {
        setError('Server is taking too long to respond. This might be a cold start for Render (wait 30s and refresh).');
      } else {
        setError(`Connection failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject(true);
  }, [fetchProject]);

  if (loading) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-blueprint" />
      <Label>Retrieving sheet</Label>
    </div>
  );

  if (!project) return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md border border-ink/25 bg-paper-raised">
        <div className="border-b border-ink/15 px-4 py-2.5">
          <Label className="!text-ink">Sheet unavailable</Label>
        </div>
        <div className="p-6">
          <h2 className="fm-condensed text-2xl font-black uppercase leading-[0.95] tracking-tight text-ink">
            {error || 'Project not found'}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-graphite">
            {error === 'Could not connect to server'
              ? 'The backend server might be offline. Please try again later.'
              : 'This project may have been removed or the link is incorrect.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchProject(true)}
              className="group relative inline-flex items-center gap-2 overflow-hidden bg-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative">Retry</span>
            </button>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 border border-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              <ArrowLeft size={14} /> Back to catalogue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const isMember = project?.members?.includes(user?.uid);
  const isRequested = project?.join_requests?.includes(user?.uid);
  const isOwner = user && project.owner_uid === user.uid;

  const currentPath = location.pathname;

  const tabs = [
    { name: 'Overview', path: `/projects/${id}`, exact: true },
    { name: 'Discussion', path: `/projects/${id}/discussion`, exact: false },
  ];

  if (isMember) {
    tabs.push({ name: 'War Room', path: `/projects/${id}/warroom`, exact: false });
    tabs.push({ name: 'Contributions', path: `/projects/${id}/contributions`, exact: false });
  }

  tabs.push({ name: 'Members & Team', path: `/projects/${id}/members`, exact: false });

  const filed = project.created_at
    ? new Date(project.created_at).toLocaleDateString()
    : '—';

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      {/* Running head */}
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <Label className="!text-ink">§ Project — {project.category || 'Open Innovation'}</Label>
        <Label className="whitespace-nowrap !text-[10px]">Filed {filed}</Label>
      </div>

      <Link
        to="/discover"
        className="group mt-4 inline-flex items-center gap-2 text-graphite transition-colors hover:text-blueprint"
      >
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
        <span className="fm-label">Back to catalogue</span>
      </Link>

      {/* Cover block */}
      <header className="grid gap-6 pt-6 pb-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-8">
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: '108%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.7, ease: EASE }}
              className="fm-condensed block text-4xl font-black uppercase leading-[0.9] tracking-tight text-ink sm:text-5xl"
            >
              {project.title}
            </motion.span>
          </span>
        </div>

        <motion.dl
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          className="border-t border-ink/20 md:col-span-4"
        >
          {[
            ['Status', 'Open'],
            ['Ref', String(id).slice(0, 12)],
            ['Team', `${project.members_info?.length ?? project.members?.length ?? 0} on board`],
          ].map(([term, value]) => (
            <div key={term} className="flex items-baseline gap-4 border-b border-rule py-2">
              <dt className="w-16 shrink-0"><Label className="!text-[10px]">{term}</Label></dt>
              <dd className="truncate font-mono text-[12px] text-ink">{value}</dd>
            </div>
          ))}
        </motion.dl>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Section contents */}
        <nav aria-label="Project sections" className="shrink-0 lg:w-60">
          <div className="sticky top-24">
            <div className="border-b border-ink pb-2">
              <Label className="!text-[10px]">Contents</Label>
            </div>
            <ul>
              {tabs.map((tab, i) => {
                const isActive = tab.exact
                  ? currentPath === tab.path
                  : currentPath.startsWith(tab.path);
                return (
                  <li key={tab.name} className="border-b border-rule">
                    <Link
                      to={tab.path}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group flex items-baseline gap-3 py-2.5 transition-colors ${
                        isActive ? 'text-blueprint' : 'text-ink hover:text-blueprint'
                      }`}
                    >
                      <Label className={`shrink-0 !text-[10px] ${isActive ? '!text-blueprint' : ''}`}>
                        {String(i + 1).padStart(2, '0')}
                      </Label>
                      <span className="fm-condensed text-[15px] font-bold uppercase leading-none tracking-tight transition-transform duration-300 group-hover:translate-x-1">
                        {tab.name}
                      </span>
                      <span className="relative ml-auto h-px w-6 self-center bg-rule" aria-hidden="true">
                        <span
                          className={`absolute inset-0 origin-left bg-blueprint transition-transform duration-500 ease-out ${
                            isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                          }`}
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Content Outlet */}
        <div className="min-w-0 flex-1">
          <Outlet context={{ project, fetchProject, isMember, isRequested, isOwner }} />
        </div>
      </div>
    </div>
  );
}
