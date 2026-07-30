"""
Compatibility Exam Router — AI-powered applicant vetting.

POST /api/compatibility/generate-exam    → Generate 3-question exam
POST /api/compatibility/evaluate         → Evaluate answers → compatibility score
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from services.compatibility_ai import generate_exam, evaluate_answers

router = APIRouter(prefix="/api/compatibility", tags=["Compatibility Exam"])


# ── Request / Response Models ────────────────────────────────────────────────

class ProjectContext(BaseModel):
    id: str
    name: str
    techStack: List[str] = Field(..., min_length=1)
    currentPhase: str = Field(..., description="e.g. prototyping, debugging, scaling, mvp, polishing")
    recentChallenges: str = ""


class ApplicantContext(BaseModel):
    id: str
    name: str
    knownSkills: List[str] = []
    bio: str = ""


class ExamQuestion(BaseModel):
    id: int
    questionText: str
    category: str  # 'Technical' | 'Workflow' | 'Priority'


class GeneratedExam(BaseModel):
    questions: List[ExamQuestion]


class GenerateExamRequest(BaseModel):
    project: ProjectContext
    applicant: ApplicantContext


class AnswerPayload(BaseModel):
    questionId: int
    answerText: str


class EvaluateRequest(BaseModel):
    project: ProjectContext
    questions: List[ExamQuestion]
    answers: List[AnswerPayload]


class RadarMetrics(BaseModel):
    techFit: int = Field(..., ge=0, le=100)
    cultureFit: int = Field(..., ge=0, le=100)
    speed: int = Field(..., ge=0, le=100)


class ExamEvaluation(BaseModel):
    totalCompatibilityScore: int = Field(..., ge=0, le=100)
    radarMetrics: RadarMetrics
    summary: str


# ── PHASE 1: Generate Exam ──────────────────────────────────────────────────

@router.post("/generate-exam", response_model=GeneratedExam)
def api_generate_exam(payload: GenerateExamRequest):
    """
    Analyze gaps between project needs and applicant skills,
    then generate a 3-question compatibility exam.
    """
    try:
        result = generate_exam(
            project_context=payload.project.model_dump(),
            applicant_context=payload.applicant.model_dump(),
        )
        return GeneratedExam(**result)

    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during exam generation: {str(e)}",
        )


# ── PHASE 2: Evaluate Answers ──────────────────────────────────────────────

@router.post("/evaluate", response_model=ExamEvaluation)
def api_evaluate_answers(payload: EvaluateRequest):
    """
    Evaluate applicant answers against the project context
    and return a compatibility score with radar metrics.
    """
    try:
        result = evaluate_answers(
            project_context=payload.project.model_dump(),
            questions=[q.model_dump() for q in payload.questions],
            answers=[a.model_dump() for a in payload.answers],
        )
        return ExamEvaluation(**result)

    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during evaluation: {str(e)}",
        )
