import re

file_path = r'd:\\Hackathons\\Uni-Verse\\UniVerse\\frontend\\src\\components\\WarRoomChat.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for useWarRoom
if 'from \'../context/WarRoomContext\'' not in content:
    content = content.replace(
        'import API_URL from \'../api\';',
        'import API_URL from \'../api\';\nimport { useWarRoom } from \'../context/WarRoomContext\';'
    )

repo_state = ""
m1 = re.search(r'(  // --- GitHub Repo State ---.*?)(?=  // --- WebRTC State ---)', content, re.DOTALL)
if m1: repo_state = m1.group(1)

repo_funcs = ""
m2 = re.search(r'(  // --- Parse GitHub owner/repo ---.*?)(?=  // --- WebSocket Setup ---)', content, re.DOTALL)
if m2: repo_funcs = m2.group(1)

time_ago = ""
m3 = re.search(r'(  // --- Helper: time ago ---.*?)(?=  const parsed = parseGithubRepo\(repoUrl\);)', content, re.DOTALL)
if m3: time_ago = m3.group(1)

new_body = f"""  // --- Left Pane Tab ---
  const [leftTab, setLeftTab] = useState('notes'); // 'notes' | 'repo'

{repo_state}
  const {{
    isConnected, connectToRoom,
    inCall, localStream, remoteStreams, isMuted, isVideoOff, isScreenSharing,
    startHuddle, leaveHuddle, toggleMute, toggleVideo, shareScreen, stopScreenShare,
    messages, sendMessage, sharedNotes, updateNotes,
    isMOMEnabled, isGeneratingMOM, toggleMOM, generateMOM,
    fullscreenVideo, setFullscreenVideo
  }} = useWarRoom();

  useEffect(() => {{
    connectToRoom(projectId, user, project);
  }}, [projectId, user, project, connectToRoom]);

  const [inputText, setInputText] = useState("");
  const scrollRef = useRef(null);

  // --- UI Actions ---
  useEffect(() => {{ scrollRef.current?.scrollIntoView({{ behavior: "smooth" }}); }}, [messages]);

  const handleSendText = () => {{
    if (!inputText.trim()) return;
    sendMessage(inputText, user);
    setInputText("");
  }};

  const handleNotesChange = (e) => {{
    updateNotes(e.target.value, user.uid);
  }};

{time_ago}
{repo_funcs}"""

start_idx = content.find("  // --- Left Pane Tab ---")
end_idx = content.find("  const parsed = parseGithubRepo(repoUrl);")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_body + content[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Rewrite successful')
else:
    print('Failed to find bounds for rewrite')
