"""
Deterministic Teacher Analytics Service.

Calculates real, database-derived learning metrics for classrooms, assignments, topics, and student interventions.
No LLM reasoning or fake metrics are used.

Centralized Configuration Thresholds:
- LEVEL_3_THRESHOLD: Level 3 indicates practice quiz intervention required.
- LEVEL_4_THRESHOLD: Level 4 indicates teacher support required.
- DIFFICULT_QUESTION_THRESHOLD: Struggle percentage threshold (>= 50%).
- WEAK_TOPIC_AVG_LEVEL_THRESHOLD: Average level threshold (>= 2.0).
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from app.database import models, crud
from app.schemas import progress as progress_schemas

# Centralized Configurable Thresholds
LEVEL_3_THRESHOLD = 3
LEVEL_4_THRESHOLD = 4
DIFFICULT_QUESTION_THRESHOLD = 50.0  # % struggle threshold
WEAK_TOPIC_AVG_LEVEL_THRESHOLD = 2.0  # Avg level >= 2.0 indicates weak topic


def get_unique_student_count(
    db: Session, teacher_id: Optional[int] = None, classroom_id: Optional[int] = None
) -> int:
    """
    Count distinct student IDs enrolled in classroom(s).
    Prevents double-counting students who belong to multiple classrooms.
    """
    if classroom_id:
        classroom = crud.get_classroom(db, classroom_id)
        if not classroom:
            return 0
        return len(set(s.id for s in classroom.students))

    if teacher_id:
        classrooms = crud.get_classrooms_by_teacher(db, teacher_id)
        student_ids = set()
        for c in classrooms:
            for s in c.students:
                student_ids.add(s.id)
        return len(student_ids)

    return 0


def calculate_independent_completion(
    db: Session, classroom_id: Optional[int] = None, assignment_id: Optional[int] = None
) -> Optional[float]:
    """
    Calculate Independent Completion Percentage:
    (Students completing without Level 2/3/4 intervention / Total attempted students) * 100

    Returns None if no students have attempted yet.
    """
    query = db.query(models.StudentQuestionProgress)
    if classroom_id:
        query = query.filter(models.StudentQuestionProgress.classroom_id == classroom_id)
    if assignment_id:
        query = query.filter(models.StudentQuestionProgress.assignment_id == assignment_id)

    records = query.all()
    if not records:
        return None

    # Group max level reached per student
    student_max_levels: Dict[int, int] = {}
    for r in records:
        sid = r.student_id
        current_max = student_max_levels.get(sid, 1)
        student_max_levels[sid] = max(current_max, r.level)

    total_attempted = len(student_max_levels)
    if total_attempted == 0:
        return None

    independent_students = sum(
        1 for max_lvl in student_max_levels.values() if max_lvl == 1
    )
    return round((independent_students / total_attempted) * 100.0, 1)


def get_weak_topics(
    db: Session, classroom_id: Optional[int] = None, teacher_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Aggregate topic-level performance by (subject, topic).
    Identifies topics needing attention using deterministic rules.
    """
    query = db.query(models.StudentQuestionProgress)
    if classroom_id:
        query = query.filter(models.StudentQuestionProgress.classroom_id == classroom_id)
    elif teacher_id:
        teacher_classroom_ids = [
            c.id for c in crud.get_classrooms_by_teacher(db, teacher_id)
        ]
        if not teacher_classroom_ids:
            return []
        query = query.filter(models.StudentQuestionProgress.classroom_id.in_(teacher_classroom_ids))

    records = query.all()

    # Group by (subject, topic)
    grouped: Dict[tuple, List[models.StudentQuestionProgress]] = {}
    for r in records:
        if not r.topic:
            continue
        key = (r.subject or "General", r.topic)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(r)

    results = []
    for (subj, top), items in grouped.items():
        affected_students = len(set(r.student_id for r in items if r.level >= 2))
        avg_lvl = sum(r.level for r in items) / max(1, len(items))

        scores = [r.quiz_score for r in items if r.quiz_score is not None]
        avg_score = (sum(scores) / len(scores)) if scores else None

        if avg_lvl >= WEAK_TOPIC_AVG_LEVEL_THRESHOLD or affected_students > 0:
            results.append({
                "subject": subj,
                "topic": top,
                "affected_students": affected_students,
                "average_level": round(avg_lvl, 1),
                "average_quiz_score": round(avg_score, 1) if avg_score is not None else None,
            })

    # Sort descending by average_level and affected_students
    results.sort(key=lambda x: (x["average_level"], x["affected_students"]), reverse=True)
    return results


def get_weak_subjects(
    db: Session, classroom_id: Optional[int] = None, teacher_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Aggregate topic-level weakness by subject.
    """
    query = db.query(models.StudentQuestionProgress)
    if classroom_id:
        query = query.filter(models.StudentQuestionProgress.classroom_id == classroom_id)
    elif teacher_id:
        teacher_classroom_ids = [
            c.id for c in crud.get_classrooms_by_teacher(db, teacher_id)
        ]
        if not teacher_classroom_ids:
            return []
        query = query.filter(models.StudentQuestionProgress.classroom_id.in_(teacher_classroom_ids))

    records = query.all()

    grouped: Dict[str, List[models.StudentQuestionProgress]] = {}
    for r in records:
        subj = r.subject or "General"
        if subj not in grouped:
            grouped[subj] = []
        grouped[subj].append(r)

    results = []
    for subj, items in grouped.items():
        affected_students = len(set(r.student_id for r in items if r.level >= 2))
        avg_lvl = sum(r.level for r in items) / max(1, len(items))

        results.append({
            "subject": subj,
            "affected_students": affected_students,
            "average_level": round(avg_lvl, 1),
        })

    results.sort(key=lambda x: (x["average_level"], x["affected_students"]), reverse=True)
    return results


def get_difficult_questions(
    db: Session, classroom_id: Optional[int] = None, assignment_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Calculate struggle percentage for assignment questions:
    (Students with Level >= 3 / Total attempted students) * 100
    """
    query = db.query(models.StudentQuestionProgress)
    if assignment_id:
        query = query.filter(models.StudentQuestionProgress.assignment_id == assignment_id)
    elif classroom_id:
        query = query.filter(models.StudentQuestionProgress.classroom_id == classroom_id)

    records = query.all()

    # Group by question_id
    grouped: Dict[int, List[models.StudentQuestionProgress]] = {}
    for r in records:
        if not r.question_id:
            continue
        if r.question_id not in grouped:
            grouped[r.question_id] = []
        grouped[r.question_id].append(r)

    results = []
    for qid, items in grouped.items():
        q_obj = db.query(models.AssignmentQuestion).filter(models.AssignmentQuestion.id == qid).first()
        q_num = q_obj.question_number if q_obj else qid
        q_text = q_obj.question_text if q_obj else ""

        attempted_students = set(r.student_id for r in items)
        struggling_students = set(r.student_id for r in items if r.level >= LEVEL_3_THRESHOLD)

        attempts = len(attempted_students)
        struggle_count = len(struggling_students)
        pct = (struggle_count / max(1, attempts)) * 100.0

        subj = items[0].subject if items else (q_obj.subject if q_obj else None)
        top = items[0].topic if items else (q_obj.topic if q_obj else None)

        results.append({
            "question_id": qid,
            "question_number": q_num,
            "question_text": q_text,
            "subject": subj or "General",
            "topic": top or "General",
            "struggle_percentage": round(pct, 1),
            "attempts": attempts,
            "struggle_count": struggle_count,
        })

    results.sort(key=lambda x: x["struggle_percentage"], reverse=True)
    return results


def get_level3_students(
    db: Session, classroom_id: Optional[int] = None, teacher_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Return list of students with Level 3 records (requiring practice quiz / guided practice).
    """
    query = db.query(models.StudentQuestionProgress).filter(
        models.StudentQuestionProgress.level == LEVEL_3_THRESHOLD
    )
    if classroom_id:
        query = query.filter(models.StudentQuestionProgress.classroom_id == classroom_id)
    elif teacher_id:
        teacher_classroom_ids = [
            c.id for c in crud.get_classrooms_by_teacher(db, teacher_id)
        ]
        if not teacher_classroom_ids:
            return []
        query = query.filter(models.StudentQuestionProgress.classroom_id.in_(teacher_classroom_ids))

    records = query.all()
    results = []
    for r in records:
        student = crud.get_user(db, r.student_id)
        results.append({
            "student_id": r.student_id,
            "student_name": student.name if student else f"Student #{r.student_id}",
            "classroom_id": r.classroom_id,
            "assignment_id": r.assignment_id,
            "question_id": r.question_id,
            "subject": r.subject,
            "topic": r.topic,
            "level": r.level,
        })
    return results


def get_level4_students(
    db: Session, classroom_id: Optional[int] = None, teacher_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Return list of students with Level 4 records (teacher support recommended).
    """
    query = db.query(models.StudentQuestionProgress).filter(
        (models.StudentQuestionProgress.level == LEVEL_4_THRESHOLD)
        | (models.StudentQuestionProgress.teacher_intimated == True)
    )
    if classroom_id:
        query = query.filter(models.StudentQuestionProgress.classroom_id == classroom_id)
    elif teacher_id:
        teacher_classroom_ids = [
            c.id for c in crud.get_classrooms_by_teacher(db, teacher_id)
        ]
        if not teacher_classroom_ids:
            return []
        query = query.filter(models.StudentQuestionProgress.classroom_id.in_(teacher_classroom_ids))

    records = query.all()
    results = []
    for r in records:
        student = crud.get_user(db, r.student_id)
        results.append({
            "student_id": r.student_id,
            "student_name": student.name if student else f"Student #{r.student_id}",
            "classroom_id": r.classroom_id,
            "assignment_id": r.assignment_id,
            "question_id": r.question_id,
            "subject": r.subject,
            "topic": r.topic,
            "level": r.level,
            "priority": r.attention_priority,
        })
    return results


def get_assignment_analytics(db: Session, assignment_id: int) -> Dict[str, Any]:
    """
    Deterministic assignment analytics summary.
    """
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        return {}

    total_questions = len(assignment.questions)
    progress_records = (
        db.query(models.StudentQuestionProgress)
        .filter(models.StudentQuestionProgress.assignment_id == assignment_id)
        .all()
    )
    attempted_student_ids = set(r.student_id for r in progress_records)

    indep_pct = calculate_independent_completion(db, assignment_id=assignment_id)
    diff_questions = get_difficult_questions(db, assignment_id=assignment_id)
    weak_tops = get_weak_topics(db, classroom_id=assignment.classroom_id)
    level3 = get_level3_students(db, classroom_id=assignment.classroom_id)
    level4 = get_level4_students(db, classroom_id=assignment.classroom_id)

    return {
        "assignment_id": assignment_id,
        "title": assignment.title,
        "total_questions": total_questions,
        "students_attempted": len(attempted_student_ids),
        "independent_completion_percentage": indep_pct,
        "difficult_questions": diff_questions,
        "weak_topics": weak_tops,
        "level3_count": len(level3),
        "level4_count": len(level4),
    }


def get_classroom_analytics(
    db: Session, classroom_id: int
) -> progress_schemas.ClassroomAnalytics:
    """
    Fully deterministic classroom analytics calculation for API route.
    """
    classroom = crud.get_classroom(db, classroom_id)
    if not classroom:
        return progress_schemas.ClassroomAnalytics(classroom_id=classroom_id)

    total_students = get_unique_student_count(db, classroom_id=classroom_id)
    progress_records = crud.get_classroom_progress_summary(db, classroom_id)

    level_dist = {"level_1": 0, "level_2": 0, "level_3": 0, "level_4": 0}
    for r in progress_records:
        key = f"level_{r.level}"
        if key in level_dist:
            level_dist[key] += 1

    indep_pct = calculate_independent_completion(db, classroom_id=classroom_id)
    weak_topic_objs = get_weak_topics(db, classroom_id=classroom_id)
    weak_topic_names = [t["topic"] for t in weak_topic_objs]

    # Generate high_attention_students list from Level 3/4 progress
    high_att_students_list = []
    level4_students = get_level4_students(db, classroom_id=classroom_id)
    for s_info in level4_students:
        high_att_students_list.append(
            progress_schemas.StudentProgressSummary(
                student_id=s_info["student_id"],
                name=s_info["student_name"],
                level_1_count=0,
                level_2_count=0,
                level_3_count=0,
                level_4_count=1,
                risk_level="high",
            )
        )

    return progress_schemas.ClassroomAnalytics(
        classroom_id=classroom_id,
        total_students=total_students,
        independent_completion_percentage=indep_pct if indep_pct is not None else 100.0,
        level_distribution=level_dist,
        weak_topics=weak_topic_names,
        high_attention_students=high_att_students_list,
    )
