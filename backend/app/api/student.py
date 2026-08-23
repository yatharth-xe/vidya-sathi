"""
Student-facing routes for assignments and practice quizzes.

Security model
--------------
* Student identity is always derived from the JWT (get_current_student).
* Membership in the classroom that owns the assignment is verified before
  exposing any assignment data or serving the PDF.
* Students cannot access assignments from classrooms they are not enrolled in.
"""
import os
import random
from typing import List, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_student
from app.database import models, crud
from app.schemas import assignment as assignment_schemas
from app.schemas import progress as progress_schemas
from app.schemas import quiz as quiz_schemas
from app.services import quiz_service

router = APIRouter(prefix="/student", tags=["student"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _verify_student_enrolled(
    db: Session,
    student_id: int,
    classroom_id: int,
) -> None:
    """Raise 403 if the student is not enrolled in the classroom."""
    if not crud.is_student_enrolled(db, student_id, classroom_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You are not enrolled in the classroom that owns this assignment",
        )


def _get_assignment_or_404(db: Session, assignment_id: int) -> models.Assignment:
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )
    return assignment


# ---------------------------------------------------------------------------
# In-memory Quiz Bank & Truth Store for evaluation
# ---------------------------------------------------------------------------
QUIZ_ANSWER_KEYS: Dict[int, str] = {}  # question_id -> correct_option ('A', 'B', 'C', 'D')


def _generate_5_practice_questions(topic: str) -> tuple[List[quiz_schemas.PracticeQuizQuestion], Dict[int, str]]:
    """
    Generate 5 topic-focused practice questions.
    Returns:
        (public_questions_without_answers, answer_keys_map)
    """
    topic_clean = (topic or "General Concepts").strip()
    questions_public = []
    answers_map = {}

    # Template question bank based on topic
    sample_templates = [
        {
            "text": f"What is the first step in solving a problem related to {topic_clean}?",
            "a": "Isolate the main variables and simplify expressions",
            "b": "Multiply all constants by zero",
            "c": "Ignore the given parameters",
            "d": "Assume all values are equal to 1",
            "correct": "A",
        },
        {
            "text": f"Which parameter is critical when analyzing {topic_clean}?",
            "a": "The independent variable relationship",
            "b": "The color of the textbook diagram",
            "c": "The page length of the chapter",
            "d": "Random numerical constant",
            "correct": "A",
        },
        {
            "text": f"In {topic_clean}, what does a balanced equation/formula represent?",
            "a": "An exact relationship where left and right expressions are equal",
            "b": "An approximate guess without mathematical proof",
            "c": "A list of unrelated numbers",
            "d": "A non-linear scale factor",
            "correct": "A",
        },
        {
            "text": f"When evaluating a secondary condition in {topic_clean}, which property applies?",
            "a": "The associative and distributive laws of operations",
            "b": "The random permutation rule",
            "c": "The constant inversion paradox",
            "d": "The null substitution rule",
            "correct": "A",
        },
        {
            "text": f"What is the recommended verification step after solving a question in {topic_clean}?",
            "a": "Substitute the calculated result back into the original condition",
            "b": "Delete the working steps",
            "c": "Round all values to zero",
            "d": "Change the question variables",
            "correct": "A",
        },
    ]

    base_id = random.randint(1000, 9000) * 10
    for idx, item in enumerate(sample_templates):
        q_id = base_id + idx + 1
        questions_public.append(
            quiz_schemas.PracticeQuizQuestion(
                id=q_id,
                question_text=item["text"],
                option_a=item["a"],
                option_b=item["b"],
                option_c=item["c"],
                option_d=item["d"],
            )
        )
        answers_map[q_id] = item["correct"]

    return questions_public, answers_map


# ---------------------------------------------------------------------------
# Student: List assignments for enrolled classrooms
# ---------------------------------------------------------------------------
@router.get(
    "/assignments",
    response_model=List[assignment_schemas.AssignmentResponse],
    summary="List assignments for all classrooms the student is enrolled in",
)
def list_student_assignments(
    current_student: models.User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    enrolled = crud.get_classrooms_by_student(db, current_student.id)
    assignments: List[models.Assignment] = []
    for classroom in enrolled:
        assignments.extend(crud.get_assignments_by_classroom(db, classroom.id))
    return assignments


# ---------------------------------------------------------------------------
# Student: Get a single assignment
# ---------------------------------------------------------------------------
@router.get(
    "/assignments/{assignment_id}",
    response_model=assignment_schemas.AssignmentResponse,
    summary="Get assignment details (student must be enrolled in the owning classroom)",
)
def get_student_assignment(
    assignment_id: int,
    current_student: models.User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    assignment = _get_assignment_or_404(db, assignment_id)
    _verify_student_enrolled(db, current_student.id, assignment.classroom_id)
    return assignment


# ---------------------------------------------------------------------------
# Student: Download / view the assignment PDF
# ---------------------------------------------------------------------------
@router.get(
    "/assignments/{assignment_id}/file",
    summary="Download the assignment PDF (student must be enrolled in the owning classroom)",
)
def get_assignment_file(
    assignment_id: int,
    current_student: models.User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    assignment = _get_assignment_or_404(db, assignment_id)
    _verify_student_enrolled(db, current_student.id, assignment.classroom_id)

    if not assignment.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No PDF has been uploaded for this assignment yet",
        )

    if not os.path.isfile(assignment.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found on server. It may have been removed.",
        )

    return FileResponse(
        path=assignment.file_path,
        media_type="application/pdf",
        filename=os.path.basename(assignment.file_path),
    )


# ---------------------------------------------------------------------------
# Student: Progress
# ---------------------------------------------------------------------------
@router.get(
    "/progress/{assignment_id}",
    response_model=List[progress_schemas.StudentQuestionProgressResponse],
    summary="Get the authenticated student's progress for an assignment",
)
def get_progress(
    assignment_id: int,
    current_student: models.User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    assignment = _get_assignment_or_404(db, assignment_id)
    _verify_student_enrolled(db, current_student.id, assignment.classroom_id)
    return crud.get_assignment_progress_for_student(db, current_student.id, assignment_id)


# ---------------------------------------------------------------------------
# Level 3 Practice Quiz Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/quiz/start",
    response_model=quiz_schemas.PracticeQuizStartResponse,
    summary="Start Level 3 Practice Quiz for a topic",
)
def start_practice_quiz(
    request: quiz_schemas.PracticeQuizStartRequest,
    current_student: models.User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Start a practice quiz session with 5 questions.
    Security: student_id is derived from JWT.
    Classroom membership & assignment validity are verified.
    IMPORTANT: Questions returned do NOT contain correct_option!
    """
    assignment = _get_assignment_or_404(db, request.assignment_id)
    _verify_student_enrolled(db, current_student.id, assignment.classroom_id)

    topic = request.topic or "General Concepts"
    questions_public, answers_map = _generate_5_practice_questions(topic)

    # Store answer keys in backend truth map
    for q_id, correct_opt in answers_map.items():
        QUIZ_ANSWER_KEYS[q_id] = correct_opt

    quiz_id = random.randint(10000, 99999)

    return quiz_schemas.PracticeQuizStartResponse(
        quiz_id=quiz_id,
        assignment_id=request.assignment_id,
        question_id=request.question_id,
        topic=topic,
        questions=questions_public,
    )


@router.post(
    "/quiz/submit",
    response_model=quiz_schemas.PracticeQuizResultResponse,
    summary="Submit Practice Quiz answers and evaluate result",
)
def submit_practice_quiz(
    request: quiz_schemas.PracticeQuizSubmitRequest,
    current_student: models.User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Submit and evaluate 5 practice quiz answers.
    Backend performs evaluation, stores QuizAttempt rows, updates StudentQuestionProgress,
    and creates TeacherNotification if score < 60%.
    """
    assignment = _get_assignment_or_404(db, request.assignment_id)
    _verify_student_enrolled(db, current_student.id, assignment.classroom_id)

    correct_count = 0
    total = len(request.answers) if request.answers else 5

    for item in request.answers:
        # Get correct answer from backend truth map (fallback to 'A')
        expected = QUIZ_ANSWER_KEYS.get(item.question_id, "A")
        is_correct = (item.selected_option.upper() == expected.upper())
        if is_correct:
            correct_count += 1

        # Persist QuizAttempt in DB
        crud.create_quiz_attempt(
            db,
            student_id=current_student.id,
            assignment_id=request.assignment_id,
            question_id=request.question_id,
            topic=request.topic,
            quiz_question=f"Question {item.question_id}",
            student_answer=item.selected_option,
            correct=is_correct,
            score=1.0 if is_correct else 0.0,
        )

    percentage = round((correct_count / max(1, total)) * 100.0, 1)

    # Centralized Level Transition Policy (app/services/quiz_service.py)
    new_level, teacher_intimated, recommendation = quiz_service.evaluate_quiz_performance(
        score=correct_count,
        total=total,
    )

    # Update or create progress in DB
    existing_progress = crud.get_or_create_question_progress(
        db,
        student_id=current_student.id,
        question_id=request.question_id,
        assignment_id=request.assignment_id,
        classroom_id=assignment.classroom_id,
        topic=request.topic,
    )

    if existing_progress:
        crud.update_question_level(
            db,
            progress_id=existing_progress.id,
            level=new_level,
            attention_priority="high" if new_level == 4 else "normal",
            teacher_intimated=teacher_intimated,
        )
        crud.update_quiz_score(db, progress_id=existing_progress.id, quiz_score=percentage)

    # Create teacher notification if student score < 60%
    if teacher_intimated:
        crud.create_teacher_notification(
            db,
            teacher_id=assignment.classroom.teacher_id,
            student_id=current_student.id,
            classroom_id=assignment.classroom_id,
            assignment_id=request.assignment_id,
            question_id=request.question_id,
            topic=request.topic,
            level=4,
            priority="high",
            message=f"Student '{current_student.name}' scored {percentage}% on practice quiz for topic '{request.topic or 'General'}'. Teacher support recommended.",
        )

    return quiz_schemas.PracticeQuizResultResponse(
        quiz_id=request.quiz_id,
        score=correct_count,
        total_questions=total,
        percentage=percentage,
        topic=request.topic,
        level=new_level,
        teacher_intimated=teacher_intimated,
        recommendation=recommendation,
    )
