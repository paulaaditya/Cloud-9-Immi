import pytest
from src.data.streamer import load_ability_supplement, stream_series_events


def test_stream_series_events_reads_first_envelopes():
    series_id = "2748743"
    envelopes = list(stream_series_events(series_id, max_envelopes=10))

    assert len(envelopes) == 10
    for envelope in envelopes:
        assert "sequenceNumber" in envelope
        assert isinstance(envelope["sequenceNumber"], int)
        assert "occurredAt" in envelope
        assert isinstance(envelope["occurredAt"], str)
        assert "events" in envelope
        assert isinstance(envelope["events"], list)


def test_stream_series_events_invalid_id_raises():
    invalid_id = "99999999_nonexistent_series"
    with pytest.raises(FileNotFoundError):
        list(stream_series_events(invalid_id))


def test_stream_series_events_zero_max_envelopes():
    series_id = "2748743"
    envelopes = list(stream_series_events(series_id, max_envelopes=0))
    assert len(envelopes) == 0


def test_load_ability_supplement_structure():
    series_id = "2748743"
    supplement = load_ability_supplement(series_id)

    assert isinstance(supplement, dict)
    assert len(supplement) > 0

    first_item = next(iter(supplement.values()))
    assert "grid_event_id" in first_item
    assert first_item["grid_event_id"] in supplement
    assert first_item["in_grid"] is True

    assert "interpolated" in first_item
    interpolated = first_item["interpolated"]
    assert isinstance(interpolated, dict)

    assert "position" in interpolated
    pos = interpolated["position"]
    assert "x" in pos and "y" in pos and "z" in pos
    assert isinstance(pos["x"], (int, float))
    assert isinstance(pos["y"], (int, float))
    assert isinstance(pos["z"], (int, float))
