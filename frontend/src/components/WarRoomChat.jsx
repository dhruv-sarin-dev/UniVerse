import { useState, useEffect, useRef } from 'react';
import { Send, Terminal, MessageSquare, Video, VideoOff, PhoneOff, Monitor, Code, Github, ExternalLink, GitCommit, GitPullRequest, RefreshCw, Link2, Save, Mic, MicOff, X } from 'lucide-react';

/* eslint-disable no-unused-vars */

import { motion, AnimatePresence } from 'framer-motion';
/* eslint-enable no-unused-vars */
import API_URL from '../api';
import { useWarRoom } from '../context/WarRoomContext';

// --- Small Helper for Video ---
function VideoPlayer({ stream, muted, label, isScreenShare, onDoubleClick, isFullscreen }) {
  const videoRef = useRef();
   const [isSpeaking, setIsSpeaking] = useState(false);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) return;

    let audioContext;
    let analyser;
    let microphone;
    let javascriptNode;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      
      // Some browsers require stream to be active before creating source
      microphone = audioContext.createMediaStreamSource(stream);
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      javascriptNode.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;
        for (let i = 0; i < array.length; i++) {
          values += array[i];
        }
        const average = values / array.length;
        setIsSpeaking(average > 0.8); // Increased sensitivity threshold
      };
    } catch (err) {
      console.warn("Audio Context init skipped for stream", err);
    }

    return () => {
      if (javascriptNode) {
        javascriptNode.onaudioprocess = null;
        javascriptNode.disconnect();
      }
      if (analyser) analyser.disconnect();
      if (microphone) microphone.disconnect();
      if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => {});
    };
  }, [stream]);

  return (
    <div 
      onDoubleClick={onDoubleClick}
      title={onDoubleClick ? "Double-click to expand" : undefined}
      className={`relative bg-black/80 rounded-xl overflow-hidden group transition-all duration-300 ${onDoubleClick ? 'cursor-pointer' : ''} ${isFullscreen ? 'w-full h-full' : (isScreenShare ? 'col-span-full aspect-auto h-64' : 'aspect-video')} ${isSpeaking ? 'border-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)]' : 'border border-white/10 shadow-xl'}`}>
      <video ref={videoRef} autoPlay playsInline muted={muted} className={`w-full h-full ${isScreenShare || isFullscreen ? 'object-contain bg-black' : 'object-cover'}`} />
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded flex items-center gap-2 text-[10px] text-white font-bold tracking-wider uppercase">
        {isScreenShare && <Monitor size={10} className="text-teal-400" />} {label}
      </div>
    </div>
  );
}

export default function WarRoomChat({ project, user }) {
  const projectId = project.id;
  const isLeader = project.owner_uid === user?.uid;

  // --- Left Pane Tab ---
  const [leftTab, setLeftTab] = useState('notes'); // 'notes' | 'repo'

  // --- GitHub Repo State ---
  const [repoUrl, setRepoUrl] = useState(project.github_url || '');
  const [repoInput, setRepoInput] = useState('');
  const [savingRepo, setSavingRepo] = useState(false);
  const [commits, setCommits] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState('');


  const {
    isConnected, connectToRoom,
    inCall, localStream, remoteStreams, isMuted, isVideoOff, isScreenSharing,
    startHuddle, leaveHuddle, toggleMute, toggleVideo, shareScreen, stopScreenShare,
    messages, sendMessage, sharedNotes, updateNotes,
    isMOMEnabled, isGeneratingMOM, toggleMOM, generateMOM,
    fullscreenVideo, setFullscreenVideo
  } = useWarRoom();

  useEffect(() => {
    connectToRoom(projectId, user, project);
  }, [projectId, user, project, connectToRoom]);

  const [inputText, setInputText] = useState("");
  const scrollRef = useRef(null);

  // --- UI Actions ---
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendText = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText, user);
    setInputText("");
  };

  const handleNotesChange = (e) => {
    updateNotes(e.target.value, user.uid);
  };

  // --- Helper: time ago ---
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };


  // --- Parse GitHub owner/repo ---
  const parseGithubRepo = (url) => {
    if (!url) return null;
    try {
      // Handle full URLs or owner/repo format
      const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
      if (cleaned.includes('github.com')) {
        const parts = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`).pathname.split('/').filter(Boolean);
        if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
      } else if (cleaned.includes('/')) {
        const [owner, repo] = cleaned.split('/');
        if (owner && repo) return { owner, repo };
      }
    } catch { /* ignore */ }
    return null;
  };

  // --- Fetch GitHub Data (via backend proxy to avoid rate limits) ---
  const fetchRepoData = async (url) => {
    const parsed = parseGithubRepo(url || repoUrl);
    if (!parsed) { setRepoError('Invalid repo URL'); return; }
    setRepoLoading(true);
    setRepoError('');
    try {
      const [commitsRes, pullsRes] = await Promise.all([
        fetch(`${API_URL}/api/vetting/github-proxy/${parsed.owner}/${parsed.repo}/commits?per_page=10`),
        fetch(`${API_URL}/api/vetting/github-proxy/${parsed.owner}/${parsed.repo}/pulls?state=open&per_page=5`)
      ]);
      if (!commitsRes.ok) throw new Error(`Repo not found or private`);
      const commitsData = await commitsRes.json();
      const pullsData = pullsRes.ok ? await pullsRes.json() : [];
      setCommits(commitsData);
      setPulls(pullsData);
    } catch (err) {
      setRepoError(err.message);
      setCommits([]);
      setPulls([]);
    } finally {
      setRepoLoading(false);
    }
  };

  // Auto-fetch when repo tab is selected and URL exists
  useEffect(() => {
    if (leftTab === 'repo' && repoUrl) {
      fetchRepoData(repoUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftTab, repoUrl]);

  // Sync repoUrl from project prop
  useEffect(() => {
    if (project.github_url) setRepoUrl(project.github_url);
  }, [project.github_url]);

  const saveRepoUrl = async () => {
    if (!repoInput.trim()) return;
    setSavingRepo(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/github`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: repoInput.trim() })
      });
      if (res.ok) {
        setRepoUrl(repoInput.trim());
        fetchRepoData(repoInput.trim());
      }
    } catch (err) {
      console.error("Failed to save repo URL", err);
    } finally {
      setSavingRepo(false);
    }
  };

  const parsed = parseGithubRepo(repoUrl);
  const githubDevUrl = parsed ? `https://github.dev/${parsed.owner}/${parsed.repo}` : null;
  const githubWebUrl = parsed ? `https://github.com/${parsed.owner}/${parsed.repo}` : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[800px]">

      {/* Left Pane: Notes & Repo Tabs */}
      <div className="flex-1 flex flex-col bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        {/* Tab Header */}
        <div className="p-4 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border-b border-white/5 z-10 relative">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeftTab('notes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${leftTab === 'notes'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shadow-lg'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
            >
              <Code size={14} /> Live Notes
            </button>
            <button
              onClick={() => setLeftTab('repo')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${leftTab === 'repo'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-lg'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
            >
              <Github size={14} /> Project Repo
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {leftTab === 'notes' ? (
          <textarea
            value={sharedNotes}
            onChange={handleNotesChange}
            placeholder={"// Type code snippets, meeting notes, action items...\n// Changes are broadcast instantly to all team members."}
            className="flex-1 w-full bg-transparent text-slate-300 font-mono text-sm p-6 resize-none focus:outline-none focus:ring-inset focus:ring-1 focus:ring-teal-500/50 transition-colors placeholder:text-slate-600 leading-relaxed"
            disabled={!isConnected}
            spellCheck="false"
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Repo Setup (if no URL set) */}
            {!repoUrl ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/20">
                  <Github size={28} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-white">Connect Your Repository</h3>
                <p className="text-xs text-slate-400 max-w-sm">Link your team's GitHub repository to see live commits, open PRs, and access the browser IDE.</p>

                {isLeader ? (
                  <div className="w-full max-w-sm space-y-3">
                    <input
                      type="text"
                      placeholder="github.com/username/repo or owner/repo"
                      value={repoInput}
                      onChange={e => setRepoInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveRepoUrl()}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      onClick={saveRepoUrl}
                      disabled={savingRepo || !repoInput.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {savingRepo ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      {savingRepo ? 'Saving...' : 'Link Repository'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Ask your project leader to link a repository.</p>
                )}
              </div>
            ) : (
              /* Repo Dashboard */
              <>
                {/* Repo Header */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/15 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Github size={16} className="text-emerald-400" />
                      <span className="text-sm font-black text-white">{parsed?.owner}/{parsed?.repo}</span>
                    </div>
                    <button onClick={() => fetchRepoData()} className="p-1.5 text-slate-500 hover:text-white transition-colors" title="Refresh">
                      <RefreshCw size={12} className={repoLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {githubWebUrl && (
                      <a href={githubWebUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 transition-colors">
                        <ExternalLink size={10} /> View on GitHub
                      </a>
                    )}
                    {githubDevUrl && (
                      <a href={githubDevUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/20 rounded-lg text-[10px] font-bold text-indigo-300 transition-colors">
                        <Code size={10} /> Open in VS Code
                      </a>
                    )}
                    {isLeader && (
                      <button onClick={() => { setRepoUrl(''); setRepoInput(''); }} className="ml-auto text-[10px] text-red-400/50 hover:text-red-400 transition-colors">
                        Unlink
                      </button>
                    )}
                  </div>
                </div>

                {repoError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    ⚠ {repoError}
                  </div>
                )}

                {/* Open Pull Requests */}
                {pulls.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <GitPullRequest size={12} /> Open Pull Requests ({pulls.length})
                    </h4>
                    <div className="space-y-2">
                      {pulls.map(pr => (
                        <a key={pr.id} href={pr.html_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-black/30 border border-white/5 rounded-lg hover:border-emerald-500/30 transition-all group">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 text-[10px] font-bold">#{pr.number}</span>
                            <span className="text-xs text-slate-300 font-semibold group-hover:text-white transition-colors truncate">{pr.title}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] text-slate-500">{pr.user?.login}</span>
                            <span className="text-[9px] text-slate-600">• {timeAgo(pr.created_at)}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Commits */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <GitCommit size={12} /> Recent Commits
                  </h4>
                  {repoLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw size={16} className="text-slate-500 animate-spin" />
                    </div>
                  ) : commits.length > 0 ? (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-emerald-500/30 via-slate-700/30 to-transparent"></div>

                      <div className="space-y-1">
                        {commits.map((c, i) => (
                          <div key={c.sha} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors group relative">
                            {/* Timeline dot */}
                            <div className={`w-[7px] h-[7px] rounded-full mt-1.5 shrink-0 ring-2 ring-black/80 ${i === 0 ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-300 leading-snug truncate group-hover:text-white transition-colors">{c.commit?.message?.split('\n')[0]}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-slate-500 font-semibold">{c.commit?.author?.name || c.author?.login}</span>
                                <span className="text-[9px] text-slate-600">• {timeAgo(c.commit?.author?.date)}</span>
                                <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[9px] text-slate-600 hover:text-teal-400 transition-colors font-mono opacity-0 group-hover:opacity-100">
                                  {c.sha?.slice(0, 7)}
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic text-center py-6">No commits found.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Pane: Media & Chat */}
      <div className="w-full lg:w-[400px] flex flex-col bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        <div className="p-4 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border-b border-white/5 flex flex-col gap-3 z-10 relative">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Terminal size={16} className="text-indigo-400" /> Video Conferencing
            </h3>
            {isLeader && (
              <div className="flex gap-2">
                <button onClick={generateMOM} disabled={isGeneratingMOM} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded hover:bg-purple-500/30 transition-colors">
                  {isGeneratingMOM ? 'Generating...' : 'Generate MOM'}
                </button>
                <button 
                   onClick={toggleMOM}
                   className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border transition-colors ${
                       isMOMEnabled 
                         ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30' 
                         : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
                   }`}
                >
                   <span className="flex items-center gap-1">
                     {isMOMEnabled && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>}
                     {isMOMEnabled ? 'Stop MOM Rec' : 'Start MOM Rec'}
                   </span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!inCall ? (
              <button onClick={startHuddle} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all border border-indigo-500/50">
                <Video size={14} /> Join Call
              </button>
            ) : (
              <>
              <button 
                  onClick={toggleMute} 
                  className={`flex items-center justify-center gap-2 px-3 py-2 ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50' : 'bg-slate-700/50 text-white hover:bg-slate-700 border border-slate-600/50'} text-xs font-bold rounded-lg transition-all`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
                <button 
                  onClick={toggleVideo} 
                  className={`flex items-center justify-center gap-2 px-3 py-2 ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50' : 'bg-slate-700/50 text-white hover:bg-slate-700 border border-slate-600/50'} text-xs font-bold rounded-lg transition-all`}
                  title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
                </button>
                {!isScreenSharing ? (
                  <button onClick={shareScreen} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-all">
                    <Monitor size={14} /> Present Screen
                  </button>
                ) : (
                  <button onClick={stopScreenShare} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all">
                    <Video size={14} /> Back to Camera
                  </button>
                )}
                <button onClick={leaveHuddle} className="flex-none p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all border border-red-500/30">
                  <PhoneOff size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {inCall && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="border-b border-white/5 bg-black/60 overflow-y-auto max-h-[300px] scrollbar-thin">
              <div className="p-3 grid grid-cols-2 gap-3 auto-rows-max">
                {localStream && <VideoPlayer stream={localStream} muted={true} isScreenShare={isScreenSharing} label={`${user.display_name} (Me)`} onDoubleClick={() => setFullscreenVideo({ stream: localStream, label: `${user.display_name} (Me)`, isScreenShare: isScreenSharing })} />}
                {Object.entries(remoteStreams).map(([uid, stream]) => {
                  const memberInfo = project?.members_info?.find(m => m.uid === uid);
                  const displayName = memberInfo ? memberInfo.name : `Peer ${uid.slice(0, 4)}`;
                  return <VideoPlayer key={uid} stream={stream} muted={false} label={displayName} onDoubleClick={() => setFullscreenVideo({ stream, label: displayName, isScreenShare: false })} />;
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide z-10 relative bg-black/20">
          {messages.map((msg, i) => {
            const isMe = msg.uid === user.uid;
            return (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`flex items-center gap-2 mb-0.5 px-2`}><span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{msg.user}</span></div>
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-lg ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-slate-200 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white/5 border-t border-white/5 z-10 relative">
          <div className="relative flex items-center gap-2">
            <input type="text" placeholder="Type message..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendText()} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
            <button onClick={handleSendText} disabled={!inputText.trim()} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl"><Send size={16} /></button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {fullscreenVideo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setFullscreenVideo(null)}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setFullscreenVideo(null); }} 
              className="absolute top-4 right-4 md:top-6 md:right-6 p-3 bg-white/10 border border-white/20 hover:bg-red-500/80 hover:border-red-500 text-white rounded-2xl transition-all z-[1001] shadow-2xl"
              title="Close Fullscreen (Esc)"
            >
              <X size={24} />
            </button>
            <div 
              className="w-full h-full max-w-[90vw] max-h-[90vh] relative flex flex-col items-center justify-center cursor-default gap-4"
              onClick={e => e.stopPropagation()}
              onDoubleClick={() => setFullscreenVideo(null)}
            >
              <div 
                className="w-full h-full ring-1 ring-white/10 rounded-2xl overflow-hidden shadow-2xl bg-black flex-1"
                title="Double-click to close"
              >
                <VideoPlayer 
                  stream={fullscreenVideo.stream} 
                  muted={false} 
                  label={fullscreenVideo.label} 
                  isScreenShare={fullscreenVideo.isScreenShare}
                  isFullscreen={true}
                />
              </div>

              {/* Thumbnail Strip of other participants */}
              {inCall && (
                <div 
                  className="flex gap-3 overflow-x-auto max-w-full px-2 py-1 shrink-0 scrollbar-hide" 
                  onClick={(e) => e.stopPropagation()} 
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  {localStream && localStream !== fullscreenVideo.stream && (
                    <div 
                      className="w-48 h-32 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/20 cursor-pointer hover:ring-teal-500 transition-all shadow-lg"
                      onClick={() => setFullscreenVideo({ stream: localStream, label: `${user.display_name} (Me)`, isScreenShare: isScreenSharing })}
                    >
                      <VideoPlayer stream={localStream} muted={true} label={`${user.display_name} (Me)`} isScreenShare={isScreenSharing} isFullscreen={true} />
                    </div>
                  )}

                  {Object.entries(remoteStreams).map(([uid, stream]) => {
                    if (stream === fullscreenVideo.stream) return null;
                    const memberInfo = project?.members_info?.find(m => m.uid === uid);
                    const displayName = memberInfo ? memberInfo.name : `Peer ${uid.slice(0, 4)}`;
                    
                    return (
                      <div 
                        key={uid}
                        className="w-48 h-32 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/20 cursor-pointer hover:ring-teal-500 transition-all shadow-lg"
                        onClick={() => setFullscreenVideo({ stream, label: displayName, isScreenShare: false })}
                      >
                        <VideoPlayer stream={stream} muted={false} label={displayName} isScreenShare={false} isFullscreen={true} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Call Controls inside Fullscreen overlay */}
              {inCall && (
                <div 
                  className="flex items-center gap-4 bg-[#1e1e1e]/80 border border-white/10 backdrop-blur-xl px-6 py-4 rounded-3xl shadow-2xl z-[1010]" 
                  onClick={e => e.stopPropagation()}
                  onDoubleClick={e => e.stopPropagation()}
                >
                  <button 
                    onClick={toggleMute} 
                    className={`flex items-center justify-center w-12 h-12 rounded-full ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30' : 'bg-slate-700/50 text-white border border-slate-600/50 hover:bg-slate-700'} transition-all`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <button 
                    onClick={toggleVideo} 
                    className={`flex items-center justify-center w-12 h-12 rounded-full ${isVideoOff ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30' : 'bg-slate-700/50 text-white border border-slate-600/50 hover:bg-slate-700'} transition-all`}
                    title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                  </button>
                  
                  {!isScreenSharing ? (
                    <button onClick={shareScreen} className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-teal-500/20">
                      <Monitor size={18} /> Present Screen
                    </button>
                  ) : (
                    <button onClick={stopScreenShare} className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/20">
                      <Video size={18} /> Back to Camera
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      leaveHuddle();
                      setFullscreenVideo(null);
                    }} 
                    className="flex items-center justify-center w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg shadow-red-500/20"
                    title="Leave Call"
                  >
                    <PhoneOff size={20} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
