import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Trash2, AlertCircle, ArrowRight, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL, { fetchJson } from '../api';
import { useAuth } from '../context/AuthContext';
import CreateProjectModal from '../components/CreateProjectModal';

/**
 * Discover — the catalogue sheet of the field manual.
 *
 * Categories keep the exact ids the backend stores on project.category; only
 * the labels changed, since the old ones ("The Core", galaxies) belonged to a
 * space metaphor the product no longer uses. The plan view is the same filter
 * interaction as before, redrawn as a schematic rather than a star map.
 */

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'Web', name: 'Web' },
  { id: 'Mobile App', name: 'Mobile' },
  { id: 'Blockchain', name: 'Blockchain' },
  { id: 'AI/ML', name: 'AI / ML' },
  { id: 'Open Innovation', name: 'Open' },
];

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

function ProjectSheet({ project, index, isOwner, onDelete }) {
  const skills = project.required_skills || [];
  const memberCount = (project.members || []).length;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col border border-ink/20 bg-paper-raised transition-colors hover:border-ink"
    >
      {/* Sheet header */}
      <div className="flex items-baseline justify-between border-b border-ink/15 px-4 py-2.5">
        <Label className="!text-ink">{project.category || 'Open Innovation'}</Label>
        <div className="flex items-center gap-3">
          <Label className="!text-[10px]">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </Label>
          {isOwner && (
            <button
              onClick={(e) => onDelete(project.id, e)}
              title="Delete project"
              className="text-graphite transition-colors hover:text-signal"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="fm-condensed text-2xl font-black uppercase leading-[0.95] tracking-tight text-ink transition-colors group-hover:text-blueprint">
          {project.title}
        </h3>
        <p className="mt-2 line-clamp-3 flex-grow text-sm leading-relaxed text-graphite">
          {project.description}
        </p>

        {skills.length > 0 && (
          <dl className="mt-4 border-t border-rule pt-3">
            <dt><Label className="!text-[10px]">Requires</Label></dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {skills.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="border border-ink/20 px-2 py-0.5 font-mono text-[11px] text-ink"
                >
                  {s}
                </span>
              ))}
              {skills.length > 4 && (
                <span className="px-1 py-0.5 font-mono text-[11px] text-graphite">
                  +{skills.length - 4}
                </span>
              )}
            </dd>
          </dl>
        )}

        {/* Member strip */}
        {(project.member_photos || []).length > 0 && (
          <div className="mt-4 flex -space-x-1.5">
            {(project.member_photos || []).slice(0, 5).map((photo, j) => (
              <img
                key={j}
                src={photo}
                alt=""
                referrerPolicy="no-referrer"
                className="h-6 w-6 shrink-0 rounded-full border border-paper object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <Link
        to={`/projects/${project.id}`}
        className="group/cta relative flex items-center justify-between overflow-hidden border-t border-ink/15 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink"
      >
        <span className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out group-hover/cta:scale-x-100" />
        <span className="relative transition-colors group-hover/cta:text-paper">Open sheet</span>
        <ArrowRight
          size={14}
          className="relative transition-all group-hover/cta:translate-x-1 group-hover/cta:text-paper"
        />
      </Link>
    </motion.article>
  );
}

/** Plan view: the same category filter, drawn as a schematic index. */
function PlanView({ categories, projects, active, onSelect }) {
  return (
    <div className="fm-grid border border-ink/20 bg-paper-raised p-4 sm:p-8">
      <div className="mb-6 flex items-baseline justify-between border-b border-ink/20 pb-2">
        <Label className="!text-ink">Plan view — by category</Label>
        <Label className="!text-[10px]">{projects.length} listed</Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.filter((c) => c.id !== 'all').map((cat) => {
          const inCat = projects.filter((p) => (p.category || 'Open Innovation') === cat.id);
          const isActive = active === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(isActive ? 'all' : cat.id)}
              className={`border p-3 text-left transition-colors ${
                isActive
                  ? 'border-blueprint bg-blueprint/[0.06]'
                  : 'border-ink/20 bg-paper hover:border-ink'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="fm-condensed text-lg font-bold uppercase tracking-tight text-ink">
                  {cat.name}
                </span>
                <span className="fm-condensed text-xl font-black text-ink/25">
                  {String(inCat.length).padStart(2, '0')}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {inCat.slice(0, 3).map((p) => (
                  <li key={p.id} className="truncate font-mono text-[11px] text-graphite">
                    — {p.title}
                  </li>
                ))}
                {inCat.length === 0 && (
                  <li className="font-mono text-[11px] text-graphite/60">— none listed</li>
                )}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Discover() {
  const { user, login } = useAuth();
  const [viewMode, setViewMode] = useState('list');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // A failure here has to surface: swallowing it renders an empty catalogue,
  // which is indistinguishable from "no projects exist".
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/api/projects/');
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.name === 'TimeoutError'
          ? 'The server is taking a while to respond — free hosting can take up to a minute to wake up.'
          : 'Could not reach the server.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreateProject = async (projectData) => {
    if (!user) return login();
    try {
      const res = await fetch(`${API_URL}/api/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...projectData, owner_uid: user.uid }),
      });
      if (res.ok) setProjects([await res.json(), ...projects]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.preventDefault();
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  const categorised = useMemo(
    () => projects.map((p) => ({ ...p, category: p.category || 'Open Innovation' })),
    [projects]
  );

  const filtered = categorised.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.title || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 sm:pt-28 lg:px-8">
      {/* Running head */}
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <Label className="!text-ink">§ Catalogue — open projects</Label>
        <Label>{filtered.length} of {projects.length}</Label>
      </div>

      <div className="flex flex-col gap-6 pt-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="fm-condensed text-5xl font-black uppercase leading-[0.9] tracking-tight text-ink sm:text-6xl">
            Project
            <br />
            <span className="text-blueprint">catalogue</span>
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-graphite">
            Everything currently open, with the skills each one still needs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 border border-ink/25 bg-paper py-2.5 pl-9 pr-3 font-mono text-[13px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none"
            />
          </div>

          <div className="flex border border-ink/25">
            {['list', 'plan'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`fm-label px-3 py-2.5 transition-colors ${
                  viewMode === mode ? 'bg-ink !text-paper' : 'text-graphite hover:text-ink'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => (user ? setIsCreateOpen(true) : login())}
            className="group relative flex items-center gap-2 overflow-hidden bg-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <Plus size={14} className="relative" />
            <span className="relative">New project</span>
          </button>
        </div>
      </div>

      {/* Category index */}
      <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-y border-rule py-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`fm-label transition-colors hover:text-blueprint ${
              activeCategory === cat.id ? '!text-ink underline underline-offset-4' : 'text-graphite'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {/* Body */}
      <div className="mt-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-blueprint" />
            <Label>Loading catalogue</Label>
          </div>
        )}

        {!loading && error && (
          <div className="border border-signal/40 bg-signal/[0.05] px-6 py-16 text-center">
            <AlertCircle size={36} className="mx-auto mb-4 text-signal" />
            <p className="fm-condensed text-2xl font-black uppercase text-ink">
              Couldn&apos;t load projects
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-graphite">{error}</p>
            <button
              onClick={loadProjects}
              className="mt-6 border border-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && viewMode === 'plan' && (
          <PlanView
            categories={CATEGORIES}
            projects={categorised}
            active={activeCategory}
            onSelect={setActiveCategory}
          />
        )}

        {!loading && !error && viewMode === 'list' && (
          filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((project, i) => (
                  <ProjectSheet
                    key={project.id}
                    project={project}
                    index={i}
                    isOwner={!!user && project.owner_uid === user.uid}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="border border-dashed border-ink/30 px-6 py-20 text-center">
              <Users size={32} className="mx-auto mb-4 text-graphite" />
              <p className="fm-condensed text-2xl font-black uppercase text-ink">
                {searchQuery ? 'No match' : 'Nothing listed yet'}
              </p>
              <p className="mt-2 text-sm text-graphite">
                {searchQuery
                  ? 'Try a different search term or category.'
                  : 'Post the first project and it will appear here.'}
              </p>
            </div>
          )
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
