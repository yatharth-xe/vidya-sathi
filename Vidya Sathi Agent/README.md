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
