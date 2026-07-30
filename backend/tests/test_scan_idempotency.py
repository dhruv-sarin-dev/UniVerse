"""
Test suite for the repo contribution scan.

Tests:
  - test_set_score_replaces: set_score overwrites, sync_score accumulates
  - test_rescan_is_idempotent: scanning twice must not double any score
  - test_scan_uses_ast_engine: scores come from the AST engine, not commit counts
  - test_scan_reports_truncation: capped scans say how many commits they skipped
  - test_missing_diff_does_not_crash: unfetchable diffs are counted, not fatal

The GitHub API and the database are both stubbed — this test makes no network
calls and writes no files.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services import firebase_gate, github_webhook
from services.firebase_gate import FirebaseGate
from services.github_webhook import scan_repo_contributions, DEEP_SCAN_COMMIT_LIMIT


PROJECT_ID = "proj-1"

REAL_CODE = """\
diff --git a/sorter.py b/sorter.py
--- a/sorter.py
+++ b/sorter.py
@@ -0,0 +1,9 @@
+class Sorter:
+    def quicksort(self, arr):
+        if len(arr) <= 1:
+            return arr
+        pivot = arr[0]
+        left = [x for x in arr[1:] if x <= pivot]
+        return self.quicksort(left) + [pivot]
"""


# ── In-memory stubs ─────────────────────────────────────────────────────────

class FakeDB:
    """Minimal stand-in for database.py, shared by both modules under test."""

    def __init__(self, commit_count=3, diff=REAL_CODE):
        self.users = {"uid-alice": {"uid": "uid-alice", "github": "alice"}}
        self.projects = {
            PROJECT_ID: {
                "id": PROJECT_ID,
                "github_url": "https://github.com/acme/widget",
                "owner_uid": "uid-alice",
                "members": ["uid-alice"],
            }
        }
        self.commit_count = commit_count
        self.diff = diff
        self.diffs_fetched = 0

    # -- database.py surface --
    def get_document(self, collection, doc_id):
        return getattr(self, collection).get(doc_id)

    def update_document(self, collection, doc_id, updates):
        getattr(self, collection).setdefault(doc_id, {}).update(updates)
        return True

    def upsert_document(self, collection, doc_id, data):
        getattr(self, collection).setdefault(doc_id, {}).update(data)
        return doc_id

    # -- GitHub API surface --
    def fake_session(self):
        db = self

        class _Resp:
            def __init__(self, payload):
                self.status_code = 200
                self._payload = payload
                self.text = ""

            def json(self):
                return self._payload

        class _Session:
            def get(self, url, **_kw):
                if "/contributors" in url:
                    return _Resp([{"login": "alice", "contributions": db.commit_count}])
                return _Resp([
                    {
                        "sha": f"sha{i:039d}",
                        "author": {"login": "alice"},
                        "commit": {
                            "message": f"commit {i}",
                            "author": {"name": "alice", "date": "2026-01-01T00:00:00Z"},
                        },
                    }
                    for i in range(db.commit_count)
                ])

            def close(self):
                pass

        return _Session()

    def fetch_commit_diff(self, owner, repo, sha):
        self.diffs_fetched += 1
        return self.diff


def install(db):
    """Point both service modules at the fake DB and fake GitHub."""
    for mod in (firebase_gate, github_webhook):
        mod.get_document = db.get_document
        mod.update_document = db.update_document
        if hasattr(mod, "upsert_document"):
            mod.upsert_document = db.upsert_document
    github_webhook.fetch_commit_diff = db.fetch_commit_diff
    github_webhook.requests = type("_R", (), {"Session": staticmethod(db.fake_session)})
    return db


# ── Tests ───────────────────────────────────────────────────────────────────

def test_set_score_replaces():
    """set_score overwrites the stored value; sync_score still accumulates."""
    install(FakeDB())

    assert FirebaseGate.sync_score("uid-alice", PROJECT_ID, 100) == 100
    assert FirebaseGate.sync_score("uid-alice", PROJECT_ID, 100) == 200, \
        "sync_score must keep accumulating (webhook path depends on it)"

    assert FirebaseGate.set_score("uid-alice", PROJECT_ID, 100) == 100
    assert FirebaseGate.get_score("uid-alice", PROJECT_ID) == 100, \
        "set_score must replace, not add"


def test_rescan_is_idempotent():
    """Scanning the same repo twice must produce the same scores."""
    db = install(FakeDB())

    first = scan_repo_contributions(PROJECT_ID)
    stored_after_first = FirebaseGate.get_score("uid-alice", PROJECT_ID)

    second = scan_repo_contributions(PROJECT_ID)
    stored_after_second = FirebaseGate.get_score("uid-alice", PROJECT_ID)

    print(f"  scan 1: grand_total={first['grand_total']}, stored={stored_after_first}")
    print(f"  scan 2: grand_total={second['grand_total']}, stored={stored_after_second}")

    assert stored_after_first > 0, "Scan should have produced a score"
    assert stored_after_second == stored_after_first, (
        f"Re-scan inflated the score: {stored_after_first} -> {stored_after_second}"
    )
    assert second["grand_total"] == first["grand_total"]


def test_scan_uses_ast_engine():
    """Scores must come from AST analysis, with a real breakdown."""
    db = install(FakeDB(commit_count=2))
    result = scan_repo_contributions(PROJECT_ID)

    alice = result["contributors"]["alice"]
    print(f"  alice: {alice['total_score']} pts, F={alice['functions']}, "
          f"C={alice['classes']}, L={alice['conditionals']}, "
          f"+{alice['additions']}/-{alice['deletions']}")

    assert db.diffs_fetched == 2, "Every capped commit should have its diff analysed"
    assert alice["functions"] > 0 and alice["classes"] > 0, \
        "AST breakdown should be populated, not hardcoded zeros"
    assert alice["additions"] > 0, "Additions should come from the real diff"
    assert alice["total_score"] % 100 != 0 or alice["total_score"] == 0, \
        "Score should be an AST score, not commit_count * 100"
    assert result["commits_analyzed"] == 2


def test_scan_reports_truncation():
    """A capped scan must say how many commits it actually analysed."""
    over = DEEP_SCAN_COMMIT_LIMIT + 5
    install(FakeDB(commit_count=over))
    result = scan_repo_contributions(PROJECT_ID)

    print(f"  analyzed={result['commits_analyzed']} of {result['commits_total']}, "
          f"truncated={result['truncated']}")

    assert result["commits_analyzed"] == DEEP_SCAN_COMMIT_LIMIT
    assert result["commits_total"] == over
    assert result["truncated"] is True, "Truncation must be reported, not silent"


def test_missing_diff_does_not_crash():
    """Unfetchable diffs are reported as unavailable, not fatal."""
    install(FakeDB(commit_count=3, diff=""))
    result = scan_repo_contributions(PROJECT_ID)

    assert result["commits_analyzed"] == 0
    assert result["commits_unavailable"] == 3
    assert result["grand_total"] == 0


# ── Runner ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        test_set_score_replaces,
        test_rescan_is_idempotent,
        test_scan_uses_ast_engine,
        test_scan_reports_truncation,
        test_missing_diff_does_not_crash,
    ]
    passed = 0
    failed = 0
    for t in tests:
        name = t.__name__
        try:
            print(f"\n> {name}")
            t()
            print("  PASSED")
            passed += 1
        except AssertionError as e:
            print(f"  FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")
            failed += 1

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)}")
    if failed:
        sys.exit(1)
    print("All tests passed.")
