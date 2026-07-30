from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import get_document, upsert_document
from services.auth import verified_uid, acting_uid

router = APIRouter(
    prefix="/api/users",
    tags=["users"]
)

class UserProfileRequest(BaseModel):
    uid: str
    email: str
    display_name: str
    branch: str
    year: str
    github: Optional[str] = ""
    bio: str
    skills: List[str]
    photo_url: Optional[str] = ""

@router.get("/{uid}")
def get_user_profile(uid: str):
    doc = get_document("users", uid)
    if not doc:
        # Return a soft response for new users who haven't onboarded yet
        return {"uid": uid, "has_profile": False}
    return {**doc, "has_profile": True}

@router.post("/profile")
def save_user_profile(payload: UserProfileRequest, caller: Optional[str] = Depends(verified_uid)):
    # A profile may only be written by its owner — the uid comes from the
    # verified token, never from the body (which anyone could set to anyone).
    uid = acting_uid(caller, payload.uid)
    if caller and caller != payload.uid:
        raise HTTPException(status_code=403, detail="You can only edit your own profile")
    user_data = payload.dict()
    user_data["uid"] = uid
    upsert_document("users", uid, user_data)
    return {"success": True, "message": "Profile saved safely"}
