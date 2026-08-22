"""E2E tests: full Student Agent flow against an ISOLATED SQLite database.

Offline/deterministic by default (Student Agent LLM stubbed, external search
mocked). Set RUN_LIVE_AGENT_TESTS=1 to opt in to real Ollama Cloud / web runs.
"""
import os
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]

RUN_LIVE = os.getenv("RUN_LIVE_AGENT_TESTS") == "1"

CHAT = "/api/v1/agents/student/chat"
QUIZ_START = "/api/v1/student/quiz/start"
QUIZ_SUBMIT = "/api/v1/student/quiz/submit"

CONTRACT_FIELDS = ["response", "level", "topic", "subject", "requires_quiz",
                   "teacher_intimated", "attention_priority", "hints",
                   "citations", "quiz_id"]


class StubAgentAdapter:
    """Deterministic stand-in for the LLM-backed adapter (CI/offline mode).

    Records what context the backend injected so tests can assert isolation.
    """

    def __init__(self):
        self.captured = []

    def chat(self, request):
        progress = request.current_progress
        level = progress.level if progress else 1
        self.captured.append({
            "student_id": request.student_id,
            "context_level": level,
            "message": request.message,
        })
        from app.schemas.agent import StudentAgentResponse
        message = request.message.lower()

        if "scholarship" in message:
            return StudentAgentResponse(
                response=("Official portals: [Web | National Scholarship "
                          "Portal | https://scholarships.gov.in/] "
                          "(retrieved 2026-08-22)"),
                level=level,
                topic=progress.topic if progress else None,
                subject=progress.subject if progress else None,
            )
        if "covalent" in message or "bonding" in message:
            return StudentAgentResponse(
                response="A covalent bond forms when atoms share electrons.",
                level=level,
                topic=progress.topic if progress else None,
                subject=progress.subject if progress else None,
                citations=["[NCERT | Chemistry | Chemical Bonding and "
                           "Molecular Structure | Covalent Bond | pp. 12-14]"],
            )
        # Progress query default
        return StudentAgentResponse(
            response=f"Your current level for this question is {level}.",
            level=level,
            topic=progress.topic if progress else None,
            subject=progress.subject if progress else None,
        )


_stub = StubAgentAdapter()


@pytest.fixture(scope="session", autouse=True)
def _stub_agent():
    """Replace only the ADAPTER (not routing/auth/persistence) for CI runs."""
    import unittest.mock as mock

    import app.services.agent_service as agent_service

    with mock.patch.object(agent_service, "get_student_agent",
                           lambda: _stub):
        yield


def _chat(client, headers, assignment_id, message, question_id=None):
    return client.post(CHAT, headers=headers,
                       json={"assignment_id": assignment_id,
                             "question_id": question_id,
                             "message": message})


class TestE2EStudentAgentFlow:
    """Ordered E2E flow: auth → membership → tools → levels → quiz → notify."""

    def test_01_valid_rfc_emails_seeded(self, client, seeded):
        for key in ("teacher", "student_a", "student_b", "outsider"):
            email = seeded[key].email
            assert email.endswith("@example.com"), email

    def test_02_isolated_db_only(self, e2e_db):
        path = str(e2e_db["path"])
        assert path.endswith("test_e2e_vidya.db")
        assert os.path.exists(path)

    def test_03_auth_required(self, client, seeded):
        r = client.post(CHAT, json={
            "assignment_id": seeded["assignment"].id, "message": "hi"})
        assert r.status_code == 401

    def test_04_unenrolled_student_rejected(self, client, seeded):
        r = _chat(client, {"Authorization": f"Bearer {client['token_outsider']}"},
                  seeded["assignment"].id, "Explain covalent bonding.")
        assert r.status_code == 403

    def test_05_foreign_question_rejected(self, client, seeded):
        headers = {"Authorization": f"Bearer {client['token_a']}"}
        r = _chat(client, headers, seeded["assignment"].id, "hi",
                  question_id=999999)
        assert r.status_code == 404

    def test_06_empty_message_rejected(self, client, seeded):
        headers = {"Authorization": f"Bearer {client['token_a']}"}
        r = _chat(client, headers, seeded["assignment"].id, "")
        assert r.status_code == 422

    def test_07_learning_state_student_a_level2(self, client, seeded):
        headers = {"Authorization": f"Bearer {client['token_a']}"}
        r = _chat(client, headers, seeded["assignment"].id,
                  "What is my current level?",
                  question_id=seeded["question_a"].id)
        assert r.status_code == 200
        body = r.json()
        assert all(k in body for k in CONTRACT_FIELDS)
        assert body["level"] == 2
        assert "2" in body["response"]
        assert not body["requires_quiz"] and not body["teacher_intimated"]

    def test_08_learning_state_student_b_level4_no_bleed(self, client, seeded):
        headers = {"Authorization": f"Bearer {client['token_b']}"}
        r = _chat(client, headers, seeded["assignment"].id,
                  "What is my current level?",
                  question_id=seeded["question_b"].id)
        body = r.json()
        assert r.status_code == 200 and body["level"] == 4

    def test_09_context_isolation_both_directions(self, client, seeded):
        h_a = {"Authorization": f"Bearer {client['token_a']}"}
        r = _chat(client, h_a, seeded["assignment"].id,
                  "What is my current level?",
                  question_id=seeded["question_a"].id)
        assert r.json()["level"] == 2
        h_b = {"Authorization": f"Bearer {client['token_b']}"}
        r = _chat(client, h_b, seeded["assignment"].id,
                  "What is my current level?",
                  question_id=seeded["question_b"].id)
        assert r.json()["level"] == 4

    def test_10_readonly_query_does_not_mutate_progress(self, e2e_db, seeded):
        SessionLocal = e2e_db["SessionLocal"]
        from app.database import models

        db = SessionLocal()
        try:
            pa = db.get(models.StudentQuestionProgress,
                        seeded["progress_a"].id)
            pb = db.get(models.StudentQuestionProgress,
                        seeded["progress_b"].id)
            assert pa.level == 2 and pb.level == 4
            assert not pa.teacher_intimated
            assert db.query(models.TeacherNotification).count() == 0
        finally:
            db.close()

    def test_11_adapter_receives_jwt_identity_only(self, seeded):
        ids = {c["student_id"] for c in _stub.captured}
        assert seeded["student_a"].id in ids
        assert seeded["student_b"].id in ids
        assert seeded["outsider"].id not in ids  # rejected before adapter
        levels = {c["student_id"]: c["context_level"] for c in _stub.captured
                  if c["context_level"]}
        assert levels[seeded["student_a"].id] == 2
        assert levels[seeded["student_b"].id] == 4

    def test_12_ncert_tool_citations(self, client, seeded):
        headers = {"Authorization": f"Bearer {client['token_a']}"}
        r = _chat(client, headers, seeded["assignment"].id,
                  "Explain covalent bonding.",
                  question_id=seeded["question_a"].id)
        body = r.json()
        assert r.status_code == 200 and body["response"]
        citations = body.get("citations") or []
        assert citations, "expected NCERT citations"
        assert all(c.startswith("[NCERT |") for c in citations)
        assert all("http" not in c for c in citations)

    def test_13_scholarship_tool_mocked_official_sources(self):
        """CI/offline: mock the external search; verify tool behavior."""
        import unittest.mock as mock

        sys.path.insert(0, str(BACKEND_DIR.parent / "Vidya Sathi Agent"))
        from agent.tools import scholarship_web_search

        fake_hits = [
            # NOTE: this mocks fetch_scholarship_results *after* its internal
            # official-source ranking, so provide realistic ranked output.
            {"title": "National Scholarship Portal",
             "url": "https://scholarships.gov.in/", "snippet": "Official."},
            {"title": "Blog list", "url": "https://blog.example.com/s",
             "snippet": ""},
        ]
        with mock.patch("agent.tools.fetch_scholarship_results",
                        lambda query: list(fake_hits)):
            payload = scholarship_web_search.invoke(
                {"query": "What scholarships are available for Class 12 "
                          "students in India?"})
        results = payload["results"]
        assert results, "expected results"
        assert results[0]["official_source"] is True  # official ranked first
        assert results[0]["source_url"] == "https://scholarships.gov.in/"
        assert results[0]["last_verified"]
        for item in results:
            # No fabricated student attributes / invented eligibility.
            assert item["eligibility"] is None
            assert item["deadline"] is None
            assert item["source_url"]

    @pytest.mark.skipif(not RUN_LIVE, reason="opt-in live E2E")
    def test_14_live_ncert_query(self, client, seeded):
        import unittest.mock as mock

        import app.services.agent_service as agent_service
        headers = {"Authorization": f"Bearer {client['token_a']}"}
        with mock.patch.object(agent_service, "get_student_agent",
                               lambda: _real_adapter()):
            r = _chat(client, headers, seeded["assignment"].id,
                      "Explain covalent bonding.",
                      question_id=seeded["question_a"].id)
        body = r.json()
        assert r.status_code == 200 and len(body["response"]) > 100
        assert body["citations"]
        assert body["citations"][0].startswith("[NCERT |")

    @pytest.mark.skipif(not RUN_LIVE, reason="opt-in live E2E")
    def test_15_live_scholarship_query(self, client, seeded):
        import unittest.mock as mock

        import app.services.agent_service as agent_service
        headers = {"Authorization": f"Bearer {client['token_a']}"}
        with mock.patch.object(agent_service, "get_student_agent",
                               lambda: _real_adapter()):
            r = _chat(client, headers, seeded["assignment"].id,
                      "What scholarships are available for Class 12 "
                      "students in India?")
        body = r.json()
        assert r.status_code == 200
        assert "[Web |" in body["response"] or "http" in body["response"]


def _real_adapter():
    from app.services.student_agent_adapter import NCERTStudentAgentAdapter
    return NCERTStudentAgentAdapter()


class TestQuizLevelPolicyE2E:
    """Quiz/level behavior + teacher notification on the isolated DB."""

    def test_quiz_below_60_sets_level4_and_notifies(self, client, e2e_db,
                                                    seeded):
        headers = {"Authorization": f"Bearer {client['token_b']}"}
        start = client.post(QUIZ_START, headers=headers, json={
            "assignment_id": seeded["assignment"].id,
            "question_id": seeded["question_b"].id,
            "topic": "Chemical Bonding"})
        assert start.status_code == 200, start.text
        start_body = start.json()
        questions = start_body["questions"]
        assert len(questions) == 5

        submit = client.post(QUIZ_SUBMIT, headers=headers, json={
            "quiz_id": start_body["quiz_id"],
            "assignment_id": seeded["assignment"].id,
            "question_id": seeded["question_b"].id,
            "topic": "Chemical Bonding",
            "answers": [{"question_id": q["id"], "selected_option": "B"}
                        for q in questions]})
        assert submit.status_code == 200, submit.text
        result = submit.json()
        assert result["percentage"] == 0.0
        # Centralized policy: <60% → Level 4 + teacher notification.
        assert result["level"] == 4 and result["teacher_intimated"] is True

        SessionLocal = e2e_db["SessionLocal"]
        from app.database import models

        db = SessionLocal()
        try:
            notification = db.query(models.TeacherNotification).filter_by(
                student_id=seeded["student_b"].id).first()
            assert notification is not None
            assert notification.teacher_id == seeded["teacher"].id
            progress = db.get(models.StudentQuestionProgress,
                              seeded["progress_b"].id)
            assert progress.level == 4
            assert progress.quiz_score == 0.0
        finally:
            db.close()

    def test_quiz_pass_resets_to_level1_no_notification(
            self, client, e2e_db, seeded):
        headers = {"Authorization": f"Bearer {client['token_a']}"}
        start = client.post(QUIZ_START, headers=headers, json={
            "assignment_id": seeded["assignment"].id,
            "question_id": seeded["question_a"].id,
            "topic": "Chemical Bonding"})
        assert start.status_code == 200, start.text
        start_body = start.json()
        questions = start_body["questions"]
        # Template bank's correct option is always 'A'.
        submit = client.post(QUIZ_SUBMIT, headers=headers, json={
            "quiz_id": start_body["quiz_id"],
            "assignment_id": seeded["assignment"].id,
            "question_id": seeded["question_a"].id,
            "topic": "Chemical Bonding",
            "answers": [{"question_id": q["id"], "selected_option": "A"}
                        for q in questions]})
        assert submit.status_code == 200
        result = submit.json()
        assert result["percentage"] == 100.0
        # Centralized policy: >=80% → Level 1, no notification.
        assert result["level"] == 1 and result["teacher_intimated"] is False

        SessionLocal = e2e_db["SessionLocal"]
        from app.database import models

        db = SessionLocal()
        try:
            notification = db.query(models.TeacherNotification).filter_by(
                student_id=seeded["student_a"].id).first()
            assert notification is None
        finally:
            db.close()
