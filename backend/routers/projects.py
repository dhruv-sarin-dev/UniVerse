from fastapi import APIRouter, BackgroundTasks
from typing import List
from services.email_service import send_email_notification
from models import ProjectBase
from database import get_collection, create_document, update_document, get_document
from pydantic import BaseModel
from services.team_evaluator import evaluate_team_compatibility
import json
import os
router = APIRouter(prefix="/api/projects", tags=["Projects"])

class UpvoteRequest(BaseModel):
    user_id: str

class CommentRequest(BaseModel):
    user_id: str
    user_name: str
    text: str

class JoinRequest(BaseModel):
    user_id: str
    compatibility_exam: dict = None  # Optional: exam evaluation from AI compatibility test

@router.get("/", response_model=List[ProjectBase])
def get_all_projects():
    from database import get_document
    docs = get_collection('projects')
    docs_sorted = sorted(docs, key=lambda x: x.get('upvotes', 0), reverse=True)
    
    # Resolve member photos for discovery cards
    for doc in docs_sorted:
        member_uids = doc.get("members", [])
        member_photos = []
        for uid in member_uids:
            profile = get_document('users', uid)
            photo = profile.get("photo_url") if profile else None
            # Fallback to UI avatars if no Google photo
            if not photo:
                name = profile.get("display_name", "U") if profile else uid
                photo = f"https://ui-avatars.com/api/?name={name[:2]}&background=random&color=fff"
            member_photos.append(photo)
        doc["member_photos"] = member_photos
        
    return [ProjectBase(**doc) for doc in docs_sorted]
    
@router.get("/{project_id}", response_model=dict)
def get_single_project(project_id: str):
    from database import get_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
    
    # Resolve members
    member_uids = proj.get("members", [])
    members_resolved = []
    for uid in member_uids:
        profile = get_document('users', uid)
        if profile:
            members_resolved.append({
                "uid": uid,
                "name": profile.get("display_name", "Unknown"),
                "email": profile.get("email", "No email"),
                "branch": profile.get("branch", ""),
                "skills": profile.get("skills", []),
                "bio": profile.get("bio", ""),
                "github": profile.get("github", "")
            })
        else:
            members_resolved.append({"uid": uid, "name": "Unknown", "email": "No profile yet", "branch": "", "skills": [], "github": ""})
            
    # Resolve join requests — attach compatibility exam data if available
    request_uids = proj.get("join_requests", [])
    compatibility_exams = proj.get("compatibility_exams", {})
    requests_resolved = []
    for uid in request_uids:
        profile = get_document('users', uid)
        req_data = {
            "uid": uid,
            "name": profile.get("display_name", "Unknown") if profile else "Unknown",
            "email": profile.get("email", "No email") if profile else "No profile yet",
            "branch": profile.get("branch", "") if profile else "",
            "skills": profile.get("skills", []) if profile else [],
            "github": profile.get("github", "") if profile else "",
        }
        # Attach compatibility exam result if it exists for this applicant
        if uid in compatibility_exams:
            req_data["compatibility_exam"] = compatibility_exams[uid]
        requests_resolved.append(req_data)

    proj["members_info"] = members_resolved
    proj["join_requests_info"] = requests_resolved
    return {"success": True, "project": proj}

@router.delete("/{project_id}")
def delete_project(project_id: str):
    from database import delete_document
    success = delete_document('projects', project_id)
    if success:
        return {"success": True}
    return {"success": False, "error": "Project not found"}

@router.post("/", response_model=ProjectBase)
def create_project(project: ProjectBase):
    data = project.model_dump(exclude={'id'})
    data['created_at'] = project.created_at.strftime('%Y-%m-%dT%H:%M:%SZ')
    data['members'] = [project.owner_uid]
    data['upvoted_by'] = []
    data['comments'] = []
    data['join_requests'] = []
    new_id = create_document('projects', data)
    project.id = new_id
    project.members = data['members']
    return project

@router.post("/{project_id}/upvote")
def upvote_project(project_id: str, payload: UpvoteRequest):
    docs = get_collection('projects')
    for doc in docs:
        if doc.get("id") == project_id:
            upvoted_by = doc.get("upvoted_by", [])
            upvotes = doc.get("upvotes", 0)
            
            if payload.user_id in upvoted_by:
                upvoted_by.remove(payload.user_id)
                upvotes -= 1
            else:
                upvoted_by.append(payload.user_id)
                upvotes += 1
                
            update_document('projects', project_id, {"upvotes": upvotes, "upvoted_by": upvoted_by})
            return {"success": True, "new_upvotes": upvotes, "upvoted_by": upvoted_by}
    return {"success": False, "error": "Project not found"}

@router.post("/{project_id}/comments")
def add_project_comment(project_id: str, payload: CommentRequest):
    import uuid
    from datetime import datetime
    docs = get_collection('projects')
    for doc in docs:
        if doc.get("id") == project_id:
            comments = doc.get("comments", [])
            new_comment = {
                "id": str(uuid.uuid4()),
                "user_id": payload.user_id,
                "user_name": payload.user_name,
                "text": payload.text,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            comments.append(new_comment)
            update_document('projects', project_id, {"comments": comments})
            return {"success": True, "comment": new_comment}
    return {"success": False, "error": "Project not found"}

@router.post("/{project_id}/join")
def join_project(project_id: str, payload: JoinRequest, background_tasks: BackgroundTasks):
    docs = get_collection('projects')
    for doc in docs:
        if doc.get("id") == project_id:
            members = doc.get("members", [])
            join_requests = doc.get("join_requests", [])
            
            # If they are already a member, they leave
            if payload.user_id in members:
                members.remove(payload.user_id)
                update_document('projects', project_id, {"members": members})
                return {"success": True, "status": "left", "members": members}
            else:
                # Toggle join request
                if payload.user_id in join_requests:
                    join_requests.remove(payload.user_id)
                    # Also remove their compatibility exam data
                    compatibility_exams = doc.get("compatibility_exams", {})
                    compatibility_exams.pop(payload.user_id, None)
                    update_document('projects', project_id, {
                        "join_requests": join_requests,
                        "compatibility_exams": compatibility_exams,
                    })
                    status = "request_cancelled"
                else:
                    join_requests.append(payload.user_id)
                    status = "requested"

                    # Store compatibility exam results if provided
                    update_data = {"join_requests": join_requests}
                    if payload.compatibility_exam:
                        compatibility_exams = doc.get("compatibility_exams", {})
                        compatibility_exams[payload.user_id] = payload.compatibility_exam
                        update_data["compatibility_exams"] = compatibility_exams

                    update_document('projects', project_id, update_data)

                    from database import get_document
                    req_user = get_document('users', payload.user_id)
                    owner_profile = get_document('users', doc.get("owner_uid"))
                    if owner_profile and req_user and owner_profile.get("email"):
                        score_info = ""
                        if payload.compatibility_exam:
                            score = payload.compatibility_exam.get("totalCompatibilityScore", "N/A")
                            score_info = f" (AI Compatibility Score: {score}%)"
                        subject = f"New Join Request for {doc.get('title', 'your project')}"
                        body = f"User {req_user.get('display_name')} has requested to join your project.{score_info}"
                        background_tasks.add_task(send_email_notification, owner_profile.get("email"), subject, body)
                
                return {"success": True, "status": status, "join_requests": join_requests}
                
    return {"success": False, "error": "Project not found"}

@router.post("/{project_id}/requests/{user_id}/accept")
def accept_join_request(project_id: str, user_id: str, background_tasks: BackgroundTasks):
    from database import get_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
        
    members = proj.get("members", [])
    join_requests = proj.get("join_requests", [])
    
    if user_id in join_requests:
        join_requests.remove(user_id)
        if user_id not in members:
            members.append(user_id)
        update_document('projects', project_id, {"members": members, "join_requests": join_requests})
        req_user = get_document('users', user_id)
        if req_user and req_user.get("email"):
            subject = f"Join Request Accepted for {proj.get('title', 'Unknown Project')}"
            body = f"Congratulations! Your request to join the project has been accepted."
            background_tasks.add_task(send_email_notification, req_user.get("email"), subject, body)
        return {"success": True}
        
    return {"success": False, "error": "User not in requests"}

@router.post("/{project_id}/requests/{user_id}/reject")
def reject_join_request(project_id: str, user_id: str, background_tasks: BackgroundTasks):
    from database import get_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
        
    join_requests = proj.get("join_requests", [])
    
    if user_id in join_requests:
        join_requests.remove(user_id)
        update_document('projects', project_id, {"join_requests": join_requests})
        req_user = get_document('users', user_id)
        if req_user and req_user.get("email"):
            subject = f"Join Request Rejected for {proj.get('title', 'Unknown Project')}"
            body = f"Your request to join the project has been declined."
            background_tasks.add_task(send_email_notification, req_user.get("email"), subject, body)
        return {"success": True}
        
    return {"success": False, "error": "User not in requests"}

@router.get("/{project_id}/members")
def get_project_members(project_id: str):
    from database import get_document
    docs = get_collection('projects')
    for doc in docs:
        if doc.get("id") == project_id:
            member_uids = doc.get("members", [])
            resolved = []
            for uid in member_uids:
                profile = get_document('users', uid)
                if profile:
                    resolved.append({
                        "uid": uid,
                        "name": profile.get("display_name", "Unknown"),
                        "email": profile.get("email", "No email"),
                        "branch": profile.get("branch", ""),
                        "skills": profile.get("skills", [])
                    })
                else:
                    resolved.append({"uid": uid, "name": "Unknown", "email": "No profile yet", "branch": "", "skills": []})
            return {"success": True, "members": resolved}
    return {"success": False, "error": "Project not found"}

@router.delete("/{project_id}/members/{user_id}")
def remove_project_member(project_id: str, user_id: str):
    from database import get_document, update_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
        
    members = proj.get("members", [])
    if user_id in members:
        members.remove(user_id)
        update_document('projects', project_id, {"members": members})
        return {"success": True}
        
    return {"success": False, "error": "User not in project"}

@router.post("/{project_id}/match")
def match_project(project_id: str, payload: dict):
    from database import get_document
    from services.ai_matcher import calculate_match_score

    # Check Project
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
        
    # Check User
    user_id = payload.get("user_id")
    inline_skills = payload.get("skills", [])  # Fallback skills sent directly from frontend
    
    user_profile = get_document('users', user_id)
    student_skills = user_profile.get("skills", []) if user_profile else inline_skills
    
    # Enhanced Context for Semantic Matching
    project_context = {
        "title": proj.get("title", ""),
        "description": proj.get("description", ""),
        "type": proj.get("project_type", "Full-Stack"),
        "difficulty": proj.get("difficulty", "Intermediate"),
        "required_skills": proj.get("required_skills", [])
    }
    
    student_profile = {
        "name": user_profile.get("display_name", "Student") if user_profile else "Student",
        "skills": student_skills,
        "bio": user_profile.get("bio", "") if user_profile else "",
        "github": user_profile.get("github", "") if user_profile else ""
    }
    
    match_result = calculate_match_score(student_profile, project_context)
    
    return {"success": True, "match": match_result}

class UpdateProjectGithub(BaseModel):
    github_url: str

@router.put("/{project_id}/github")
def update_project_github(project_id: str, payload: UpdateProjectGithub):
    from database import update_document, get_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
    update_document('projects', project_id, {"github_url": payload.github_url})
    return {"success": True}

@router.delete("/{project_id}")
def delete_project(project_id: str):
    from database import delete_document
    success = delete_document("projects", project_id)
    if success:
        return {"success": True}
    return {"success": False, "error": "Project not found"}


@router.patch("/{project_id}/requirements")
def update_project_requirements(project_id: str, requirements: dict):
    success = update_document('projects', project_id, requirements)
    return {"success": success}

@router.post("/{project_id}/team-analysis")
def get_team_analysis(project_id: str):
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
    
    # 1. Gather all existing members and current applicants
    member_uids = proj.get("members", [])
    applicant_uids = proj.get("join_requests", [])
    
    candidates = []
    # Resolve all potential team members (Current + Applicants)
    for uid in (member_uids + applicant_uids):
        user_profile = get_document("users", uid)
        if user_profile:
            candidates.append({
                "name": user_profile.get("display_name", "Unknown"),
                "skills": user_profile.get("skills", []),
                "role": user_profile.get("role") or user_profile.get("branch", "Generalist"), 
                "experience_level": user_profile.get("experience_level", "Junior"),
                "bio": user_profile.get("bio", "")
            })

    # 2. If no real applicants/members, load mock candidates for demonstration
    # 2. No mock fallback for team intelligence — keep it real or empty
    if not candidates:
        return {"success": True, "analysis": None}
        
    analysis = evaluate_team_compatibility(proj, candidates)
    return {"success": True, "analysis": analysis}

class GenerateMOMRequest(BaseModel):
    transcripts: List[str]
    fallback_title: str = "Project"
    fallback_members: List[str] = []

@router.post("/{project_id}/generate_mom")
def generate_mom(project_id: str, payload: GenerateMOMRequest, background_tasks: BackgroundTasks):
    from services.ai_mom import generate_mom_from_transcripts
    from services.email_service import send_email_notification
    from database import get_document
    
    proj = get_document('projects', project_id)
    if not proj:
        # Instead of failing, utilize the fallback provided by the frontend cache
        print("Project not found in DB or quota exceeded. Using frontend fallback data for emails.")
        title = payload.fallback_title
        members = payload.fallback_members
    else:
        title = proj.get("title", "Project")
        members = proj.get("members", [])
        
    mom_text = generate_mom_from_transcripts(payload.transcripts)
    
    # Send MOM email to all project members
    members_notified = 0
    for member_id in members:
        req_user = get_document('users', member_id)
        if req_user and req_user.get("email"):
            subject = f"Minutes of Meeting: {title}"
            body = f"Here is the AI-generated Summary and Action Items from your recent War Room session:\n\n{mom_text}"
            background_tasks.add_task(send_email_notification, req_user.get("email"), subject, body)
            members_notified += 1

    return {"success": True, "mom": mom_text, "members_notified": members_notified}

@router.post("/{project_id}/notify_meeting")
def notify_meeting(project_id: str, background_tasks: BackgroundTasks):
    from database import get_document
    proj = get_document('projects', project_id)
    if not proj:
        print(f"[Notify] Project not found: {project_id}")
        return {"success": False, "error": "Project not found"}
        
    members = proj.get("members", [])
    members_notified = 0
    print(f"\n[Notify] Starting notification for meeting: {proj.get('title')} (Project ID: {project_id})")
    print(f"[Notify] Scanning {len(members)} total members...")

    for member_id in members:
        req_user = get_document('users', member_id)
        if not req_user:
            print(f"[Notify] ❌ User document not found for ID: {member_id}")
            continue
            
        email = req_user.get("email")
        if not email:
            print(f"[Notify] ❌ User {req_user.get('display_name', 'Unknown')} has no email address. Skipping.")
            continue
            
        subject = f"War Room Active: {proj.get('title', 'Project')}"
        body = f"The Team Lead has joined the War Room (Video Call) for project: {proj.get('title', 'Project')}. Please join the meeting!"
        
        print(f"[Notify] ✅ Queued email to: {email} (User: {req_user.get('display_name')})")
        background_tasks.add_task(send_email_notification, email, subject, body)
        members_notified += 1
            
    print(f"[Notify] Finished. Queued {members_notified} emails.\n")
    return {"success": True, "members_notified": members_notified}
