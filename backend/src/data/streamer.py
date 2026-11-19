import io
import json
import pathlib
from typing import Any, Dict, Iterator, Optional, Union

import zstandard

from src.config import get_settings


def _resolve_events_path(series_id: Union[str, pathlib.Path]) -> pathlib.Path:
    settings = get_settings()
    if isinstance(series_id, pathlib.Path):
        if series_id.is_file():
            return series_id
        series_id = str(series_id)

    path_candidate = pathlib.Path(series_id)
    if path_candidate.is_file():
        return path_candidate

    candidates = [
        settings.VAL_DIR / f"events_{series_id}_grid.jsonl.zst",
        settings.VAL_DIR / f"{series_id}.jsonl.zst",
        settings.VAL_DIR / f"events_{series_id}.jsonl.zst",
        settings.VAL_DIR / f"{series_id}_grid.jsonl.zst",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate

    return candidates[0]


def _resolve_supplement_path(series_id: Union[str, pathlib.Path]) -> pathlib.Path:
    settings = get_settings()
    if isinstance(series_id, pathlib.Path):
        if series_id.is_file():
            return series_id
        series_id = str(series_id)

    path_candidate = pathlib.Path(series_id)
    if path_candidate.is_file():
        return path_candidate

    candidates = [
        settings.SUPPLEMENT_DIR / f"{series_id}.jsonl.zst",
        settings.SUPPLEMENT_DIR / f"events_{series_id}_grid.jsonl.zst",
        settings.SUPPLEMENT_DIR / f"supplement_{series_id}.jsonl.zst",
        settings.SUPPLEMENT_DIR / f"{series_id}_supplement.jsonl.zst",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate

    return candidates[0]


def _generate_series_events(
    path: pathlib.Path, max_envelopes: Optional[int] = None
) -> Iterator[Dict[str, Any]]:
    dctx = zstandard.ZstdDecompressor()
    count = 0
    with open(path, "rb") as file_handle:
        with dctx.stream_reader(file_handle) as reader:
            text_stream = io.TextIOWrapper(reader, encoding="utf-8")
            for line in text_stream:
                line_text = line.strip()
                if not line_text:
                    continue
                envelope = json.loads(line_text)
                yield envelope
                count += 1
                if max_envelopes is not None and count >= max_envelopes:
                    break


def stream_series_events(
    series_id: Union[str, pathlib.Path], max_envelopes: Optional[int] = None
) -> Iterator[Dict[str, Any]]:
    """Stream decompression line-by-line of series events via zstandard without disk inflation."""
    path = _resolve_events_path(series_id)
    if not path.is_file():
        raise FileNotFoundError(f"Series event file not found for series ID: {series_id} at {path}")

    if max_envelopes is not None and max_envelopes <= 0:
        return iter(())

    return _generate_series_events(path, max_envelopes)


def load_ability_supplement(
    series_id: Union[str, pathlib.Path]
) -> Dict[str, Dict[str, Any]]:
    """Load ability supplement records mapped by grid_event_id where in_grid is true."""
    path = _resolve_supplement_path(series_id)
    if not path.is_file():
        raise FileNotFoundError(
            f"Ability supplement file not found for series ID: {series_id} at {path}"
        )

    supplement_map: Dict[str, Dict[str, Any]] = {}
    dctx = zstandard.ZstdDecompressor()

    with open(path, "rb") as file_handle:
        with dctx.stream_reader(file_handle) as reader:
            text_stream = io.TextIOWrapper(reader, encoding="utf-8")
            for line in text_stream:
                line_text = line.strip()
                if not line_text:
                    continue
                record = json.loads(line_text)
                if record.get("in_grid") is True:
                    grid_event_id = record.get("grid_event_id")
                    if grid_event_id:
                        interpolated = record.get("interpolated")
                        if isinstance(interpolated, dict):
                            pos = interpolated.get("position")
                            if isinstance(pos, dict):
                                record.setdefault("x", pos.get("x"))
                                record.setdefault("y", pos.get("y"))
                                record.setdefault("z", pos.get("z"))
                                record.setdefault("caster_x", pos.get("x"))
                                record.setdefault("caster_y", pos.get("y"))
                                record.setdefault("caster_z", pos.get("z"))
                            view = interpolated.get("view")
                            if isinstance(view, dict):
                                record.setdefault("aim_x", view.get("x"))
                                record.setdefault("aim_y", view.get("y"))
                                record.setdefault("aim_z", view.get("z"))
                            vel = interpolated.get("velocity")
                            if isinstance(vel, dict):
                                record.setdefault("vel_x", vel.get("x"))
                                record.setdefault("vel_y", vel.get("y"))
                                record.setdefault("vel_z", vel.get("z"))
                        supplement_map[grid_event_id] = record

    return supplement_map
