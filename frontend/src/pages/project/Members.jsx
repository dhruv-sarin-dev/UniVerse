import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Users, Sparkles, Mail, Github, Trash2, BarChart3, X, Star, BookOpen, Code, ExternalLink, Shield, Brain, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import API_URL from '../../api';
import ApplicantCompatibilityExam from '../../components/ApplicantCompatibilityExam';

export default function Members() {
  const { project, fetchProject, isMember, isRequested, isOwner } = useOutletContext();
  const { user, login, onlineUsers = [] } = useAuth();

  // Real-time polling for owner to see new join requests
  useEffect(() => {
    if (!isOwner) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchProject();
    }, 8000);
    return () => clearInterval(interval);
  }, [isOwner, fetchProject]);

  // --- GitHub Intel Modal State ---
  const [intelModal, setIntelModal] = useState(null);
  const [intelData, setIntelData] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);

  // ── Compatibility Exam Modal State ────────────────────────────────────
  const [showExamModal, setShowExamModal] = useState(false);
  const [examEvaluation, setExamEvaluation] = useState(null);
  const [joiningAfterExam, setJoiningAfterExam] = useState(false);

  const handleJoin = async (compatibilityExamData = null) => {
    if (!user) return login();

    // If not a member AND not already requested AND no exam data yet → open exam modal
    if (!isMember && !isRequested && !compatibilityExamData) {
      setShowExamModal(true);
      return;
    }

    try {
      const body = { user_id: user.uid };
      if (compatibilityExamData) {
        body.compatibility_exam = compatibilityExamData;
      }
      const res = await fetch(`${API_URL}/api/projects/${project.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        fetchProject();
      }
    } catch (err) {
      console.error("Failed to join project", err);
    }
  };

  const handleExamComplete = async (evaluation) => {
    setExamEvaluation(evaluation);
    setJoiningAfterExam(true);
    try {
      const body = {
        user_id: user.uid,
        compatibility_exam: evaluation,
      };
      const res = await fetch(`${API_URL}/api/projects/${project.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setTimeout(() => {
          setShowExamModal(false);
          setJoiningAfterExam(false);
          setExamEvaluation(null);
          fetchProject();
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to join after exam", err);
      setJoiningAfterExam(false);
    }
  };

  const handleAccept = async (requestUid) => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/requests/${requestUid}/accept`, {
        method: 'POST'
      });
      if (res.ok) fetchProject();
    } catch (err) {
      console.error("Failed to accept request", err);
    }
  };

  const handleReject = async (requestUid) => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/requests/${requestUid}/reject`, {
        method: 'POST'
      });
      if (res.ok) fetchProject();
    } catch (err) {
      console.error("Failed to reject request", err);
    }
  };

  const handleRemoveMember = async (memberUid) => {
    if (!window.confirm("Remove this member from the project?")) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/members/${memberUid}`, { method: 'DELETE' });
      if (res.ok) fetchProject();
    } catch (err) {
      console.error("Failed to remove member", err);
    }
  };

  const openGithubIntel = async (person) => {
    let username = person.github || '';
    if (!username) { alert('This user has not linked a GitHub account.'); return; }
    if (username.includes('github.com/')) username = username.split('github.com/')[1].split('/')[0];
    username = username.replace(/\/$/, '');
    if (!username) { alert('Invalid GitHub username.'); return; }

    setIntelModal(person);
    setIntelData(null);
    setIntelLoading(true);

    try {
      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${username}`),
        fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`)
      ]);
      if (!userRes.ok) throw new Error('User not found');
      const userData = await userRes.json();
      const reposData = reposRes.ok ? await reposRes.json() : [];

      const totalStars = reposData.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
      const languages = {};
      reposData.forEach(r => { if (r.language) languages[r.language] = (languages[r.language] || 0) + 1; });
      const topLangs = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const topRepos = reposData.filter(r => !r.fork).sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 5);

      setIntelData({
        avatar: userData.avatar_url,
        login: userData.login,
        bio: userData.bio,
        publicRepos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        totalStars,
        topLangs,
        topRepos,
        profileUrl: userData.html_url
      });
    } catch (err) {
      setIntelData({ error: err.message });
    } finally {
      setIntelLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Current Team Section */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 bg-gradient-to-r from-teal-500/10 to-cyan-500/5 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/20 rounded-xl">
                <Users size={18} className="text-teal-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  Current Team
                </h3>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-500/10 text-teal-400 text-[10px] font-bold rounded-lg border border-teal-500/20">
              <span className="inline-block w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
              {project.members_info?.length || 0} Active
            </span>
          </div>
        </div>

        <div className="p-5 grid gap-4 grid-cols-1 md:grid-cols-2">
          {project.members_info?.map((m, idx) => {
            const isMemberOwner = m.uid === project.owner_uid;
            const isOnline = onlineUsers.includes(m.uid);
            return (
              <motion.div
                key={m.uid}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-black/30 border border-white/5 hover:border-teal-500/20 transition-all group"
              >
                <div className="relative shrink-0">
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/10 group-hover:border-teal-500/30 transition-colors"
                    />
                  ) : null}
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${isMemberOwner ? 'from-teal-500 to-cyan-600' : 'from-slate-700 to-slate-800'} flex items-center justify-center text-sm font-black text-white border-2 border-white/10 group-hover:border-teal-500/30 transition-colors`}
                    style={m.photo_url ? { display: 'none' } : {}}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-black/80 ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-600'}`}
                    title={isOnline ? 'Online' : 'Offline'}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-base font-bold text-white truncate">{m.name}</p>
                    {isMemberOwner ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-teal-500/10 text-teal-400 text-[9px] font-bold rounded border border-teal-500/20 shrink-0">
                        <Sparkles size={8} /> LEAD
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 text-slate-500 text-[9px] font-bold rounded border border-white/5 shrink-0">
                        MEMBER
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{m.branch || 'University Student'}</p>
                </div>

                <div className="flex items-center gap-2">
                  {isOwner && m.github && (
                    <button onClick={() => openGithubIntel(m)} className="p-2 text-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" title="GitHub Intel">
                      <Github size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => m.email ? window.open(`mailto:${m.email}`, '_blank') : alert('No email provided by this user.')}
                    className="p-2 text-slate-600 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    title="Send Email"
                  >
                    <Mail size={16} />
                  </button>
                  {isOwner && m.uid !== project.owner_uid && (
                    <button onClick={() => handleRemoveMember(m.uid)} className="p-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Remove">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}

          {(!project.members_info || project.members_info.length === 0) && (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center">
                <Users size={28} className="text-slate-600" />
              </div>
              <p className="text-base text-slate-400 font-semibold">No team members yet</p>
              <p className="text-sm text-slate-600 mt-1">Be the first to join this project!</p>
            </div>
          )}
        </div>

        {/* Join Project Action for Non-Members */}
        {user && !isOwner && !isMember && (
          <div className="p-6 bg-black/20 border-t border-white/5 flex justify-center">
             <button
              onClick={() => handleJoin()}
              className={`w-full max-w-sm font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm ${
                isRequested
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                  : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg shadow-teal-500/10'
              }`}
            >
              {isRequested
                ? 'Request Pending (Click to Cancel)'
                : <><Sparkles size={16} /> Request to Join</>
              }
            </button>
          </div>
        )}
        {!user && (
          <div className="p-6 bg-black/20 border-t border-white/5 flex justify-center">
            <button onClick={login} className="w-full max-w-sm bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 text-sm">
              <Sparkles size={16} /> Sign in to Join Team
            </button>
          </div>
        )}
      </div>


      {/* Pending Applications - Owner Only */}
      {isOwner && project.join_requests_info?.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-all"></div>

          <h4 className="text-sm font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
            Pending Applications ({project.join_requests_info.length})
          </h4>

          <div className="space-y-4 relative z-10">
            {project.join_requests_info.map((req) => {
              const exam = req.compatibility_exam;
              const score = exam?.totalCompatibilityScore;
              const scoreColor = score >= 70 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : score >= 45 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : score !== undefined ? 'text-red-400 bg-red-500/10 border-red-500/20' : '';

              return (
              <div key={req.uid} className="bg-black/40 border border-white/5 rounded-xl p-5 transition-all hover:border-yellow-500/30 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
                    {req.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-white leading-none mb-1.5">{req.name}</p>
                    <p className="text-xs text-slate-500 truncate">{req.branch || 'University Student'}</p>
                  </div>
                  {score !== undefined && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${scoreColor}`} title="AI Compatibility Score">
                      <Brain size={12} />
                      {score}%
                    </div>
                  )}
                </div>

                <div className="flex-1 lg:pl-4 border-t border-white/5 lg:border-t-0 lg:border-l pt-4 lg:pt-0 mt-4 lg:mt-0">
                  {req.skills && req.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {req.skills.slice(0, 4).map(s => (
                        <span key={s} className="px-2 py-1 bg-white/5 text-[10px] text-slate-400 rounded-md border border-white/5">{s}</span>
                      ))}
                      {req.skills.length > 4 && <span className="text-xs text-slate-500 pl-1 py-1">+{req.skills.length - 4}</span>}
                    </div>
                  ) : <span className="text-xs text-slate-600 block mb-3">No skills listed</span>}
                  
                  {exam && (
                    <ExamInsightBlock exam={exam} />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {req.github && (
                    <button onClick={() => openGithubIntel(req)} className="p-2 text-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="GitHub Intel">
                      <Github size={18} />
                    </button>
                  )}
                  <button onClick={() => handleAccept(req.uid)} className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-sm font-bold px-6 py-2.5 rounded-lg border border-teal-500/20 transition-colors">
                    Accept
                  </button>
                  <button onClick={() => handleReject(req.uid)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold px-4 py-2.5 rounded-lg border border-red-500/20 transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* GitHub Intel Modal */}
      <AnimatePresence>
        {intelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setIntelModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-xl">
                    <BarChart3 size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">GitHub Intel</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{intelModal.name}</p>
                  </div>
                </div>
                <button onClick={() => setIntelModal(null)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {intelLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-xs text-slate-500">Fetching GitHub data...</p>
                  </div>
                ) : intelData?.error ? (
                  <div className="text-center py-8">
                    <p className="text-red-400 text-sm">⚠ {intelData.error}</p>
                  </div>
                ) : intelData ? (
                  <div className="space-y-5">
                    {/* Profile Card */}
                    <div className="flex items-center gap-4 p-4 bg-black/30 rounded-xl border border-white/5">
                      <img src={intelData.avatar} alt="" className="w-14 h-14 rounded-full border-2 border-emerald-500/30" />
                      <div className="flex-1">
                        <a href={intelData.profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-white hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                          @{intelData.login} <ExternalLink size={10} />
                        </a>
                        {intelData.bio && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{intelData.bio}</p>}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Repos', value: intelData.publicRepos, icon: BookOpen, color: 'text-indigo-400' },
                        { label: 'Stars', value: intelData.totalStars, icon: Star, color: 'text-yellow-400' },
                        { label: 'Followers', value: intelData.followers, icon: Users, color: 'text-teal-400' },
                        { label: 'Following', value: intelData.following, icon: Users, color: 'text-slate-400' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                          <stat.icon size={14} className={`${stat.color} mx-auto mb-1.5`} />
                          <p className="text-lg font-black text-white">{stat.value || 0}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Top Languages */}
                    {intelData.topLangs?.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Code size={12} /> Top Languages
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {intelData.topLangs.map(([lang, count]) => (
                            <span key={lang} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                              {lang}
                              <span className="text-emerald-500/50 text-[9px]">{count} repos</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Repos */}
                    {intelData.topRepos?.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <BookOpen size={12} /> Notable Projects
                        </h4>
                        <div className="space-y-2">
                          {intelData.topRepos.map(repo => (
                            <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-black/30 border border-white/5 rounded-lg hover:border-emerald-500/30 transition-all group">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{repo.name}</span>
                                <div className="flex items-center gap-1 text-yellow-500 text-[10px]">
                                  <Star size={10} /> {repo.stargazers_count}
                                </div>
                              </div>
                              {repo.description && <p className="text-[10px] text-slate-500 mt-1 truncate">{repo.description}</p>}
                              <div className="flex items-center gap-2 mt-1.5">
                                {repo.language && <span className="text-[9px] text-emerald-400/60 font-semibold">{repo.language}</span>}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Compatibility Exam Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showExamModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => { if (!joiningAfterExam) setShowExamModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border-b border-white/5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/20 rounded-xl">
                    <Shield size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Compatibility Assessment</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Complete to join {project?.title}</p>
                  </div>
                </div>
                {!joiningAfterExam && (
                  <button
                    onClick={() => setShowExamModal(false)}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <ApplicantCompatibilityExam
                  projectContext={{
                    id: project?.id,
                    name: project?.title,
                    techStack: project?.required_skills || [],
                    currentPhase: project?.project_type || 'Development',
                    recentChallenges: project?.description?.slice(0, 200) || '',
                  }}
                  applicantContext={{
                    id: user?.uid,
                    name: user?.display_name || user?.email || 'Applicant',
                    knownSkills: user?.skills || [],
                    bio: user?.bio || '',
                  }}
                  onComplete={handleExamComplete}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Inline helper: Expandable AI insight block for team lead ──────────
function ExamInsightBlock({ exam }) {
  const [expanded, setExpanded] = useState(false);
  const radar = exam.radarMetrics || {};

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300 font-semibold uppercase tracking-wider transition-colors mb-2"
      >
        <Brain size={10} />
        AI Insight
        {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          {/* Radar Metric Bars */}
          {[{ label: 'Tech Fit', value: radar.techFit, color: 'bg-cyan-500' },
            { label: 'Culture Fit', value: radar.cultureFit, color: 'bg-violet-500' },
            { label: 'Speed', value: radar.speed, color: 'bg-amber-500' },
          ].map(m => (
            m.value !== undefined && (
              <div key={m.label} className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 w-16 shrink-0">{m.label}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
                </div>
                <span className="text-[9px] text-slate-400 w-7 text-right">{m.value}</span>
              </div>
            )
          ))}
          {/* Summary */}
          {exam.summary && (
            <p className="text-[10px] text-slate-400 italic leading-relaxed mt-1 p-2 bg-violet-500/5 rounded-lg border border-violet-500/10">
              "{exam.summary}"
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
