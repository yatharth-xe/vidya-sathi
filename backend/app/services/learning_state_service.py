"""Learning State Service — the ONLY bridge between agent tools and progress CRUD.

Two-track level model:
  TRACK 1 (conversational): Student Agent assesses the doubt interaction and
  persists a level 1-4 through :func:`upsert_student_learning_state`.
  TRACK 2 (quiz): ``quiz_service.evaluate_quiz_performance`` is authoritative;
  quiz-determined states can NEVER be overwritten by Track 1.

Security properties:
- student_id comes exclusively from the authenticated backend context
  (injected trusted scope), never from the LLM.
- Full authorization chain re-validated here (defense in depth):
  enrollment -> assignment-in-classroom -> question-in-assignment.
- Writes restricted to: level, topic, subject(trusted only).
  Never: quiz_score, teacher_intimated, attention_priority, initial_attempt,
  teacher notifications.
- Agents never see raw SQL / SQLAlchemy sessions.
"""
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.database import crud, models


_LEVELS = (1, 2, 3, 4)


def upsert_student_learning_state(
    db: Optional[Session] = None,
    *,
    student_id: int,
    classroom_id: int,
    assignment_id: int,
    question_id: int,
    level: int,
    topic: Optional[str] = None,
    trusted_subject: Optional[str] = None,
) -> Dict[str, Any]:
    """Create/update the AUTHENTICATED student's conversational learning state.

    Returns a structured dict; NEVER raises for business-rule rejections.
    If ``db`` is None a session is created and closed internally (tool path).
    """
    owns_session = db is None
    if owns_session:
        from app.database.database import SessionLocal

        db = SessionLocal()
    try:
        return _upsert(
            db,
            student_id=student_id,
            classroom_id=classroom_id,
            assignment_id=assignment_id,
            question_id=question_id,
            level=level,
            topic=topic,
            trusted_subject=trusted_subject,
        )
    finally:
        if owns_session:
            db.close()


def get_classroom_progress_for_teacher(
    db: Optional[Session] = None,
    *,
    teacher_id: int,
    classroom_id: int,
    assignment_id: Optional[int] = None,
    topic: Optional[str] = None,
    level: Optional[int] = None,
) -> Dict[str, Any]:
    """READ-ONLY bridge for the Teacher Agent's ``get_student_progress`` tool.

    Authorization: the classroom MUST belong to ``teacher_id`` (verified
    here, independent of routes). Returns whitelisted progress fields only;
    never mutates anything.
    """
    owns_session = db is None
    if owns_session:
        from app.database.database import SessionLocal

        db = SessionLocal()
    try:
        if not isinstance(teacher_id, int) or not isinstance(classroom_id, int):
            return {"status": "rejected", "reason": "invalid_identifiers"}
        if level is not None and level not in _LEVELS:
            return {"status": "rejected", "reason": "invalid_level"}

        classroom = db.query(models.Classroom).filter(
            models.Classroom.id == classroom_id).first()
        if not classroom:
            return {"status": "rejected", "reason": "classroom_not_found"}
        if classroom.teacher_id != teacher_id:
            return {"status": "rejected", "reason": "not_classroom_owner"}

        rows = crud.get_classroom_progress_summary(db, classroom_id)
        records: list[Dict[str, Any]] = []
        for row in rows:
            if assignment_id is not None and row.assignment_id != assignment_id:
                continue
            if topic and (row.topic or "").lower() != topic.lower():
                continue
            if level is not None and row.level != level:
                continue
            user = crud.get_user(db, row.student_id)
            records.append({
                "student_id": row.student_id,
                "student_name": user.name if user else None,
                "classroom_id": row.classroom_id,
                "assignment_id": row.assignment_id,
                "question_id": row.question_id,
                "topic": row.topic,
                "subject": row.subject,
                "level": row.level,
                "quiz_score": row.quiz_score,
                "attention_priority": row.attention_priority,
                "teacher_intimated": bool(row.teacher_intimated),
                "updated_at": (
                    row.updated_at.isoformat() if row.updated_at else None),
            })

        return {"status": "ok", "count": len(records), "records": records}
    finally:
        if owns_session:
            db.close()


def _reject(reason: str, **extra: Any) -> Dict[str, Any]:
    return {"status": "rejected", "reason": reason, **extra}


def _upsert(
    db: Session,
    *,
    student_id: int,
    classroom_id: int,
    assignment_id: int,
    question_id: int,
    level: int,
    topic: Optional[str],
    trusted_subject: Optional[str],
) -> Dict[str, Any]:
    # --- 1. Argument sanity -------------------------------------------------
    if not all(isinstance(v, int) for v in (
            student_id, classroom_id, assignment_id, question_id)):
        return _reject("invalid_identifiers")
    if level not in _LEVELS:
        return _reject("invalid_level")

    # --- 2. Authorization chain (re-validated, independent of routes) -------
    if not crud.is_student_enrolled(db, student_id, classroom_id):
        return _reject("not_enrolled")

    assignment = crud.get_assignment(db, assignment_id)
    if not assignment or assignment.classroom_id != classroom_id:
        return _reject("assignment_classroom_mismatch")

    question = db.query(crud.models.AssignmentQuestion).filter(
        crud.models.AssignmentQuestion.id == question_id,
        crud.models.AssignmentQuestion.assignment_id == assignment_id,
    ).first()
    if not question:
        return _reject("question_assignment_mismatch")

    # --- 3. Locate existing state -------------------------------------------
    existing = crud.get_question_progress(db, student_id, question_id)
    if existing and (existing.classroom_id != classroom_id
                     or existing.assignment_id != assignment_id):
        # Row exists but under another scope -> never touch it.
        return _reject("scope_mismatch")

    # --- 4. QUIZ AUTHORITY GUARD --------------------------------------------
    # A row with a quiz score is backend-authoritative (Track 2). The
    # conversational tool may not overwrite it.
    if existing is not None and existing.quiz_score is not None:
        return _reject(
            "quiz_authoritative_state",
            record_id=existing.id,
            level=existing.level,
            quiz_score=existing.quiz_score,
        )

    # --- 5. Persist (existing CRUD only) -------------------------------------
    progress = crud.get_or_create_question_progress(
        db,
        student_id=student_id,
        question_id=question_id,
        assignment_id=assignment_id,
        classroom_id=classroom_id,
        subject=trusted_subject,
        topic=topic,
    )
    created = existing is None

    # Preserve fields owned by other workflows; only touch permitted ones.
    crud.update_question_level(
        db,
        progress_id=progress.id,
        level=level,
        attention_priority=progress.attention_priority or "normal",
        teacher_intimated=bool(progress.teacher_intimated),
    )

    # Refresh and apply optional permitted field updates (never quiz fields).
    fresh = crud.get_question_progress(db, student_id, question_id)
    if fresh is not None:
        changed = False
        if topic and fresh.topic != topic:
            fresh.topic = topic
            changed = True
        if trusted_subject and fresh.subject != trusted_subject:
            fresh.subject = trusted_subject
            changed = True
        if changed:
            db.commit()
            db.refresh(fresh)
        progress = fresh

    return {
        "status": "created" if created else "updated",
        "record_id": progress.id,
        "student_id": student_id,
        "classroom_id": classroom_id,
        "assignment_id": assignment_id,
        "question_id": question_id,
        "level": progress.level,
        "topic": progress.topic,
    }
