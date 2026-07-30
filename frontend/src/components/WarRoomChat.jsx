import { useState, useEffect, useRef } from 'react';
import { Send, Video, VideoOff, PhoneOff, Monitor, ExternalLink, RefreshCw, Mic, MicOff, X } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../api';
import { useWarRoom } from '../context/WarRoomContext';

/**
 * War Room — an operations sheet.
 *
 * Video tiles are monitored panels on an ink plate (video is dark; paper
 * around it, ink beneath it), the notes pane is the running log, and the
 * repository pane is the manifest. Signal is earned twice here and nowhere
 * else: the live indicator while a call is up, and the minutes recorder
 * while it is capturing.
 */

const EASE = [0.16, 1, 0.3, 1];

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

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
      className={`relative overflow-hidden bg-ink transition-colors duration-200 ${onDoubleClick ? 'cursor-pointer' : ''} ${isFullscreen ? 'h-full w-full' : (isScreenShare ? 'col-span-full aspect-auto h-64' : 'aspect-video')} ${isSpeaking ? 'outline outline-2 outline-blueprint' : 'outline outline-1 outline-paper/20'}`}>
      <video ref={videoRef} autoPlay playsInline muted={muted} className={`h-full w-full ${isScreenShare || isFullscreen ? 'bg-ink object-contain' : 'object-cover'}`} />
      <div className="absolute bottom-0 left-0 flex items-center gap-1.5 bg-ink/85 px-2 py-1">
        {isScreenShare && <Monitor size={10} className="text-paper/70" />}
        <span className="fm-label !text-[9px] text-paper">{label}</span>
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

  const controlBtn = 'flex items-center justify-center gap-2 border border-ink px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper';

  return (
    <div className="flex h-[800px] flex-col gap-5 lg:flex-row">

      {/* ── Left pane: log & manifest ──────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden border border-ink/20 bg-paper-raised">
        <div className="flex items-center gap-4 border-b border-ink/15 px-3 py-2">
          {[
            { id: 'notes', name: 'Log — shared notes' },
            { id: 'repo', name: 'Manifest — repository' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLeftTab(tab.id)}
              className={`fm-label transition-colors hover:text-blueprint ${
                leftTab === tab.id ? '!text-ink underline underline-offset-4' : 'text-graphite'
              }`}
            >
              {tab.name}
            </button>
          ))}

          <span className="ml-auto flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 ${isConnected ? 'bg-blueprint' : 'bg-rule'}`} />
            <Label className="!text-[9px]">{isConnected ? 'Linked' : 'Offline'}</Label>
          </span>
        </div>

        {/* Tab Content */}
        {leftTab === 'notes' ? (
          <textarea
            value={sharedNotes}
            onChange={handleNotesChange}
            placeholder={"// Type code snippets, meeting notes, action items...\n// Changes are broadcast instantly to all team members."}
            className="w-full flex-1 resize-none bg-paper p-5 font-mono text-[13px] leading-relaxed text-ink transition-colors placeholder:text-graphite focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blueprint disabled:bg-paper-deep"
            disabled={!isConnected}
            spellCheck="false"
          />
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {/* Repo Setup (if no URL set) */}
            {!repoUrl ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="fm-condensed text-2xl font-black uppercase leading-none text-ink">
                  No repository linked
                </p>
                <p className="max-w-sm text-sm leading-relaxed text-graphite">
                  Link the team&apos;s GitHub repository to read live commits, open pull
                  requests, and open the browser IDE.
                </p>

                {isLeader ? (
                  <div className="mt-2 w-full max-w-sm space-y-3">
                    <input
                      type="text"
                      placeholder="github.com/username/repo or owner/repo"
                      value={repoInput}
                      onChange={e => setRepoInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveRepoUrl()}
                      className="w-full border border-ink/25 bg-paper px-3 py-2.5 font-mono text-[13px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none"
                    />
                    <button
                      onClick={saveRepoUrl}
                      disabled={savingRepo || !repoInput.trim()}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden bg-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:cursor-not-allowed disabled:bg-paper-deep disabled:text-graphite"
                    >
                      {!savingRepo && repoInput.trim() && (
                        <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
                      )}
                      {savingRepo && <RefreshCw size={13} className="relative animate-spin" />}
                      <span className="relative">{savingRepo ? 'Saving' : 'Link repository'}</span>
                    </button>
                  </div>
                ) : (
                  <Label className="!text-[10px]">Ask the project lead to link a repository</Label>
                )}
              </div>
            ) : (
              /* Repo Dashboard */
              <>
                {/* Repo header */}
                <div className="border border-ink/20 bg-paper p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-mono text-[13px] text-ink">
                      {parsed?.owner}/{parsed?.repo}
                    </span>
                    <button
                      onClick={() => fetchRepoData()}
                      className="shrink-0 text-graphite transition-colors hover:text-blueprint"
                      title="Refresh"
                    >
                      <RefreshCw size={12} className={repoLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {githubWebUrl && (
                      <a
                        href={githubWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 border border-ink/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
                      >
                        <ExternalLink size={10} /> View on GitHub
                      </a>
                    )}
                    {githubDevUrl && (
                      <a
                        href={githubDevUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 border border-ink/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
                      >
                        Open in VS Code
                      </a>
                    )}
                    {isLeader && (
                      <button
                        onClick={() => { setRepoUrl(''); setRepoInput(''); }}
                        className="fm-label ml-auto !text-[9px] text-graphite transition-colors hover:text-ink"
                      >
                        Unlink
                      </button>
                    )}
                  </div>
                </div>

                {repoError && (
                  <div className="border border-ink/25 bg-paper p-3">
                    <Label className="!text-[10px] !text-ink">Manifest unavailable</Label>
                    <p className="mt-1 font-mono text-[12px] text-graphite">{repoError}</p>
                  </div>
                )}

                {/* Open Pull Requests */}
                {pulls.length > 0 && (
                  <div>
                    <div className="flex items-baseline justify-between border-b border-ink/20 pb-1.5">
                      <Label className="!text-[10px] !text-ink">Open pull requests</Label>
                      <Label className="!text-[10px]">{pulls.length}</Label>
                    </div>
                    <ul>
                      {pulls.map(pr => (
                        <li key={pr.id} className="border-b border-rule">
                          <a
                            href={pr.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block py-2.5"
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="shrink-0 font-mono text-[11px] text-blueprint">#{pr.number}</span>
                              <span className="truncate text-[13px] text-ink transition-colors group-hover:text-blueprint">
                                {pr.title}
                              </span>
                            </div>
                            <p className="mt-0.5 font-mono text-[11px] text-graphite">
                              {pr.user?.login} · {timeAgo(pr.created_at)}
                            </p>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recent Commits */}
                <div>
                  <div className="flex items-baseline justify-between border-b border-ink/20 pb-1.5">
                    <Label className="!text-[10px] !text-ink">Recent commits</Label>
                    <Label className="!text-[10px]">{commits.length}</Label>
                  </div>
                  {repoLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink/15 border-t-blueprint" />
                    </div>
                  ) : commits.length > 0 ? (
                    <ul>
                      {commits.map((c, i) => (
                        <li key={c.sha} className="group flex items-baseline gap-3 border-b border-rule py-2">
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 self-start ${i === 0 ? 'bg-blueprint' : 'bg-rule'}`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] leading-snug text-ink">
                              {c.commit?.message?.split('\n')[0]}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-graphite">
                              {c.commit?.author?.name || c.author?.login} · {timeAgo(c.commit?.author?.date)}
                            </p>
                          </div>
                          <a
                            href={c.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 font-mono text-[11px] text-graphite transition-colors hover:text-blueprint"
                          >
                            {c.sha?.slice(0, 7)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-6 text-center font-mono text-[12px] text-graphite">— no commits read</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Right pane: station ────────────────────────────────────── */}
      <div className="relative flex w-full flex-col overflow-hidden border border-ink/20 bg-paper-raised lg:w-[400px]">
        <div className="flex flex-col gap-3 border-b border-ink/15 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="!text-ink">Station — call &amp; channel</Label>
            {inCall && (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-signal" />
                <span className="fm-label !text-[9px] text-signal">Live</span>
              </span>
            )}
          </div>

          {isLeader && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={generateMOM}
                disabled={isGeneratingMOM}
                className="border border-ink/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
              >
                {isGeneratingMOM ? 'Generating minutes' : 'Generate minutes'}
              </button>
              <button
                onClick={toggleMOM}
                className={`flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  isMOMEnabled
                    ? 'border-signal text-signal hover:bg-signal hover:text-paper'
                    : 'border-ink/25 text-ink hover:bg-ink hover:text-paper'
                }`}
              >
                {isMOMEnabled && <span className="h-1.5 w-1.5 bg-signal" />}
                {isMOMEnabled ? 'Stop recording' : 'Record minutes'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!inCall ? (
              <button
                onClick={startHuddle}
                className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden bg-ink px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <Video size={14} className="relative" />
                <span className="relative">Join call</span>
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={isMuted ? `${controlBtn} bg-ink text-paper` : controlBtn}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={controlBtn}
                  title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
                </button>
                {!isScreenSharing ? (
                  <button onClick={shareScreen} className={`${controlBtn} flex-1`}>
                    <Monitor size={14} /> Present
                  </button>
                ) : (
                  <button onClick={stopScreenShare} className={`${controlBtn} flex-1`}>
                    <Video size={14} /> Camera
                  </button>
                )}
                <button onClick={leaveHuddle} className={controlBtn} title="Leave call">
                  <PhoneOff size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {inCall && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="max-h-[300px] overflow-y-auto border-b border-ink/15 bg-paper-deep"
            >
              <div className="grid auto-rows-max grid-cols-2 gap-2 p-2">
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

        {/* Channel */}
        <div className="relative z-10 flex-1 space-y-4 overflow-y-auto bg-paper p-4">
          {messages.map((msg, i) => {
            const isMe = msg.uid === user.uid;
            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                key={i}
                className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}
              >
                <Label className="!text-[9px]">{msg.user}</Label>
                <div
                  className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed ${
                    isMe ? 'bg-ink text-paper' : 'border border-ink/20 bg-paper-raised text-ink'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="relative z-10 border-t border-ink/15 p-3">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              placeholder="Message the room"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendText()}
              className="flex-1 border border-ink/25 bg-paper px-3 py-2.5 font-mono text-[12px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none"
            />
            <button
              onClick={handleSendText}
              disabled={!inputText.trim()}
              className="bg-ink p-2.5 text-paper transition-colors hover:bg-blueprint disabled:bg-paper-deep disabled:text-graphite"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Fullscreen monitor ─────────────────────────────────────── */}
      <AnimatePresence>
        {fullscreenVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/95 p-4 md:p-8"
            onClick={() => setFullscreenVideo(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setFullscreenVideo(null); }}
              className="absolute right-4 top-4 z-[1001] border border-paper/25 p-2.5 text-paper transition-colors hover:bg-paper hover:text-ink md:right-6 md:top-6"
              title="Close Fullscreen (Esc)"
            >
              <X size={20} />
            </button>
            <div
              className="relative flex h-full max-h-[90vh] w-full max-w-[90vw] cursor-default flex-col items-center justify-center gap-4"
              onClick={e => e.stopPropagation()}
              onDoubleClick={() => setFullscreenVideo(null)}
            >
              <div
                className="h-full w-full flex-1 overflow-hidden bg-ink outline outline-1 outline-paper/20"
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
                  className="flex max-w-full shrink-0 gap-3 overflow-x-auto px-2 py-1"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  {localStream && localStream !== fullscreenVideo.stream && (
                    <div
                      className="h-32 w-48 shrink-0 cursor-pointer overflow-hidden outline outline-1 outline-paper/25 transition-all hover:outline-blueprint"
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
                        className="h-32 w-48 shrink-0 cursor-pointer overflow-hidden outline outline-1 outline-paper/25 transition-all hover:outline-blueprint"
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
                  className="z-[1010] flex items-center gap-3 border border-paper/20 bg-ink px-5 py-3"
                  onClick={e => e.stopPropagation()}
                  onDoubleClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={toggleMute}
                    className={`flex h-10 w-10 items-center justify-center border border-paper/25 transition-colors ${isMuted ? 'bg-paper text-ink' : 'text-paper hover:bg-paper hover:text-ink'}`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button
                    onClick={toggleVideo}
                    className="flex h-10 w-10 items-center justify-center border border-paper/25 text-paper transition-colors hover:bg-paper hover:text-ink"
                    title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
                  </button>

                  {!isScreenSharing ? (
                    <button onClick={shareScreen} className="flex items-center gap-2 border border-paper/25 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper transition-colors hover:bg-paper hover:text-ink">
                      <Monitor size={15} /> Present screen
                    </button>
                  ) : (
                    <button onClick={stopScreenShare} className="flex items-center gap-2 border border-paper/25 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper transition-colors hover:bg-paper hover:text-ink">
                      <Video size={15} /> Back to camera
                    </button>
                  )}

                  <button
                    onClick={() => {
                      leaveHuddle();
                      setFullscreenVideo(null);
                    }}
                    className="flex h-10 w-10 items-center justify-center bg-signal text-paper transition-colors hover:bg-paper hover:text-ink"
                    title="Leave Call"
                  >
                    <PhoneOff size={16} />
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
