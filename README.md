<div align="center">

# 🌌 Uni-Verse

### *Where University Minds Collide*

**A full-stack social platform for university students to discover teammates, pitch projects, and connect through AI-powered matchmaking.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Groq](https://img.shields.io/badge/Groq-Llama--3.3-FF6B35?style=flat-square)](https://console.groq.com)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Video-333333?style=flat-square&logo=webrtc)](https://webrtc.org)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)

</div>

---

## ✨ Features

### 🔐 Authentication & Onboarding
| Feature | Description |
|---|---|
| **Google Sign-In** | One-click authentication via Firebase |
| **Guided Onboarding** | New users set up branch, year, skills, GitHub, and bio |
| **Profile Editor** | Update name, skills, bio, and GitHub link at any time |

### 🚀 Project Discovery & Management
| Feature | Description |
|---|---|
| **Discover Feed** | Browse and filter open projects posted by fellow students |
| **Create Projects** | Post your idea with title, description, tech stack, difficulty, and required skills |
| **Join / Leave Teams** | Request to join any open project; project owners accept or reject |
| **Project Dashboard** | Multi-tab layout with Overview, Discussion, War Room, Contributions, and Members panels |
| **Full CRUD** | Create, read, update, and delete projects and community posts |

### 🤖 AI-Powered Intelligence (Groq Llama-3.3)
| Feature | Description |
|---|---|
| **Skill Matchmaking** | AI scores your skills against a project's requirements with a detailed compatibility breakdown |
| **Compatibility Exam** | AI generates a targeted 3-question exam based on gaps between applicant skills and project needs, then evaluates answers with radar metrics (Tech Fit, Culture Fit, Speed) |
| **AI Team Evaluator** | Deep semantic analysis of team composition — evaluates skill coverage, role balance, and inter-personal complementarity |
| **AI Meeting Minutes (MoM)** | Record War Room discussions and let AI generate structured meeting minutes with decisions, action items, and key takeaways |

### 🔥 War Room — Real-Time Collaboration
| Feature | Description |
|---|---|
| **WebRTC Video & Audio** | Peer-to-peer video calls with camera/mic toggle |
| **Speaking Detection** | Live audio analysis highlights the active speaker with a glowing border |
| **Screen Sharing** | Present your screen to teammates with one click |
| **Fullscreen Mode** | Double-click any video to expand; thumbnail strip keeps all participants visible |
| **Live Chat** | WebSocket-powered real-time messaging alongside video |
| **Shared Notes** | Collaboratively edit code snippets, meeting notes, and action items — synced instantly across all members |
| **MoM Recording** | Start/stop meeting recording; AI transcribes and generates formatted minutes |

### 🐙 GitHub Integration
| Feature | Description |
|---|---|
| **Repository Linking** | Project owners can link a GitHub repo to the project |
| **Live Commit Feed** | View the latest commits with author, message, and timestamp in a visual timeline |
| **Pull Request Tracker** | Monitor open PRs directly inside the War Room |
| **Browser IDE** | Launch github.dev (VS Code in browser) for instant editing |
| **GitHub API Proxy** | Server-side authenticated proxy avoids browser rate limits |

### 📊 AST Proof-of-Work Contribution Tracking
| Feature | Description |
|---|---|
| **Deterministic Code Scoring** | Tree-sitter AST engine analyzes code diffs — counts functions, classes, and conditionals with weighted scoring |
| **Anti-Bloat Filter** | Density check (nodes/chars) penalizes low-quality bulk commits with a 0.5× penalty |
| **Per-Member Contribution Bars** | Animated progress bars show each member's percentage contribution |
| **Verified / Low Badges** | Members contributing <5% are flagged with a warning badge |
| **GitHub Webhook** | Auto-analyze commits and PRs via webhook events (push, pull_request) |
| **Manual Repo Scan** | Project owners can trigger a full scan of recent commits on-demand |

### 💬 Community Hub
| Feature | Description |
|---|---|
| **Community Sub-Forums** | 8 pre-seeded topic channels (General, Web Dev, AI/ML, Mobile Dev, DevOps, UI/UX, Hackathons, Career) plus user-created communities |
| **Rich Post Editor** | Create discussions or questions with Markdown support, syntax highlighting, and tags |
| **Upvote / Downvote** | Reddit-style voting with optimistic UI updates |
| **Threaded Comments** | Nested reply threads with real-time submission |
| **Q&A System** | Posts can be typed as "Question" — owners can mark an answer as "Accepted" to resolve |
| **Leaderboard** | Top contributors ranked by community engagement |
| **Trending Questions** | Surface the most active unanswered questions |
| **Community Search** | Unified search across posts and communities |
| **Subscribe** | Follow specific communities to filter your feed |

### 👑 Admin & Team Management
| Feature | Description |
|---|---|
| **Applicant Review** | Accept or reject join requests with AI compatibility scores |
| **Member Removal** | Project owners can remove underperforming members |
| **GitHub Analytics Intel** | Vet applicants by viewing their GitHub stats, stars, repos, and top languages |
| **Email Notifications** | Optional SMTP notifications for team events (join requests, acceptances) |

### 🎨 Design & UX
| Feature | Description |
|---|---|
| **Cosmic Theme** | Dark-mode-first design with glassmorphism, neon accents, and mesh gradients |
| **3D Background** | React Three Fiber cosmic particle background on the landing page |
| **Micro-Animations** | Framer Motion and GSAP power smooth transitions throughout |
| **Custom Cursor** | Magnetic cursor effect that follows pointer movement |
| **Command Palette** | ⌘+K spotlight-style navigation for power users |
| **PWA Ready** | Installable Progressive Web App with offline support |
| **Real-Time Presence** | WebSocket-powered online/offline indicators for active users |
| **Responsive Design** | Fully adaptive layout for mobile, tablet, and desktop |

---

## 🏗️ Tech Stack

```
Uni-Verse/
├── frontend/                # React 19 + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── pages/           # Landing, Home, Discover, Onboarding, Profile,
│   │   │                    # Community, CompatibilityExam
│   │   ├── pages/project/   # ProjectLayout, Overview, Discussion, WarRoom,
│   │   │                    # Contributions, Members
│   │   ├── components/      # Navbar, WarRoomChat, ContributionTracker,
│   │   │                    # CommandPalette, CosmicBackground, GlowCard,
│   │   │                    # TeamLeadApplicantView, CommunitySearch, etc.
│   │   └── context/         # AuthContext, WarRoomContext
│   └── .env                 # Firebase credentials (see .env.example)
│
└── backend/                 # Python FastAPI
    ├── routers/             # projects, community, communities, users,
    │                        # chat, vetting, presence, compatibility_exam
    ├── services/
    │   ├── ai_matcher.py    # Groq Llama-3.3 skill matching
    │   ├── ai_mom.py        # AI meeting minutes generator
    │   ├── ast_engine.py    # Tree-sitter AST code scorer
    │   ├── compatibility_ai.py  # Exam generation & evaluation
    │   ├── team_evaluator.py    # AI team compatibility analysis
    │   ├── firebase_gate.py     # Score sync & badge logic
    │   ├── github_webhook.py    # Webhook processing & repo scanning
    │   └── email_service.py     # SMTP notification service
    ├── database.py          # Firestore + local JSON fallback
    ├── firebase.py          # Firebase Admin SDK init
    └── .env                 # API keys (see .env.example)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- A [Firebase project](https://console.firebase.google.com) with **Authentication** (Google) and **Firestore** enabled
- A [Groq API key](https://console.groq.com)

---

### 1. Clone the repo

```bash
git clone https://github.com/prathamjainone/UniVerse.git
cd UniVerse
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Add your environment variables
cp .env.example .env
# Edit .env and fill in GROQ_API_KEY

# Place your Firebase service account file
# Download from Firebase Console → Project Settings → Service Accounts
# Save as: backend/service-account.json

# Start the server
python -m uvicorn main:app --reload
```

> API runs at `http://localhost:8000`  
> Swagger docs at `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend
npm install

# Add your environment variables
cp .env.example .env
# Edit .env with your Firebase project credentials

# Start development server
npm run dev
```

> App runs at `http://localhost:5173`

---

## 🔒 Environment Variables

### `backend/.env`
| Variable | Description | Required |
|---|---|---|
| `GROQ_API_KEY` | Groq API key for all AI features | ✅ Yes |
| `GITHUB_TOKEN` | GitHub personal access token for analytics & webhook proxy | Optional |
| `GITHUB_WEBHOOK_SECRET` | Secret for verifying GitHub webhook payloads | Optional |
| `SMTP_USER` | Email address for notifications (Gmail) | Optional |
| `SMTP_PASSWORD` | Gmail app password for SMTP | Optional |
| `SMTP_SERVER` | SMTP server (default: `smtp.gmail.com`) | Optional |
| `SMTP_PORT` | SMTP port (default: `587`) | Optional |

### `frontend/.env`
| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_API_URL` | Backend API URL (for production deployment) |

> ⚠️ **Never commit your `.env` files or `service-account.json` to Git.**

---

## 📡 API Reference

### Projects
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/{id}` | Get a single project |
| `DELETE` | `/api/projects/{id}` | Delete a project |
| `POST` | `/api/projects/{id}/join` | Join or leave a project |
| `POST` | `/api/projects/{id}/requests/{uid}/accept` | Accept a join request |
| `POST` | `/api/projects/{id}/requests/{uid}/reject` | Reject a join request |
| `DELETE` | `/api/projects/{id}/members/{uid}` | Remove a project member |
| `PUT` | `/api/projects/{id}/github` | Set or update linked GitHub repo |
| `POST` | `/api/projects/{id}/match` | AI skill matching |
| `GET` | `/api/projects/{id}/members` | Get member details |

### Community
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/community` | List community posts (with sort & filter) |
| `POST` | `/api/community` | Create a post |
| `POST` | `/api/community/{id}/vote` | Upvote / downvote a post |
| `POST` | `/api/community/{id}/comments` | Add comment (supports threaded replies) |
| `POST` | `/api/community/{id}/accept` | Accept an answer (Q&A) |
| `DELETE` | `/api/community/{id}` | Delete a post |
| `GET` | `/api/community/leaderboard/top` | Top community contributors |
| `GET` | `/api/community/trending/questions` | Trending unanswered questions |

### Communities (Sub-Forums)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/communities` | List all communities |
| `GET` | `/api/communities/{id}` | Get community details |
| `POST` | `/api/communities` | Create a new community |
| `POST` | `/api/communities/{id}/subscribe` | Toggle subscribe/unsubscribe |

### Compatibility Exam
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/compatibility/generate-exam` | Generate AI exam for applicant |
| `POST` | `/api/compatibility/evaluate` | Evaluate exam answers → compatibility score |

### Vetting & Contributions
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/vetting/analyze` | Score a code diff via AST analysis |
| `GET` | `/api/vetting/team/{id}` | Team contribution standings |
| `POST` | `/api/vetting/webhook/github` | GitHub webhook receiver |
| `POST` | `/api/vetting/scan/{id}` | Manual repo scan |
| `GET` | `/api/vetting/contributions/{id}` | Get cached contribution data |
| `GET` | `/api/vetting/github-proxy/{owner}/{repo}/commits` | Proxy GitHub commits API |
| `GET` | `/api/vetting/github-proxy/{owner}/{repo}/pulls` | Proxy GitHub pulls API |

### Users & Presence
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/{uid}` | Get user profile |
| `POST` | `/api/users/profile` | Create or update profile |
| `WS` | `/ws/chat/{project_id}` | WebSocket for War Room chat & WebRTC signaling |
| `WS` | `/ws/presence/{uid}` | WebSocket for real-time online/offline presence |

---

## 🚢 Deployment

| Component | Platform | 
|---|---|
| Frontend | [Vercel](https://vercel.com) (free tier) |
| Backend | [Render](https://render.com) (free tier) |
| Database | [Firebase Firestore](https://firebase.google.com) (managed) |

**Backend (Render)**  
- Runtime: Python 3 · Root Directory: `backend`  
- Build: `pip install -r requirements.txt`  
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Frontend (Vercel)**  
- Framework: Vite · Root Directory: `frontend`  
- Build: `npm run build` · Output: `dist`

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss what you'd like to change.

---

<div align="center">

Made with ❤️ for university builders

</div>
