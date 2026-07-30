import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import API_URL from '../api';

const WarRoomContext = createContext(null);
export const useWarRoom = () => useContext(WarRoomContext);

const rtcConfig = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
] };

export function WarRoomProvider({ children }) {
  // ── Connection state ──
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

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

  // ── WebRTC helpers ──
  const createPeerConnection = useCallback(async (peerUid, isInitiator) => {
    if (peerConnections.current[peerUid]) return peerConnections.current[peerUid];
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[peerUid] = pc;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }
    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.send(JSON.stringify({ type: 'webrtc_ice', sender: userRef.current?.uid, target: peerUid, payload: e.candidate }));
      }
    };
    pc.ontrack = (e) => setRemoteStreams(prev => ({ ...prev, [peerUid]: e.streams[0] }));
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.send(JSON.stringify({ type: 'webrtc_offer', sender: userRef.current?.uid, target: peerUid, payload: offer }));
    }
    return pc;
  }, []);

  const handleOffer = useCallback(async (peerUid, offer) => {
    const pc = await createPeerConnection(peerUid, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.send(JSON.stringify({ type: 'webrtc_answer', sender: userRef.current?.uid, target: peerUid, payload: answer }));
  }, [createPeerConnection]);

  const handleAnswer = useCallback(async (peerUid, answer) => {
    const pc = peerConnections.current[peerUid];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const handleNewICECandidate = useCallback(async (peerUid, candidate) => {
    const pc = peerConnections.current[peerUid];
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }, []);

  const removePeerConnection = useCallback((peerUid) => {
    const pc = peerConnections.current[peerUid];
    if (pc) { pc.close(); delete peerConnections.current[peerUid]; }
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

  // ── Connect to a war room ──
  const connectToRoom = useCallback((projectId, user, project) => {
    // If already connected to same room, skip
    if (activeProjectId === projectId && socketRef.current?.readyState === WebSocket.OPEN) return;
    // Disconnect from old room first (but keep call alive if same project)
    if (socketRef.current && activeProjectId !== projectId) {
      leaveHuddle();
      socketRef.current.close();
    }

    userRef.current = user;
    projectRef.current = project;
    setActiveProjectId(projectId);

    // Restore persisted chat
    const saved = localStorage.getItem(`warroom_msgs_${projectId}`);
    setMessages(saved ? JSON.parse(saved) : []);
    setSharedNotes(localStorage.getItem(`warroom_notes_${projectId}`) || '');

    initSpeechRecognition(user);

    const wsBase = API_URL.replace(/^http/, 'ws');
    const socket = new WebSocket(`${wsBase}/ws/chat/${projectId}`);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.type || data.type === 'chat') { setMessages(prev => [...prev, data]); return; }
      if (data.type === 'mom_control') {
        setIsMOMEnabled(data.enabled);
        isMOMEnabledRef.current = data.enabled;
        if (data.enabled && recognitionRef.current) { try { recognitionRef.current.start(); } catch { /* */ } }
        else if (!data.enabled && recognitionRef.current) recognitionRef.current.stop();
        return;
      }
      if (data.type === 'transcript') { sessionTranscripts.current.push(`${data.user}: ${data.text}`); return; }
      if (data.type === 'editor_sync' && data.sender !== user.uid) { setSharedNotes(data.payload); return; }

      const { type, sender, target, payload } = data;
      if (target && target !== user.uid) return;
      if (sender === user.uid) return;
      if (type === 'webrtc_join') { if (localStreamRef.current) createPeerConnection(sender, true); }
      else if (type === 'webrtc_offer') { if (localStreamRef.current) handleOffer(sender, payload); }
      else if (type === 'webrtc_answer') { handleAnswer(sender, payload); }
      else if (type === 'webrtc_ice') { handleNewICECandidate(sender, payload); }
      else if (type === 'webrtc_leave') { removePeerConnection(sender); }
    };
    socket.onclose = () => { setIsConnected(false); };
  }, [activeProjectId, leaveHuddle, initSpeechRecognition, createPeerConnection, handleOffer, handleAnswer, handleNewICECandidate, removePeerConnection]);

  // ── Disconnect from room ──
  const disconnectFromRoom = useCallback(() => {
    leaveHuddle();
    if (socketRef.current) socketRef.current.close();
    socketRef.current = null;
    setActiveProjectId(null);
    setIsConnected(false);
    setMessages([]);
    setSharedNotes('');
    if (recognitionRef.current) recognitionRef.current.stop();
  }, [leaveHuddle]);

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
