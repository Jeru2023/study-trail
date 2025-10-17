# Repository Guidelines

## Project Structure & Module Organization
Start from the clean `main` branch. Place production code in `src/study_trail/`, grouping subpackages by domain (for example, `src/study_trail/sessions.py`). Mirrors of the source tree should live under `tests/` (`tests/test_sessions.py` exercises the example module). Store short-form documentation and diagrams in `docs/`, and keep automation utilities in `scripts/` (maintain both Bash and PowerShell variants when feasible). Use `assets/` for fixtures and small CSV references; notebooks and exploratory work belong in `notebooks/` with distilled results promoted into `src/`.

## Build, Test, and Development Commands
Target Python 3.11 locally. Create an isolated environment with `python -m venv .venv` and activate it before installing anything. Install dependencies via `pip install -r requirements.txt`; regenerate the lock file whenever dependencies shift. Until a Makefile or task runner is added, call `ruff check src tests` for linting and `pytest` for the full test suite. Use `pytest -k smoke` for quick confidence checks and `python -m build` before tagging a release candidate.

## Coding Style & Naming Conventions
Follow PEP 8 with 4-space indentation and wrap lines at 100 characters. All public functions, methods, and modules must carry type hints. Module files stay `snake_case`, classes `PascalCase`, constants `UPPER_SNAKE_CASE`, and fixtures `fixture_name`. Shell or PowerShell helpers follow the `verb-noun.ps1` pattern. Format code with `black` and lint with `ruff`; enable pre-commit hooks so both run automatically.

## Testing Guidelines
Use `pytest` for unit and integration coverage. Name files `test_<module>.py`, keep the arrange-act-assert pattern obvious, and describe intent with docstrings that read `Given_When_Then`. Centralize fixtures in `tests/conftest.py` and place sample payloads in `tests/data/`. Aim for at least 85% line coverage, verified with `pytest --cov=src --cov-report=term-missing`. Tag longer or external calls with `@pytest.mark.integration` and skip them by default unless `PYTEST_ADDOPTS="--run-integration"` is set.

## Commit & Pull Request Guidelines
Organize work into small commits using Conventional Commit prefixes (e.g., `feat: add spaced repetition scheduler`). Reference issues with `Closes #123`. Every pull request should include a concise summary, testing notes (`pytest`, `ruff`, coverage), follow-up tasks, and screenshots or CLI logs when behavior changes. Request at least one peer review and wait for CI checks to pass before merging, even if you have write access.
