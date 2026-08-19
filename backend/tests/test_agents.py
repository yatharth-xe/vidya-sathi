import unittest
from app.agents.student_agent import handle_student_doubt
from app.agents.teacher_agent import generate_classroom_insights

class TestAgents(unittest.TestCase):
    def test_handle_student_doubt_mock(self):
        result = handle_student_doubt(classroom_id=1, student_id=10, doubt="What is algebra?")
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)

    def test_generate_classroom_insights_mock(self):
        result = generate_classroom_insights(classroom_id=1)
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)

if __name__ == "__main__":
    unittest.main()
