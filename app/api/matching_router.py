"""
Matching Simulation API Router.
Controls 5D algorithm execution, counselor overrides, and publication firewall.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException

from app.api.students_router import load_students, save_students
from app.api.colleges_router import load_colleges
from app.core.ai_engine import AIEngine

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.post("/run/{student_id}")
async def run_simulation(student_id: str) -> Dict[str, Any]:
    """
    Executes the 5-Dimensional admissions matching simulation for a student.
    Results are saved into draft state behind the counselor security firewall.
    """
    students = load_students()
    target_idx = next((i for i, s in enumerate(students) if s.get("id") == student_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail="Student not found")

    student = students[target_idx]
    colleges = load_colleges()

    # Run AI simulation
    simulation_result = await AIEngine.run_simulation(student, colleges)

    # Attach counselor override metadata & firewall state
    updated_simulation = {
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "is_published": False,
        "firewall_status": "DRAFT_MUTED",
        "counselor_override_note": student.get("simulation", {}).get("counselor_override_note", "Pending counselor review."),
        "student_analysis": simulation_result.get("student_analysis", {}),
        "matched_universities": simulation_result.get("matched_universities", [])
    }

    students[target_idx]["simulation"] = updated_simulation
    save_students(students)

    return {
        "status": "success",
        "student_id": student_id,
        "firewall_status": "DRAFT_MUTED",
        "simulation": updated_simulation
    }


@router.post("/override/{student_id}")
async def override_match(student_id: str, override_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Counselor adjusts category (Reach/Match/Safety), comments, or approved visibility for a university.
    """
    students = load_students()
    target_idx = next((i for i, s in enumerate(students) if s.get("id") == student_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail="Student not found")

    simulation = students[target_idx].get("simulation", {})
    matched_universities = simulation.get("matched_universities", [])
    
    ipeds_id = override_payload.get("ipeds_id")
    new_category = override_payload.get("category")
    counselor_comment = override_payload.get("comment")
    is_approved = override_payload.get("is_approved")
    general_counselor_note = override_payload.get("general_note")

    if general_counselor_note is not None:
        simulation["counselor_override_note"] = general_counselor_note

    for u in matched_universities:
        if u.get("ipeds_id") == ipeds_id or u.get("university_name") == override_payload.get("university_name"):
            if new_category:
                u["counselor_override_category"] = new_category
                u["matching_category"] = new_category
            if counselor_comment is not None:
                u["counselor_comment"] = counselor_comment
            if is_approved is not None:
                u["is_approved"] = is_approved

    save_students(students)
    return {"status": "success", "simulation": simulation}


@router.post("/publish/{student_id}")
async def publish_to_client(student_id: str) -> Dict[str, Any]:
    """
    Releases counselor-curated dossier past the firewall to the Student & Parent Portal.
    """
    students = load_students()
    target_idx = next((i for i, s in enumerate(students) if s.get("id") == student_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail="Student not found")

    simulation = students[target_idx].get("simulation", {})
    simulation["is_published"] = True
    simulation["firewall_status"] = "PUBLISHED_TO_CLIENT"
    simulation["published_at"] = datetime.now(timezone.utc).isoformat()

    save_students(students)
    return {
        "status": "success",
        "message": "Dossier published to Student & Parent Portal successfully.",
        "firewall_status": "PUBLISHED_TO_CLIENT"
    }
