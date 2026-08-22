"""Shared E2E fixtures for the Student Agent integration tests.

Guarantees:
- Tests NEVER touch backend/vidya_sathi.db (guarded loudly).
- All data lives in a temporary isolated SQLite DB (Windows-safe cleanup).
- Only RFC-valid example.com emails are used.
"""
import gc
import os
import pathlib
import tempfile
import time

import pytest

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]
PRODUCTION_DB = BACKEND_DIR / "vidya_sathi.db"

_app_cache = {}


def _build_app():
    if "app" not in _app_cache:
        from app.main import app as fastapi_app
        _app_cache["app"] = fastapi_app
    return _app_cache["app"]


@pytest.fixture(scope="session")
def e2e_db():
    """Create an isolated temporary SQLite database and wire it into the app.

    Must set DATABASE_URL BEFORE importing any app module, because
    app.core.config reads the environment at import time.
    """
    tmpdir = pathlib.Path(tempfile.mkdtemp(prefix="vs_e2e_"))
    db_path = tmpdir / "test_e2e_vidya.db"

    # --- Safety guard (requirement 5) ------------------------------------
    if db_path.resolve() == PRODUCTION_DB.resolve():
        raise RuntimeError(
            f"E2E misconfiguration: test DB path {db_path} resolves to the "
            f"production database {PRODUCTION_DB}. Aborting."
        )

    os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"

    import sys

    if str(BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(BACKEND_DIR))

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.core import dependencies as deps
    from app.database import database as db_module
    from app.database.database import Base

    engine = create_engine(
        f"sqlite:///{db_path.as_posix()}",
        connect_args={"check_same_thread": False},
    )
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False,
                                    bind=engine)

    # Inject the test DB into every place the app resolves a session.
    db_module.engine = engine
    db_module.SessionLocal = TestSessionLocal
    deps.SessionLocal = TestSessionLocal

    Base.metadata.create_all(bind=engine)

    yield {"engine": engine, "SessionLocal": TestSessionLocal,
           "path": db_path, "tmpdir": tmpdir}

    # --- Teardown (requirements 4 / 11) ----------------------------------
    engine.dispose()
    gc.collect()  # drop lingering connection objects before unlinking

    last_error = None
    for attempt in range(6):
        try:
            os.remove(db_path)
            last_error = None
            break
        except PermissionError as exc:
            last_error = exc
            time.sleep(0.5 * (attempt + 1))
    if last_error is not None:
        raise RuntimeError(
            f"Could not delete test DB {db_path} on Windows after retries: "
            f"{last_error}. A SQLAlchemy connection/session was likely left "
            "open. Ensure every SessionLocal() is closed."
        )

    try:
        os.rmdir(tmpdir)
    except OSError:
        pass  # non-empty tmpdir is harmless; the DB file itself is gone


@pytest.fixture(scope="session")
def seeded(e2e_db):
    """Seed clean, deterministic E2E entities with RFC-valid emails."""
    from app.core.security import get_password_hash
    from app.database import models

    SessionLocal = e2e_db["SessionLocal"]
    db = SessionLocal()
    db.expire_on_commit = False

    def mk_user(email, name, role):
        u = models.User(email=email, name=name, role=role,
                        hashed_password=get_password_hash("Passw0rd!"))
        db.add(u)
        db.commit()
        db.refresh(u)
        return u

    teacher = mk_user("teacher_e2e@example.com", "E2E Teacher", "teacher")
    student_a = mk_user("student_a_e2e@example.com", "E2E Student A", "student")
    student_b = mk_user("student_b_e2e@example.com", "E2E Student B", "student")
    outsider = mk_user("outsider_e2e@example.com", "E2E Outsider", "student")

    classroom = models.Classroom(name="E2E Chemistry 12", teacher_id=teacher.id)
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    classroom.students.extend([student_a, student_b])
    db.commit()

    assignment = models.Assignment(classroom_id=classroom.id,
                                   title="E2E Chemical Bonding HW")
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    q_a = models.AssignmentQuestion(assignment_id=assignment.id,
                                    question_number="1",
                                    question_text="Explain covalent bonding.",
                                    subject="Chemistry",
                                    topic="Chemical Bonding")
    q_b = models.AssignmentQuestion(assignment_id=assignment.id,
                                    question_number="2",
                                    question_text="Explain hydrogen bonding.",
                                    subject="Chemistry",
                                    topic="Chemical Bonding")
    db.add_all([q_a, q_b])
    db.commit()
    db.refresh(q_a)
    db.refresh(q_b)

    # Real question IDs ONLY — never None.
    assert q_a.id is not None and q_b.id is not None

    p_a = models.StudentQuestionProgress(
        classroom_id=classroom.id, assignment_id=assignment.id,
        question_id=q_a.id, student_id=student_a.id, subject="Chemistry",
        topic="Chemical Bonding", level=2, initial_attempt="A: tried once")
    p_b = models.StudentQuestionProgress(
        classroom_id=classroom.id, assignment_id=assignment.id,
        question_id=q_b.id, student_id=student_b.id, subject="Chemistry",
        topic="Chemical Bonding", level=4, attention_priority="high",
        initial_attempt="B: tried three times")
    db.add_all([p_a, p_b])
    db.commit()
    db.close()

    return {"teacher": teacher, "student_a": student_a,
            "student_b": student_b, "outsider": outsider,
            "classroom": classroom, "assignment": assignment,
            "question_a": q_a, "question_b": q_b,
            "progress_a": p_a, "progress_b": p_b}


@pytest.fixture(scope="session")
def client(e2e_db, seeded):
    """TestClient (delegating) plus JWTs from the REAL /auth/login endpoint.

    Usage: client.post(...)  /  client["token_a"], etc.
    """
    from fastapi.testclient import TestClient

    class ClientWithTokens:
        def __init__(self, inner, tokens):
            self._inner = inner
            self._tokens = tokens

        def __getitem__(self, key):
            return self._tokens[key]

        def __getattr__(self, name):
            return getattr(self._inner, name)

    app = _build_app()
    inner = TestClient(app)

    tokens = {}
    for key, email in (
        ("a", "student_a_e2e@example.com"),
        ("b", "student_b_e2e@example.com"),
        ("outsider", "outsider_e2e@example.com"),
        ("teacher", "teacher_e2e@example.com"),
    ):
        r = inner.post("/api/v1/auth/login",
                       data={"username": email, "password": "Passw0rd!"})
        assert r.status_code == 200, f"login failed for {email}: {r.text}"
        tokens[f"token_{key}"] = r.json()["access_token"]
    return ClientWithTokens(inner, tokens)
