import { useState, useRef, useEffect, useCallback } from 'react';
import { useWarRoom } from '../context/WarRoomContext';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Maximize2, GripHorizontal, X } from 'lucide-react';
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion';
/* eslint-enable no-unused-vars */

function MiniVideoPlayer({ stream, muted, label }) {
  const ref = useRef();
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur rounded text-[8px] text-white font-bold truncate max-w-[80%]">
        {label}
      </div>
    </div>
  );
}

export default function MiniCallOverlay() {
  const ctx = useWarRoom();
  const navigate = useNavigate();

  const {
    inCall, activeProjectId, localStream, remoteStreams,
    isMuted, isVideoOff, isScreenSharing,
    toggleMute, toggleVideo, leaveHuddle, shareScreen, stopScreenShare,
    userRef, projectRef,
  } = ctx || {};

  // Dragging
  const [pos, setPos] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 280 });
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  // Don't render if no active call
  if (!inCall || !activeProjectId) return null;

  // Check if user is currently on the war room page for this project
  const isOnWarRoomPage = window.location.pathname === `/projects/${activeProjectId}`;

  // If user is on the war-room page, don't show the mini overlay
  if (isOnWarRoomPage) return null;

  const remoteEntries = Object.entries(remoteStreams || {});
  const participantCount = 1 + remoteEntries.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[9999] select-none"
    >
      <div
        className={`bg-[#0d0d0d]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden transition-all duration-300 ${collapsed ? 'w-[200px]' : 'w-[320px]'}`}
      >
        {/* Header bar — draggable */}
        <div
          onMouseDown={onMouseDown}
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600/20 to-teal-600/20 border-b border-white/5 cursor-grab active:cursor-grabbing"
        >
          <GripHorizontal size={12} className="text-slate-500" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest flex-1 truncate">
            War Room • {participantCount} in call
          </span>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 text-slate-400 hover:text-white transition-colors" title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <Maximize2 size={12} /> : <X size={12} />}
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Video grid */}
            <div className="p-2 grid grid-cols-2 gap-1.5" style={{ maxHeight: 160 }}>
              {localStream && (
                <div className="aspect-video">
                  <MiniVideoPlayer stream={localStream} muted={true} label="You" />
                </div>
              )}
              {remoteEntries.slice(0, 3).map(([uid, stream]) => {
                const info = projectRef?.current?.members_info?.find(m => m.uid === uid);
                return (
                  <div key={uid} className="aspect-video">
                    <MiniVideoPlayer stream={stream} muted={false} label={info?.name || `Peer`} />
                  </div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 px-3 py-2 border-t border-white/5">
              <button onClick={toggleMute} className={`p-2 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'}`} title={isMuted ? "Unmute" : "Mute"}>
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              <button onClick={toggleVideo} className={`p-2 rounded-full transition-all ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'}`} title={isVideoOff ? "Camera On" : "Camera Off"}>
                {isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
              </button>
              <button onClick={isScreenSharing ? stopScreenShare : shareScreen} className={`p-2 rounded-full transition-all ${isScreenSharing ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white hover:bg-white/10'}`} title={isScreenSharing ? "Stop Share" : "Share Screen"}>
                <Monitor size={14} />
              </button>
              <button onClick={leaveHuddle} className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all" title="Leave Call">
                <PhoneOff size={14} />
              </button>
            </div>

            {/* Double-click to navigate back */}
            <button
              onDoubleClick={() => navigate(`/projects/${activeProjectId}?tab=warroom`)}
              className="w-full text-center text-[9px] text-slate-500 hover:text-teal-400 transition-colors py-1.5 border-t border-white/5 cursor-pointer"
            >
              Double-click to return to War Room
            </button>
          </>
        )}

        {collapsed && (
          <div className="flex items-center justify-center gap-2 px-3 py-2">
            <button onClick={toggleMute} className={`p-1.5 rounded-full ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white'}`}>
              {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
            </button>
            <button onClick={leaveHuddle} className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40">
              <PhoneOff size={12} />
            </button>
            <button
              onDoubleClick={() => navigate(`/projects/${activeProjectId}?tab=warroom`)}
              className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-teal-400"
              title="Double-click to return"
            >
              <Maximize2 size={12} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
