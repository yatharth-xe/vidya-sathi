from sqlalchemy.orm import Session
from app.database import models, crud
from app.schemas import assignment as assignment_schemas

def create_new_assignment(db: Session, assignment: assignment_schemas.AssignmentCreate, file_path: str = None):
    return crud.create_assignment(
        db,
        assignment.title,
        assignment.description,
        assignment.classroom_id,
        file_path,
        assignment.due_date
    )

def submit_student_assignment(db: Session, submission: assignment_schemas.SubmissionCreate, student_id: int):
    return crud.create_submission(db, submission.assignment_id, student_id)


def grade_submission(db: Session, submission_id: int, grade: float, feedback: str):
    db_submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if db_submission:
        db_submission.grade = grade
        db_submission.feedback = feedback
        db_submission.status = "graded"
        db.commit()
        db.refresh(db_submission)
    return db_submission
