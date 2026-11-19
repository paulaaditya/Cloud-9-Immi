import math
from typing import Optional
from src.models.match_state import Vector3D


def euclidean_distance_3d(
    p1: Optional[Vector3D], p2: Optional[Vector3D]
) -> Optional[float]:
    """Calculate Euclidean distance between two 3D points. Returns None if either point is None."""
    if p1 is None or p2 is None:
        return None
    return math.sqrt(
        (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2
    )


def is_within_trade_distance(
    p1: Optional[Vector3D],
    p2: Optional[Vector3D],
    max_units: float = 800.0,
) -> bool:
    """Check if two positions are within trade distance (800 units = 8 meters in VALORANT).

    Defaults to True (conservative assumption) if either position coordinate is missing.
    """
    dist = euclidean_distance_3d(p1, p2)
    if dist is None:
        return True
    return dist <= max_units
