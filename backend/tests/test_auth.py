"""Self-check for the auth gate.

Run from the backend dir:  venv/Scripts/python.exe tests/test_auth.py

Covers the two modes that matter: REQUIRE_AUTH off must never break an
unauthenticated client, REQUIRE_AUTH on must reject one.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException
from services.auth import verified_uid, acting_uid, require_owner


def raises_401(authorization):
    try:
        verified_uid(authorization)
        return False
    except HTTPException as e:
        return e.status_code == 401


# ── Legacy mode: no token means "we don't know who you are", not a rejection ──
os.environ["REQUIRE_AUTH"] = "false"
assert verified_uid(None) is None
assert verified_uid("Bearer not-a-real-token") is None
assert acting_uid(None, "body-uid") == "body-uid"
assert acting_uid("token-uid", "body-uid") == "token-uid"
require_owner("owner", None)          # unknown caller — old behaviour stands
require_owner("owner", "owner")       # owner acting on own resource
try:
    require_owner("owner", "someone-else")
    raise AssertionError("expected 403 for a non-owner")
except HTTPException as e:
    assert e.status_code == 403

# ── Enforced mode: missing or bogus tokens are rejected outright ──
os.environ["REQUIRE_AUTH"] = "true"
assert raises_401(None)
assert raises_401("")
assert raises_401("Basic abc")
assert raises_401("Bearer not-a-real-token")

print("auth self-check passed")
