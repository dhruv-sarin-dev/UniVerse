"""Firebase ID token verification for state-changing endpoints.

Every write used to trust whatever uid the client put in the request body, so
anyone could delete someone else's project or post as another user. These
helpers put the acting uid behind `Authorization: Bearer <firebase id token>`.

The deployed frontend does not send that header yet, so enforcement is gated on
REQUIRE_AUTH (default "false"): unauthenticated writes are still accepted and
logged loudly, and ownership checks only bite once we actually know who is
calling. Set REQUIRE_AUTH=true in production once clients ship the header.
"""
import os
from typing import Optional

from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth


def _require_auth() -> bool:
    # Read per-call, not at import: tests and local runs flip the env var.
    return os.getenv("REQUIRE_AUTH", "false").strip().lower() in ("1", "true", "yes")


def verified_uid(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """FastAPI dependency: the caller's uid from a verified Firebase ID token.

    Returns None (instead of 401) when REQUIRE_AUTH is off, so old clients keep
    working. Raises 401 on a missing or invalid token when REQUIRE_AUTH is on.
    """
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if not token:
        if _require_auth():
            raise HTTPException(status_code=401, detail="Missing Authorization: Bearer <token>")
        print("WARNING: unauthenticated request (no bearer token); trusting client-supplied uid. Set REQUIRE_AUTH=true to enforce.")
        return None

    try:
        return firebase_auth.verify_id_token(token)["uid"]
    except Exception as e:
        if _require_auth():
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        # No service-account.json locally means verify_id_token always throws.
        print(f"WARNING: token verification failed ({e}); falling back to client-supplied uid because REQUIRE_AUTH is off.")
        return None


def acting_uid(verified: Optional[str], claimed: Optional[str] = None) -> Optional[str]:
    """The uid to act as: the verified one, or the body's claim in legacy mode."""
    return verified or claimed


def require_owner(owner_uid: Optional[str], uid: Optional[str], action: str = "do this"):
    """403 unless the verified caller owns the resource.

    A None uid means we could not identify the caller (REQUIRE_AUTH off, no
    token) — there is nothing to compare against, so the old behaviour stands.
    """
    if uid and uid != owner_uid:
        raise HTTPException(status_code=403, detail=f"Only the owner can {action}")
