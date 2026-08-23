# Vidya Sathi

> AI-assisted educational platform for students and teachers, combining NCERT-grounded learning, conversational learning-state tracking, practice intervention, scholarship discovery, teacher analytics, and teacher support notifications.

## Overview

Vidya Sathi is a full-stack educational platform built around a student learning workflow and a teacher support workflow.

```text
Teacher
  │
  ├── Create classroom
  ├── Enroll students
  ├── Publish assignments
  ├── Upload assignment PDFs
  ├── Add structured questions
  ├── View learning analytics
  └── Receive support notifications

Student
  │
  ├── Join classroom
  ├── View assignments
  ├── Read assignment PDFs
  ├── Ask contextual doubts
  ├── Get NCERT-grounded explanations
  ├── Discover scholarships
  └── Participate in practice quizzes

Student Agent ────────────────► Shared learning-state database ◄──────────── Teacher Agent
     │                                      │                                  │
     ├── ncert_retriever                     │                                  ├── get_student_progress
     ├── student_learning_state              │                                  │
     └── scholarship_web_search              │                                  └── Classroom analysis
                                             │
                                             └── Teacher notifications / analytics
```

## Core Capabilities

### Student platform

- JWT-based authentication and role separation.
- Student dashboard with enrolled classrooms and assignments.
- Classroom and assignment browsing.
- Authenticated assignment PDF viewing/downloading.
- Contextual `Ask Doubt` flow from assignment questions.
- NCERT-grounded Student Agent responses with citations.
- Scholarship discovery through web search with source URLs.
- Conversational learning-state persistence.
- Level-based intervention flow.
- Level 3 practice quiz.
- Quiz-authoritative level transitions.
- Teacher intimation for Level 3/4 learning states.

### Teacher platform

- Teacher dashboard.
- Classroom management.
- Student roster visibility.
- Assignment publishing.
- PDF upload/replacement.
- Structured question management.
- Teacher support notifications.
- Deterministic classroom analytics.
- Teacher Agent insights.
- Read-only `get_student_progress` tool over authorized classroom data.

## Student Agent

The Student Agent contains exactly three tools.

### 1. `ncert_retriever`

Used for educational/NCERT questions.

Validated retrieval architecture:

- NCERT corpus: 2587 chunks.
- Chroma collection: `ncert_knowledge`.
- Embeddings: `BAAI/bge-small-en-v1.5`.
- BM25: `k1=1.5`, `b=0.75`.
- Hybrid retrieval: candidate pool 50 and RRF `k=60`.
- Chemistry keyword gate.
- Chemistry: BM25 route.
- Non-Chemistry: BM25 + BGE + RRF route.
- Real NCERT metadata is used for citations.

**Important:** the NCERT retrieval stack is treated as a validated component and should not be replaced or duplicated casually.

### 2. `student_learning_state`

This is a controlled write tool.

The Student Agent can persist conversational learning state for the authenticated student. The LLM never supplies `student_id` as a free identity field.

Logical scope:

```text
student_id        ← injected from authenticated JWT context
classroom_id
assignment_id
topic
question_id
level
```

The service validates classroom membership and assignment/question relationships before writing.

The conversational track uses:

```text
Level 1 → demonstrated understanding / doubt cleared
Level 2 → partial understanding / guided help
Level 3 → continued struggle / practice recommended
Level 4 → substantial or persistent difficulty / teacher support
```

The write path does not directly own quiz score or teacher notification business rules.

### 3. `scholarship_web_search`

Used for current scholarship discovery.

Behavior:

- Prefers official/government/education sources.
- Preserves source URLs.
- Treats web content as untrusted data.
- Does not invent student income, marks, category, age, state, or course details.
- Sanitizes and bounds web input/result size.
- Handles timeouts and network failures safely.
- Keeps Web citations separate from NCERT citations.

Optional Tavily support can be enabled with `TAVILY_API_KEY`; the project also contains a keyless DuckDuckGo HTML fallback.

## Teacher Agent

The Teacher Agent has one database-oriented tool:

### `get_student_progress`

This is a read-only tool.

Teacher identity is derived from the authenticated teacher JWT and classroom ownership is verified before data is returned.

The tool can provide classroom-scoped progress data such as:

- student ID/name
- classroom ID
- assignment ID
- question ID
- topic/subject
- level
- quiz score
- attention priority
- teacher intimation state
- update time

The Teacher Agent uses those records to answer questions such as:

- Which students need support?
- Which topic is most difficult?
- Which question is most difficult?
- How many students are at Level 3 or Level 4?

The database tool is read-only; it does not modify student progress.

## Learning-State Ownership

The platform uses a shared SQLite learning-state model.

```text
Student Agent
    │
    │ controlled WRITE / UPDATE
    ▼
learning_state_service
    │
    ▼
SQLite
    ▲
    │ controlled READ ONLY
    │
Teacher Agent
```

### Two-track level authority

#### Conversational track

The Student Agent assesses the ongoing interaction and may persist a conversational level through the controlled learning-state tool.

#### Quiz track

Practice quiz results are authoritative in the backend.

Current policy:

```text
>= 80%     → Level 1
60–79%     → Level 2
< 60%      → Level 4 + teacher notification
```

The Student Agent cannot overwrite a quiz-authoritative level when a quiz score is already present.

### Teacher intimation

Teacher support is represented in the shared learning state and surfaced in the Teacher Dashboard/notifications flow. The intended student-support policy is:

```text
Level 1 → no teacher intimation
Level 2 → no teacher intimation
Level 3 → teacher intimation
Level 4 → teacher intimation
```

Teacher notifications are backend-controlled; the Student Agent tool does not directly create notification records.


# Student Learning State — Shared Learning Intelligence

The **Student Learning State** is the shared state layer between the Student Agent, backend learning logic, Teacher Dashboard, and Teacher Agent.

It is **not** a chat feature and it is **not** a separate database. It is the structured learning record stored in the existing SQLite database and controlled by the backend.

## Why Student Learning State Exists

The Student Agent learns from the student's interaction with an assignment question.

For every relevant student/question context, the system can maintain:

```text
student_id
classroom_id
assignment_id
topic
question_id
level
quiz_score
teacher_intimated
attention_priority
initial_attempt
...
```

The important idea is:

```text
Student Agent
      │
      │ writes conversational learning state
      ▼
┌─────────────────────────────┐
│      SQLite Database        │
│ student_question_progress   │
└──────────────┬──────────────┘
               │
               │ read-only
               ▼
        Teacher Agent
               │
               ▼
      Teacher Dashboard
```

The Student Agent **writes/scopes learning state**, while the Teacher Agent **reads and analyzes the same state**.

## Student Learning-State Tree

The complete learning-state architecture is:

```text
                    ┌───────────────────────┐
                    │      STUDENT          │
                    │ asks assignment doubt│
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    Student Agent      │
                    └───────────┬───────────┘
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
       NCERT Question      Progress/State     Scholarship
             │                  │                  │
             ▼                  ▼                  ▼
      ncert_retriever    student_learning_state  web search
                                │
                                │ controlled WRITE
                                ▼
                  ┌──────────────────────────────┐
                  │     learning_state_service   │
                  │  validation + authorization │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │          SQLite              │
                  │ student_question_progress    │
                  └──────────────┬───────────────┘
                                 │
                     ┌───────────┴────────────┐
                     │                        │
                     │ READ                   │ READ
                     ▼                        ▼
          ┌─────────────────────┐   ┌──────────────────────┐
          │ Teacher Dashboard   │   │     Teacher Agent    │
          │ counts/notifications│   │ get_student_progress │
          └─────────────────────┘   └──────────┬───────────┘
                                               │
                                               ▼
                                      Classroom analysis
```

## What the Student Agent Writes

The Student Agent's `student_learning_state` tool is a **controlled write/update tool**.

The LLM-visible fields are deliberately limited:

```text
classroom_id
assignment_id
question_id
topic
level
```

The Student Agent does **NOT** choose the student's identity.

The backend injects:

```text
student_id = authenticated JWT student
```

Therefore the security boundary is:

```text
Student JWT
    │
    ▼
current_student.id
    │
    ▼
agent_service
    │
    ▼
StudentAgentAdapter
    │
    ▼
authorized WriteScope
    │
    ▼
student_learning_state
    │
    ▼
learning_state_service
```

The tool cannot simply say:

```text
student_id = 999
```

to modify another student's state.

## Learning-State Record Scope

A progress record is logically associated with:

```text
(student_id,
 classroom_id,
 assignment_id,
 topic,
 question_id)
```

Example:

```text
Student 10
Classroom 4
Assignment 4
Topic: Chemical Bonding
Question 3
Level: 2
```

This means the state is **question/context specific**, not a single global "student level."

A student can therefore have different learning states for different questions/topics.

Example:

```text
Student 10

Classroom 4
├── Assignment 4
│   ├── Question 1
│   │   └── Chemical Bonding → Level 1
│   ├── Question 2
│   │   └── Chemical Bonding → Level 2
│   └── Question 3
│       └── Chemical Bonding → Level 3
│
└── Assignment 5
    └── Question 1
        └── Atomic Structure → Level 1
```

This is why the Teacher Agent can analyze **which question or topic is difficult**, rather than treating the entire student as having one permanent level.

## Two-Track Level Authority

The learning state has two important sources of level decisions.

```text
                       Learning Level
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
   Conversational Track               Quiz Track
              │                             │
       Student Agent                  Backend Quiz Service
              │                             │
       assesses doubt                 evaluates score
              │                             │
              ▼                             ▼
   student_learning_state          quiz_service
              │                             │
              └──────────────┬──────────────┘
                             ▼
                    Student Progress State
```

### Track 1 — Conversational Level

The Student Agent assesses the learning interaction.

```text
Level 1
→ demonstrated understanding / doubt cleared

Level 2
→ partial understanding / guided help

Level 3
→ continued struggle / practice recommended

Level 4
→ substantial or persistent difficulty
   / teacher support recommended
```

The Student Agent can persist this conversational assessment through the controlled learning-state service.

It must not invent student identity, access raw SQL, or directly create teacher notifications.

### Track 2 — Quiz Level

Quiz results are **backend-authoritative**.

```text
Practice Quiz
      │
      ▼
quiz_service.evaluate_quiz_performance()
      │
      ├── >= 80%  → Level 1
      │
      ├── 60–79%  → Level 2
      │
      └── < 60%   → Level 4
                         │
                         └── Teacher notification
```

The conversational Student Agent cannot overwrite a quiz-authoritative level when the progress record already contains a quiz score.

```text
quiz_score != NULL
       │
       ▼
Quiz state is authoritative
       │
       ▼
student_learning_state cannot replace the level
```

## Teacher Intimation Flow

Teacher intimation is controlled by the backend and shared through the learning state/notification system.

Conceptually:

```text
Student interaction
       │
       ▼
Student Agent assessment
       │
       ├── Level 1 ───────────► no teacher intimation
       │
       ├── Level 2 ───────────► no teacher intimation
       │
       ├── Level 3 ───────────► teacher_intimated = TRUE
       │                              │
       │                              ▼
       │                       Teacher notification
       │
       └── Level 4 ───────────► teacher_intimated = TRUE
                                      │
                                      ▼
                               Teacher notification
```

Teacher notifications are not created directly by the Student Agent tool. They remain backend-controlled.

## Shared Database: Student → Teacher

The most important architectural relationship is that **both agents use the same learning-state data**.

```text
                    STUDENT SIDE
                         │
                         ▼
                Student Agent
                         │
                         │ WRITE
                         ▼
        ┌─────────────────────────────────┐
        │          SQLite                 │
        │                                 │
        │   student_question_progress     │
        │                                 │
        │ student_id                      │
        │ classroom_id                    │
        │ assignment_id                   │
        │ topic                           │
        │ question_id                     │
        │ level                           │
        │ quiz_score                      │
        │ teacher_intimated               │
        │ attention_priority              │
        └────────────────┬────────────────┘
                         │
                         │ READ ONLY
                         ▼
                  Teacher Agent
                         │
                  get_student_progress
                         │
                         ▼
              Teacher analysis/insights
                         │
                         ▼
                 Teacher Dashboard
```

This means the Teacher Agent does not need another independent learning database.

## Example: Student Struggles With One Question

Suppose a student repeatedly struggles with:

```text
Topic: Chemical Bonding
Question: "Why does Na+ form?"
```

The interaction can produce:

```text
Student Agent
     ↓
Level 3 conversational assessment
     ↓
student_learning_state
     ↓
SQLite

student_id       = 10
classroom_id     = 4
assignment_id    = 4
topic            = Chemical Bonding
question_id      = 3
level            = 3
teacher_intimated = TRUE
```

Then the Teacher Agent can read the same row:

```text
Teacher Agent
     ↓
get_student_progress
     ↓
Chemical Bonding
     ↓
Question 3
     ↓
Student 10
     ↓
Level 3
```

If multiple students have the same pattern:

```text
Student 10 → Chemical Bonding Q3 → L3
Student 11 → Chemical Bonding Q3 → L4
Student 12 → Chemical Bonding Q3 → L3
```

the Teacher Agent can reason:

```text
Question 3 is causing difficulty for multiple students.
Chemical Bonding is a high-attention topic.
Teacher support may be useful.
```

## Teacher Progress Tool

The Teacher Agent uses:

```text
get_student_progress
```

This tool is **read-only**.

Its flow:

```text
Teacher JWT
   │
   ▼
current_teacher.id
   │
   ▼
classroom ownership validation
   │
   ▼
TeacherReadScope
   │
   ▼
get_student_progress
   │
   ▼
learning_state_service
   │
   ▼
SQLite
   │
   ▼
authorized progress records
   │
   ▼
Teacher Agent reasoning
```

The Teacher Agent can filter by:

```text
classroom
assignment
topic
level
```

and analyze questions/students from the returned data.

It cannot:

```text
write progress
change a level
change quiz_score
create teacher notifications
access another teacher's classroom
```

## Why the Learning-State Service Exists

Neither agent should access SQLite directly.

The safe boundary is:

```text
                 NOT ALLOWED
                    ┌─────┐
Student Agent ─────►│ SQL │
Teacher Agent ─────►│ DB  │
                    └─────┘

                 ALLOWED
Student Agent
     │
     ▼
learning_state_service
     │
     ▼
CRUD
     │
     ▼
SQLite

Teacher Agent
     │
     ▼
learning_state_service
     │
     ▼
CRUD
     │
     ▼
SQLite
```

The service is responsible for:

- authorization
- classroom membership
- assignment/question relationship checks
- allowed field updates
- quiz-authority protection
- read/write boundaries
- controlled serialization

## Data Integrity Rules

The learning-state implementation follows these rules:

1. `student_id` comes from authenticated backend identity.
2. The Student Agent can only write within its injected authorization scope.
3. The Teacher Agent can only read teacher-owned classrooms.
4. The Teacher Agent is read-only.
5. The Student Agent cannot overwrite quiz-authoritative state.
6. The Student Agent does not directly create teacher notifications.
7. Agents never receive raw SQLAlchemy sessions or SQLite connections.
8. Progress data is scoped to classroom/assignment/topic/question.
9. Dashboard metrics should count distinct students where the metric means "students," not raw progress rows.
10. E2E tests use isolated temporary databases rather than the production/demo database.

## Learning-State Testing

A useful manual verification path is:

```text
1. Student asks assignment doubt
        ↓
2. Student Agent responds
        ↓
3. Conversational level is assessed
        ↓
4. student_learning_state writes state
        ↓
5. SQLite row changes
        ↓
6. Teacher Dashboard refreshes
        ↓
7. Teacher sees support/intimation
        ↓
8. Teacher Agent get_student_progress
        ↓
9. Teacher Agent analyzes the same state
```

For database inspection on Windows PowerShell:

```powershell
cd backend

py -c "import sqlite3; con=sqlite3.connect('vidya_sathi.db'); print(*con.execute('SELECT student_id,classroom_id,assignment_id,topic,question_id,level,quiz_score,teacher_intimated FROM student_question_progress ORDER BY id DESC LIMIT 20').fetchall(), sep='\n'); con.close()"
```

Do not manually modify learning-state rows during normal testing. Use the application workflow so authorization and business rules are exercised.

## Learning-State Security Test Matrix

```text
Student A
   │
   ├── write own classroom/question → ALLOWED
   │
   └── write Student B's state      → REJECTED

Teacher A
   │
   ├── read own classroom            → ALLOWED
   │
   └── read Teacher B's classroom    → REJECTED

Teacher Agent
   │
   └── modify progress               → NOT ALLOWED

Student Agent
   │
   └── provide arbitrary student_id  → NOT ALLOWED
```

This shared learning-state architecture is one of the core design boundaries of Vidya Sathi and should be preserved when extending either agent.

## Architecture

```text
                     ┌────────────────────┐
                     │      React UI      │
                     └─────────┬──────────┘
                               │
                               ▼
                     ┌────────────────────┐
                     │    FastAPI API     │
                     │      + JWT         │
                     └─────────┬──────────┘
                               │
             ┌─────────────────┼──────────────────┐
             │                 │                  │
             ▼                 ▼                  ▼
      Student services   Teacher services    Agent services
             │                 │                  │
             │                 │          ┌───────┴─────────┐
             │                 │          │                 │
             │                 │          ▼                 ▼
             │                 │    Student Agent     Teacher Agent
             │                 │          │                 │
             │                 │          │                 │
             └────────────┬────┴──────────┴─────────────────┘
                          ▼
                   SQLite / CRUD layer
                          │
                  learning_state_service
```

## Repository Structure

The repository is organized around three main areas:

```text
vidya_sathi/
├── backend/
│   ├── app/
│   │   ├── api/                  # FastAPI routes
│   │   ├── core/                 # config, auth/security, dependencies
│   │   ├── database/             # DB/session setup, models and CRUD
│   │   ├── schemas/              # Pydantic API/data schemas
│   │   └── services/             # application/agent/analytics services
│   ├── tests/                    # reusable backend + E2E tests
│   ├── uploads/                  # runtime assignment PDF storage
│   ├── requirements.txt
│   └── vidya_sathi.db            # local/demo SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── router.jsx
│   ├── package.json
│   └── ...
│
└── Vidya Sathi Agent/
    ├── agent/
    │   ├── student_agent.py
    │   ├── tools.py
    │   ├── prompts.py
    │   └── retrieval/
    ├── tests/
    ├── config/
    ├── data/
    └── README.md
```

## Environment Variables

### Vidya Sathi Agent

Create a local file:

```text
Vidya Sathi Agent/.env
```

Do **not** commit it.

Required:

```env
OLLAMA_API_KEY=your_ollama_cloud_key
OLLAMA_BASE_URL=your_ollama_base_url
VIDYA_SATHI_MODEL=your_model_name
```

Optional scholarship configuration:

```env
TAVILY_API_KEY=your_tavily_key
SCHOLARSHIP_SEARCH_TIMEOUT=10
SCHOLARSHIP_MAX_RESULTS=5
```

Use `.env.example` as the shareable template. Never place real keys in Git.

## Local Development

### Prerequisites

Recommended local prerequisites:

- Git
- Python 3.11+ (the validated environment used Python 3.12)
- Node.js 20+
- npm
- PowerShell on Windows
- Internet access for Ollama Cloud and optional scholarship search

### Clone the repository

```powershell
git clone https://github.com/yatharth-xe/vidya-sathi.git
cd vidya-sathi
git checkout dev
git pull origin dev
```

### Backend setup

Open PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip check
```

If PowerShell blocks activation, you can also run the venv Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip check
```

### Backend configuration

The FastAPI backend uses SQLite by default:

```text
sqlite:///./vidya_sathi.db
```

The active application database is `backend/vidya_sathi.db` when the backend is started from `backend/`.

### Start backend

From the repository root:

```powershell
uvicorn app.main:app --reload --app-dir backend
```

Or from `backend/`:

```powershell
uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger/OpenAPI:

```text
http://127.0.0.1:8000/docs
```

### Frontend setup

Open a second PowerShell window:

```powershell
cd frontend
npm install
```

Run the frontend using the development script defined by the project. In environments where the project is configured with Vite:

```powershell
npm run dev
```

If your local `package.json` exposes the React development server as `start`, use:

```powershell
npm start
```

The terminal will print the exact local URL, commonly:

```text
http://localhost:3000
```

### Frontend production build

```powershell
cd frontend
npm run build
```

## Running the Student Agent Standalone

From the agent directory:

```powershell
cd "Vidya Sathi Agent"
python -m agent.student_agent "Explain chemical bonding."
```

The Student Agent requires the agent environment variables and the validated NCERT runtime artifacts.

## Runtime NCERT Artifacts

The Student Agent depends on its local retrieval artifacts, including:

```text
Vidya Sathi Agent/data/knowledge_chunks_final.jsonl
Vidya Sathi Agent/data/chroma_db/
Vidya Sathi Agent/data/model_cache/
```

These are runtime assets for the validated retrieval pipeline. Do not replace them casually with a new retrieval system.

## Authentication

Canonical login:

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded
```

Request fields:

```text
username=<email>
password=<password>
```

Registration:

```http
POST /api/v1/auth/register
```

Current profile:

```http
GET /api/v1/auth/me
Authorization: Bearer <JWT>
```

JWTs are attached to API requests by the frontend service layer.

## Important API Endpoints

### Student

```text
GET  /api/v1/classrooms/
GET  /api/v1/classrooms/{classroom_id}
POST /api/v1/classrooms/{classroom_id}/enroll
GET  /api/v1/student/assignments
GET  /api/v1/student/assignments/{assignment_id}
GET  /api/v1/student/assignments/{assignment_id}/file
POST /api/v1/agents/student/chat
POST /api/v1/student/quiz/start
POST /api/v1/student/quiz/submit
```

### Teacher

```text
GET  /api/v1/classrooms/
POST /api/v1/classrooms/
GET  /api/v1/classrooms/{classroom_id}
GET  /api/v1/assignments/
POST /api/v1/assignments/
GET  /api/v1/assignments/{assignment_id}
POST /api/v1/assignments/{assignment_id}/upload-pdf
GET  /api/v1/assignments/{assignment_id}/questions
POST /api/v1/assignments/{assignment_id}/questions
GET  /api/v1/teacher/notifications
PATCH /api/v1/teacher/notifications/{notification_id}/read
POST /api/v1/agents/teacher/insights/{classroom_id}
```

## PDF Workflow

The validated PDF contract is direct file upload/download; there is no signed/presigned URL implementation in the current codebase.

Teacher upload:

```text
POST /api/v1/assignments/{assignment_id}/upload-pdf
```

Student PDF access:

```text
GET /api/v1/student/assignments/{assignment_id}/file
```

Uploaded files are stored under:

```text
backend/uploads/
```

## Manual Test Flow

For a complete manual platform test, use this order:

```text
Teacher Login
    ↓
Create Classroom
    ↓
Enroll Student
    ↓
Create Assignment
    ↓
Upload PDF
    ↓
Add Questions
    ↓
Student Login
    ↓
Open Classroom
    ↓
Open Assignment
    ↓
Open PDF
    ↓
Ask Doubt
    ↓
NCERT Student Agent
    ↓
Scholarship Query
    ↓
Conversational Learning State
    ↓
Level 3 / Level 4 Teacher Intimation
    ↓
Practice Quiz
    ↓
Teacher Dashboard
    ↓
Teacher Agent get_student_progress
```

### Level checks

Conversational examples should exercise:

```text
L1 → demonstrated understanding
L2 → partial understanding / guided help
L3 → continued struggle / practice recommended
L4 → substantial/persistent difficulty
```

Quiz checks:

```text
5/5 or 4/5 → Level 1
3/5          → Level 2
0–2/5        → Level 4 + teacher notification
```

## Testing

### Student Agent unit tests

From the agent directory:

```powershell
cd "Vidya Sathi Agent"
pytest tests/test_student_agent.py
```

### Backend tests

From repository root:

```powershell
pytest backend/tests -q
```

### Safe Student Agent E2E tests

```powershell
pytest backend/tests/test_e2e_student_agent.py
```

The E2E harness is designed to use an isolated temporary SQLite database rather than the real demo database. This is important on Windows because it avoids contaminating `backend/vidya_sathi.db` and handles SQLite file cleanup carefully.

### Full validation

```powershell
# Backend import
python -c "from app.main import app; print('Backend import OK')"

# Python dependency check
pip check

# Backend tests
pytest backend/tests -q

# Agent tests
pytest "Vidya Sathi Agent/tests/test_student_agent.py"

# Student Agent E2E
pytest backend/tests/test_e2e_student_agent.py

# Frontend build
cd frontend
npm install
npm run build
```

## Security Model

### Student identity

Student identity is derived from the authenticated JWT. The Student Agent learning-state tool does not trust an LLM-supplied student ID.

### Teacher identity

Teacher identity is derived from the authenticated JWT and teacher classroom ownership is verified before progress data is exposed.

### Agent database boundaries

Neither agent receives raw SQLAlchemy sessions, database connections, CRUD modules, or arbitrary SQL.

```text
Agent
  ↓
controlled service
  ↓
CRUD
  ↓
SQLite
```

### Quiz authority

The conversational learning-state tool cannot overwrite quiz-authoritative progress when a quiz score is already present.

### Scholarship web security

Web results are treated as untrusted data. URLs are validated before being returned, input/result sizes are bounded, and secrets remain server-side.

## Common Windows Issues

### SQLite `PermissionError: WinError 32`

If a test database cannot be deleted, stop running Uvicorn/Python processes that may still hold the SQLite file and re-run the test. The safe E2E harness disposes its test engine and retries cleanup.

### `sqlite3` command not found

The Windows environment does not necessarily include the SQLite CLI. Use Python instead:

```powershell
py -c "import sqlite3; con=sqlite3.connect('vidya_sathi.db'); print(con.execute('SELECT 1').fetchone()); con.close()"
```

### PDF 404

Check:

```powershell
Get-ChildItem .\uploads
```

If an assignment has a stored path but its physical PDF is missing, re-upload the PDF through the Teacher UI.

### `npm`/Node problems

Check:

```powershell
node --version
npm --version
```

Node 20+ is recommended for the current browser automation tooling.

## Browser Automation / Playwright MCP

For debugging the actual UI, Cline can use Playwright MCP to control a browser.

Typical Cline MCP configuration:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "timeout": 60,
      "args": [
        "-y",
        "@playwright/mcp@latest"
      ],
      "disabled": false
    }
  }
}
```

On Windows, if Cline cannot find `npx`, use the absolute path to `npx.cmd`, for example:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "timeout": 60,
      "args": [
        "-y",
        "@playwright/mcp@latest"
      ],
      "disabled": false
    }
  }
}
```

## Git / Team Workflow

The shared development branch is:

```text
dev
```

Typical workflow:

```powershell
git checkout dev
git pull origin dev
# make changes
git status
git add .
git commit -m "describe the change"
git push origin dev
```

Do not commit:

```text
.env
node_modules/
.venv/
__pycache__/
.pytest_cache/
temporary SQLite databases
runtime logs
```

## Handoff Notes

Important integration boundaries:

- `backend/app/services/student_agent_adapter.py` — backend integration boundary for the Student Agent.
- `backend/app/services/learning_state_service.py` — controlled shared learning-state bridge.
- `backend/app/services/teacher_agent_tools.py` — Teacher Agent progress tool.
- `backend/app/services/analytics_service.py` — deterministic teacher analytics.
- `Vidya Sathi Agent/agent/student_agent.py` — Student Agent entry point.
- `Vidya Sathi Agent/agent/tools.py` — Student Agent tools.

### Known limitations

- Conversational learning-state fallback is heuristic rather than a perfect educational evaluator.
- The current learning-state idempotency guard is in-process; multi-worker deployments should eventually use database-level idempotency as defense-in-depth.
- DuckDuckGo HTML fallback for scholarship search is markup-sensitive; Tavily is more robust when configured.
- Web prompt-injection protection is layered but not absolute.
- The NCERT corpus is the validated knowledge source; non-NCERT academic coverage should not be assumed to have NCERT evidence.

## Troubleshooting Philosophy

When debugging, trace the whole data path before changing code:

```text
SQLite
  ↓
CRUD
  ↓
Service
  ↓
FastAPI endpoint
  ↓
Frontend API service
  ↓
React state
  ↓
Rendered UI
```

For agents:

```text
User query
  ↓
FastAPI
  ↓
agent_service
  ↓
adapter
  ↓
agent/tool
  ↓
controlled service
  ↓
SQLite or retrieval source
  ↓
agent response
  ↓
FastAPI response
  ↓
React
```

Avoid hardcoded/fake metrics when the metric should be derived from the database.

## Demo Checklist

Before a live demo:

```text
[.] Backend starts successfully
[.] Frontend starts successfully
[.] Swagger opens
[.] Teacher can log in
[.] Teacher dashboard loads
[.] Classroom exists
[.] Assignment exists
[.] PDF exists in backend/uploads
[.] Questions exist
[.] Student can log in
[.] Student can open assignment
[.] PDF displays
[.] Ask Doubt works
[.] NCERT citations display
[.] Scholarship search works
[.] Learning-state persists
[ ] Level 3/4 teacher intimation works
[ ] Practice quiz works
[ ] Teacher notifications appear
[ ] Teacher Agent insights load
[.] No secrets are committed
[.] Git status is clean or only intentional changes exist
``
