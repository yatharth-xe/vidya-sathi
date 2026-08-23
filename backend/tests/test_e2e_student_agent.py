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
    Two-track behavior: when the student message contains the marker
    "record my learning state", the stub exercises the REAL
    learning_state_service upsert with the backend-injected scope (exactly
    what the live LLM tool would do), proposing the level stated in the
    message ("... as level N").
    """

    def __init__(self):
        self.captured = []

    def chat(self, request):
        progress = request.current_progress
        level = progress.level if progress else 1
        entry = {
            "student_id": request.student_id,
            "context_level": level,
            "message": request.message,
            "write_result": None,
        }
        message = request.message.lower()

        if request.question_id and "record my learning state" in message:
            import re

            from app.services.learning_state_service import (
                upsert_student_learning_state)

            match = re.search(r"level\s*(\d)", message)
            proposed = int(match.group(1)) if match else 3
            entry["write_result"] = upsert_student_learning_state(
                student_id=request.student_id,
                classroom_id=request.classroom_id,
                assignment_id=request.assignment_id,
                question_id=request.question_id,
                level=proposed,
                topic=progress.topic if progress else None,
                trusted_subject=(
                    request.question_context.subject
                    if request.question_context else None),
            )

        self.captured.append(entry)

        from app.schemas.agent import StudentAgentResponse

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
        # Progress query default: reflects the trusted context snapshot.
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


class TestConversationalLearningState:
    """TRACK 1: agent-determined conversational writes via the real service."""

    def test_update_existing_conversational_level(self, client, e2e_db,
                                                  seeded):
        from app.database import models

        headers = {"Authorization": f"Bearer {client['token_a']}"}
        r = _chat(client, headers, seeded["assignment"].id,
                  "Please record my learning state as level 3.",
                  question_id=seeded["question_a"].id)
        assert r.status_code == 200
        write = _stub.captured[-1]["write_result"]
        assert write["status"] == "updated"
        assert write["level"] == 3

        db = e2e_db["SessionLocal"]()
        try:
            row = db.get(models.StudentQuestionProgress,
                         seeded["progress_a"].id)
            assert row.level == 3          # was 2, conversational write won
            assert row.quiz_score is None  # quiz fields untouched
        finally:
            db.close()

    def test_create_new_state_row(self, client, e2e_db, seeded):
        from app.database import models

        headers = {"Authorization": f"Bearer {client['token_a']}"}
        r = _chat(client, headers, seeded["assignment"].id,
                  "Please record my learning state as level 1.",
                  question_id=seeded["question_c"].id)
        assert r.status_code == 200
        write = _stub.captured[-1]["write_result"]
        # NOTE: run_student_chat pre-creates the progress row before the
        # adapter runs, so via-API writes report "updated"; the important
        # guarantee is the persisted level.
        assert write["status"] in ("created", "updated")
        assert write["level"] == 1

        db = e2e_db["SessionLocal"]()
        try:
            row = db.query(models.StudentQuestionProgress).filter_by(
                student_id=seeded["student_a"].id,
                question_id=seeded["question_c"].id).one()
            assert row.level == 1
        finally:
            db.close()

    def test_isolation_student_a_cannot_modify_student_b(
            self, client, e2e_db, seeded):
        # A asks on B's question: the service writes A's OWN row for that
        # question — never B's row (student_id comes from A's JWT scope).
        from app.database import models

        headers = {"Authorization": f"Bearer {client['token_a']}"}
        r = _chat(client, headers, seeded["assignment"].id,
                  "Please record my learning state as level 1.",
                  question_id=seeded["question_b"].id)
        assert r.status_code == 200

        db = e2e_db["SessionLocal"]()
        try:
            b_row = db.get(models.StudentQuestionProgress,
                           seeded["progress_b"].id)
            assert b_row.level == 4  # B's row untouched
            a_row = db.query(models.StudentQuestionProgress).filter_by(
                student_id=seeded["student_a"].id,
                question_id=seeded["question_b"].id).one()
            assert a_row.student_id == seeded["student_a"].id
            assert a_row.level == 1
        finally:
            db.close()

    def test_zero_teacher_notifications_from_agent_writes(
            self, e2e_db, seeded):
        from app.database import models

        db = e2e_db["SessionLocal"]()
        try:
            # Conversational writes never create notifications.
            assert db.query(models.TeacherNotification).count() == 0
        finally:
            db.close()

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


class TestQuizAuthorityGuard:
    """TRACK 2 wins: quiz-determined states can NEVER be overwritten."""

    def test_agent_cannot_override_quiz_level4(self, client, e2e_db, seeded):
        """B failed the quiz (Level 4, quiz_score=0). Agent proposes L1."""
        from app.database import models

        headers = {"Authorization": f"Bearer {client['token_b']}"}
        r = _chat(client, headers, seeded["assignment"].id,
                  "Please record my learning state as level 1.",
                  question_id=seeded["question_b"].id)
        assert r.status_code == 200

        write = _stub.captured[-1]["write_result"]
        assert write["status"] == "rejected"
        assert write["reason"] == "quiz_authoritative_state"
        assert write["level"] == 4

        db = e2e_db["SessionLocal"]()
        try:
            row = db.get(models.StudentQuestionProgress,
                         seeded["progress_b"].id)
            assert row.level == 4          # quiz result stands
            assert row.quiz_score == 0.0   # unchanged
        finally:
            db.close()

    def test_agent_cannot_override_quiz_level1(self, client, e2e_db, seeded):
        """A passed the quiz (Level 1, quiz_score=100). Agent proposes L3."""
        from app.database import models

        headers = {"Authorization": f"Bearer {client['token_a']}"}
        r = _chat(client, headers, seeded["assignment"].id,
                  "Please record my learning state as level 3.",
                  question_id=seeded["question_a"].id)
        assert r.status_code == 200

        write = _stub.captured[-1]["write_result"]
        assert write["status"] == "rejected"
        assert write["reason"] == "quiz_authoritative_state"

        db = e2e_db["SessionLocal"]()
        try:
            row = db.get(models.StudentQuestionProgress,
                         seeded["progress_a"].id)
            assert row.level == 1           # quiz result stands
            assert row.quiz_score == 100.0  # unchanged
        finally:
            db.close()


class TestTeacherGetStudentProgress:
    """Phase 8: the Teacher Agent's ONE read-only database tool."""

    @pytest.fixture(autouse=True)
    def _setup(self, e2e_db, seeded, client):
        from app.core.security import get_password_hash
        from app.database import models
        from app.services import teacher_agent_tools as tat

        self.tat = tat
        self.db_cls = e2e_db["SessionLocal"]
        self.seeded = seeded
        self.client = client

        # Second teacher with an unrelated classroom (cross-tenant test).
        # Idempotent: created once even though this fixture runs per-test.
        db = self.db_cls()
        db.expire_on_commit = False
        t2 = db.query(models.User).filter_by(
            email="teacher_b_e2e@example.com").first()
        if not t2:
            t2 = models.User(email="teacher_b_e2e@example.com", name="T2",
                             role="teacher",
                             hashed_password=get_password_hash("Passw0rd!"))
            db.add(t2); db.commit(); db.refresh(t2)
            room2 = models.Classroom(name="Other Room", teacher_id=t2.id)
            db.add(room2); db.commit(); db.refresh(room2)
            self.classroom_b = room2
        else:
            self.classroom_b = db.query(models.Classroom).filter_by(
                teacher_id=t2.id).first()
        db.close()
        self.teacher_b = t2
        yield
        self.tat.set_teacher_scope(None)

    def test_exactly_one_teacher_db_tool(self):
        assert [t.name for t in self.tat.TEACHER_DB_TOOLS] == \
            ["get_student_progress"]

    def test_no_teacher_id_in_llm_schema(self):
        fields = self.tat.get_student_progress.args_schema.model_fields
        assert "teacher_id" not in fields
        assert set(fields) == {"classroom_id", "assignment_id", "topic",
                               "level"}

    def test_own_classroom_read_allowed(self):
        self._scope_a = lambda: self.tat.set_teacher_scope(
            {"teacher_id": self.seeded["teacher"].id})
        self._scope_a()
        out = self.tat.get_student_progress.invoke(
            {"classroom_id": self.seeded["classroom"].id})
        assert out["status"] == "ok"
        assert out["count"] >= 3
        rec = out["records"][0]
        assert set(rec) == {
            "student_id", "student_name", "classroom_id", "assignment_id",
            "question_id", "topic", "subject", "level", "quiz_score",
            "attention_priority", "teacher_intimated", "updated_at"}
        assert any(r["student_name"] for r in out["records"])

    def test_cross_teacher_access_rejected(self):
        self.tat.set_teacher_scope({"teacher_id": self.seeded["teacher"].id})
        out = self.tat.get_student_progress.invoke(
            {"classroom_id": self.classroom_b.id})
        assert out["status"] == "rejected"
        assert out["reason"] == "not_classroom_owner"

    def test_assignment_filter(self):
        self.tat.set_teacher_scope({"teacher_id": self.seeded["teacher"].id})
        out = self.tat.get_student_progress.invoke({
            "classroom_id": self.seeded["classroom"].id,
            "assignment_id": self.seeded["assignment"].id})
        assert out["status"] == "ok"
        assert all(r["assignment_id"] == self.seeded["assignment"].id
                   for r in out["records"])

    def test_topic_filter(self):
        self.tat.set_teacher_scope({"teacher_id": self.seeded["teacher"].id})
        out = self.tat.get_student_progress.invoke({
            "classroom_id": self.seeded["classroom"].id,
            "topic": "chemical bonding"})
        assert out["status"] == "ok"
        assert out["count"] >= 1
        assert all(r["topic"] == "Chemical Bonding" for r in out["records"])

    def test_level4_support_view(self):
        self.tat.set_teacher_scope({"teacher_id": self.seeded["teacher"].id})
        out = self.tat.get_student_progress.invoke({
            "classroom_id": self.seeded["classroom"].id, "level": 4})
        assert out["status"] == "ok"
        b_rows = [r for r in out["records"]
                  if r["student_id"] == self.seeded["student_b"].id]
        assert b_rows, "Level-4 student must appear in support view"
        assert all(r["level"] == 4 for r in out["records"])

    def test_quiz_score_and_intimation_preserved(self):
        self.tat.set_teacher_scope({"teacher_id": self.seeded["teacher"].id})
        out = self.tat.get_student_progress.invoke(
            {"classroom_id": self.seeded["classroom"].id})
        b_row = next(r for r in out["records"]
                     if r["student_id"] == self.seeded["student_b"].id
                     and r["question_id"] == self.seeded["question_b"].id)
        assert b_row["quiz_score"] == 0.0
        assert b_row["teacher_intimated"] is True

    def test_tool_is_read_only(self):
        import json

        from app.database import models

        self.tat.set_teacher_scope({"teacher_id": self.seeded["teacher"].id})
        db = self.db_cls()
        try:
            before = [tuple(sorted((c.name, str(getattr(r, c.name)))
                                   for c in r.__table__.columns))
                      for r in db.query(models.StudentQuestionProgress).all()]
        finally:
            db.close()

        self.tat.get_student_progress.invoke(
            {"classroom_id": self.seeded["classroom"].id})

        db = self.db_cls()
        try:
            after = [tuple(sorted((c.name, str(getattr(r, c.name)))
                                  for c in r.__table__.columns))
                     for r in db.query(models.StudentQuestionProgress).all()]
        finally:
            db.close()
        assert json.dumps(before) == json.dumps(after)

    def test_rejects_without_scope_and_invalid_level(self):
        self.tat.set_teacher_scope(None)
        out = self.tat.get_student_progress.invoke(
            {"classroom_id": self.seeded["classroom"].id})
        assert out["status"] == "rejected"
        assert out["reason"] == "no_authorized_scope"

        self.tat.set_teacher_scope({"teacher_id": self.seeded["teacher"].id})
        out = self.tat.get_student_progress.invoke({
            "classroom_id": self.seeded["classroom"].id, "level": 9})
        assert out["reason"] == "invalid_level"

    def test_student_identity_cannot_read_as_teacher(self):
        from app.services.learning_state_service import (
            get_classroom_progress_for_teacher)

        out = get_classroom_progress_for_teacher(
            teacher_id=self.seeded["student_a"].id,
            classroom_id=self.seeded["classroom"].id)
        assert out["status"] == "rejected"
        assert out["reason"] == "not_classroom_owner"

    def test_real_endpoint_reflects_shared_learning_state(self):
        headers = {"Authorization": f"Bearer {self.client['token_teacher']}"}
        r = self.client.post(
            f"/api/v1/agents/teacher/insights/{self.seeded['classroom'].id}",
            headers=headers)
        assert r.status_code == 200
        body = r.json()
        assert body["level_4_count"] >= 1   # shared SQLite state is visible
        assert body["weak_topics"]
        # Trusted teacher scope must be cleared after the run.
        from app.services.teacher_agent_tools import get_teacher_scope

        assert get_teacher_scope() is None


# ---------------------------------------------------------------------------
# Phase 9: conversational level-assessment quality (deterministic scripted
# conversations driven through the REAL run_student_agent -> tool -> service
# -> SQLite chain). Imports are deferred into the fixture because the agent
# project path is only registered by the e2e_db fixture.
# ---------------------------------------------------------------------------
from langchain_core.language_models.chat_models import BaseChatModel as _BCM  # noqa: E402
from langchain_core.messages import AIMessage as _AIM, ToolMessage as _TM  # noqa: E402
from langchain_core.outputs import ChatGeneration, ChatResult as _CR  # noqa: E402


class AssessingModel(_BCM):
    """Scripted model that 'assesses' a transcript and calls the real
    student_learning_state tool with proposed_level (unless use_tool=False,
    simulating a fresh unrelated topic with nothing to record)."""

    proposed_level: int = 2
    use_tool: bool = True
    args_override: dict = {}

    @property
    def _llm_type(self):
        return "assessing-script"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        if not any(isinstance(m, _TM) for m in messages):
            calls = []
            if self.use_tool:
                calls.append({
                    "name": "student_learning_state",
                    "args": {"classroom_id": self.args_override[
                                 "classroom_id"],
                             "assignment_id": self.args_override[
                                 "assignment_id"],
                             "question_id": self.args_override["question_id"],
                             "level": self.proposed_level,
                             "evidence": ("Student correctly restated and "
                                          "applied the concept.")},
                    "id": "call_assess", "type": "tool_call"})
            msg = _AIM(content="", tool_calls=calls)
        else:
            msg = _AIM(content="Assessment recorded.")
        return _CR(generations=[ChatGeneration(message=msg)])


class TestConversationalLevelQuality:
    """Rubric matrix: conversation evidence -> assessed level -> SQLite."""

    @pytest.fixture(autouse=True)
    def _setup(self, e2e_db, seeded):
        import sys as _sys

        from app.database import models

        global _real_run
        agent_dir = Path(__file__).resolve().parents[2] / "Vidya Sathi Agent"
        if str(agent_dir) not in _sys.path:
            _sys.path.insert(0, str(agent_dir))
        import agent.student_agent as _asa

        _real_run = _asa.run_student_agent
        self.models = models
        self.db_cls = e2e_db["SessionLocal"]
        self.seeded = seeded

        # Reset a CLEAN conversational baseline: no quiz-authoritative state
        # on question_a/question_c (earlier classes may have run quizzes).
        db = self.db_cls()
        try:
            qa = db.query(models.StudentQuestionProgress).filter_by(
                student_id=self.seeded["student_a"].id,
                question_id=self.seeded["question_a"].id).first()
            if qa:
                qa.level, qa.quiz_score = 2, None
                qa.teacher_intimated, qa.attention_priority = False, "normal"
            qc = db.query(models.StudentQuestionProgress).filter_by(
                student_id=self.seeded["student_a"].id,
                question_id=self.seeded["question_c"].id).first()
            if qc:
                db.delete(qc)
            db.commit()
        finally:
            db.close()

    def _scope(self, student_key, question_key):
        s = self.seeded
        return {"student_id": s[student_key].id,
                "classroom_id": s["classroom"].id,
                "assignment_id": s["assignment"].id,
                "question_id": s[question_key].id,
                "subject": "Chemistry"}

    def _run(self, transcript, proposed, use_tool=True,
             student="student_a", question="question_a"):
        scope = self._scope(student, question)
        model = AssessingModel(proposed_level=proposed, use_tool=use_tool)
        model.args_override = {k: scope[k] for k in
                               ("classroom_id", "assignment_id",
                                "question_id")}
        result = _real_run(transcript, top_k=1, model=model,
                           learning_context={"snapshot": {}, "scope": scope})
        return result

    def _row_level(self, student_key, question_key):
        db = self.db_cls()
        try:
            row = db.query(self.models.StudentQuestionProgress).filter_by(
                student_id=self.seeded[student_key].id,
                question_id=self.seeded[question_key].id).first()
            return None if row is None else row.level
        finally:
            db.close()

    # -- rubric matrix ----------------------------------------------------
    def test_01_demonstrates_understanding_l1(self):
        t = ("Student: Oh! I get it now — covalent bonding is sharing "
             "electron pairs so both atoms complete their octet. So in H2O "
             "each H shares one pair with O, right?")
        self._run(t, proposed=1)
        assert self._row_level("student_a", "question_a") == 1

    def test_02_partial_understanding_hint_request_l2(self):
        t = ("Student: I think sharing is involved but I'm mixed up about "
             "when it becomes ionic instead. Can you give me a hint?")
        self._run(t, proposed=2)
        assert self._row_level("student_a", "question_a") == 2

    def test_03_still_confused_after_explanation_l3(self):
        t = ("Student: You explained it twice but I still don't see why "
             "electrons are shared rather than transferred. I'm just as "
             "confused as before.")
        self._run(t, proposed=3)
        assert self._row_level("student_a", "question_a") == 3

    def test_04_repeated_substantial_difficulty_l4(self):
        t = ("Student: I've tried three times with your hints and I still "
             "cannot tell covalent from ionic bonding. Nothing makes sense "
             "no matter what.")
        self._run(t, proposed=4)
        assert self._row_level("student_a", "question_a") == 4

    def test_05_polite_okay_is_not_level1(self):
        t = "Student: Okay, thanks, that makes sense I guess. Anyway..."
        self._run(t, proposed=2)  # conservative: no evidence -> not L1
        assert self._row_level("student_a", "question_a") == 2

    def test_06_repeated_misconception_l3(self):
        t = ("Student: So covalent bonding is when a metal GIVES electrons "
             "to a nonmetal... that's still what I thought even after your "
             "explanation.")
        self._run(t, proposed=3)
        assert self._row_level("student_a", "question_a") == 3

    def test_07_correct_followup_application_l1(self):
        t = ("Student: Following your explanation — N2 has 5 valence "
             "electrons each so it forms a triple bond sharing three pairs. "
             "And CH4 would be four single C-H bonds, correct?")
        self._run(t, proposed=1)
        assert self._row_level("student_a", "question_a") == 1

    def test_08_new_question_does_not_inherit_difficulty(self):
        before = self._row_level("student_a", "question_c")
        t = "Student: Completely different topic — what is photosynthesis?"
        self._run(t, proposed=2, use_tool=False)
        assert self._row_level("student_a", "question_c") == before

    # -- teacher visibility -------------------------------------------------
    def test_teacher_reads_the_same_state(self):
        from app.services import teacher_agent_tools as tat

        tat.set_teacher_scope({"teacher_id": self.seeded["teacher"].id})
        try:
            out = tat.get_student_progress.invoke(
                {"classroom_id": self.seeded["classroom"].id})
        finally:
            tat.set_teacher_scope(None)
        assert out["status"] == "ok"
        stored = {(r["student_id"], r["question_id"]): r["level"]
                  for r in out["records"]}
        key = (self.seeded["student_a"].id, self.seeded["question_a"].id)
        assert stored[key] == self._row_level("student_a", "question_a")

    # -- quiz authority regression -------------------------------------------
    def test_quiz_authoritative_state_not_overwritten(self):
        db = self.db_cls()
        try:
            row = db.query(self.models.StudentQuestionProgress).filter_by(
                student_id=self.seeded["student_a"].id,
                question_id=self.seeded["question_c"].id).first()
            if row is None:
                row = self.models.StudentQuestionProgress(
                    classroom_id=self.seeded["classroom"].id,
                    assignment_id=self.seeded["assignment"].id,
                    question_id=self.seeded["question_c"].id,
                    student_id=self.seeded["student_a"].id,
                    subject="Chemistry", topic="Chemical Bonding")
                db.add(row)
            # Simulate a backend quiz evaluation (Track 2).
            row.quiz_score, row.level, row.teacher_intimated = 55.0, 4, True
            db.commit(); db.refresh(row)
        finally:
            db.close()

        # Student now claims mastery (would be L1) — must be rejected.
        self._run("Student: Now I fully understand everything!",
                  proposed=1, student="student_a", question="question_c")

        db = self.db_cls()
        try:
            row = db.query(self.models.StudentQuestionProgress).filter_by(
                student_id=self.seeded["student_a"].id,
                question_id=self.seeded["question_c"].id).one()
            assert row.level == 4 and row.quiz_score == 55.0
        finally:
            db.close()


class DoubleCallModel(_BCM):
    """Calls student_learning_state once or twice (or not at all) to test
    exactly-one-write guarantees through the real agent chain."""

    n_calls: int = 1  # 0, 1, or 2
    args_override: dict = {}

    @property
    def _llm_type(self):
        return "double-call-script"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        if any(isinstance(m, _TM) for m in messages):
            return _CR(generations=[ChatGeneration(message=_AIM(content="d"))])
        calls = []
        for i in range(self.n_calls):
            if self.n_calls == 0:
                break
            calls.append({
                "name": "student_learning_state",
                "args": {**self.args_override, "level": 2,
                         "evidence": ("Student restated octet sharing "
                                      "correctly.")},
                "id": f"c{i}", "type": "tool_call"})
        return _CR(generations=[ChatGeneration(
            message=_AIM(content="", tool_calls=calls))])


class TestReliablePersistence:
    """Phase 10: exactly-one-write guarantees via the real agent chain."""

    @pytest.fixture(autouse=True)
    def _setup(self, e2e_db, seeded):
        import sys as _sys

        from app.database import models

        global _real_run
        agent_dir = Path(__file__).resolve().parents[2] / "Vidya Sathi Agent"
        if str(agent_dir) not in _sys.path:
            _sys.path.insert(0, str(agent_dir))
        import agent.student_agent as _asa

        _real_run = _asa.run_student_agent
        self.models = models
        self.db_cls = e2e_db["SessionLocal"]
        self.seeded = seeded
        # Fresh conversational questions for these isolated assertions.
        db = self.db_cls()
        try:
            for qk in ("question_a", "question_b", "question_c"):
                for sk in ("student_a", "student_b"):
                    r = db.query(models.StudentQuestionProgress).filter_by(
                        student_id=self.seeded[sk].id,
                        question_id=self.seeded[qk].id).first()
                    if r:
                        db.delete(r)
            db.commit()
        finally:
            db.close()

    def _run_with(self, model, sk, qk, level=2):
        s = self.seeded
        scope = {"student_id": s[sk].id, "classroom_id": s["classroom"].id,
                 "assignment_id": s["assignment"].id,
                 "question_id": s[qk].id, "subject": "Chemistry"}
        model.args_override = {k: scope[k] for k in ("classroom_id",
                                                     "assignment_id",
                                                     "question_id")}
        return _real_run("Student: please explain it again.",
                         top_k=1, model=model,
                         learning_context={"snapshot": {}, "scope": scope})

    def _row_level(self, sk, qk):
        db = self.db_cls()
        try:
            r = db.query(self.models.StudentQuestionProgress).filter_by(
                student_id=self.seeded[sk].id,
                question_id=self.seeded[qk].id).first()
            return None if r is None else r.level
        finally:
            db.close()

    def test_single_call_writes_once(self):
        self._run_with(DoubleCallModel(n_calls=1), "student_a", "question_a")
        assert self._row_level("student_a", "question_a") == 2

    def test_double_call_dedupes_to_one_write(self):
        result = self._run_with(DoubleCallModel(n_calls=2),
                                "student_a", "question_b")
        # First call wrote level 2; the duplicate must not raise it.
        assert self._row_level("student_a", "question_b") == 2
        wrote = [m for m in result.messages
                 if isinstance(m, _TM) and m.name == "student_learning_state"
                 and ("\"created\"" in str(m.content)
                      or "\"updated\"" in str(m.content))]
        assert len(wrote) == 1  # exactly one successful persistence

    def test_student_isolation_no_cross_write(self):
        before_b = self._row_level("student_b", "question_a")
        self._run_with(DoubleCallModel(n_calls=1), "student_a", "question_a")
        assert self._row_level("student_b", "question_a") == before_b

    def test_quiz_authoritative_state_is_protected(self):
        db = self.db_cls()
        try:
            row = db.query(self.models.StudentQuestionProgress).filter_by(
                student_id=self.seeded["student_a"].id,
                question_id=self.seeded["question_c"].id).first()
            if row is None:
                row = self.models.StudentQuestionProgress(
                    classroom_id=self.seeded["classroom"].id,
                    assignment_id=self.seeded["assignment"].id,
                    question_id=self.seeded["question_c"].id,
                    student_id=self.seeded["student_a"].id)
                db.add(row)
            row.level, row.quiz_score = 4, 30.0   # backend quiz authority
            db.commit(); db.refresh(row)
        finally:
            db.close()
        self._run_with(DoubleCallModel(n_calls=1), "student_a", "question_c")
        db = self.db_cls()
        try:
            row = db.query(self.models.StudentQuestionProgress).filter_by(
                student_id=self.seeded["student_a"].id,
                question_id=self.seeded["question_c"].id).one()
            assert row.level == 4 and row.quiz_score == 30.0
        finally:
            db.close()


class TestFallbackOrchestration:
    """Phase 10: agent_service fallback when the agent omits the tool call."""

    @pytest.fixture(autouse=True)
    def _setup(self, e2e_db, seeded):
        from app.database import models

        self.db_cls = e2e_db["SessionLocal"]
        self.seeded = seeded
        self.models = models

    def _stub_adapter(self, tool_called=False):
        from app.schemas.agent import StudentAgentResponse

        class _Stub:
            def chat(self, request):
                level = (request.current_progress.level
                         if request.current_progress else 1)
                return StudentAgentResponse(
                    response="stub", level=level,
                    topic=request.question_context.topic
                    if request.question_context else None,
                    subject=request.question_context.subject
                    if request.question_context else None,
                    metadata={"learning_state_tool_called": tool_called})

        return _Stub()

    def test_fallback_writes_once_when_agent_omits_tool(self):
        import unittest.mock as mock

        import app.services.agent_service as agent_service
        from app.services import learning_state_service as lss

        calls = []
        real = lss.upsert_student_learning_state

        def spy(db=None, **kw):
            calls.append({k: kw.get(k) for k in
                          ("student_id", "classroom_id", "assignment_id",
                           "question_id", "level", "topic")})
            return real(db=db, **kw)

        db = self.db_cls()
        try:
            with mock.patch.object(agent_service, "get_student_agent",
                                   lambda: self._stub_adapter(tool_called=False)), \
                 mock.patch.object(lss, "upsert_student_learning_state", spy):
                resp = agent_service.run_student_chat(
                    db, student_id=self.seeded["student_a"].id,
                    classroom_id=self.seeded["classroom"].id,
                    assignment_id=self.seeded["assignment"].id,
                    question_id=self.seeded["question_a"].id,
                    message="explain it again")
        finally:
            db.close()

        assert resp.metadata["learning_state_assessment_source"] == \
            "backend_fallback"
        assert len(calls) == 1  # exactly one fallback persistence
        call = calls[0]
        assert call["student_id"] == self.seeded["student_a"].id
        assert call["level"] in (1, 2, 3, 4)  # preserves, never fabricates

    def test_agent_called_tool_no_fallback(self):
        import unittest.mock as mock

        import app.services.agent_service as agent_service
        from app.services import learning_state_service as lss

        calls = []

        def spy(db=None, **kw):
            calls.append(kw)
            return {"status": "updated", "level": kw["level"]}

        db = self.db_cls()
        try:
            with mock.patch.object(agent_service, "get_student_agent",
                                   lambda: self._stub_adapter(tool_called=True)), \
                 mock.patch.object(lss, "upsert_student_learning_state", spy):
                resp = agent_service.run_student_chat(
                    db, student_id=self.seeded["student_a"].id,
                    classroom_id=self.seeded["classroom"].id,
                    assignment_id=self.seeded["assignment"].id,
                    question_id=self.seeded["question_a"].id,
                    message="explain it")
        finally:
            db.close()
        assert len(calls) == 0  # tool already called -> no fallback
        assert resp.metadata["learning_state_assessment_source"] == \
            "agent_tool"
