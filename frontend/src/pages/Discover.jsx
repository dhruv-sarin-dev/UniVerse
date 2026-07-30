import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Rocket, Map, List, Star, Users, ArrowRight, Plus, Trash2 } from 'lucide-react';
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion';
/* eslint-enable no-unused-vars */
import API_URL from '../api';
import { useAuth } from '../context/AuthContext';
import CreateProjectModal from '../components/CreateProjectModal';
import GlowCard from '../components/GlowCard';

// Galaxy categories mapped directly to valid choices
const GALAXY_DEFS = [
  { id: 'all', name: 'The Core', x: '50%', y: '50%', radius: 250, color: 'white' },
  { id: 'Web', name: 'Web', x: '50%', y: '15%', radius: 130, color: '#8888FF' },
  { id: 'Mobile App', name: 'Mobile App', x: '15%', y: '75%', radius: 180, color: 'var(--color-neon-magenta)' },
  { id: 'Blockchain', name: 'Blockchain', x: '80%', y: '25%', radius: 120, color: 'var(--color-neon-teal)' },
  { id: 'AI/ML', name: 'AI/ML', x: '20%', y: '30%', radius: 150, color: 'var(--color-neon-purple)' },
  { id: 'Open Innovation', name: 'Open Innovation', x: '85%', y: '80%', radius: 140, color: 'var(--color-neon-blue)' },
];

const GALAXY_DELAYS = [0, 1.2, 2.4, 0.8, 3.1, 1.6, 2.0];

export default function Discover() {
  const { user, login } = useAuth();
  const [viewMode, setViewMode] = useState('list');
  const [activeGalaxy, setActiveGalaxy] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch real projects from backend
  useEffect(() => {
    fetch(`${API_URL}/api/projects`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
        }
      })
      .catch(() => {
        // API unavailable — show empty state
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateProject = async (projectData) => {
    if (!user) return login();
    const payload = {
      ...projectData,
      owner_uid: user.uid,
    };
    try {
      const res = await fetch(`${API_URL}/api/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newProj = await res.json();
        setProjects([newProj, ...projects]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      }
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  // Assign projects to their chosen galaxy/category
  const categorizedProjects = useMemo(() => {
    return projects.map(p => ({ ...p, galaxy: p.category || 'Open Innovation' }));
  }, [projects]);

  const filteredProjects = categorizedProjects.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGalaxy = activeGalaxy === 'all' || p.galaxy === activeGalaxy;
    return matchesSearch && matchesGalaxy;
  });

  // Only show galaxies that have projects
  const activeGalaxies = useMemo(() => {
    const cats = new Set(categorizedProjects.map(p => p.galaxy));
    return GALAXY_DEFS.filter(g => g.id === 'all' || cats.has(g.id));
  }, [categorizedProjects]);

  const NEON_COLORS = ['var(--color-neon-purple)', 'var(--color-neon-teal)', 'var(--color-neon-magenta)', 'var(--color-neon-blue)', '#8888FF', '#FFD700'];

  return (
    <div className="min-h-screen pt-28 pb-20 flex flex-col relative overflow-hidden">
      
      {/* Top Bar */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-outfit font-bold text-white mb-2">Stellar Discovery</h1>
          <p className="text-slate-400">Explore and collaborate on projects across the universe.</p>
        </div>

        <div className="flex gap-4 items-center">
          <button 
            onClick={() => user ? setIsCreateOpen(true) : login()}
            className="hidden md:flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-neon-purple to-neon-blue text-white font-semibold rounded-full hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all"
          >
            <Plus size={16} /> Create Project
          </button>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-dark-surface/50 border border-white/10 rounded-full focus:outline-none focus:border-neon-blue text-sm w-64 transition-all"
            />
          </div>
          
          <div className="glass flex p-1 rounded-full">
            <button 
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Map size={16} /> Map
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <List size={16} /> List
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col">
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-10 h-10 border-2 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 text-sm">Scanning the universe for projects...</p>
          </div>
        )}

        {!loading && (
          <AnimatePresence mode="wait">
            
            {/* MAP VIEW */}
            {viewMode === 'map' && (
              <motion.div 
                key="map-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
                className="flex-grow relative w-full h-[600px] glass-strong rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-50"></div>
                
                {/* Galaxies */}
                {activeGalaxies.map((galaxy, gi) => (
                  <div 
                    key={galaxy.id}
                    className="absolute animate-float"
                    style={{ left: galaxy.x, top: galaxy.y, animationDelay: `${GALAXY_DELAYS[gi % GALAXY_DELAYS.length]}s` }}
                  >
                    {galaxy.id !== 'all' && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/5 rounded-full pointer-events-none" style={{ width: galaxy.radius, height: galaxy.radius }}></div>
                    )}
                    
                    <div 
                      onClick={() => setActiveGalaxy(galaxy.id)}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer group flex flex-col items-center z-10"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${activeGalaxy === galaxy.id ? 'scale-150' : 'group-hover:scale-125'}`} style={{ backgroundColor: `${galaxy.color}20`, boxShadow: `0 0 20px ${galaxy.color}40`, border: `1px solid ${galaxy.color}` }}>
                         {galaxy.id === 'all' ? <Star size={14} className="text-white" /> : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: galaxy.color }}></div>}
                      </div>
                      <span className={`mt-3 text-xs font-bold tracking-wider transition-opacity ${activeGalaxy === galaxy.id ? 'text-white opacity-100' : 'text-slate-400 opacity-70 group-hover:opacity-100'}`}>
                        {galaxy.name}
                      </span>
                    </div>

                    {activeGalaxy === galaxy.id && filteredProjects
                      .filter(p => galaxy.id === 'all' ? true : p.galaxy === galaxy.id)
                      .slice(0, 6) // Limit to prevent overlap
                      .map((project, i, arr) => {
                        const angle = (i / Math.max(arr.length, 1)) * Math.PI * 2;
                        const r = galaxy.radius / 2;
                        const px = Math.cos(angle) * r;
                        const py = Math.sin(angle) * r;
                        
                        return (
                          <Link to={`/projects/${project.id}`} key={project.id}>
                            <motion.div 
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute w-44 glass p-3 rounded-xl border border-white/10 hover:border-white/30 transition-colors cursor-pointer z-20"
                              style={{ 
                                left: `calc(50% + ${px}px)`, 
                                top: `calc(50% + ${py}px)`,
                                transform: 'translate(-50%, -50%)'
                              }}
                            >
                               <h4 className="text-xs font-bold text-white truncate">{project.title}</h4>
                               <p className="text-[10px] text-slate-400 truncate">{project.galaxy}</p>
                               <div className="flex items-center gap-1 mt-1">
                                 <Users size={10} className="text-slate-500" />
                                 <span className="text-[10px] text-slate-500">{(project.members || []).length} members</span>
                               </div>
                            </motion.div>
                          </Link>
                        );
                    })}
                  </div>
                ))}

                {projects.length === 0 && (
                  <div className="text-center z-30 relative flex flex-col items-center">
                    <Rocket size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium">No projects in the universe yet</p>
                    <button 
                      onClick={() => user ? setIsCreateOpen(true) : login()}
                      className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors font-medium text-sm border border-white/5"
                    >
                      Be the first to create one!
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <motion.div 
                key="list-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* Category Filter Pills */}
                <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-none">
                  {GALAXY_DEFS.map(galaxy => (
                    <button
                      key={galaxy.id}
                      onClick={() => setActiveGalaxy(galaxy.id)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                        activeGalaxy === galaxy.id 
                          ? 'bg-white text-black' 
                          : 'glass text-slate-300 hover:text-white'
                      }`}
                    >
                      {galaxy.name}
                    </button>
                  ))}
                </div>

                {filteredProjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 items-stretch">
                    <AnimatePresence>
                      {filteredProjects.map((project, i) => {
                        const projColor = GALAXY_DEFS.find(g => g.id === project.galaxy)?.color || 'white';
                                          
                        return (
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -30 }}
                          transition={{ duration: 0.5, delay: i * 0.05, ease: [0.25, 1, 0.5, 1] }}
                          key={project.id}
                          className="perf-card group flex flex-col h-full"
                        >
                          <GlowCard colorClass={projColor} className="w-full h-full min-h-[280px] p-6 flex flex-col bento-card border-white/5 cursor-pointer">
                          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 group-hover:opacity-50 transition-opacity duration-700" style={{ backgroundColor: projColor }}></div>
                          
                          <div className="flex justify-between items-start mb-4 relative z-10">
                            <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10" style={{ color: projColor }}>
                              {project.galaxy}
                            </span>
                            <div className="flex items-center gap-3">
                              {user && project.owner_uid === user.uid && (
                                <button 
                                  onClick={(e) => handleDeleteProject(project.id, e)} 
                                  className="text-slate-500 hover:text-red-400 transition-colors z-20"
                                  title="Delete Project"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                              <div className="flex -space-x-2">
                                {(project.member_photos || []).slice(0, 4).map((photo, j) => (
                                  <img 
                                    key={j} 
                                    src={photo}
                                    alt="member"
                                    className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] shrink-0 object-cover"
                                  />
                                ))}
                                {(project.members || []).length === 0 && (
                                  <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] bg-slate-800 shrink-0 flex items-center justify-center">
                                    <Users size={12} className="text-slate-500" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold mb-2 text-white relative z-10">{project.title}</h3>
                          <p className="text-slate-400 group-hover:text-white transition-colors duration-300 text-sm mb-4 flex-grow relative z-10 line-clamp-3">
                            {project.description}
                          </p>
                          
                          {project.required_skills && project.required_skills.length > 0 && (
                            <div className="relative z-10 mb-4">
                              <div className="text-xs text-slate-500 group-hover:text-white/80 transition-colors duration-300 mb-2 font-medium">SKILLS NEEDED</div>
                              <div className="flex flex-wrap gap-2">
                                {project.required_skills.slice(0, 3).map(role => (
                                  <span key={role} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-dark-surface group-hover:bg-black/30 group-hover:text-white transition-all duration-300 border border-white/5">
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <Link 
                            to={`/projects/${project.id}`}
                            className="relative z-10 block w-full py-3 text-center glass border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex flex-row items-center justify-center gap-2"
                          >
                            View Project <ArrowRight size={14} />
                          </Link>
                        </GlowCard>
                        </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <Rocket size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium">
                      {searchQuery ? 'No projects match your search' : 'No projects found in this sector'}
                    </p>
                    <p className="text-slate-500 text-sm mt-2">Try a different category or search term</p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
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
