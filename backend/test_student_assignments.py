from app.database.database import SessionLocal
from app.database import crud, models
db = SessionLocal()
classrooms = crud.get_classrooms_by_student(db, 1) # assuming student id 1
for c in classrooms:
    assignments = crud.get_assignments_by_classroom(db, c.id)
    for a in assignments:
        print(f"Assignment ID: {a.id}, Title: {a.title}, Classroom ID: {a.classroom_id}")
