from sqlalchemy.orm import Session
from app.database import models, crud
from app.schemas import classroom as classroom_schemas

def create_new_classroom(db: Session, classroom: classroom_schemas.ClassroomCreate, teacher_id: int):
    return crud.create_classroom(db, classroom.name, classroom.description, teacher_id)

def get_classroom_details(db: Session, classroom_id: int):
    return crud.get_classroom(db, classroom_id)

def enroll_student(db: Session, classroom_id: int, student_id: int):
    return crud.enroll_student(db, classroom_id, student_id)

