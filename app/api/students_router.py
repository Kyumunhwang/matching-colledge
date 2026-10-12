"""
Students API Router for managing applicant dossiers, graduation, withdrawal, and archiving.
"""
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(prefix="/api/students", tags=["students"])

import shutil

def get_active_data_dir() -> Path:
    """Returns writable data directory, falling back to /tmp on serverless environments."""
    try:
        settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
        test_file = settings.DATA_DIR / ".write_test"
        with open(test_file, "w") as f:
            f.write("ok")
        test_file.unlink(missing_ok=True)
        return settings.DATA_DIR
    except (OSError, PermissionError):
        tmp_dir = Path("/tmp") / "matching_college_data"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        tmp_students = tmp_dir / "students.json"
        if not tmp_students.exists() and settings.STUDENTS_FILE.exists():
            shutil.copy2(settings.STUDENTS_FILE, tmp_students)
        return tmp_dir


ACTIVE_DATA_DIR = get_active_data_dir()
WITHDRAWN_DIR = ACTIVE_DATA_DIR / "withdrawn"
GRADUATED_DIR = ACTIVE_DATA_DIR / "graduated"

WITHDRAWN_DIR.mkdir(parents=True, exist_ok=True)
GRADUATED_DIR.mkdir(parents=True, exist_ok=True)


def get_students_file() -> Path:
    target = ACTIVE_DATA_DIR / "students.json"
    if not target.exists() and settings.STUDENTS_FILE.exists():
        return settings.STUDENTS_FILE
    return target


def load_students() -> List[Dict[str, Any]]:
    target = get_students_file()
    if not target.exists():
        return []
    with open(target, "r", encoding="utf-8") as f:
        return json.load(f)


def save_students(students: List[Dict[str, Any]]) -> None:
    target = ACTIVE_DATA_DIR / "students.json"
    with open(target, "w", encoding="utf-8") as f:
        json.dump(students, f, ensure_ascii=False, indent=2)


class NewStudentPayload(BaseModel):
    name: str
    korean_name: str
    school: Optional[str] = "Lighthouse International School (LIS)"
    grade: Optional[int] = 12
    cohort: Optional[str] = "IBDP Cohort Alpha"
    citizenship_status: Optional[str] = "International (No Green Card)"
    curriculum_type: Optional[str] = "IB DP"
    ib_predicted_score: Optional[int] = 40
    unweighted_gpa: Optional[float] = 3.90
    sat_score: Optional[int] = None
    household_income_usd: Optional[float] = 85000
    max_annual_budget_usd: Optional[float] = 25000
    intended_major: Optional[str] = "Computer Science"


class WithdrawPayload(BaseModel):
    withdrawn_year: int
    reason: Optional[str] = "Transfer / Personal reasons"


class GraduatePayload(BaseModel):
    graduation_year: int
    final_matriculation: Optional[str] = "Pending Enrollment"


class RosterImportPayload(BaseModel):
    active: Optional[List[Dict[str, Any]]] = None
    graduated: Optional[List[Dict[str, Any]]] = None
    withdrawn: Optional[List[Dict[str, Any]]] = None


@router.get("", response_model=List[Dict[str, Any]])
async def get_all_students() -> List[Dict[str, Any]]:
    """Retrieve all active student dossiers in the counseling cockpit."""
    return load_students()


@router.get("/export")
async def export_all_data() -> Dict[str, Any]:
    """Export complete roster database (active, graduated, withdrawn) for cross-device backup."""
    return {
        "school": "Lighthouse International School (LIS)",
        "exported_at": datetime.now().isoformat(),
        "active": load_students(),
        "graduated": await get_archived_students("graduated"),
        "withdrawn": await get_archived_students("withdrawn"),
    }


@router.post("/import")
async def import_all_data(payload: RosterImportPayload) -> Dict[str, Any]:
    """Import roster database for restoring data across devices."""
    if payload.active is not None:
        save_students(payload.active)
    
    current_year = datetime.now().year
    if payload.graduated is not None:
        grad_file = GRADUATED_DIR / f"graduated_{current_year}.json"
        with open(grad_file, "w", encoding="utf-8") as f:
            json.dump(payload.graduated, f, ensure_ascii=False, indent=2)

    if payload.withdrawn is not None:
        with_file = WITHDRAWN_DIR / f"withdrawn_{current_year}.json"
        with open(with_file, "w", encoding="utf-8") as f:
            json.dump(payload.withdrawn, f, ensure_ascii=False, indent=2)

    return {
        "status": "success",
        "message": "Roster imported successfully.",
        "active_count": len(payload.active or []),
        "graduated_count": len(payload.graduated or []),
        "withdrawn_count": len(payload.withdrawn or [])
    }


@router.post("")
async def create_new_student(payload: NewStudentPayload) -> Dict[str, Any]:
    """Register a new student dossier into the active roster."""
    students = load_students()
    
    # Generate unique ID
    existing_ids = [int(s.get("id", 8800)) for s in students if str(s.get("id", "")).isdigit()]
    new_id = str(max(existing_ids, default=8800) + 1)

    std_tests: Dict[str, Any] = {}
    if payload.sat_score is not None and payload.sat_score > 0:
        std_tests["SAT"] = payload.sat_score
        std_tests["SAT_RW"] = min(800, max(200, int(payload.sat_score * 0.48)))
        std_tests["SAT_Math"] = payload.sat_score - std_tests["SAT_RW"]

    new_student = {
        "id": new_id,
        "name": payload.name,
        "korean_name": payload.korean_name,
        "school": payload.school or "Lighthouse International School (LIS)",
        "grade": payload.grade,
        "cohort": payload.cohort,
        "counselor_name": "Mr. David Nah",
        "dossier_status": f"Registered {datetime.now().strftime('%Y.%m.%d')}",
        "citizenship_status": payload.citizenship_status,
        "academic_profile": {
            "curriculum_type": payload.curriculum_type,
            "ib_predicted_score": payload.ib_predicted_score,
            "unweighted_gpa": payload.unweighted_gpa,
            "weighted_gpa": round(payload.unweighted_gpa * 1.1, 2),
            "school_context": f"{payload.curriculum_type} Diploma Track",
            "grade_trend": "Consistently Strong",
            "standardized_tests": std_tests,
            "years_in_english_school": 4,
            "english_waiver_eligible": True,
            "intended_major": payload.intended_major
        },
        "financial_profile": {
            "household_income_usd": payload.household_income_usd,
            "household_assets_usd": payload.household_income_usd * 2,
            "max_annual_budget_usd": payload.max_annual_budget_usd,
            "financial_aid_required": True,
            "estimated_sai_usd": round(payload.household_income_usd * 0.2, -2)
        },
        "extracurricular_profile": [
            {
                "activity_name": "Academic Project & Club Leadership",
                "duration_years": 3,
                "hours_per_week": 8,
                "role": "President / Founder",
                "spike_classification": "Spike Focus",
                "impact": "Led team research and community initiatives."
            }
        ],
        "preferences": {
            "institution_type": "National University",
            "geographic_location": "East Coast or West Coast",
            "campus_setting": "Suburban or Urban"
        },
        "simulation": {
            "evaluated_at": datetime.now().isoformat(),
            "is_published": False,
            "firewall_status": "DRAFT_MUTED",
            "counselor_override_note": "Awaiting initial counselor assessment by Mr. David Nah.",
            "student_analysis": {},
            "matched_universities": []
        }
    }

    students.append(new_student)
    save_students(students)
    return {"status": "success", "student": new_student}


@router.get("/{student_id}")
async def get_student(student_id: str) -> Dict[str, Any]:
    """Retrieve a single student dossier by ID."""
    students = load_students()
    for s in students:
        if s.get("id") == student_id:
            return s
    raise HTTPException(status_code=404, detail="Student not found")


@router.post("/{student_id}")
async def update_student(student_id: str, updated_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update student 5D parameters and save to JSON database."""
    students = load_students()
    target_idx = next((idx for idx, s in enumerate(students) if s.get("id") == student_id), None)

    if target_idx is None:
        raise HTTPException(status_code=404, detail="Student not found")

    students[target_idx].update(updated_data)
    save_students(students)
    return {"status": "success", "student": students[target_idx]}


@router.post("/{student_id}/withdraw")
async def withdraw_student(student_id: str, payload: WithdrawPayload) -> Dict[str, Any]:
    """
    Process student withdrawal (자퇴 처리).
    Archives student into app/data/withdrawn/withdrawn_{year}.json and removes from active roster.
    """
    students = load_students()
    target_idx = next((idx for idx, s in enumerate(students) if s.get("id") == student_id), None)

    if target_idx is None:
        raise HTTPException(status_code=404, detail="Student not found in active roster")

    student = students.pop(target_idx)
    student["status"] = "WITHDRAWN"
    student["withdrawn_year"] = payload.withdrawn_year
    student["withdrawn_reason"] = payload.reason
    student["withdrawn_at"] = datetime.now().isoformat()

    # Save to withdrawn folder by year
    archive_file = WITHDRAWN_DIR / f"withdrawn_{payload.withdrawn_year}.json"
    archived_list = []
    if archive_file.exists():
        with open(archive_file, "r", encoding="utf-8") as f:
            archived_list = json.load(f)

    # Avoid duplicate in archive
    archived_list = [s for s in archived_list if s.get("id") != student_id]
    archived_list.append(student)

    with open(archive_file, "w", encoding="utf-8") as f:
        json.dump(archived_list, f, ensure_ascii=False, indent=2)

    save_students(students)
    return {
        "status": "success",
        "message": f"Student {student.get('name')} successfully marked as withdrawn ({payload.withdrawn_year}).",
        "student": student,
        "archive_file": str(archive_file)
    }


@router.post("/{student_id}/graduate")
async def graduate_student(student_id: str, payload: GraduatePayload) -> Dict[str, Any]:
    """
    Process student graduation (졸업 처리).
    Archives student into app/data/graduated/graduated_{year}.json and removes from active roster.
    """
    students = load_students()
    target_idx = next((idx for idx, s in enumerate(students) if s.get("id") == student_id), None)

    if target_idx is None:
        raise HTTPException(status_code=404, detail="Student not found in active roster")

    student = students.pop(target_idx)
    student["status"] = "GRADUATED"
    student["graduation_year"] = payload.graduation_year
    student["final_matriculation"] = payload.final_matriculation
    student["graduated_at"] = datetime.now().isoformat()

    # Save to graduated folder by year
    archive_file = GRADUATED_DIR / f"graduated_{payload.graduation_year}.json"
    archived_list = []
    if archive_file.exists():
        with open(archive_file, "r", encoding="utf-8") as f:
            archived_list = json.load(f)

    archived_list = [s for s in archived_list if s.get("id") != student_id]
    archived_list.append(student)

    with open(archive_file, "w", encoding="utf-8") as f:
        json.dump(archived_list, f, ensure_ascii=False, indent=2)

    save_students(students)
    return {
        "status": "success",
        "message": f"Student {student.get('name')} successfully recorded as alumni ({payload.graduation_year}).",
        "student": student,
        "archive_file": str(archive_file)
    }


@router.get("/archives/{archive_type}")
async def get_archived_students(archive_type: str) -> List[Dict[str, Any]]:
    """
    Retrieve archived students (archive_type: 'withdrawn' or 'graduated').
    """
    target_dir = WITHDRAWN_DIR if archive_type == "withdrawn" else GRADUATED_DIR
    all_archived = []
    for file_path in target_dir.glob("*.json"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                records = json.load(f)
                all_archived.extend(records)
        except Exception:
            continue
    return all_archived
