import os
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    uid: str
    email: str
    display_name: str
    branch: str  # e.g., CSE, Business, Design
    skills: List[str] = []
    bio: Optional[str] = ""
    github: Optional[str] = ""
    photo_url: Optional[str] = ""
    reputation: int = 0  # Universe Karma

class ProjectBase(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    owner_uid: str
    category: str = "Open Innovation"
    required_skills: List[str] = []
    members: List[str] = [] 
    member_photos: List[str] = []
    upvotes: int = 0
    upvoted_by: List[str] = []
    comments: List[dict] = []
    github_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ── Community (subreddit-like) ──
class CommunityBase(BaseModel):
    id: Optional[str] = None
    name: str                    # e.g. "Web Dev", "AI/ML"
    slug: str                    # e.g. "web-dev", "ai-ml"
    description: str = ""
    icon: str = "💬"             # emoji icon
    color: str = "#7000FF"       # accent color hex
    subscriber_count: int = 0
    subscribers: List[str] = []  # list of user UIDs
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ── Post (supports Discussion + Question) ──
class PostBase(BaseModel):
    id: Optional[str] = None
    author_uid: str
    author_name: str
    author_avatar: Optional[str] = None
    title: str
    content: str
    tags: List[str] = []
    # Community
    community_id: Optional[str] = None
    community_name: Optional[str] = None
    # Post type: "discussion" or "question"
    post_type: str = "discussion"
    is_resolved: bool = False
    accepted_comment_id: Optional[str] = None
    # Voting
    upvotes: int = 0
    upvoted_by: List[str] = []
    downvoted_by: List[str] = []
    # Engagement
    view_count: int = 0
    comments: List[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ── Comment (supports threading via parent_id) ──
class CommentBase(BaseModel):
    id: Optional[str] = None
    post_id: str
    parent_id: Optional[str] = None  # None = top-level, else = reply
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    text: str
    upvotes: int = 0
    upvoted_by: List[str] = []
    downvoted_by: List[str] = []
    is_accepted: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)
