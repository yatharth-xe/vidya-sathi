"""
Assignment management routes — Teacher-facing.

Security model
--------------
* Teacher identity is always derived from the JWT (get_current_teacher).
* teacher_id is NEVER accepted from the request body.
* Classroom ownership is verified before creating / managing any assignment.
* PDF uploads: MIME-type validated, size capped at 20 MB, safe unique filename.
"""
import os
import uuid
import mimetypes
from typing import List

from fastapi import (
    APIRouter, Depends, HTTPException, status,
    UploadFile, File, Query,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db, get_current_teacher
from app.database import models, crud
from app.schemas import assignment as assignment_schemas
from app.services import assignment_service

router = APIRouter(prefix="/assignments", tags=["assignments"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_UPLOAD_BYTES = 20 * 1024 * 1024   # 20 MB
ALLOWED_MIME_TYPES = {"application/pdf"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _verify_classroom_owned_by_teacher(
    db: Session,
    classroom_id: int,
    teacher_id: int,
) -> models.Classroom:
    """Return the classroom or raise 403/404 if the teacher doesn't own it."""
    classroom = crud.get_classroom(db, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found",
        )
    if classroom.teacher_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not own this classroom",
        )
    return classroom


def _safe_upload_path(original_filename: str, assignment_id: int) -> str:
    """
    Build a collision-free, path-traversal-safe file path inside UPLOAD_DIR.
    Format: uploads/<assignment_id>_<uuid>.<ext>
    """
    # Strip any directory components that could cause path traversal
    basename = os.path.basename(original_filename)
    _, ext = os.path.splitext(basename)
    ext = ext.lower()[:10]              # cap extension length to avoid tricks
    safe_name = f"{assignment_id}_{uuid.uuid4().hex}{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    return os.path.join(settings.UPLOAD_DIR, safe_name)


# ---------------------------------------------------------------------------
# Teacher: Create assignment
# ---------------------------------------------------------------------------
@router.post(
    "/",
    response_model=assignment_schemas.AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new assignment in a classroom (teacher only)",
)
def create_assignment(
    assignment_in: assignment_schemas.AssignmentCreate,
    current_teacher: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Creates an assignment. Teacher identity comes from the JWT — the
    classroom_id in the body is verified against the authenticated teacher.
    """
    _verify_classroom_owned_by_teacher(db, assignment_in.classroom_id, current_teacher.id)
    return assignment_service.create_new_assignment(db, assignment_in)


# ---------------------------------------------------------------------------
# Teacher: List own assignments (across all classrooms or filtered)
# ---------------------------------------------------------------------------
@router.get(
    "/",
    response_model=List[assignment_schemas.AssignmentResponse],
    summary="List assignments owned by the authenticated teacher",
)
def list_teacher_assignments(
    classroom_id: int = Query(
        None,
        description="Optional: filter by a specific classroom_id",
    ),
    current_teacher: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Returns assignments for classrooms owned by the teacher.
    Pass ?classroom_id=<id> to narrow to a single classroom.
    """
    if classroom_id is not None:
        _verify_classroom_owned_by_teacher(db, classroom_id, current_teacher.id)
        return crud.get_assignments_by_classroom(db, classroom_id)

    # All classrooms this teacher owns
    classrooms = crud.get_classrooms_by_teacher(db, current_teacher.id)
    assignments: List[models.Assignment] = []
    for cls in classrooms:
        assignments.extend(crud.get_assignments_by_classroom(db, cls.id))
    return assignments


# ---------------------------------------------------------------------------
# Teacher: Get a single assignment
# ---------------------------------------------------------------------------
@router.get(
    "/{assignment_id}",
    response_model=assignment_schemas.AssignmentResponse,
    summary="Get assignment details (teacher only — must own the classroom)",
)
def get_assignment(
    assignment_id: int,
    current_teacher: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )
    # Verify teacher owns the classroom this assignment belongs to
    _verify_classroom_owned_by_teacher(db, assignment.classroom_id, current_teacher.id)
    return assignment


# ---------------------------------------------------------------------------
# Teacher: Get assignment PDF file
# ---------------------------------------------------------------------------
@router.get(
    "/{assignment_id}/file",
    summary="Get the PDF file for an assignment (teacher only — must own the classroom)",
)
def get_assignment_file(
    assignment_id: int,
    current_teacher: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )
    _verify_classroom_owned_by_teacher(db, assignment.classroom_id, current_teacher.id)

    if not assignment.file_path or not os.path.exists(assignment.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server",
        )

    # Use content-disposition to render in browser for PDF viewer if possible
    filename = os.path.basename(assignment.file_path)
    return FileResponse(
        assignment.file_path,
        media_type="application/pdf",
        filename=filename,
        content_disposition_type="inline"
    )


# ---------------------------------------------------------------------------
# Teacher: Upload PDF for an assignment
# ---------------------------------------------------------------------------
@router.post(
    "/{assignment_id}/upload-pdf",
    summary="Upload a PDF for an assignment (teacher only — must own the classroom)",
)
async def upload_pdf(
    assignment_id: int,
    file: UploadFile = File(...),
    current_teacher: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    # 1. Verify assignment exists
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    # 2. Verify classroom ownership
    _verify_classroom_owned_by_teacher(db, assignment.classroom_id, current_teacher.id)

    # 3. MIME-type validation (content-type header + guessed from filename)
    content_type = file.content_type or ""
    guessed_type, _ = mimetypes.guess_type(file.filename or "")
    if content_type not in ALLOWED_MIME_TYPES and guessed_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PDF files are allowed. Received content-type: '{content_type}'",
        )

    # 4. Read file and validate size
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the {MAX_UPLOAD_BYTES // (1024*1024)} MB limit",
        )
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    # 5. Build a safe path and write to disk
    file_path = _safe_upload_path(file.filename or "upload.pdf", assignment_id)
    with open(file_path, "wb") as fp:
        fp.write(contents)

    # 6. Persist the path in the DB
    updated = crud.update_assignment_file_path(db, assignment_id, file_path)

    return {
        "message": "PDF uploaded successfully",
        "assignment_id": assignment_id,
        "file_path": updated.file_path,
        "size_bytes": len(contents),
    }


# ---------------------------------------------------------------------------
# Teacher: Create questions for an assignment
# ---------------------------------------------------------------------------
@router.post(
    "/{assignment_id}/questions",
    response_model=assignment_schemas.AssignmentQuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a question to an assignment (teacher only — must own the classroom)",
)
def create_question(
    assignment_id: int,
    question_in: assignment_schemas.AssignmentQuestionBase,
    current_teacher: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )
    _verify_classroom_owned_by_teacher(db, assignment.classroom_id, current_teacher.id)

    return crud.create_assignment_question(
        db,
        assignment_id=assignment_id,
        question_number=question_in.question_number,
        question_text=question_in.question_text,
        subject=question_in.subject,
        topic=question_in.topic,
    )


# ---------------------------------------------------------------------------
# Teacher: List questions for an assignment
# ---------------------------------------------------------------------------
@router.get(
    "/{assignment_id}/questions",
    response_model=List[assignment_schemas.AssignmentQuestionResponse],
    summary="List questions for an assignment (teacher only — must own the classroom)",
)
def list_questions(
    assignment_id: int,
    current_teacher: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )
    _verify_classroom_owned_by_teacher(db, assignment.classroom_id, current_teacher.id)
    return crud.get_questions_by_assignment(db, assignment_id)
