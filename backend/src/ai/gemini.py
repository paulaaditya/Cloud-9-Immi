"""Optional Gemini layer for the timeout advisor: turns the advisor's adjustments into a short call a coach can read out.

What it is: wording and prioritising. What it is not: a source of facts. The model is given only the advisor's
aggregated lines (never raw match data, rosters or personal details), is told to use nothing else, and its answer is
rejected if it contains a number that was not in the input. Any failure (no key, network error, bad answer)
returns None and the page shows the plain advice. The key comes from the environment (`GEMINI_API_KEY`) only.
"""

import json
import re
from typing import Any, Dict, List, Optional

import httpx

from src.config import get_settings

ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
TIMEOUT_SECONDS = 45.0
NUMBER = re.compile(r"\d+(?:\.\d+)?")

SYSTEM = (
    "You are a VALORANT assistant coach writing a 30-second timeout call. Use ONLY the facts provided. "
    "Do not add statistics, player names, ability names or claims that are not in the facts. "
    "Keep every number exactly as given. Be direct and specific. If the facts are thin, say so. "
    'Reply as JSON: {"call": "3-4 short sentences the coach can read out", "priorities": ["short bullet", ...]} '
    "with at most 3 priorities."
)


def numbers_in(text: str) -> set:
    return set(NUMBER.findall(text))


def build_facts(advice: Dict[str, Any]) -> List[str]:
    lines = [f"Map: {advice['map']}. Opponent side next round: {advice['opp_side']}. Situation: {advice['situation_text']}."]
    lines += advice["facts"]
    lines += [f"[{a['kind']}, {a['rounds']} rounds, {a['confidence']} confidence] {a['text']}" for a in advice["adjustments"]]
    return lines


def validate(answer: Any, facts: List[str]) -> Optional[Dict[str, Any]]:
    """Accept only {call: str, priorities: [str]} whose numbers all appear in the facts."""
    if not isinstance(answer, dict) or not isinstance(answer.get("call"), str):
        return None
    pri = answer.get("priorities", [])
    if not isinstance(pri, list) or not all(isinstance(x, str) for x in pri):
        return None
    allowed = numbers_in(" ".join(facts))
    if not numbers_in(answer["call"] + " " + " ".join(pri)) <= allowed:
        return None
    return {"call": answer["call"].strip(), "priorities": [x.strip() for x in pri[:3]]}


def gemini_call(advice: Dict[str, Any], transport: Optional[httpx.BaseTransport] = None) -> Dict[str, Any]:
    """Returns {"available": bool, "model": str, "call"?, "priorities"?, "reason"?}. Never raises."""
    settings = get_settings()
    key, model = settings.GEMINI_API_KEY, settings.GEMINI_MODEL
    if not key:
        return {"available": False, "reason": "GEMINI_API_KEY is not set"}
    facts = build_facts(advice)
    if not advice["adjustments"]:
        return {"available": False, "reason": "no adjustments to word"}
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": "Facts:\n- " + "\n- ".join(facts)}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.3},
    }
    try:
        with httpx.Client(timeout=TIMEOUT_SECONDS, transport=transport) as client:
            r = client.post(ENDPOINT.format(model=model), headers={"x-goog-api-key": key}, json=body)
        r.raise_for_status()
        text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        checked = validate(json.loads(text), facts)
    except (httpx.HTTPError, KeyError, IndexError, ValueError, TypeError) as exc:
        return {"available": False, "model": model, "reason": f"request failed ({type(exc).__name__})"}
    if checked is None:
        return {"available": False, "model": model, "reason": "answer rejected: it contained numbers not in the data"}
    return {"available": True, "model": model, **checked}
