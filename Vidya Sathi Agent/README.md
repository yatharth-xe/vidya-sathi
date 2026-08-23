# Vidya Sathi Agent

NCERT Student Learning Agent for Classes 11 and 12.

The Student Agent reasons and answers. The Retriever Tool only returns NCERT evidence.

```
Student question
        │
        ▼
 Student Agent  (Ollama Cloud, LangChain)
        │
        │  only tool: ncert_retriever(query, top_k)
        ▼
 Chemistry Keyword Gate
        │
        ├── Chemistry        → BM25
        └── Non-Chemistry    → BM25 + BGE + RRF
                │
                ▼
        Top-K NCERT chunks
                │
                ▼
 Student Agent answers from evidence + citations
```

This project was built from the validated `Knowledge_Base` runtime, not by copying that folder. Retrieval math is unchanged:

| System | Recall@10 |
|---|---|
| BM25 | 0.5938 |
| Global BM25 + BGE + RRF | 0.6250 |
| Chemistry-gated | 0.6302 |

BM25 uses `k1 = 1.5`, `b = 0.75`. Hybrid uses `candidate_k = 50` and RRF `k = 60`. Dense embeddings are `BAAI/bge-small-en-v1.5` in Chroma collection `ncert_knowledge` (2587 chunks).

## Folder responsibilities

| Path | Responsibility |
|---|---|
| `agent/` | Student Agent, prompt, and the single LangChain tool adapter |
| `retrieval/` | Chemistry gate, BM25, RRF, hybrid fusion, public `retrieve()` |
| `vector_db/` | Chroma manager and query-time BGE encoding |
| `config/` | Runtime paths, retrieval constants, Ollama settings |
| `data/` | Corpus JSONL, persistent Chroma store, BGE cache, gold queries |
| `examples/` | Minimal runnable entry points |
| `tests/` | Runtime tests and Recall@10 regression |
| `scripts/` | Chroma check, representative queries, live agent, import boundary |

## Dependency flow

```
config.settings
    ▲
    │
agent.student_agent ──► agent.tools ──► retrieval.retriever
                                              │
                     ChemistryKeywordGate ◄───┤
                     BM25Retriever      ◄─────┤
                     HybridRetriever    ◄─────┘
                            │
              ┌─────────────┴──────────────┐
              ▼                            ▼
     retrieval.bm25 / rrf          vector_db.embeddings
                                            │
                                            ▼
                                  vector_db.chroma_manager
                                            │
                                            ▼
                                  data/chroma_db + data/knowledge_chunks_final.jsonl
```

The Student Agent never imports BM25, BGE, or Chroma. Runtime packages never import `Knowledge_Base` or `evaluation`.

## Setup

```powershell
cd "C:\Users\Pavan\Downloads\Vidya Sathi Agent"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Put `OLLAMA_API_KEY` in `.env`. For Ollama Cloud set:

```
OLLAMA_BASE_URL=https://ollama.com
VIDYA_SATHI_MODEL=gpt-oss:120b-cloud
```

A local Ollama daemon can use `OLLAMA_BASE_URL=http://localhost:11434`.

PyTorch CUDA wheels, if needed, should be installed from the official PyTorch index rather than PyPI.

## Run

```powershell
python examples\retrieve_only.py
python -m agent.student_agent "Explain chemical bonding."
python scripts\verify_chroma.py
python scripts\run_representative_queries.py
python -m unittest discover -s tests -v
```

Live Student Agent (needs Ollama):

```powershell
python scripts\run_student_agent_live.py
$env:RUN_LIVE_AGENT_TESTS="1"; python -m unittest tests.test_student_agent.StudentAgentTest.test_ollama_cloud_student_agent
```

## Public interfaces

Retriever:

```python
from retrieval import retrieve

payload = retrieve("Explain chemical bonding.", top_k=10)
# payload["route"] is "bm25" or "bm25_bge_hybrid"
```

Student Agent:

```python
from agent import run_student_agent

result = run_student_agent("Explain the derivative of sin(x).", top_k=5)
print(result.final_answer)
```

## What was intentionally left out

Copied from `Knowledge_Base` only when required at runtime:

- `output/knowledge_chunks_final.jsonl` (2587 chunks)
- `vector_db/chroma_db` (persisted BGE vectors)
- `evaluation/embedding_queries.jsonl` (gold set for regression only)
- `evaluation/model_cache/.../bge-small-en-v1.5` (query encoder)

Excluded on purpose:

- Source NCERT PDFs — not needed after chunking
- `ncert_parser/` — preprocessing only
- Other `output/` artifacts (`qa_chunks`, quality reports, failed files)
- Evaluation harnesses, reranker experiments, obsolete routers (`student_agent_2`, subject router)
- Duplicate agent implementations
- Intermediate benchmark JSON/Markdown reports

Keep `Knowledge_Base` as the archive. Do not import it from this project.

---

# HANDOFF � 3-Tool Student Agent (Phase 6)

> Note: the diagram above predates Phase 2. The agent now has exactly THREE tools:

## Tools (exactly three � do not add more without re-running the full test suite)
1. `ncert_retriever(query, top_k)` � Chemistry-gated BM25/BGE/Chroma/RRF NCERT retrieval.
2. `student_learning_state()` � READ-ONLY snapshot of backend-injected progress (level, quiz score, teacher-support status). Takes NO arguments; identity comes only from the backend.
3. `scholarship_web_search(query)` � live web search for scholarships; official sources boosted, URLs validated (http/s only), text sanitized and size-capped, results hard-capped at 10, short timeout, fails safe.

Registered in `agent/tools.py::STUDENT_AGENT_TOOLS`; entry point `agent/student_agent.py::run_student_agent(query, top_k=None, model=None, learning_context=None)`.

## Backend integration
`POST /api/v1/agents/student/chat` ? `agent_service.run_student_chat` ? `NCERTStudentAgentAdapter` (`backend/app/services/student_agent_adapter.py`) ? `run_student_agent`. The adapter injects trusted `learning_context` from `StudentAgentRequest.current_progress` and clears it in a `finally` block. The agent NEVER touches SQLAlchemy/CRUD; level/quiz policy is owned by `quiz_service.py` + `agent_service.py`.

## Environment variables (.env, never committed)
| Variable | Purpose |
|---|---|
| `OLLAMA_API_KEY` | Ollama Cloud auth (required for live runs) |
| `OLLAMA_BASE_URL` | `https://ollama.com` (cloud) or local daemon |
| `VIDYA_SATHI_MODEL` | e.g. `gpt-oss:120b-cloud` |
| `TAVILY_API_KEY` | optional; scholarship search provider (keyless DuckDuckGo fallback exists) |
| `SCHOLARSHIP_SEARCH_TIMEOUT`, `SCHOLARSHIP_MAX_RESULTS` | optional knobs (hard cap 10) |

## Required runtime artifacts
- `data/knowledge_chunks_final.jsonl` (2587 chunks)
- `data/chroma_db/` (persistent Chroma store)
- `data/model_cache/` (BGE `bge-small-en-v1.5` cache)
- `.env` with at least `OLLAMA_*` values

## Tests & startup
```powershell
# Agent unit/integration tests (offline, deterministic)
python -m pytest "tests/test_student_agent.py" -q
# Full E2E through the real FastAPI app (isolated temp SQLite; LLM stubbed)
python -m pytest ..\backend\tests\test_e2e_student_agent.py -q
# Opt-in live tests (real Ollama Cloud / web search)
$env:RUN_LIVE_AGENT_TESTS="1"
# Backend
uvicorn app.main:app --reload --app-dir backend   # from repo root
# Frontend
cd frontend; npm run build
```
E2E NEVER touches `backend/vidya_sathi.db` (guarded in `conftest.py`).

## Known risks / behaviors
- Corpus is Class 11/12 CHEMISTRY-only: non-chemistry academic questions route via the gate and may be answered from assignment context without textbook citations � by design; no fabricated citations are emitted.
- Web results are untrusted data (prompt-enforced + sanitized); eligibility/deadlines must be verified on official pages.
- Scholarship fallback uses DuckDuckGo HTML scraping � markup changes degrade to empty results (fail-safe); set `TAVILY_API_KEY` for the robust path.
- Learning-state context holder assumes serialized agent runs (adapter uses a single-worker executor).
