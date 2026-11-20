# Demo video script (target 2:50, hard limit under 3:00)

Record at 1080p with the backend on port 8000 and the frontend on port 3000. Use Cloud9 (self-scouting) so every number can be checked. Pick Lotus: it has 13 matches and every tab has a clear story. Numbers below were read from the running app; re-check them on screen before recording, since a different dataset or filter changes them.

| Time | On screen | Say |
|---|---|---|
| 0:00-0:12 | `/scout`, Cloud9 selected | "Coaches lose hours to VODs to answer one question: what will this team do next? C9 Oracle answers it from the official GRID data, with the evidence next to every number." |
| 0:12-0:35 | Utility placement tab, Lotus, Defense, placeables. Click a hotspot. | "Each hotspot says how many rounds it shows up in and when. The evidence bar says how many rounds and matches stand behind it, and how confident we are." |
| 0:35-0:55 | Operator profiler, then the buy-type panel | "OXY holds 97 of Cloud9's 102 Operator rounds, 93 on defense, and only on full buys. That is a pickable habit." |
| 0:55-1:20 | Defensive setups, Lotus, ~15 s | "We count where the five defenders stand 15 seconds in. With zero or one defender on Site 1 they won half their rounds, against 68% with two or more. The table shows the rounds in each cell." |
| 1:20-1:40 | Attack executes, Lotus | "On attack they plant Site 3 most and win 76% there. Site 2 is their weak hit at 44%." |
| 1:40-2:15 | Timeout advisor: Cloud9, Lotus, Attack, Lost last 2. Click + Site 3 three times and + Site 1. Tick the Gemini box. | "Now the timeout. They've lost two in a row. We compare how they play after losing two with their normal game: they go Site 3 in 36.6% of plants, and they've hit it three of the last four. The advisor gives three adjustments, each with its rounds, and says when a sample is thin. Gemini turns those lines into a call we can read out. It only sees these lines, and any answer with a number that isn't in them is thrown away." |
| 2:15-2:38 | Click Counter-card, scroll, press Print and show the PDF preview | "Everything collapses into one printable counter-card for the map, with sample sizes and caveats on it." |
| 2:38-2:50 | `docs/METHODOLOGY.md` or the README limits list | "It's counts and rates over rounds, no black box. We list what it can't say: sites are numbered not lettered, and win rates are descriptive." |

## Before recording

- Restart the backend so all routes are loaded, and run `python -m pytest -q` once so you can say the tests pass.
- Keep the browser at a width where the three Scout columns are visible.
- Do not show `.scout-cache` files or the dataset folder. Do not show account tokens or the terminal history.
- If you mention JetBrains tools, say only what you actually used.
- Only show the Gemini step if you have checked the hackathon's rules on outside AI services. If not, untick the box and cut the Gemini sentences; the advisor still stands on its own.
- Never show `.env` or the API key. Check the Gemini call once beforehand so a failure does not appear on camera.

## Submission checklist

- Video under 3 minutes, public link.
- Repo link and branch merged to the default branch or named explicitly.
- README: fill in the `TODO(author)` JetBrains line, or delete the sentence.
- Check the hackathon rules on outside data before mentioning VLR; if unsure, leave VLR out of the video.
- Check the rules on how the data may be shown in public videos.
