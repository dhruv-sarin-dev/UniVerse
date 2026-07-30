from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel
from models import PostBase
from database import get_collection, create_document, update_document, delete_document, get_document, upsert_document

router = APIRouter(prefix="/api/community", tags=["Community"])

class VoteRequest(BaseModel):
    user_id: str
    vote: int  # 1 for upvote, -1 for downvote, 0 to remove vote

class CommentRequest(BaseModel):
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    text: str
    parent_id: Optional[str] = None  # For threaded replies

class AcceptAnswerRequest(BaseModel):
    user_id: str
    comment_id: str


# ── Helper: update user reputation ──
def _update_reputation(user_id: str, delta: int):
    """Increment or decrement a user's reputation score."""
    doc = get_document("users", user_id)
    if doc:
        current = doc.get("reputation", 0)
        upsert_document("users", user_id, {"reputation": current + delta})


# ── GET all posts (with optional community filter) ──
@router.get("/", response_model=List[PostBase])
def get_all_posts(sort: str = "votes", community_id: Optional[str] = None, post_type: Optional[str] = None):
    docs = get_collection('posts')

    # Filter by community
    if community_id:
        docs = [d for d in docs if d.get('community_id') == community_id]

    # Filter by post type
    if post_type:
        docs = [d for d in docs if d.get('post_type', 'discussion') == post_type]

    if sort == "recent":
        docs_sorted = sorted(docs, key=lambda x: x.get('created_at', ''), reverse=True)
    elif sort == "hot":
        # Hot = combo of recency + votes
        import math
        from datetime import datetime
        now = datetime.utcnow()
        def hot_score(d):
            votes = d.get('upvotes', 0)
            created = d.get('created_at', '')
            try:
                age_hours = (now - datetime.fromisoformat(created.replace('Z', ''))).total_seconds() / 3600
            except:
                age_hours = 999
            return votes / max(1, (age_hours + 2) ** 1.5)
        docs_sorted = sorted(docs, key=hot_score, reverse=True)
    else:
        docs_sorted = sorted(docs, key=lambda x: x.get('upvotes', 0), reverse=True)

    return [PostBase(**doc) for doc in docs_sorted]

# Also support /posts path for backwards compat
@router.get("/posts", response_model=List[PostBase])
def get_all_posts_compat(sort: str = "votes"):
    return get_all_posts(sort)

@router.get("/user/{user_id}", response_model=List[PostBase])
def get_user_posts(user_id: str):
    docs = get_collection('posts')
    user_docs = [doc for doc in docs if doc.get('author_uid') == user_id]
    user_docs_sorted = sorted(user_docs, key=lambda x: x.get('created_at', ''), reverse=True)
    return [PostBase(**doc) for doc in user_docs_sorted]


# ── GET single post (increments view count) ──
@router.get("/{post_id}", response_model=PostBase)
def get_single_post(post_id: str):
    doc = get_document("posts", post_id)
    if not doc:
        return {"error": "Post not found"}
    # Increment view count
    views = doc.get("view_count", 0) + 1
    update_document("posts", post_id, {"view_count": views})
    doc["view_count"] = views
    return PostBase(**doc)


@router.post("/", response_model=PostBase)
def create_post(post: PostBase):
    data = post.model_dump(exclude={'id'})
    data['created_at'] = post.created_at.strftime('%Y-%m-%dT%H:%M:%SZ')
    data['upvoted_by'] = []
    data['downvoted_by'] = []
    data['comments'] = []
    data['upvotes'] = 0
    data['view_count'] = 0
    data['is_resolved'] = False
    data['accepted_comment_id'] = None
    new_id = create_document('posts', data)
    post.id = new_id
    return post

# Also support /posts path for backwards compat
@router.post("/posts", response_model=PostBase)
def create_post_compat(post: PostBase):
    return create_post(post)


# ── Voting with reputation ──
@router.post("/{post_id}/vote")
def vote_post(post_id: str, payload: VoteRequest):
    docs = get_collection('posts')
    for doc in docs:
        if doc.get("id") == post_id:
            upvoted_by = doc.get("upvoted_by", [])
            downvoted_by = doc.get("downvoted_by", [])
            author_uid = doc.get("author_uid", "")

            # Calculate old state for reputation delta
            was_upvoted = payload.user_id in upvoted_by
            was_downvoted = payload.user_id in downvoted_by

            # Remove any existing vote first
            if payload.user_id in upvoted_by:
                upvoted_by.remove(payload.user_id)
            if payload.user_id in downvoted_by:
                downvoted_by.remove(payload.user_id)

            # Apply new vote
            if payload.vote == 1:
                upvoted_by.append(payload.user_id)
            elif payload.vote == -1:
                downvoted_by.append(payload.user_id)

            net_votes = len(upvoted_by) - len(downvoted_by)
            update_document('posts', post_id, {
                "upvotes": net_votes,
                "upvoted_by": upvoted_by,
                "downvoted_by": downvoted_by
            })

            # Update author reputation
            if author_uid and author_uid != payload.user_id:
                rep_delta = 0
                if was_upvoted and payload.vote != 1:
                    rep_delta -= 10  # lost an upvote
                if was_downvoted and payload.vote != -1:
                    rep_delta += 5   # lost a downvote
                if payload.vote == 1 and not was_upvoted:
                    rep_delta += 10  # gained an upvote
                if payload.vote == -1 and not was_downvoted:
                    rep_delta -= 5   # gained a downvote
                if rep_delta != 0:
                    _update_reputation(author_uid, rep_delta)

            return {
                "success": True,
                "net_votes": net_votes,
                "upvoted_by": upvoted_by,
                "downvoted_by": downvoted_by
            }

    return {"success": False, "error": "Post not found"}

# Keep legacy upvote endpoint for backwards compat
@router.post("/{post_id}/upvote")
def upvote_post(post_id: str, payload: VoteRequest):
    payload.vote = 1
    return vote_post(post_id, payload)


# ── Comments (threaded) ──
@router.post("/{post_id}/comments")
def add_comment(post_id: str, payload: CommentRequest):
    import uuid
    from datetime import datetime
    docs = get_collection('posts')
    for doc in docs:
        if doc.get("id") == post_id:
            comments = doc.get("comments", [])
            new_comment = {
                "id": str(uuid.uuid4()),
                "user_id": payload.user_id,
                "user_name": payload.user_name,
                "user_avatar": payload.user_avatar,
                "text": payload.text,
                "parent_id": payload.parent_id,
                "upvotes": 0,
                "upvoted_by": [],
                "downvoted_by": [],
                "is_accepted": False,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            comments.append(new_comment)
            update_document('posts', post_id, {"comments": comments})

            # +2 reputation for commenting
            _update_reputation(payload.user_id, 2)

            return {"success": True, "comment": new_comment}

    return {"success": False, "error": "Post not found"}


# ── Comment voting ──
@router.post("/{post_id}/comments/{comment_id}/vote")
def vote_comment(post_id: str, comment_id: str, payload: VoteRequest):
    docs = get_collection('posts')
    for doc in docs:
        if doc.get("id") == post_id:
            comments = doc.get("comments", [])
            for comment in comments:
                if comment.get("id") == comment_id:
                    up = comment.get("upvoted_by", [])
                    down = comment.get("downvoted_by", [])
                    commenter = comment.get("user_id", "")

                    was_up = payload.user_id in up
                    was_down = payload.user_id in down

                    if payload.user_id in up: up.remove(payload.user_id)
                    if payload.user_id in down: down.remove(payload.user_id)
                    if payload.vote == 1: up.append(payload.user_id)
                    elif payload.vote == -1: down.append(payload.user_id)

                    comment["upvoted_by"] = up
                    comment["downvoted_by"] = down
                    comment["upvotes"] = len(up) - len(down)

                    update_document('posts', post_id, {"comments": comments})

                    # Reputation for comment author
                    if commenter and commenter != payload.user_id:
                        rep = 0
                        if was_up and payload.vote != 1: rep -= 5
                        if was_down and payload.vote != -1: rep += 2
                        if payload.vote == 1 and not was_up: rep += 5
                        if payload.vote == -1 and not was_down: rep -= 2
                        if rep != 0:
                            _update_reputation(commenter, rep)

                    return {"success": True, "upvotes": comment["upvotes"]}
            return {"success": False, "error": "Comment not found"}
    return {"success": False, "error": "Post not found"}


# ── Accept answer (StackOverflow style) ──
@router.post("/{post_id}/accept")
def accept_answer(post_id: str, payload: AcceptAnswerRequest):
    doc = get_document("posts", post_id)
    if not doc:
        return {"success": False, "error": "Post not found"}
    if doc.get("author_uid") != payload.user_id:
        return {"success": False, "error": "Only the author can accept an answer"}
    if doc.get("post_type") != "question":
        return {"success": False, "error": "Only questions can have accepted answers"}

    comments = doc.get("comments", [])
    accepted_user = None
    old_accepted = doc.get("accepted_comment_id")

    for comment in comments:
        if comment["id"] == old_accepted:
            comment["is_accepted"] = False
        if comment["id"] == payload.comment_id:
            comment["is_accepted"] = True
            accepted_user = comment.get("user_id")

    update_document("posts", post_id, {
        "accepted_comment_id": payload.comment_id,
        "is_resolved": True,
        "comments": comments,
    })

    # +25 reputation for having answer accepted
    if accepted_user and accepted_user != payload.user_id:
        _update_reputation(accepted_user, 25)
    # If un-accepting the old one, remove rep
    if old_accepted and old_accepted != payload.comment_id:
        for c in comments:
            if c["id"] == old_accepted and c.get("user_id"):
                _update_reputation(c["user_id"], -25)

    return {"success": True, "accepted_comment_id": payload.comment_id}


# ── Leaderboard: top contributors by reputation ──
@router.get("/leaderboard/top")
def get_leaderboard():
    users = get_collection("users")
    sorted_users = sorted(users, key=lambda u: u.get("reputation", 0), reverse=True)[:10]
    return [
        {
            "uid": u.get("uid", u.get("id", "")),
            "display_name": u.get("display_name", "Anonymous"),
            "photo_url": u.get("photo_url", ""),
            "reputation": u.get("reputation", 0),
            "branch": u.get("branch", ""),
        }
        for u in sorted_users
    ]


# ── Trending questions (open, most-voted) ──
@router.get("/trending/questions")
def get_trending_questions():
    docs = get_collection("posts")
    questions = [d for d in docs if d.get("post_type") == "question" and not d.get("is_resolved", False)]
    questions_sorted = sorted(questions, key=lambda x: x.get("upvotes", 0), reverse=True)[:8]
    return [
        {
            "id": q.get("id"),
            "title": q.get("title", "Untitled"),
            "upvotes": q.get("upvotes", 0),
            "comment_count": len(q.get("comments", [])),
            "author_name": q.get("author_name", "Anonymous"),
            "community_name": q.get("community_name", ""),
            "created_at": q.get("created_at", ""),
            "tags": q.get("tags", [])[:3],
        }
        for q in questions_sorted
    ]


# ── Search posts ──
@router.get("/search/posts")
def search_posts(q: str = ""):
    if not q.strip():
        return []
    query = q.lower().strip()
    docs = get_collection("posts")
    results = []
    for d in docs:
        title = (d.get("title") or "").lower()
        content = (d.get("content") or "").lower()
        tags = [t.lower() for t in d.get("tags", [])]
        if query in title or query in content or any(query in t for t in tags):
            results.append(d)
    results = sorted(results, key=lambda x: x.get("upvotes", 0), reverse=True)[:20]
    return [PostBase(**doc) for doc in results]


@router.delete("/{post_id}")
def delete_post(post_id: str):
    success = delete_document("posts", post_id)
    if success:
        return {"success": True}
    return {"success": False, "error": "Post not found"}
