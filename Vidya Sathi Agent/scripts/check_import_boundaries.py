"""Check runtime packages do not import Knowledge_Base or evaluation scripts."""

from __future__ import annotations

import ast
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_PACKAGES = ("agent", "retrieval", "vector_db", "config")


def main() -> int:
    violations: list[str] = []
    for package in RUNTIME_PACKAGES:
        for path in (PROJECT_ROOT / package).rglob("*.py"):
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            for node in ast.walk(tree):
                names: list[str] = []
                if isinstance(node, ast.Import):
                    names = [alias.name for alias in node.names]
                elif isinstance(node, ast.ImportFrom) and node.module:
                    names = [node.module]
                for name in names:
                    if name.startswith("evaluation") or "Knowledge_Base" in name:
                        violations.append(f"{path}: {name}")
    if violations:
        print("Forbidden imports:")
        for item in violations:
            print(f"  {item}")
        return 1
    print("OK: runtime packages do not import Knowledge_Base or evaluation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
