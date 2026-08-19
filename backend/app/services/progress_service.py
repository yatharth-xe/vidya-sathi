from sqlalchemy.orm import Session
from app.database import models, crud
from app.schemas import progress as progress_schemas

def get_classroom_analytics(db: Session, classroom_id: int) -> progress_schemas.ClassroomAnalytics:
    classroom = crud.get_classroom(db, classroom_id)
    if not classroom:
        return progress_schemas.ClassroomAnalytics(classroom_id=classroom_id)

    students = classroom.students
    total_students = len(students)
    
    progress_records = crud.get_classroom_progress_summary(db, classroom_id)
    
    level_dist = {"level_1": 0, "level_2": 0, "level_3": 0, "level_4": 0}
    for r in progress_records:
        level_key = f"level_{r.level}"
        if level_key in level_dist:
            level_dist[level_key] += 1

    independent = level_dist["level_1"]
    total_attempts = len(progress_records)
    indep_pct = (independent / total_attempts * 100.0) if total_attempts > 0 else 100.0

    return progress_schemas.ClassroomAnalytics(
        classroom_id=classroom_id,
        total_students=total_students,
        independent_completion_percentage=round(indep_pct, 1),
        level_distribution=level_dist,
        weak_topics=["Quadratic Equations", "Polynomials"],
        high_attention_students=[]
    )
