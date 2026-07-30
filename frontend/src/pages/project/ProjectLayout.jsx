import { useState, useEffect } from 'react';
import { useParams, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, MessageSquare, Users, BarChart3, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../api';

export default function ProjectLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = async (isInitial = false) => {
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
  };

  useEffect(() => {
    fetchProject(true);
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!project) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="glass-strong rounded-3xl p-10 border border-white/5 max-w-md text-center">
        <div className="text-5xl mb-4">🔭</div>
        <h2 className="text-xl font-bold text-white mb-2">{error || 'Project not found'}</h2>
        <p className="text-slate-400 text-sm mb-6">
          {error === 'Could not connect to server' 
            ? 'The backend server might be offline. Please try again later.'
            : 'This project may have been removed or the link is incorrect.'
          }
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => fetchProject(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-white font-semibold rounded-full hover:bg-teal-400 transition-colors">
            Retry
          </button>
          <Link to="/discover" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-slate-200 transition-colors">
            <ArrowLeft size={16} /> Back to Discover
          </Link>
        </div>
      </div>
    </div>
  );

  const isMember = project?.members?.includes(user?.uid);
  const isRequested = project?.join_requests?.includes(user?.uid);
  const isOwner = user && project.owner_uid === user.uid;

  const currentPath = location.pathname;

  const tabs = [
    { name: 'Overview', path: `/projects/${id}`, icon: LayoutDashboard, exact: true },
    { name: 'Discussion', path: `/projects/${id}/discussion`, icon: MessageSquare, exact: false },
  ];

  if (isMember) {
    tabs.push({ name: 'War Room', path: `/projects/${id}/warroom`, icon: Sparkles, exact: false });
    tabs.push({ name: 'Contributions', path: `/projects/${id}/contributions`, icon: BarChart3, exact: false });
  }

  tabs.push({ name: 'Members & Team', path: `/projects/${id}/members`, icon: Users, exact: false });


  return (
    <div className="max-w-6xl mx-auto px-4 pt-28 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      <Link to="/discover" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Discovery</span>
      </Link>

      {/* Hero Header */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold border border-teal-500/20 uppercase tracking-wider">
              Open Project
            </div>
            <span className="text-slate-500 text-xs">• Posted {new Date(project.created_at).toLocaleDateString()}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 leading-tight">
            {project.title}
          </h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:w-64 shrink-0">
          <div className="sticky top-28 space-y-1">
            {tabs.map(tab => {
              const isActive = tab.exact ? currentPath === tab.path : currentPath.startsWith(tab.path);
              return (
                <Link
                  key={tab.name}
                  to={tab.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content Outlet */}
        <div className="flex-1 min-w-0">
          <Outlet context={{ project, fetchProject, isMember, isRequested, isOwner }} />
        </div>
      </div>
    </div>
  );
}
