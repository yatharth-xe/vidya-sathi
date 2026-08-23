import unittest

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database.database import Base
    from app.database import models, crud
    from app.schemas import user as user_schema, classroom as classroom_schema
    HAS_SQLALCHEMY = True
except ImportError:
    HAS_SQLALCHEMY = False

@unittest.skipUnless(HAS_SQLALCHEMY, "SQLAlchemy is not installed in the environment")
class TestDatabase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()

    def test_create_user(self):
        user_in = user_schema.UserCreate(
            email="teacher@test.com",
            name="Teacher Test",
            password="secretpassword",
            role="teacher"
        )
        user = crud.create_user(self.db, user_in)
        self.assertEqual(user.email, "teacher@test.com")
        self.assertEqual(user.role, "teacher")

    def test_create_classroom(self):
        teacher_in = user_schema.UserCreate(
            email="t1@test.com",
            name="Teacher 1",
            password="password",
            role="teacher"
        )
        teacher = crud.create_user(self.db, teacher_in)
        
        class_in = classroom_schema.ClassroomCreate(
            name="Class 10-A Mathematics",
            description="Grade 10 math classroom"
        )
        classroom = crud.create_classroom(self.db, class_in, teacher_id=teacher.id)
        self.assertEqual(classroom.name, "Class 10-A Mathematics")
        self.assertEqual(classroom.teacher_id, teacher.id)

if __name__ == "__main__":
    unittest.main()
