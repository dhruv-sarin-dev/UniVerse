import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Mail, Github, Trash2, X, Star, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import API_URL from '../../api';
import ApplicantCompatibilityExam from '../../components/ApplicantCompatibilityExam';

/**
 * Members — the roster, with the vetting appendix beneath it.
 *
 * The team is a numbered roster rather than a grid of cards, and everything
 * the AI measured about an applicant — the compatibility score and its radar
 * metrics — is set in mono, because those are readings, not decoration.
 *
 * The compatibility exam modal keeps a dark plate: the exam component it
 * wraps is not part of this conversion and renders light-on-dark, so an
 * inverted appendix is the honest way to host it.
 */

const EASE = [0.16, 1, 0.3, 1];

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

function Panel({ caption, meta, children, className = '' }) {
  return (
    <section className={`border border-ink/20 bg-paper-raised ${className}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-ink/15 px-3 py-2">
        <Label className="!text-ink">{caption}</Label>
        {meta}
      </div>
      {children}
    </section>
  );
}

/** Scores band into three readings; the word carries the meaning, not a colour. */
function scoreBand(score) {
  if (score >= 70) return 'strong fit';
  if (score >= 45) return 'partial fit';
  return 'weak fit';
}

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

  const members = project.members_info || [];
  const requests = project.join_requests_info || [];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Roster ──────────────────────────────────────────────────── */}
      <Panel
        caption="Roster — on board"
        meta={<Label className="whitespace-nowrap !text-[10px]">{members.length} of record</Label>}
      >
        <ul>
          {members.map((m, idx) => {
            const isMemberOwner = m.uid === project.owner_uid;
            const isOnline = onlineUsers.includes(m.uid);
            return (
              <motion.li
                key={m.uid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.3), duration: 0.4, ease: EASE }}
                className="group flex items-center gap-4 border-b border-rule px-4 py-3 last:border-b-0"
              >
                <span className="w-6 shrink-0 font-mono text-[11px] text-graphite">
                  {String(idx + 1).padStart(2, '0')}
                </span>

                <div className="relative shrink-0">
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      className="h-10 w-10 border border-ink/20 object-cover"
                    />
                  ) : null}
                  <div
                    className="flex h-10 w-10 items-center justify-center border border-ink/20 bg-paper-deep font-mono text-[13px] font-bold text-ink"
                    style={m.photo_url ? { display: 'none' } : {}}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 h-2 w-2 border border-paper-raised ${
                      isOnline ? 'bg-blueprint' : 'bg-rule'
                    }`}
                    title={isOnline ? 'Online' : 'Offline'}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="fm-condensed truncate text-[17px] font-bold uppercase leading-none tracking-tight text-ink">
                      {m.name}
                    </p>
                    <Label className="shrink-0 !text-[9px]">
                      {isMemberOwner ? 'Lead' : 'Member'}
                    </Label>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-graphite">
                    {m.branch || 'University student'}
                    {isOnline ? ' · online' : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {isOwner && m.github && (
                    <button
                      onClick={() => openGithubIntel(m)}
                      className="border border-transparent p-2 text-graphite transition-colors hover:border-ink/20 hover:text-blueprint"
                      title="GitHub intel"
                    >
                      <Github size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => m.email ? window.open(`mailto:${m.email}`, '_blank') : alert('No email provided by this user.')}
                    className="border border-transparent p-2 text-graphite transition-colors hover:border-ink/20 hover:text-ink"
                    title="Send email"
                  >
                    <Mail size={15} />
                  </button>
                  {isOwner && m.uid !== project.owner_uid && (
                    <button
                      onClick={() => handleRemoveMember(m.uid)}
                      className="border border-transparent p-2 text-graphite transition-colors hover:border-ink/20 hover:text-signal"
                      title="Remove from roster"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </motion.li>
            );
          })}

          {members.length === 0 && (
            <li className="border-b border-dashed border-ink/25 px-4 py-12 text-center">
              <p className="fm-condensed text-xl font-black uppercase text-ink">Roster empty</p>
              <p className="mt-1.5 text-sm text-graphite">No one has joined this project yet.</p>
            </li>
          )}
        </ul>

        {/* Join action */}
        {user && !isOwner && !isMember && (
          <div className="border-t border-ink/15 p-4">
            <button
              onClick={() => handleJoin()}
              className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                isRequested
                  ? 'border border-signal text-signal hover:bg-signal hover:text-paper'
                  : 'bg-ink text-paper'
              }`}
            >
              {!isRequested && (
                <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
              )}
              <span className="relative">
                {isRequested ? 'Request pending — click to cancel' : 'Request to join'}
              </span>
            </button>
          </div>
        )}
        {!user && (
          <div className="border-t border-ink/15 p-4">
            <button
              onClick={login}
              className="group relative flex w-full items-center justify-center overflow-hidden bg-ink px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-paper"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative">Sign in to request a seat</span>
            </button>
          </div>
        )}
      </Panel>

      {/* ── Appendix A — vetting ────────────────────────────────────── */}
      {isOwner && requests.length > 0 && (
        <Panel
          caption="Appendix A — applications"
          meta={<Label className="whitespace-nowrap !text-[10px]">{requests.length} awaiting review</Label>}
        >
          <ul>
            {requests.map((req) => {
              const exam = req.compatibility_exam;
              const score = exam?.totalCompatibilityScore;

              return (
                <li key={req.uid} className="border-b border-rule p-4 last:border-b-0">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    {/* Identity */}
                    <div className="flex flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink/20 bg-paper-deep font-mono text-[13px] font-bold text-ink">
                        {req.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="fm-condensed truncate text-[17px] font-bold uppercase leading-none tracking-tight text-ink">
                          {req.name}
                        </p>
                        <p className="mt-1 truncate font-mono text-[11px] text-graphite">
                          {req.branch || 'University student'}
                        </p>
                        {score !== undefined && (
                          <dl className="mt-2 flex items-baseline gap-2">
                            <dt><Label className="!text-[9px]">Score</Label></dt>
                            <dd className="fm-condensed text-xl font-black leading-none text-ink">
                              {score}<span className="text-ink/30">%</span>
                            </dd>
                            <dd><Label className="!text-[9px]">{scoreBand(score)}</Label></dd>
                          </dl>
                        )}
                      </div>
                    </div>

                    {/* Declared skills + AI reading */}
                    <div className="flex-1 border-t border-rule pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                      {req.skills && req.skills.length > 0 ? (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {req.skills.slice(0, 4).map(s => (
                            <span key={s} className="border border-ink/20 px-2 py-0.5 font-mono text-[11px] text-ink">
                              {s}
                            </span>
                          ))}
                          {req.skills.length > 4 && (
                            <span className="px-1 py-0.5 font-mono text-[11px] text-graphite">
                              +{req.skills.length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="mb-3 font-mono text-[11px] text-graphite">— no skills declared</p>
                      )}

                      {exam && <ExamInsightBlock exam={exam} />}
                    </div>

                    {/* Verdict */}
                    <div className="flex shrink-0 items-center gap-2">
                      {req.github && (
                        <button
                          onClick={() => openGithubIntel(req)}
                          className="border border-transparent p-2 text-graphite transition-colors hover:border-ink/20 hover:text-blueprint"
                          title="GitHub intel"
                        >
                          <Github size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleAccept(req.uid)}
                        className="group relative overflow-hidden bg-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper"
                      >
                        <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
                        <span className="relative">Accept</span>
                      </button>
                      <button
                        onClick={() => handleReject(req.uid)}
                        className="border border-ink px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/* ── GitHub Intel Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {intelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
            onClick={() => setIntelModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg border border-ink bg-paper-raised"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-ink px-4 py-2.5">
                <Label className="!text-ink">Appendix B — GitHub record</Label>
                <div className="flex items-center gap-3">
                  <Label className="!text-[10px]">{intelModal.name}</Label>
                  <button onClick={() => setIntelModal(null)} className="text-graphite transition-colors hover:text-ink">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-4">
                {intelLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-blueprint" />
                    <Label>Reading public record</Label>
                  </div>
                ) : intelData?.error ? (
                  <div className="border border-ink/20 px-4 py-8 text-center">
                    <p className="fm-condensed text-xl font-black uppercase text-ink">Record unavailable</p>
                    <p className="mt-1.5 font-mono text-[12px] text-graphite">{intelData.error}</p>
                  </div>
                ) : intelData ? (
                  <div className="space-y-5">
                    {/* Identity */}
                    <div className="flex items-center gap-3 border border-ink/20 p-3">
                      <img src={intelData.avatar} alt="" className="h-12 w-12 border border-ink/20 object-cover" />
                      <div className="min-w-0 flex-1">
                        <a
                          href={intelData.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-[13px] text-ink transition-colors hover:text-blueprint"
                        >
                          @{intelData.login} <ExternalLink size={10} />
                        </a>
                        {intelData.bio && (
                          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-graphite">{intelData.bio}</p>
                        )}
                      </div>
                    </div>

                    {/* Measurements */}
                    <dl className="grid grid-cols-4 border-t border-ink/20">
                      {[
                        { label: 'Repos', value: intelData.publicRepos },
                        { label: 'Stars', value: intelData.totalStars },
                        { label: 'Followers', value: intelData.followers },
                        { label: 'Following', value: intelData.following },
                      ].map(stat => (
                        <div key={stat.label} className="border-b border-r border-rule p-3 last:border-r-0">
                          <dt><Label className="!text-[9px]">{stat.label}</Label></dt>
                          <dd className="fm-condensed mt-1 text-2xl font-black leading-none text-ink">
                            {stat.value || 0}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {/* Languages */}
                    {intelData.topLangs?.length > 0 && (
                      <div>
                        <Label className="!text-[10px]">Languages by repo count</Label>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {intelData.topLangs.map(([lang, count]) => (
                            <span
                              key={lang}
                              className="flex items-center gap-1.5 border border-ink/20 px-2 py-0.5 font-mono text-[11px] text-ink"
                            >
                              {lang}
                              <span className="text-graphite">{count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notable work */}
                    {intelData.topRepos?.length > 0 && (
                      <div>
                        <Label className="!text-[10px]">Notable repositories</Label>
                        <ul className="mt-2 border-t border-ink/20">
                          {intelData.topRepos.map(repo => (
                            <li key={repo.id} className="border-b border-rule">
                              <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block py-2.5 transition-colors hover:text-blueprint"
                              >
                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="truncate font-mono text-[12px] text-ink transition-colors group-hover:text-blueprint">
                                    {repo.name}
                                  </span>
                                  <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-graphite">
                                    <Star size={10} /> {repo.stargazers_count}
                                  </span>
                                </div>
                                {repo.description && (
                                  <p className="mt-0.5 truncate text-[12px] text-graphite">{repo.description}</p>
                                )}
                                {repo.language && (
                                  <p className="mt-0.5 font-mono text-[10px] text-graphite">{repo.language}</p>
                                )}
                              </a>
                            </li>
                          ))}
                        </ul>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
            onClick={() => { if (!joiningAfterExam) setShowExamModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-ink bg-ink"
            >
              <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-paper/20 bg-ink px-4 py-2.5">
                <span className="fm-label text-paper">Appendix C — vetting exam</span>
                <div className="flex items-center gap-3">
                  <span className="fm-label !text-[10px] text-paper/50">
                    Required to join {project?.title}
                  </span>
                  {!joiningAfterExam && (
                    <button
                      onClick={() => setShowExamModal(false)}
                      className="text-paper/60 transition-colors hover:text-paper"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

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

// ── Inline helper: the AI's reading of an applicant, for the team lead ──
function ExamInsightBlock({ exam }) {
  const [expanded, setExpanded] = useState(false);
  const radar = exam.radarMetrics || {};

  const metrics = [
    { label: 'Tech fit', value: radar.techFit },
    { label: 'Culture fit', value: radar.cultureFit },
    { label: 'Ramp-up', value: radar.speed },
  ].filter((m) => m.value !== undefined);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="fm-label flex items-center gap-1.5 text-graphite transition-colors hover:text-blueprint"
      >
        AI reading
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <dl className="mt-2 border-t border-rule">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center gap-3 border-b border-rule py-1.5">
                <dt className="w-20 shrink-0"><Label className="!text-[9px]">{m.label}</Label></dt>
                <dd className="flex flex-1 items-center gap-2">
                  {/* A measured quantity, not a progress bar: ticked scale, value read off the end. */}
                  <span className="relative h-1.5 flex-1 bg-paper-deep">
                    <motion.span
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: m.value / 100 }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="absolute inset-y-0 left-0 w-full origin-left bg-ink"
                    />
                    <span className="absolute inset-y-0 left-1/2 w-px bg-paper-raised" aria-hidden="true" />
                  </span>
                  <span className="w-7 shrink-0 text-right font-mono text-[11px] text-ink">{m.value}</span>
                </dd>
              </div>
            ))}
          </dl>

          {exam.summary && (
            <p className="mt-2 text-[12px] leading-relaxed text-graphite">{exam.summary}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
