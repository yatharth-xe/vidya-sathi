from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table, DateTime, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

# Association table for Student-Classroom enrollment (Many-to-Many)
classroom_student_association = Table(
    "classroom_members",
    Base.metadata,
    Column("classroom_id", Integer, ForeignKey("classrooms.id", ondelete="CASCADE"), primary_key=True),
    Column("student_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False) # "student" or "teacher"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    taught_classrooms = relationship("Classroom", back_populates="teacher")
    enrolled_classrooms = relationship("Classroom", secondary=classroom_student_association, back_populates="students")
    submissions = relationship("Submission", back_populates="student")
    question_progress = relationship("StudentQuestionProgress", back_populates="student")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")
    notifications = relationship("TeacherNotification", foreign_keys="TeacherNotification.student_id", back_populates="student")

class Classroom(Base):
    __tablename__ = "classrooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    teacher = relationship("User", back_populates="taught_classrooms")
    students = relationship("User", secondary=classroom_student_association, back_populates="enrolled_classrooms")
    assignments = relationship("Assignment", back_populates="classroom")
    question_progress = relationship("StudentQuestionProgress", back_populates="classroom")
    notifications = relationship("TeacherNotification", back_populates="classroom")

class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String, nullable=True) # PDF resources path
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    classroom = relationship("Classroom", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")
    questions = relationship("AssignmentQuestion", back_populates="assignment", cascade="all, delete-orphan")
    question_progress = relationship("StudentQuestionProgress", back_populates="assignment")
    quiz_attempts = relationship("QuizAttempt", back_populates="assignment")
    notifications = relationship("TeacherNotification", back_populates="assignment")

class AssignmentQuestion(Base):
    __tablename__ = "assignment_questions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    subject = Column(String, nullable=True)
    topic = Column(String, nullable=True)

    # Relationships
    assignment = relationship("Assignment", back_populates="questions")
    question_progress = relationship("StudentQuestionProgress", back_populates="question")
    quiz_attempts = relationship("QuizAttempt", back_populates="question")

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    grade = Column(Float, nullable=True)
    status = Column(String, default="pending") # "pending", "submitted", "graded"
    feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")

class StudentQuestionProgress(Base):
    __tablename__ = "student_question_progress"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("assignment_questions.id", ondelete="CASCADE"), nullable=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    level = Column(Integer, default=1) # 1=conceptual, 2=needs hints, 3=practice quiz, 4=high risk
    teacher_intimated = Column(Boolean, default=False)
    attention_priority = Column(String, default="normal") # "normal", "high"
    initial_attempt = Column(Text, nullable=True)
    quiz_score = Column(Float, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    classroom = relationship("Classroom", back_populates="question_progress")
    assignment = relationship("Assignment", back_populates="question_progress")
    question = relationship("AssignmentQuestion", back_populates="question_progress")
    student = relationship("User", back_populates="question_progress")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("assignment_questions.id", ondelete="CASCADE"), nullable=True)
    topic = Column(String, nullable=True)
    quiz_question = Column(Text, nullable=False)
    student_answer = Column(String, nullable=True)
    correct = Column(Boolean, nullable=True)
    score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("User", back_populates="quiz_attempts")
    assignment = relationship("Assignment", back_populates="quiz_attempts")
    question = relationship("AssignmentQuestion", back_populates="quiz_attempts")

class TeacherNotification(Base):
    __tablename__ = "teacher_notifications"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=True)
    question_id = Column(Integer, ForeignKey("assignment_questions.id", ondelete="CASCADE"), nullable=True)
    topic = Column(String, nullable=True)
    level = Column(Integer, nullable=True)
    priority = Column(String, default="normal") # "normal", "high"
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("User", foreign_keys=[student_id], back_populates="notifications")
    classroom = relationship("Classroom", back_populates="notifications")
    assignment = relationship("Assignment", back_populates="notifications")
