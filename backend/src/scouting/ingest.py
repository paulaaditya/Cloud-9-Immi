"""Build the scouting cache from the GRID dataset.

    python -m src.scouting.ingest --team "Cloud9" --team "Cloud9 GC"
    python -m src.scouting.ingest --all --workers 6

The cache is derived from licensed data and is git-ignored (`.scout-cache/`).
"""

import argparse
import time

from src.scouting.catalog import find_team_ids, load_catalog
from src.scouting.store import build_many, cache_dir


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract scouting facts for teams into the local cache")
    ap.add_argument("--team", action="append", default=[], help="Team name (repeatable)")
    ap.add_argument("--all", action="store_true", help="Every series in the dataset")
    ap.add_argument("--workers", type=int, default=None)
    ap.add_argument("--force", action="store_true", help="Rebuild even if cached")
    args = ap.parse_args()

    cat = load_catalog()
    ids = set()
    if args.all:
        ids.update(cat.series.keys())
    for name in args.team:
        tids = find_team_ids(name)
        if not tids:
            print(f"! no team named {name!r}")
        for tid in tids:
            ids.update(cat.team_series.get(tid, []))
    ids = sorted(ids)
    print(f"{len(ids)} series -> {cache_dir()}")
    t = time.time()
    errors = build_many(ids, workers=args.workers, force=args.force)
    print(f"done in {time.time() - t:.0f}s, {len(errors)} errors")
    for sid, err in list(errors.items())[:20]:
        print(f"  {sid}: {err}")


if __name__ == "__main__":
    main()
