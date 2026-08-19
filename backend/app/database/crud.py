from typing import List, Optional
from sqlalchemy.orm import Session
from app.database import models
from app.schemas import auth as auth_schema
from app.core.security import get_password_hash

# ==================== Users CRUD ====================
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: auth_schema.UserCreate) -> models.User:
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ==================== Classrooms CRUD ====================
def get_classroom(db: Session, classroom_id: int) -> Optional[models.Classroom]:
    return db.query(models.Classroom).filter(models.Classroom.id == classroom_id).first()

def get_classrooms_by_teacher(db: Session, teacher_id: int) -> List[models.Classroom]:
    return db.query(models.Classroom).filter(models.Classroom.teacher_id == teacher_id).all()

def get_classrooms_by_student(db: Session, student_id: int) -> List[models.Classroom]:
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if student:
        return student.enrolled_classrooms
    return []

def create_classroom(db: Session, name: str, description: Optional[str], teacher_id: int) -> models.Classroom:
    db_classroom = models.Classroom(
        name=name,
        description=description,
        teacher_id=teacher_id
    )
    db.add(db_classroom)
    db.commit()
    db.refresh(db_classroom)
    return db_classroom

def enroll_student(db: Session, classroom_id: int, student_id: int) -> Optional[models.Classroom]:
    classroom = get_classroom(db, classroom_id)
    student = get_user(db, student_id)
    if classroom and student and student.role == "student":
        if student not in classroom.students:
            classroom.students.append(student)
            db.commit()
            db.refresh(classroom)
    return classroom

# ==================== Assignments CRUD ====================
def get_assignment(db: Session, assignment_id: int) -> Optional[models.Assignment]:
    return db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()

def get_assignments_by_classroom(db: Session, classroom_id: int) -> List[models.Assignment]:
    return db.query(models.Assignment).filter(models.Assignment.classroom_id == classroom_id).all()

def create_assignment(
    db: Session,
    title: str,
    description: Optional[str],
    classroom_id: int,
    file_path: Optional[str] = None,
    due_date=None
) -> models.Assignment:
    db_assignment = models.Assignment(
        title=title,
        description=description,
        classroom_id=classroom_id,
        file_path=file_path,
        due_date=due_date
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

# ==================== Assignment Questions CRUD ====================
def get_questions_by_assignment(db: Session, assignment_id: int) -> List[models.AssignmentQuestion]:
    return db.query(models.AssignmentQuestion).filter(
        models.AssignmentQuestion.assignment_id == assignment_id
    ).order_by(models.AssignmentQuestion.question_number).all()

def create_assignment_question(
    db: Session,
    assignment_id: int,
    question_number: int,
    question_text: str,
    subject: Optional[str] = None,
    topic: Optional[str] = None
) -> models.AssignmentQuestion:
    question = models.AssignmentQuestion(
        assignment_id=assignment_id,
        question_number=question_number,
        question_text=question_text,
        subject=subject,
        topic=topic
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

# ==================== Submissions CRUD ====================
def get_submission(db: Session, assignment_id: int, student_id: int) -> Optional[models.Submission]:
    return db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id,
        models.Submission.student_id == student_id
    ).first()

def create_submission(db: Session, assignment_id: int, student_id: int) -> models.Submission:
    submission = get_submission(db, assignment_id, student_id)
    if not submission:
        submission = models.Submission(
            assignment_id=assignment_id,
            student_id=student_id,
            status="submitted"
        )
        db.add(submission)
    else:
        submission.status = "submitted"
    db.commit()
    db.refresh(submission)
    return submission

def update_submission_grade(
    db: Session,
    submission_id: int,
    grade: float,
    feedback: Optional[str] = None
) -> Optional[models.Submission]:
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if submission:
        submission.grade = grade
        submission.feedback = feedback
        submission.status = "graded"
        db.commit()
        db.refresh(submission)
    return submission

# ==================== Student Question Progress CRUD ====================
def get_question_progress(db: Session, student_id: int, question_id: int) -> Optional[models.StudentQuestionProgress]:
    return db.query(models.StudentQuestionProgress).filter(
        models.StudentQuestionProgress.student_id == student_id,
        models.StudentQuestionProgress.question_id == question_id
    ).first()

def get_or_create_question_progress(
    db: Session,
    student_id: int,
    question_id: Optional[int],
    assignment_id: int,
    classroom_id: int,
    subject: Optional[str] = None,
    topic: Optional[str] = None
) -> models.StudentQuestionProgress:
    progress = None
    if question_id:
        progress = get_question_progress(db, student_id, question_id)
    
    if not progress:
        progress = models.StudentQuestionProgress(
            classroom_id=classroom_id,
            assignment_id=assignment_id,
            question_id=question_id,
            student_id=student_id,
            subject=subject,
            topic=topic,
            level=1
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress

def update_question_level(
    db: Session,
    progress_id: int,
    level: int,
    attention_priority: str = "normal",
    teacher_intimated: bool = False
) -> Optional[models.StudentQuestionProgress]:
    progress = db.query(models.StudentQuestionProgress).filter(
        models.StudentQuestionProgress.id == progress_id
    ).first()
    if progress:
        progress.level = level
        progress.attention_priority = attention_priority
        progress.teacher_intimated = teacher_intimated
        db.commit()
        db.refresh(progress)
    return progress

def record_initial_attempt(db: Session, progress_id: int, attempt_text: str) -> Optional[models.StudentQuestionProgress]:
    progress = db.query(models.StudentQuestionProgress).filter(
        models.StudentQuestionProgress.id == progress_id
    ).first()
    if progress:
        progress.initial_attempt = attempt_text
        db.commit()
        db.refresh(progress)
    return progress

def update_quiz_score(db: Session, progress_id: int, quiz_score: float) -> Optional[models.StudentQuestionProgress]:
    progress = db.query(models.StudentQuestionProgress).filter(
        models.StudentQuestionProgress.id == progress_id
    ).first()
    if progress:
        progress.quiz_score = quiz_score
        db.commit()
        db.refresh(progress)
    return progress

def get_assignment_progress_for_student(db: Session, student_id: int, assignment_id: int) -> List[models.StudentQuestionProgress]:
    return db.query(models.StudentQuestionProgress).filter(
        models.StudentQuestionProgress.student_id == student_id,
        models.StudentQuestionProgress.assignment_id == assignment_id
    ).all()

def get_classroom_progress_summary(db: Session, classroom_id: int) -> List[models.StudentQuestionProgress]:
    return db.query(models.StudentQuestionProgress).filter(
        models.StudentQuestionProgress.classroom_id == classroom_id
    ).all()

# ==================== Quiz Attempts CRUD ====================
def create_quiz_attempt(
    db: Session,
    student_id: int,
    assignment_id: int,
    topic: Optional[str],
    quiz_question: str,
    student_answer: Optional[str] = None,
    correct: Optional[bool] = None,
    score: Optional[float] = None,
    question_id: Optional[int] = None
) -> models.QuizAttempt:
    attempt = models.QuizAttempt(
        student_id=student_id,
        assignment_id=assignment_id,
        question_id=question_id,
        topic=topic,
        quiz_question=quiz_question,
        student_answer=student_answer,
        correct=correct,
        score=score
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt

def get_quiz_attempts_by_student_assignment(db: Session, student_id: int, assignment_id: int) -> List[models.QuizAttempt]:
    return db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student_id,
        models.QuizAttempt.assignment_id == assignment_id
    ).all()

# ==================== Teacher Notifications CRUD ====================
def create_teacher_notification(
    db: Session,
    teacher_id: int,
    student_id: int,
    classroom_id: int,
    message: str,
    assignment_id: Optional[int] = None,
    question_id: Optional[int] = None,
    topic: Optional[str] = None,
    level: Optional[int] = None,
    priority: str = "normal"
) -> models.TeacherNotification:
    notification = models.TeacherNotification(
        teacher_id=teacher_id,
        student_id=student_id,
        classroom_id=classroom_id,
        assignment_id=assignment_id,
        question_id=question_id,
        topic=topic,
        level=level,
        priority=priority,
        message=message
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def get_unread_notifications(db: Session, teacher_id: int) -> List[models.TeacherNotification]:
    return db.query(models.TeacherNotification).filter(
        models.TeacherNotification.teacher_id == teacher_id,
        models.TeacherNotification.is_read == False
    ).order_by(models.TeacherNotification.created_at.desc()).all()

def mark_notification_read(db: Session, notification_id: int) -> Optional[models.TeacherNotification]:
    notification = db.query(models.TeacherNotification).filter(
        models.TeacherNotification.id == notification_id
    ).first()
    if notification:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
    return notification
