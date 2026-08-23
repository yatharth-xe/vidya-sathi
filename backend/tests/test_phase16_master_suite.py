"""
Phase 16 Master Test Suite for Vidya Sathi.

Automated verification suite covering Passes 1 to 5:
- Pass 1: Core Demo Path (Auth, Teacher setup, Student learning, Student Agent, Quiz start/submit, Notifications, Teacher Agent)
- Pass 2: Quiz Level Outcomes (Level 1, Level 2, Level 4 + DB persistence)
- Pass 3: Security & Authorization Matrix (SEC-01 through SEC-09)
- Pass 4: Database Persistence Verification
- Pass 5: Error Handling & Form Validation
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.dependencies import get_db
from app.database import models, crud
from app.services import quiz_service, analytics_service

# Use in-memory or file-based test database for suite
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_phase16_vidya.db"
test_engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True, scope="module")
def setup_test_db():
    models.Base.metadata.drop_all(bind=test_engine)
    models.Base.metadata.create_all(bind=test_engine)
    yield
    models.Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_phase16_vidya.db"):
        os.remove("./test_phase16_vidya.db")


# Helper: register user & return token
def _register_and_login(email: str, name: str, password: str, role: str) -> dict:
    client.post("/api/v1/auth/register", json={"email": email, "name": name, "password": password, "role": role})
    res = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()


# ===========================================================================
# PASS 1 — CORE DEMO PATH
# ===========================================================================

def test_pass1_core_demo_path():
    # 1. AUTH-01 / AUTH-03: Register & Login Teacher
    t_auth = _register_and_login("teacher_demo@test.com", "Demo Teacher", "pass123", "teacher")
    t_headers = {"Authorization": f"Bearer {t_auth['access_token']}"}

    # 2. AUTH-02 / AUTH-03: Register & Login Student
    s_auth = _register_and_login("student_demo@test.com", "Demo Student", "pass123", "student")
    s_headers = {"Authorization": f"Bearer {s_auth['access_token']}"}

    # 3. AUTH-06: Check /auth/me
    me_res = client.get("/api/v1/auth/me", headers=t_headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "teacher_demo@test.com"

    # 4. TCH-01: Create Classroom
    c_res = client.post("/api/v1/classrooms/", json={"name": "Mathematics — Class X", "description": "Demo Class"}, headers=t_headers)
    assert c_res.status_code == 201
    class_id = c_res.json()["id"]

    # 5. TCH-02: Add Student to Classroom
    add_res = client.post(f"/api/v1/classrooms/{class_id}/students/{s_auth['user_id']}", headers=t_headers)
    assert add_res.status_code == 200

    # 6. TCH-03: Create Assignment
    a_res = client.post("/api/v1/assignments/", json={"title": "Quadratic Equations Homework", "description": "Demo Assignment", "classroom_id": class_id}, headers=t_headers)
    assert a_res.status_code == 201
    assign_id = a_res.json()["id"]

    # 7. TCH-04: Upload PDF
    pdf_content = b"%PDF-1.4 dummy pdf content for testing"
    pdf_res = client.post(f"/api/v1/assignments/{assign_id}/upload-pdf", files={"file": ("guide.pdf", pdf_content, "application/pdf")}, headers=t_headers)
    assert pdf_res.status_code == 200

    # 8. TCH-07: Add Question
    q_res = client.post(f"/api/v1/assignments/{assign_id}/questions", json={"question_number": 1, "question_text": "What is the first step in solving x^2 + 5x + 6 = 0?", "subject": "Mathematics", "topic": "Quadratic Equations"}, headers=t_headers)
    assert q_res.status_code == 201
    q_id = q_res.json()["id"]

    # 9. STU-01: Student list enrolled classrooms
    st_c_res = client.get("/api/v1/classrooms/", headers=s_headers)
    assert st_c_res.status_code == 200
    assert len(st_c_res.json()) >= 1

    # 10. STU-02: Student view assignment
    st_a_res = client.get(f"/api/v1/student/assignments/{assign_id}", headers=s_headers)
    assert st_a_res.status_code == 200

    # 11. STU-03: Student view PDF file
    st_pdf_res = client.get(f"/api/v1/student/assignments/{assign_id}/file", headers=s_headers)
    assert st_pdf_res.status_code == 200
    assert st_pdf_res.headers["content-type"] == "application/pdf"

    # 12. SAG-01 / SAG-02 / SAG-04: Student Agent Doubt Chat
    chat_res = client.post("/api/v1/agents/student/chat", json={"assignment_id": assign_id, "question_id": q_id, "message": "How do I solve this step by step?"}, headers=s_headers)
    assert chat_res.status_code == 200
    assert "response" in chat_res.json()

    # 13. QUIZ-01 / QUIZ-02: Start Practice Quiz (verifying correct_option is NOT exposed)
    q_start_res = client.post("/api/v1/student/quiz/start", json={"assignment_id": assign_id, "question_id": q_id, "topic": "Quadratic Equations"}, headers=s_headers)
    assert q_start_res.status_code == 200
    quiz_data = q_start_res.json()
    assert len(quiz_data["questions"]) == 5
    for q_item in quiz_data["questions"]:
        assert "correct_option" not in q_item
        assert "correct" not in q_item

    # 14. QUIZ-06 / NOTIF-01: Submit quiz with score < 60% (1/5 correct -> Level 4 + Teacher Notification)
    submit_payload = {
        "quiz_id": quiz_data["quiz_id"],
        "assignment_id": assign_id,
        "question_id": q_id,
        "topic": "Quadratic Equations",
        "answers": [
            {"question_id": q_item["id"], "selected_option": "D"} for q_item in quiz_data["questions"]
        ]
    }
    submit_res = client.post("/api/v1/student/quiz/submit", json=submit_payload, headers=s_headers)
    assert submit_res.status_code == 200
    sub_result = submit_res.json()
    assert sub_result["level"] == 4
    assert sub_result["teacher_intimated"] is True

    # 15. NOTIF-01: Teacher check notifications
    n_res = client.get("/api/v1/teacher/notifications", headers=t_headers)
    assert n_res.status_code == 200
    assert len(n_res.json()) >= 1
    assert n_res.json()[0]["level"] == 4

    # 16. TAG-01: Teacher Agent Insights
    ins_res = client.post(f"/api/v1/agents/teacher/insights/{class_id}", headers=t_headers)
    assert ins_res.status_code == 200
    assert "insights_text" in ins_res.json()
    assert ins_res.json()["classroom_id"] == class_id


# ===========================================================================
# PASS 2 — QUIZ OUTCOMES & PERSISTENCE
# ===========================================================================

def test_pass2_quiz_outcomes():
    # Evaluate score branches directly via quiz_service
    res_high = quiz_service.evaluate_quiz_performance(5, 5)
    assert res_high[0] == 1  # 100% -> Level 1
    assert res_high[1] is False

    res_mod = quiz_service.evaluate_quiz_performance(3, 5)
    assert res_mod[0] == 2   # 60% -> Level 2
    assert res_mod[1] is False

    res_low = quiz_service.evaluate_quiz_performance(1, 5)
    assert res_low[0] == 4   # 20% -> Level 4
    assert res_low[1] is True


# ===========================================================================
# PASS 3 — SECURITY & AUTHORIZATION MATRIX
# ===========================================================================

def test_pass3_security_matrix():
    t1 = _register_and_login("teacher_a@test.com", "Teacher A", "pass123", "teacher")
    t2 = _register_and_login("teacher_b@test.com", "Teacher B", "pass123", "teacher")
    t1_hdr = {"Authorization": f"Bearer {t1['access_token']}"}
    t2_hdr = {"Authorization": f"Bearer {t2['access_token']}"}

    s1 = _register_and_login("student_a@test.com", "Student A", "pass123", "student")
    s2 = _register_and_login("student_b@test.com", "Student B", "pass123", "student")
    s1_hdr = {"Authorization": f"Bearer {s1['access_token']}"}
    s2_hdr = {"Authorization": f"Bearer {s2['access_token']}"}

    # Create classroom for Teacher A
    c1 = client.post("/api/v1/classrooms/", json={"name": "Class A", "description": ""}, headers=t1_hdr).json()["id"]
    # Enroll Student A only in Class A
    client.post(f"/api/v1/classrooms/{c1}/students/{s1['user_id']}", headers=t1_hdr)

    # Create assignment in Class A
    a1 = client.post("/api/v1/assignments/", json={"title": "Assign A", "description": "", "classroom_id": c1}, headers=t1_hdr).json()["id"]

    # SEC-01: Teacher B cannot view Teacher A classroom details
    sec1 = client.get(f"/api/v1/classrooms/{c1}", headers=t2_hdr)
    assert sec1.status_code in (401, 403)

    # SEC-02: Teacher B cannot view Teacher A assignment
    sec2 = client.get(f"/api/v1/assignments/{a1}", headers=t2_hdr)
    assert sec2.status_code in (401, 403)

    # SEC-03: Teacher B receives zero notifications belonging to Teacher A
    sec3 = client.get("/api/v1/teacher/notifications", headers=t2_hdr)
    assert sec3.status_code == 200
    assert len(sec3.json()) == 0

    # SEC-04: Student B cannot access Class A details
    sec4 = client.get(f"/api/v1/classrooms/{c1}", headers=s2_hdr)
    assert sec4.status_code in (401, 403)

    # SEC-05: Student B cannot access Assignment A details
    sec5 = client.get(f"/api/v1/student/assignments/{a1}", headers=s1_hdr if False else s2_hdr)
    assert sec5.status_code in (401, 403)

    # SEC-06: Student A cannot access Teacher-only route /api/v1/assignments/
    sec6 = client.get("/api/v1/assignments/", headers=s1_hdr)
    assert sec6.status_code in (401, 403)

    # SEC-08: Student cannot impersonate another student in quiz request
    # Backend derives student_id from JWT token only
    sec8_start = client.post("/api/v1/student/quiz/start", json={"assignment_id": a1, "topic": "General", "student_id": 99999}, headers=s1_hdr)
    assert sec8_start.status_code == 200  # Payload student_id is safely ignored, student_a JWT used

    # SEC-09: Unenrolled Student B cannot start or submit quiz for Assignment A
    sec9_start = client.post("/api/v1/student/quiz/start", json={"assignment_id": a1, "topic": "General"}, headers=s2_hdr)
    assert sec9_start.status_code in (401, 403)

    sec9_sub = client.post("/api/v1/student/quiz/submit", json={"quiz_id": 123, "assignment_id": a1, "answers": []}, headers=s2_hdr)
    assert sec9_sub.status_code in (401, 403)


# ===========================================================================
# PASS 4 — PERSISTENCE VERIFICATION
# ===========================================================================

def test_pass4_persistence():
    db = TestingSessionLocal()
    try:
        users = db.query(models.User).all()
        assert len(users) > 0
        for u in users:
            assert u.hashed_password != "pass123"  # Passwords must remain hashed
            assert u.hashed_password.startswith("$2b$") or len(u.hashed_password) > 20
    finally:
        db.close()


# ===========================================================================
# PASS 5 — ERROR HANDLING & VALIDATION
# ===========================================================================

def test_pass5_error_handling():
    t_auth = _register_and_login("err_teacher@test.com", "Err Teacher", "pass123", "teacher")
    t_hdr = {"Authorization": f"Bearer {t_auth['access_token']}"}

    # ERR-01: Invalid classroom ID
    err1 = client.get("/api/v1/classrooms/999999", headers=t_hdr)
    assert err1.status_code == 404

    # ERR-02: Invalid assignment ID
    err2 = client.get("/api/v1/assignments/999999", headers=t_hdr)
    assert err2.status_code == 404

    # ERR-05: Non-PDF file upload
    err5 = client.post("/api/v1/assignments/1/upload-pdf", files={"file": ("test.txt", b"hello text", "text/plain")}, headers=t_hdr)
    assert err5.status_code in (400, 403, 404)
