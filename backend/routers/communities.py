from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from models import CommunityBase
from database import get_collection, create_document, update_document, get_document

router = APIRouter(prefix="/api/communities", tags=["Communities"])

# ── Default communities seeded on first request ──
DEFAULT_COMMUNITIES = [
    {"name": "General",        "slug": "general",        "description": "Open discussions about anything university-related",              "icon": "💬", "color": "#7000FF"},
    {"name": "Web Dev",        "slug": "web-dev",        "description": "Frontend, backend, full-stack — share and learn",                "icon": "🌐", "color": "#00F0FF"},
    {"name": "AI / ML",        "slug": "ai-ml",          "description": "Machine learning, deep learning, data science",                  "icon": "🤖", "color": "#FF006E"},
    {"name": "Mobile Dev",     "slug": "mobile-dev",     "description": "iOS, Android, React Native, Flutter",                            "icon": "📱", "color": "#00F0A0"},
    {"name": "DevOps & Cloud", "slug": "devops-cloud",   "description": "CI/CD, Docker, Kubernetes, AWS, GCP",                            "icon": "☁️", "color": "#FF9500"},
    {"name": "UI / UX Design", "slug": "ui-ux-design",   "description": "Design systems, Figma, user research, accessibility",            "icon": "🎨", "color": "#E040FB"},
    {"name": "Hackathons",     "slug": "hackathons",     "description": "Find teammates, share tips, post hackathon results",             "icon": "🏆", "color": "#FFD700"},
    {"name": "Career & Jobs",  "slug": "career-jobs",    "description": "Internships, job hunting, resume reviews, interview prep",       "icon": "💼", "color": "#4CAF50"},
]

_seeded = False

def _ensure_seeded():
    global _seeded
    if _seeded:
        return
    existing = get_collection("communities")
    existing_slugs = {c.get("slug") for c in existing}
    for comm in DEFAULT_COMMUNITIES:
        if comm["slug"] not in existing_slugs:
            from datetime import datetime
            data = {
                **comm,
                "subscriber_count": 0,
                "subscribers": [],
                "created_by": "system",
                "created_at": datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            }
            create_document("communities", data)
    _seeded = True


@router.get("/", response_model=List[CommunityBase])
def list_communities():
    _ensure_seeded()
    docs = get_collection("communities")
    docs_sorted = sorted(docs, key=lambda x: x.get("subscriber_count", 0), reverse=True)
    return [CommunityBase(**doc) for doc in docs_sorted]


@router.get("/{community_id}", response_model=CommunityBase)
def get_community(community_id: str):
    _ensure_seeded()
    doc = get_document("communities", community_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Community not found")
    return CommunityBase(**doc)


class CreateCommunityRequest(BaseModel):
    name: str
    slug: str
    description: str = ""
    icon: str = "💬"
    color: str = "#7000FF"
    created_by: Optional[str] = None

@router.post("/", response_model=CommunityBase)
def create_community(payload: CreateCommunityRequest):
    _ensure_seeded()
    # Check slug uniqueness
    existing = get_collection("communities")
    for c in existing:
        if c.get("slug") == payload.slug:
            raise HTTPException(status_code=409, detail="A community with this slug already exists")
    from datetime import datetime
    data = {
        "name": payload.name,
        "slug": payload.slug,
        "description": payload.description,
        "icon": payload.icon,
        "color": payload.color,
        "subscriber_count": 0,
        "subscribers": [],
        "created_by": payload.created_by,
        "created_at": datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    }
    new_id = create_document("communities", data)
    data["id"] = new_id
    return CommunityBase(**data)


class SubscribeRequest(BaseModel):
    user_id: str

@router.post("/{community_id}/subscribe")
def toggle_subscribe(community_id: str, payload: SubscribeRequest):
    _ensure_seeded()
    doc = get_document("communities", community_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Community not found")
    subs = doc.get("subscribers", [])
    if payload.user_id in subs:
        subs.remove(payload.user_id)
        action = "unsubscribed"
    else:
        subs.append(payload.user_id)
        action = "subscribed"
    update_document("communities", community_id, {
        "subscribers": subs,
        "subscriber_count": len(subs),
    })
    return {"success": True, "action": action, "subscriber_count": len(subs)}
