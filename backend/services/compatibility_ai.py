"""
Compatibility AI Service — Exam Generation & Evaluation via Groq LLM.

Phase 1: Generate a 3-question compatibility exam based on project–applicant gap analysis.
Phase 2: Evaluate applicant answers and produce a compatibility score + radar metrics.
"""

import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()


# ── Data Contracts (Python equivalents of the TypeScript interfaces) ─────────
#
# ProjectContext:
#   id: str
#   name: str
#   techStack: list[str]
#   currentPhase: str  (e.g., 'prototyping', 'debugging', 'scaling')
#   recentChallenges: str
#
# ApplicantContext:
#   id: str
#   name: str
#   knownSkills: list[str]
#   bio: str
#
# ExamQuestion:
#   id: int
#   questionText: str
#   category: 'Technical' | 'Workflow' | 'Priority'
#
# GeneratedExam:
#   questions: list[ExamQuestion]  (exactly 3)
#
# ExamEvaluation:
#   totalCompatibilityScore: int  (0-100)
#   radarMetrics: { techFit: int, cultureFit: int, speed: int }
#   summary: str  (2 sentences)
# ─────────────────────────────────────────────────────────────────────────────


def _get_client() -> Groq:
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY not set")
    return Groq(api_key=key, timeout=30.0)


def _extract_json(text: str) -> dict:
    """Robustly extract a JSON object from LLM text output."""
    # Strip control characters
    clean = re.sub(r'[\x00-\x1f\x7f]', ' ', text)

    # Try to find a JSON object (possibly nested)
    # First try: find the outermost { ... }
    depth = 0
    start = None
    for i, ch in enumerate(clean):
        if ch == '{':
            if depth == 0:
                start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return json.loads(clean[start:i + 1])
                except json.JSONDecodeError:
                    start = None
                    continue

    # Fallback: regex for simple JSON
    match = re.search(r'\{.*\}', clean, re.DOTALL)
    if match:
        return json.loads(match.group())

    raise ValueError(f"No valid JSON found in LLM response: {text[:200]}")


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1: EXAM GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

EXAM_SYSTEM_PROMPT = """You are an elite Technical Recruiter AI for Uni-Verse, a cutting-edge hackathon team collaboration platform. Your job is to design a precision compatibility exam that identifies whether an applicant can contribute meaningfully to a SPECIFIC project at THIS EXACT moment.

You are NOT giving a generic coding test. You are performing GAP ANALYSIS:
1. Analyze the project's tech stack, current phase, and recent challenges.
2. Analyze the applicant's known skills and background.
3. Identify the GAPS — what the project needs that the applicant hasn't demonstrated yet.
4. Design 3 questions that probe these gaps to determine if the applicant can fill them.

QUESTION DESIGN RULES:
- Question 1 (category: "Technical"): Test a specific technical gap between the project's stack and the applicant's skills. Ask about a technology or concept the project NEEDS but the applicant's profile doesn't explicitly cover. Make it scenario-based, not trivia.
- Question 2 (category: "Workflow"): Test how the applicant would handle a REAL workflow challenge the project is currently facing. Reference the project's current phase and recent challenges directly. This tests process thinking, not just coding ability.
- Question 3 (category: "Priority"): Present a realistic trade-off scenario the project team might face given its current state. Test the applicant's judgment about what to prioritize. There should be no single "correct" answer — you're testing alignment with the project's needs.

Each question must be 2-4 sentences. Be specific and contextual — never generic.

RESPOND WITH ONLY A RAW JSON OBJECT in this exact format:
{
  "questions": [
    {"id": 1, "questionText": "...", "category": "Technical"},
    {"id": 2, "questionText": "...", "category": "Workflow"},
    {"id": 3, "questionText": "...", "category": "Priority"}
  ]
}

No markdown, no explanation, no code fences. ONLY the JSON object."""


def generate_exam(project_context: dict, applicant_context: dict) -> dict:
    """
    Generate a 3-question compatibility exam by analyzing gaps between
    project needs and applicant profile.

    Args:
        project_context: { id, name, techStack, currentPhase, recentChallenges }
        applicant_context: { id, name, knownSkills, bio }

    Returns:
        { questions: [ { id, questionText, category }, ... ] }
    """
    client = _get_client()

    tech_stack = ", ".join(project_context.get("techStack", []))
    known_skills = ", ".join(applicant_context.get("knownSkills", []))

    user_prompt = f"""PROJECT CONTEXT:
- Project Name: "{project_context.get('name', 'Unnamed Project')}"
- Tech Stack: [{tech_stack}]
- Current Phase: {project_context.get('currentPhase', 'unknown')}
- Recent Challenges: {project_context.get('recentChallenges', 'None specified')}

APPLICANT CONTEXT:
- Name: {applicant_context.get('name', 'Unknown')}
- Known Skills: [{known_skills}]
- Bio: {applicant_context.get('bio', 'No bio provided')}

TASK: Perform a gap analysis between the project's needs and the applicant's profile. Then generate exactly 3 targeted exam questions as specified. Output ONLY the JSON."""

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": EXAM_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            max_tokens=1200,
        )

        raw = completion.choices[0].message.content
        result = _extract_json(raw)

        # Validate structure
        questions = result.get("questions", [])
        if not isinstance(questions, list) or len(questions) != 3:
            raise ValueError(f"Expected 3 questions, got {len(questions) if isinstance(questions, list) else 'non-list'}")

        valid_categories = {"Technical", "Workflow", "Priority"}
        for q in questions:
            if not all(k in q for k in ("id", "questionText", "category")):
                raise ValueError(f"Question missing required fields: {q}")
            if q["category"] not in valid_categories:
                raise ValueError(f"Invalid category: {q['category']}")

        return {"questions": questions}

    except Exception as e:
        raise RuntimeError(f"Exam generation failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2: ANSWER EVALUATION
# ═══════════════════════════════════════════════════════════════════════════════

EVAL_SYSTEM_PROMPT = """You are a Technical Compatibility Evaluator AI for Uni-Verse. You are evaluating an applicant's exam answers to determine their COMPATIBILITY with a specific project — NOT their general programming knowledge.

EVALUATION CRITERIA:
1. **Technical Fit (techFit)**: Does the applicant demonstrate understanding of the technologies and concepts the project specifically requires? Can they fill the identified skill gaps?
2. **Culture Fit (cultureFit)**: Does the applicant's approach to workflow, collaboration, and problem-solving align with how this project team operates? Do their answers show they'd integrate smoothly into the team's current phase?
3. **Speed (speed)**: Based on their answers, how quickly could this applicant become productive on THIS project? Consider ramp-up time, familiarity with adjacent technologies, and their apparent learning velocity.

SCORING RULES:
- totalCompatibilityScore: A holistic 0-100 score. This is NOT an average of the sub-scores. It's your professional judgment of overall project-applicant fit.
- Each radar metric (techFit, cultureFit, speed): Independent 0-100 score.
- summary: Exactly 2 sentences. First sentence: the applicant's strongest alignment with the project. Second sentence: the most significant gap or risk.

Be HONEST and CALIBRATED. A score of 50 means "neutral — could go either way." Below 40 means "significant misalignment." Above 75 means "strong fit."

RESPOND WITH ONLY A RAW JSON OBJECT in this exact format:
{
  "totalCompatibilityScore": <number 0-100>,
  "radarMetrics": {
    "techFit": <number 0-100>,
    "cultureFit": <number 0-100>,
    "speed": <number 0-100>
  },
  "summary": "<exactly 2 sentences>"
}

No markdown, no explanation, no code fences. ONLY the JSON object."""


def evaluate_answers(
    project_context: dict,
    questions: list,
    answers: list,
) -> dict:
    """
    Evaluate applicant's exam answers against the project context.

    Args:
        project_context: { id, name, techStack, currentPhase, recentChallenges }
        questions: list of { id, questionText, category }
        answers: list of { questionId, answerText }

    Returns:
        { totalCompatibilityScore, radarMetrics: { techFit, cultureFit, speed }, summary }
    """
    client = _get_client()

    tech_stack = ", ".join(project_context.get("techStack", []))

    # Build Q&A pairs
    qa_block = ""
    for q in questions:
        matching_answer = next(
            (a for a in answers if a.get("questionId") == q.get("id")),
            None,
        )
        answer_text = matching_answer.get("answerText", "(No answer provided)") if matching_answer else "(No answer provided)"
        qa_block += f"""
Question {q['id']} [{q['category']}]: {q['questionText']}
Applicant's Answer: {answer_text}
"""

    user_prompt = f"""PROJECT CONTEXT:
- Project Name: "{project_context.get('name', 'Unnamed')}"
- Tech Stack: [{tech_stack}]
- Current Phase: {project_context.get('currentPhase', 'unknown')}
- Recent Challenges: {project_context.get('recentChallenges', 'None')}

EXAM RESPONSES:
{qa_block}

TASK: Evaluate these answers strictly on COMPATIBILITY with this specific project's needs, not on generic correctness. Output ONLY the JSON evaluation."""

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": EVAL_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=600,
        )

        raw = completion.choices[0].message.content
        result = _extract_json(raw)

        # Validate and sanitize
        score = int(result.get("totalCompatibilityScore", 0))
        score = max(0, min(100, score))

        radar = result.get("radarMetrics", {})
        radar_clean = {
            "techFit": max(0, min(100, int(radar.get("techFit", 0)))),
            "cultureFit": max(0, min(100, int(radar.get("cultureFit", 0)))),
            "speed": max(0, min(100, int(radar.get("speed", 0)))),
        }

        summary = str(result.get("summary", "Evaluation complete."))

        return {
            "totalCompatibilityScore": score,
            "radarMetrics": radar_clean,
            "summary": summary,
        }

    except Exception as e:
        raise RuntimeError(f"Answer evaluation failed: {e}")
