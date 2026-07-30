import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import API_URL from '../api';

const WarRoomContext = createContext(null);
export const useWarRoom = () => useContext(WarRoomContext);

// STUN is enough for peers on the same LAN or behind cone NAT. Anyone on a
// symmetric NAT / restrictive mobile network needs TURN to connect at all.
// The old hardcoded openrelay.metered.ca servers are defunct, so TURN is now
// supplied per-deployment via env. Without it, cross-network calls may fail.
const TURN_URL = import.meta.env.VITE_TURN_URL;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL;

const iceServers = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

if (TURN_URL) {
  iceServers.push({
    urls: TURN_URL.split(',').map(u => u.trim()).filter(Boolean),
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
  });
} else if (import.meta.env.PROD) {
  console.warn(
    '[WarRoom] No TURN server configured (VITE_TURN_URL). Calls between users ' +
    'on different networks will fail whenever either side is behind a symmetric NAT.'
  );
}

const rtcConfig = { iceServers };

export function WarRoomProvider({ children }) {
  // ── Connection state ──
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  // Mirrors activeProjectId. connectToRoom must keep a stable identity or the
  // effect that calls it re-fires and opens a duplicate socket, so it reads the
  // ref instead of closing over the state value.
  const activeProjectIdRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  // ── Call state ──
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({});
  const userRef = useRef(null);
  const projectRef = useRef(null);
  // ICE candidates that arrived before the remote description was applied.
  // Adding them early throws and the candidate is lost for good, which is why
  // calls that work on localhost fail across the internet.
  const pendingCandidates = useRef({});
  // Perfect-negotiation bookkeeping, per peer uid.
  const makingOffer = useRef({});

  // ── Chat state ──
  const [messages, setMessages] = useState([]);
  const [sharedNotes, setSharedNotes] = useState('');

  // ── MOM state ──
  const [isMOMEnabled, setIsMOMEnabled] = useState(false);
  const [isGeneratingMOM, setIsGeneratingMOM] = useState(false);
  const isMOMEnabledRef = useRef(false);
  const sessionTranscripts = useRef([]);
  const recognitionRef = useRef(null);

  // ── Active speaker ──
  const [activeSpeaker, setActiveSpeaker] = useState(null);

  // ── Fullscreen video ──
  const [fullscreenVideo, setFullscreenVideo] = useState(null);

  // ── WebSocket message handlers (forwarded from WarRoomChat) ──
  const chatListeners = useRef(new Set());
  const addChatListener = useCallback((fn) => { chatListeners.current.add(fn); return () => chatListeners.current.delete(fn); }, []);

  // ── Speech recognition setup ──
  const initSpeechRecognition = useCallback((user) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = event.results[event.results.length - 1][0].transcript;
      if (text.trim() && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'transcript', sender: user?.uid, user: user?.display_name, text: text.trim() }));
      }
    };
    recognition.onend = () => { if (isMOMEnabledRef.current) { try { recognition.start(); } catch { /* ignore */ } } };
    recognitionRef.current = recognition;
  }, []);

  // ── Signalling helper ──
  // Every send must check readyState. The socket is CONNECTING right after it
  // is created and CLOSED during a reconnect; send() throws in both states.
  const sendSignal = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  // ── WebRTC helpers ──
  // Politeness has to be deterministic and opposite on the two peers, so derive
  // it from the uid pair: the lexicographically smaller uid is the polite one.
  const isPolite = useCallback((peerUid) => (userRef.current?.uid || '') < peerUid, []);

  const flushCandidates = useCallback(async (peerUid, pc) => {
    const queued = pendingCandidates.current[peerUid];
    if (!queued?.length) return;
    delete pendingCandidates.current[peerUid];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WarRoom] Dropped queued ICE candidate', err);
      }
    }
  }, []);

  const createPeerConnection = useCallback((peerUid) => {
    const existing = peerConnections.current[peerUid];
    if (existing) return existing;

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[peerUid] = pc;
    makingOffer.current[peerUid] = false;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ type: 'webrtc_ice', sender: userRef.current?.uid, target: peerUid, payload: e.candidate });
      }
    };

    pc.ontrack = (e) => setRemoteStreams(prev => ({ ...prev, [peerUid]: e.streams[0] }));

    // Let the browser decide when to renegotiate (tracks added, camera swapped
    // for a screen share) rather than offering by hand at one fixed moment.
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer.current[peerUid] = true;
        await pc.setLocalDescription();
        sendSignal({ type: 'webrtc_offer', sender: userRef.current?.uid, target: peerUid, payload: pc.localDescription });
      } catch (err) {
        console.error('[WarRoom] Negotiation failed', err);
      } finally {
        makingOffer.current[peerUid] = false;
      }
    };

    pc.onconnectionstatechange = () => {
      // ICE usually dies because no relay candidate was viable. A restart is
      // cheap and often recovers a call that would otherwise hang on a black tile.
      if (pc.connectionState === 'failed') pc.restartIce?.();
    };

    return pc;
  }, [sendSignal]);

  const handleOffer = useCallback(async (peerUid, offer) => {
    const pc = createPeerConnection(peerUid);
    const collision = makingOffer.current[peerUid] || pc.signalingState !== 'stable';

    // Impolite peer ignores a colliding offer; the polite peer rolls its own
    // offer back and accepts. Without this, two people clicking Join Call at the
    // same moment both sit in have-local-offer and no media ever flows.
    if (collision && !isPolite(peerUid)) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushCandidates(peerUid, pc);
      await pc.setLocalDescription();
      sendSignal({ type: 'webrtc_answer', sender: userRef.current?.uid, target: peerUid, payload: pc.localDescription });
    } catch (err) {
      console.error('[WarRoom] Failed to handle offer', err);
    }
  }, [createPeerConnection, isPolite, flushCandidates, sendSignal]);

  const handleAnswer = useCallback(async (peerUid, answer) => {
    const pc = peerConnections.current[peerUid];
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await flushCandidates(peerUid, pc);
    } catch (err) {
      console.error('[WarRoom] Failed to apply answer', err);
    }
  }, [flushCandidates]);

  const handleNewICECandidate = useCallback(async (peerUid, candidate) => {
    const pc = peerConnections.current[peerUid];
    // Queue until a remote description exists — addIceCandidate rejects
    // otherwise and that candidate is lost for good.
    if (!pc || !pc.remoteDescription) {
      (pendingCandidates.current[peerUid] ||= []).push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[WarRoom] Failed to add ICE candidate', err);
    }
  }, []);

  const removePeerConnection = useCallback((peerUid) => {
    const pc = peerConnections.current[peerUid];
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onnegotiationneeded = null;
      pc.onconnectionstatechange = null;
      pc.close();
      delete peerConnections.current[peerUid];
    }
    delete pendingCandidates.current[peerUid];
    delete makingOffer.current[peerUid];
    setRemoteStreams(prev => { const u = { ...prev }; delete u[peerUid]; return u; });
  }, []);

  // ── Leave huddle ──
  const leaveHuddle = useCallback(() => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    localStreamRef.current = null;
    setInCall(false);
    setIsScreenSharing(false);
    setActiveSpeaker(null);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'webrtc_leave', sender: userRef.current?.uid }));
    }
    Object.keys(peerConnections.current).forEach(removePeerConnection);
  }, [removePeerConnection]);

  // ── Socket lifecycle ──
  const openSocket = useCallback((projectId) => {
    // https -> wss, http -> ws (the trailing "s" survives the replace).
    const wsBase = API_URL.replace(/^http/, 'ws');
    const socket = new WebSocket(`${wsBase}/ws/chat/${projectId}`);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      // After a reconnect mid-call we must re-announce, otherwise peers who
      // joined while we were offline never learn we are in the room.
      if (localStreamRef.current) {
        socket.send(JSON.stringify({ type: 'webrtc_join', sender: userRef.current?.uid }));
      }
    };

    socket.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }

      const myUid = userRef.current?.uid;

      if (!data.type || data.type === 'chat') { setMessages(prev => [...prev, data]); return; }
      if (data.type === 'mom_control') {
        setIsMOMEnabled(data.enabled);
        isMOMEnabledRef.current = data.enabled;
        if (data.enabled && recognitionRef.current) { try { recognitionRef.current.start(); } catch { /* */ } }
        else if (!data.enabled && recognitionRef.current) recognitionRef.current.stop();
        return;
      }
      if (data.type === 'transcript') { sessionTranscripts.current.push(`${data.user}: ${data.text}`); return; }
      if (data.type === 'editor_sync' && data.sender !== myUid) { setSharedNotes(data.payload); return; }

      const { type, sender, target, payload } = data;
      if (target && target !== myUid) return;
      if (sender === myUid) return;
      if (type === 'webrtc_join') { if (localStreamRef.current) createPeerConnection(sender); }
      else if (type === 'webrtc_offer') { if (localStreamRef.current) handleOffer(sender, payload); }
      else if (type === 'webrtc_answer') { handleAnswer(sender, payload); }
      else if (type === 'webrtc_ice') { handleNewICECandidate(sender, payload); }
      else if (type === 'webrtc_leave') { removePeerConnection(sender); }
    };

    socket.onclose = () => {
      setIsConnected(false);
      if (intentionalCloseRef.current) return;
      // A stale socket from a room we already left must not resurrect itself.
      if (activeProjectIdRef.current !== projectId) return;
      // Render's free tier drops idle sockets. Without reconnecting, the room
      // goes quietly dead — chat and signalling both stop with no visible error.
      const attempt = (reconnectAttemptsRef.current += 1);
      const delay = Math.min(30000, 1000 * 2 ** (attempt - 1));
      reconnectTimerRef.current = setTimeout(() => openSocket(projectId), delay);
    };
  }, [createPeerConnection, handleOffer, handleAnswer, handleNewICECandidate, removePeerConnection]);

  // ── Connect to a war room ──
  // Every dependency here is stable and room identity is read from a ref, so
  // this callback never changes identity. That matters: WarRoomChat calls it
  // from an effect that lists it as a dependency, and the previous version
  // changed identity as soon as it set activeProjectId — re-running the effect
  // while the socket was still CONNECTING, failing the readyState check, and
  // opening a second socket while orphaning the first.
  const connectToRoom = useCallback((projectId, user, project) => {
    userRef.current = user;
    projectRef.current = project;

    const alreadyHere =
      activeProjectIdRef.current === projectId &&
      (socketRef.current?.readyState === WebSocket.OPEN ||
       socketRef.current?.readyState === WebSocket.CONNECTING);
    if (alreadyHere) return;

    const switchingRooms =
      activeProjectIdRef.current && activeProjectIdRef.current !== projectId;
    if (switchingRooms) leaveHuddle();

    clearTimeout(reconnectTimerRef.current);
    if (socketRef.current) {
      intentionalCloseRef.current = true;
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
      intentionalCloseRef.current = false;
    }

    activeProjectIdRef.current = projectId;
    reconnectAttemptsRef.current = 0;
    setActiveProjectId(projectId);

    // Restore persisted chat
    const saved = localStorage.getItem(`warroom_msgs_${projectId}`);
    setMessages(saved ? JSON.parse(saved) : []);
    setSharedNotes(localStorage.getItem(`warroom_notes_${projectId}`) || '');

    initSpeechRecognition(user);
    openSocket(projectId);
  }, [leaveHuddle, initSpeechRecognition, openSocket]);

  // ── Disconnect from room ──
  const disconnectFromRoom = useCallback(() => {
    leaveHuddle();
    clearTimeout(reconnectTimerRef.current);
    // Clear the room ref first so a close event in flight cannot schedule a
    // reconnect to the room we are deliberately leaving.
    activeProjectIdRef.current = null;
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
    }
    socketRef.current = null;
    setActiveProjectId(null);
    setIsConnected(false);
    setMessages([]);
    setSharedNotes('');
    if (recognitionRef.current) recognitionRef.current.stop();
  }, [leaveHuddle]);

  // Tear down the socket and any pending reconnect when the provider unmounts.
  useEffect(() => () => {
    clearTimeout(reconnectTimerRef.current);
    activeProjectIdRef.current = null;
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
    }
  }, []);

  // ── Start huddle ──
  const startHuddle = useCallback(async () => {
    try {
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); }
      catch { stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); }
      setIsMuted(false);
      setIsVideoOff(false);
      setLocalStream(stream);
      localStreamRef.current = stream;
      setInCall(true);
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'webrtc_join', sender: userRef.current?.uid }));
      }
      const proj = projectRef.current;
      if (proj && proj.owner_uid === userRef.current?.uid) {
        fetch(`${API_URL}/api/projects/${proj.id}/notify_meeting`, { method: 'POST' }).catch(e => console.error(e));
      }
    } catch { alert("Camera/Microphone permissions denied or devices not found."); }
  }, []);

  // ── Toggle controls ──
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const t = localStreamRef.current.getAudioTracks();
      if (t.length > 0) { t[0].enabled = !t[0].enabled; setIsMuted(!t[0].enabled); }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const t = localStreamRef.current.getVideoTracks();
      if (t.length > 0) { t[0].enabled = !t[0].enabled; setIsVideoOff(!t[0].enabled); }
    }
  }, []);

  const shareScreen = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } });
      const screenTrack = displayStream.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack).catch(e => console.error(e));
      });
      if (localStreamRef.current) {
        const newStream = new MediaStream([screenTrack]);
        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) newStream.addTrack(audioTracks[0]);
        setLocalStream(newStream);
        localStreamRef.current = newStream;
      }
      setIsScreenSharing(true);
      screenTrack.onended = () => stopScreenShare();
    } catch (err) { console.error("Screen Share Failed", err); }
  }, []);

  const stopScreenShare = useCallback(async () => {
    setIsScreenSharing(false);
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(camTrack).catch(e => console.error(e));
      });
      if (localStreamRef.current) {
        const restoredStream = new MediaStream([camTrack]);
        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) restoredStream.addTrack(audioTracks[0]);
        setLocalStream(restoredStream);
        localStreamRef.current = restoredStream;
      }
    } catch (e) { console.error("Restore Camera Failed", e); }
  }, []);

  // ── MOM controls ──
  const toggleMOM = useCallback(() => {
    const newState = !isMOMEnabled;
    setIsMOMEnabled(newState);
    isMOMEnabledRef.current = newState;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'mom_control', enabled: newState }));
    }
    if (newState && recognitionRef.current) { try { recognitionRef.current.start(); } catch { /* */ } }
    else if (!newState && recognitionRef.current) recognitionRef.current.stop();
  }, [isMOMEnabled]);

  const generateMOM = useCallback(async () => {
    if (!sessionTranscripts.current?.length) {
      alert("No transcripts recorded yet! Enable 'Start MOM Rec' and talk first.");
      return;
    }
    setIsGeneratingMOM(true);
    try {
      const proj = projectRef.current;
      const res = await fetch(`${API_URL}/api/projects/${activeProjectId}/generate_mom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcripts: sessionTranscripts.current, fallback_title: proj?.title || 'Project', fallback_members: proj?.members || [] })
      });
      const data = await res.json();
      if (data.success) {
        if (data.members_notified > 0) alert(`MOM generated and emailed to ${data.members_notified} member(s)!`);
        else alert(`MOM generated, but no members notified.`);
        sessionTranscripts.current = [];
      } else alert(`Failed: ${data.error || 'Server rejected request.'}`);
    } catch (err) { console.error("MOM Gen Error", err); alert("Failed to generate MOM."); }
    finally { setIsGeneratingMOM(false); }
  }, [activeProjectId]);

  // ── Chat send ──
  const sendMessage = useCallback((text, user) => {
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: 'chat', user: user.display_name, uid: user.uid, text, timestamp: new Date().toISOString() }));
  }, []);

  // ── Notes sync ──
  const updateNotes = useCallback((val, userId) => {
    setSharedNotes(val);
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type: 'editor_sync', sender: userId, payload: val }));
    }
  }, [isConnected]);

  // ── Persist messages & notes ──
  useEffect(() => { if (activeProjectId) localStorage.setItem(`warroom_msgs_${activeProjectId}`, JSON.stringify(messages)); }, [messages, activeProjectId]);
  useEffect(() => { if (activeProjectId) localStorage.setItem(`warroom_notes_${activeProjectId}`, sharedNotes); }, [sharedNotes, activeProjectId]);

  // ── Active speaker detection ──
  useEffect(() => {
    if (!localStream || !inCall) return;
    const audioTracks = localStream.getAudioTracks();
    if (!audioTracks.length) return;
    let audioContext, analyser, source, processor;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(localStream);
      processor = audioContext.createScriptProcessor(2048, 1, 1);
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);
      processor.onaudioprocess = () => {
        const arr = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(arr);
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        if (avg > 5) setActiveSpeaker(userRef.current?.uid || 'local');
      };
    } catch { /* ignore */ }
    return () => {
      if (processor) { processor.onaudioprocess = null; processor.disconnect(); }
      if (analyser) analyser.disconnect();
      if (source) source.disconnect();
      if (audioContext?.state !== 'closed') audioContext?.close().catch(() => {});
    };
  }, [localStream, inCall]);

  const value = {
    // Connection
    activeProjectId, isConnected, connectToRoom, disconnectFromRoom,
    // Call
    inCall, localStream, remoteStreams, isMuted, isVideoOff, isScreenSharing,
    startHuddle, leaveHuddle, toggleMute, toggleVideo, shareScreen, stopScreenShare,
    // Chat
    messages, sendMessage, sharedNotes, updateNotes,
    // MOM
    isMOMEnabled, isGeneratingMOM, toggleMOM, generateMOM,
    // Speaker
    activeSpeaker,
    // Fullscreen
    fullscreenVideo, setFullscreenVideo,
    // Refs for child components
    userRef, projectRef, socketRef, localStreamRef, peerConnections,
    // Listeners
    addChatListener,
  };

  return <WarRoomContext.Provider value={value}>{children}</WarRoomContext.Provider>;
}
