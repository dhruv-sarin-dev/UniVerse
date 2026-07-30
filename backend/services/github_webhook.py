"""
GitHub Webhook Service — listens for push/PR events, fetches diffs,
and auto-triggers AST analysis for each contributor.

Supports:
  - push events (commits)
  - pull_request events (opened, synchronize)
  - Manual trigger via project's github_url (polling fallback)
"""

from __future__ import annotations

import hashlib
import hmac
import os
from typing import Dict, List, Optional, Any

import requests

from services.ast_engine import ASTEngine
from services.firebase_gate import FirebaseGate
from database import get_collection, get_document, update_document


GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")

# Each deep-analysed commit costs one GitHub API call, and unauthenticated
# clients get 60/hour. Cap the deep scan and report the truncation.
DEEP_SCAN_COMMIT_LIMIT = 15


def verify_signature(payload_body: bytes, signature: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature."""
    if not GITHUB_WEBHOOK_SECRET:
        return True  # No secret configured — accept all (dev mode)
    expected = "sha256=" + hmac.new(
        GITHUB_WEBHOOK_SECRET.encode(), payload_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def _extract_github_owner_repo(url: str) -> Optional[tuple]:
    """Extract (owner, repo) from a GitHub URL or 'owner/repo' string."""
    if not url:
        return None
    url = url.strip().rstrip("/")
    # Remove .git suffix properly (not rstrip which strips individual chars)
    if url.endswith(".git"):
        url = url[:-4]
    # Handle full URLs: https://github.com/owner/repo
    if "github.com/" in url:
        parts = url.split("github.com/")
        segments = parts[1].split("/")
        if len(segments) >= 2 and segments[0] and segments[1]:
            return segments[0], segments[1]
        return None
    # Handle bare format: owner/repo
    segments = url.split("/")
    if len(segments) == 2 and segments[0] and segments[1]:
        return segments[0], segments[1]
    return None


def _resolve_uid_from_github(github_username: str, project_id: str) -> Optional[str]:
    """
    Look up a Uni-Verse uid by matching the github field on user documents
    who are members of the given project.
    """
    project = get_document("projects", project_id)
    if not project:
        return None

    member_uids = project.get("members", [])
    owner = project.get("owner_uid")
    if owner and owner not in member_uids:
        member_uids = [owner] + member_uids

    for uid in member_uids:
        user = get_document("users", uid)
        if not user:
            continue
        user_gh = user.get("github", "")
        if not user_gh:
            continue
        # Normalize: extract username from URL or bare username
        if "github.com/" in user_gh:
            user_gh = user_gh.split("github.com/")[1].split("/")[0]
        user_gh = user_gh.strip().rstrip("/").lower()
        if user_gh == github_username.lower():
            return uid

    return None


def _find_project_by_repo(owner: str, repo: str) -> Optional[Dict]:
    """Find a project whose github_url matches the given owner/repo."""
    projects = get_collection("projects")
    target = f"{owner}/{repo}".lower()
    for p in projects:
        gh_url = p.get("github_url", "")
        if not gh_url:
            continue
        parsed = _extract_github_owner_repo(gh_url)
        if parsed and f"{parsed[0]}/{parsed[1]}".lower() == target:
            return p
    return None


def fetch_commit_diff(owner: str, repo: str, sha: str) -> str:
    """Fetch the diff for a specific commit from GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}"
    headers = {"Accept": "application/vnd.github.v3.diff"}
    token = os.getenv("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"token {token}"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            return resp.text
    except Exception:
        pass
    return ""


def count_diff_lines(diff: str) -> tuple:
    """Count (additions, deletions) in a unified diff, ignoring file headers."""
    additions = deletions = 0
    for line in diff.splitlines():
        if line.startswith("+++") or line.startswith("---"):
            continue
        if line.startswith("+"):
            additions += 1
        elif line.startswith("-"):
            deletions += 1
    return additions, deletions


def fetch_pr_diff(owner: str, repo: str, pr_number: int) -> str:
    """Fetch the diff for a pull request from GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    headers = {"Accept": "application/vnd.github.v3.diff"}
    token = os.getenv("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"token {token}"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            return resp.text
    except Exception:
        pass
    return ""


def fetch_recent_commits(owner: str, repo: str, count: int = 30) -> List[Dict]:
    """Fetch recent commits from a repo via GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page={count}"
    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.getenv("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"token {token}"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return []


def process_push_event(payload: Dict[str, Any]) -> Dict:
    """
    Process a GitHub push webhook event.
    Analyzes each commit's diff and scores them.
    """
    repo_full = payload.get("repository", {}).get("full_name", "")
    if "/" not in repo_full:
        return {"processed": 0, "error": "Invalid repository"}

    owner, repo = repo_full.split("/", 1)
    project = _find_project_by_repo(owner, repo)
    if not project:
        return {"processed": 0, "error": "No matching Uni-Verse project"}

    project_id = project.get("id")
    engine = ASTEngine.instance()
    results = []

    for commit in payload.get("commits", []):
        sha = commit.get("id", "")
        author_username = commit.get("author", {}).get("username", "")

        # Resolve to Uni-Verse uid
        uid = _resolve_uid_from_github(author_username, project_id)
        if not uid:
            uid = author_username  # fallback to GH username

        # Fetch and analyze the diff
        diff = fetch_commit_diff(owner, repo, sha)
        if not diff:
            continue

        scoring = engine.analyze_commit(diff)
        if scoring.score > 0:
            updated_total = FirebaseGate.sync_score(uid, project_id, scoring.score)
            results.append({
                "sha": sha[:7],
                "author": author_username,
                "uid": uid,
                "score": scoring.score,
                "breakdown": scoring.breakdown,
                "total": updated_total,
            })

    return {"processed": len(results), "results": results, "project_id": project_id}


def process_pr_event(payload: Dict[str, Any]) -> Dict:
    """
    Process a GitHub pull_request webhook event.
    Analyzes the PR diff when opened or synchronized.
    """
    action = payload.get("action", "")
    if action not in ("opened", "synchronize", "closed"):
        return {"processed": 0, "skipped": f"action={action}"}

    pr = payload.get("pull_request", {})
    if action == "closed" and not pr.get("merged"):
        return {"processed": 0, "skipped": "PR closed without merge"}

    repo_full = payload.get("repository", {}).get("full_name", "")
    if "/" not in repo_full:
        return {"processed": 0, "error": "Invalid repository"}

    owner, repo = repo_full.split("/", 1)
    project = _find_project_by_repo(owner, repo)
    if not project:
        return {"processed": 0, "error": "No matching Uni-Verse project"}

    project_id = project.get("id")
    pr_number = pr.get("number")
    author_username = pr.get("user", {}).get("login", "")

    uid = _resolve_uid_from_github(author_username, project_id)
    if not uid:
        uid = author_username

    diff = fetch_pr_diff(owner, repo, pr_number)
    if not diff:
        return {"processed": 0, "error": "Could not fetch PR diff"}

    engine = ASTEngine.instance()
    scoring = engine.analyze_commit(diff)

    if scoring.score > 0:
        updated_total = FirebaseGate.sync_score(uid, project_id, scoring.score)
        return {
            "processed": 1,
            "project_id": project_id,
            "pr": pr_number,
            "author": author_username,
            "uid": uid,
            "score": scoring.score,
            "breakdown": scoring.breakdown,
            "total": updated_total,
        }

    return {"processed": 0, "score": 0}


def scan_repo_contributions(project_id: str) -> Dict:
    """
    Scan a project's linked repo and score contributors with the AST engine.

    Pulls the recent commit list, then fetches and analyses the diff of up to
    DEEP_SCAN_COMMIT_LIMIT of them. Scores replace (not accumulate) the stored
    per-project score, so re-scanning is idempotent.
    """
    print(f"[SCAN] Starting scan for project: {project_id}")
    project = get_document("projects", project_id)
    if not project:
        print(f"[SCAN] ERROR: Project {project_id} not found")
        return {"error": "Project not found"}

    github_url = project.get("github_url", "")
    print(f"[SCAN] GitHub URL from project: '{github_url}'")
    parsed = _extract_github_owner_repo(github_url)
    if not parsed:
        print(f"[SCAN] ERROR: Could not parse owner/repo from URL: '{github_url}'")
        return {"error": f"No valid GitHub URL linked. Current value: '{github_url}'"}

    owner, repo = parsed
    print(f"[SCAN] Parsed owner={owner}, repo={repo}")
    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.getenv("GITHUB_TOKEN", "")
    print(f"[SCAN] GITHUB_TOKEN present: {bool(token)}")
    if token:
        headers["Authorization"] = f"token {token}"

    session = requests.Session()

    # ── 1. Fetch contributors (instant, no 202) ─────────────────────────
    try:
        url1 = f"https://api.github.com/repos/{owner}/{repo}/contributors?per_page=50"
        print(f"[SCAN] Fetching: {url1}")
        r1 = session.get(url1, headers=headers, timeout=10)
        print(f"[SCAN] Contributors response: {r1.status_code}")
        if r1.status_code != 200:
            print(f"[SCAN] Contributors body: {r1.text[:300]}")
    except Exception as e:
        print(f"[SCAN] Contributors fetch error: {e}")
        r1 = None

    # ── 2. Fetch recent commits for log ──────────────────────────────────
    try:
        url2 = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=25"
        print(f"[SCAN] Fetching: {url2}")
        r2 = session.get(url2, headers=headers, timeout=10)
        print(f"[SCAN] Commits response: {r2.status_code}")
        if r2.status_code != 200:
            print(f"[SCAN] Commits body: {r2.text[:300]}")
    except Exception as e:
        print(f"[SCAN] Commits fetch error: {e}")
        r2 = None

    session.close()

    contributors = r1.json() if r1 and r1.status_code == 200 else []
    recent = r2.json() if r2 and r2.status_code == 200 else []

    # Commits are what we score. Without them there is nothing honest to report,
    # so fail loudly instead of overwriting the cached scan with zeros.
    if not recent:
        return {"error": "Could not fetch commits (check repo visibility or GITHUB_TOKEN)"}

    # ── Deep-analyse commit diffs with the AST engine ────────────────────
    engine = ASTEngine.instance()
    contributor_scores: Dict[str, Dict] = {}
    commit_log: List[Dict] = []
    analyzed = 0
    unavailable = 0

    for c in recent:
        sha = c.get("sha", "")
        author_login = (c.get("author") or {}).get("login", "")
        if not author_login:
            author_login = c.get("commit", {}).get("author", {}).get("name", "unknown")

        entry = {
            "sha": sha[:7],
            "author": author_login,
            "message": c.get("commit", {}).get("message", "").split("\n")[0][:80],
            "date": c.get("commit", {}).get("author", {}).get("date", ""),
            "score": 0,
            "penalized": False,
            "analyzed": False,
        }
        commit_log.append(entry)

        if analyzed >= DEEP_SCAN_COMMIT_LIMIT or not sha:
            continue

        diff = fetch_commit_diff(owner, repo, sha)
        if not diff:
            # Private/huge/removed commit — count it as unscored rather than
            # guessing a score or blowing up the whole scan.
            unavailable += 1
            continue

        scoring = engine.analyze_commit(diff)
        additions, deletions = count_diff_lines(diff)

        bucket = contributor_scores.setdefault(author_login, {
            "total_score": 0, "commits": 0,
            "additions": 0, "deletions": 0,
            "functions": 0, "classes": 0, "conditionals": 0,
        })
        bucket["total_score"] += scoring.score
        bucket["commits"] += 1
        bucket["additions"] += additions
        bucket["deletions"] += deletions
        bucket["functions"] += scoring.functions
        bucket["classes"] += scoring.classes
        bucket["conditionals"] += scoring.conditionals

        entry["score"] = scoring.score
        entry["penalized"] = scoring.penalized
        entry["analyzed"] = True
        analyzed += 1

    # ── Percentages + Firebase sync ──────────────────────────────────────
    grand_total = sum(c["total_score"] for c in contributor_scores.values())
    for gh_username, data in contributor_scores.items():
        uid = _resolve_uid_from_github(gh_username, project_id) or gh_username
        data["uid"] = uid
        data["github"] = gh_username
        data["percentage"] = round((data["total_score"] / grand_total * 100), 1) if grand_total > 0 else 0
        # set_score, not sync_score: a scan recomputes the same commits every
        # run, so accumulating would inflate the total on every re-scan.
        FirebaseGate.set_score(uid, project_id, data["total_score"])

    commits_total = sum(e.get("contributions", 0) for e in contributors) if contributors else None

    scan_result = {
        "contributors": contributor_scores,
        "commit_log": commit_log,
        "grand_total": grand_total,
        "commits_analyzed": analyzed,
        "commits_listed": len(recent),
        "commits_total": commits_total,
        "commits_unavailable": unavailable,
        "deep_scan_limit": DEEP_SCAN_COMMIT_LIMIT,
        "truncated": commits_total is not None and analyzed < commits_total,
        "repo": f"{owner}/{repo}",
    }
    update_document("projects", project_id, {"contribution_scan": scan_result})

    return scan_result

