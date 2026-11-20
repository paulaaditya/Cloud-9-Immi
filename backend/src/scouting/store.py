"""Per-series extraction cache.

Extracted facts are derived from licensed GRID data, so the cache lives in `.scout-cache/` at the
project root, which is git-ignored. Never commit it.
"""

import json
import os
import pathlib
from concurrent.futures import ProcessPoolExecutor
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Optional

from src.config import get_settings
from src.scouting.extractor import extract_series

CACHE_VERSION = 2  # v2 adds per-round position snapshots and the list of players killed


def cache_dir() -> pathlib.Path:
    d = pathlib.Path(os.environ.get("C9_SCOUT_CACHE") or get_settings().PROJECT_ROOT / ".scout-cache")
    d.mkdir(parents=True, exist_ok=True)
    return d


def _path(series_id: str) -> pathlib.Path:
    return cache_dir() / f"{series_id}.v{CACHE_VERSION}.json"


def build_series(series_id: str, force: bool = False) -> Optional[str]:
    """Extract one series into the cache. Returns an error string on failure, else None."""
    p = _path(series_id)
    if p.exists() and not force:
        return None
    try:
        data = extract_series(series_id)
    except FileNotFoundError as exc:
        return str(exc)
    except Exception as exc:  # keep one bad feed from sinking a batch
        return f"{type(exc).__name__}: {exc}"
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    tmp.replace(p)
    return None


@lru_cache(maxsize=256)
def get_series(series_id: str) -> Optional[Dict[str, Any]]:
    """Load a series from cache, extracting on demand. None if the feed does not exist."""
    p = _path(series_id)
    if not p.exists():
        if build_series(series_id) is not None:
            return None
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def build_many(series_ids: Iterable[str], workers: Optional[int] = None, force: bool = False) -> Dict[str, str]:
    """Build caches in parallel. Returns {series_id: error} for failures."""
    ids: List[str] = list(series_ids)
    errors: Dict[str, str] = {}
    if not ids:
        return errors
    workers = workers or max(1, (os.cpu_count() or 2) - 1)
    if workers == 1 or len(ids) == 1:
        for sid in ids:
            err = build_series(sid, force)
            if err:
                errors[sid] = err
        return errors
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for sid, err in zip(ids, ex.map(build_series, ids, [force] * len(ids), chunksize=2)):
            if err:
                errors[sid] = err
    return errors
