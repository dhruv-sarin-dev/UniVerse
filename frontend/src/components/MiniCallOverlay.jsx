import { useState, useRef, useEffect, useCallback } from 'react';
import { useWarRoom } from '../context/WarRoomContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Maximize2, GripHorizontal, X } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * The docked monitor: the war room's call, still running while you read
 * another sheet. It stays an ink plate on every route — video is dark, and
 * the same plate reads correctly over drafting paper and over the pages
 * still awaiting conversion.
 */

function MiniVideoPlayer({ stream, muted, label }) {
  const ref = useRef();
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink outline outline-1 outline-paper/15">
      <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      <div className="absolute bottom-0 left-0 max-w-[85%] truncate bg-ink/85 px-1.5 py-0.5">
        <span className="fm-label !text-[8px] !tracking-wider text-paper">{label}</span>
      </div>
    </div>
  );
}

export default function MiniCallOverlay() {
  const ctx = useWarRoom();
  const navigate = useNavigate();
  // useLocation, not window.location: the latter is read during render and
  // never re-reads on client-side navigation, so the overlay's visibility
  // would stay frozen at whatever the URL was when the call started.
  const location = useLocation();

  const {
    inCall, activeProjectId, activeProject, localStream, remoteStreams,
    isMuted, isVideoOff, isScreenSharing,
    toggleMute, toggleVideo, leaveHuddle, shareScreen, stopScreenShare,
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

  // The War Room lives at /projects/:id/warroom. Comparing against
  // /projects/:id matched the Overview tab instead, so the overlay hid on the
  // one page it should show on and floated over the full-size call grid.
  const isOnWarRoomPage = location.pathname === `/projects/${activeProjectId}/warroom`;

  // If user is on the war-room page, don't show the mini overlay
  if (isOnWarRoomPage) return null;

  const remoteEntries = Object.entries(remoteStreams || {});
  const participantCount = 1 + remoteEntries.length;

  const btn = 'flex items-center justify-center border border-paper/25 text-paper transition-colors hover:bg-paper hover:text-ink';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[9999] select-none"
    >
      <div className={`border border-paper/20 bg-ink ${collapsed ? 'w-[200px]' : 'w-[320px]'}`}>
        {/* Header bar — draggable */}
        <div
          onMouseDown={onMouseDown}
          className="flex cursor-grab items-center gap-2 border-b border-paper/15 px-2.5 py-1.5 active:cursor-grabbing"
        >
          <GripHorizontal size={11} className="shrink-0 text-paper/40" />
          <span className="h-1.5 w-1.5 shrink-0 bg-signal" aria-hidden="true" />
          <span className="fm-label flex-1 truncate !text-[9px] text-paper">
            War room · {participantCount} in call
          </span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-0.5 text-paper/50 transition-colors hover:text-paper"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <Maximize2 size={11} /> : <X size={11} />}
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Video grid */}
            <div className="grid grid-cols-2 gap-1.5 p-2" style={{ maxHeight: 160 }}>
              {localStream && (
                <div className="aspect-video">
                  <MiniVideoPlayer stream={localStream} muted={true} label="You" />
                </div>
              )}
              {remoteEntries.slice(0, 3).map(([uid, stream]) => {
                const info = activeProject?.members_info?.find(m => m.uid === uid);
                return (
                  <div key={uid} className="aspect-video">
                    <MiniVideoPlayer stream={stream} muted={false} label={info?.name || `Peer`} />
                  </div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 border-t border-paper/15 px-3 py-2">
              <button
                onClick={toggleMute}
                className={`${btn} h-8 w-8 ${isMuted ? 'bg-paper text-ink' : ''}`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
              </button>
              <button
                onClick={toggleVideo}
                className={`${btn} h-8 w-8 ${isVideoOff ? 'bg-paper text-ink' : ''}`}
                title={isVideoOff ? "Camera On" : "Camera Off"}
              >
                {isVideoOff ? <VideoOff size={13} /> : <Video size={13} />}
              </button>
              <button
                onClick={isScreenSharing ? stopScreenShare : shareScreen}
                className={`${btn} h-8 w-8 ${isScreenSharing ? 'bg-paper text-ink' : ''}`}
                title={isScreenSharing ? "Stop Share" : "Share Screen"}
              >
                <Monitor size={13} />
              </button>
              <button onClick={leaveHuddle} className={`${btn} h-8 w-8`} title="Leave Call">
                <PhoneOff size={13} />
              </button>
            </div>

            {/* Double-click to navigate back */}
            <button
              onDoubleClick={() => navigate(`/projects/${activeProjectId}/warroom`)}
              className="fm-label w-full border-t border-paper/15 py-1.5 text-center !text-[8px] text-paper/45 transition-colors hover:text-paper"
            >
              Double-click to return to the war room
            </button>
          </>
        )}

        {collapsed && (
          <div className="flex items-center justify-center gap-2 px-3 py-2">
            <button
              onClick={toggleMute}
              className={`${btn} h-7 w-7 ${isMuted ? 'bg-paper text-ink' : ''}`}
            >
              {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
            </button>
            <button onClick={leaveHuddle} className={`${btn} h-7 w-7`}>
              <PhoneOff size={12} />
            </button>
            <button
              onDoubleClick={() => navigate(`/projects/${activeProjectId}/warroom`)}
              className={`${btn} h-7 w-7`}
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
