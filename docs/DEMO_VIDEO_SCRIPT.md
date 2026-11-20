# Demo video script (target 2:40, hard limit under 3:00)

Record at 1080p with the backend on port 8000 and the frontend on port 3000. Use Cloud9 (self-scouting) so every number can be checked. Pick Lotus: it has 13 matches and all four tabs have a clear story. Numbers below were read from the running app; re-check them on screen before recording, since a different dataset or filter changes them.

| Time | On screen | Say |
|---|---|---|
| 0:00-0:15 | `/scout`, Cloud9 selected, README title card for 2 s | "Coaches lose hours to VODs to answer one question: what will this team do on this map? C9 Oracle answers it from the official GRID data, with the evidence next to every number." |
| 0:15-0:45 | Utility placement tab, Lotus, Defense, placeables. Click a hotspot. | "Here is where they place utility. Each hotspot says how many rounds it shows up in and when. The evidence bar says how many rounds and matches stand behind it, and how confident we are." |
| 0:45-1:10 | Operator profiler, then the buy-type panel | "One player, OXY, holds 97 of Cloud9's 102 Operator rounds, 93 of them on defense, and only on full buys. That is a pickable habit." |
| 1:10-1:45 | Defensive setups, Lotus, switch ~15 s | "We read where all five defenders stand 15 seconds in and count them per site. With zero or one defender on Site 1 they won half their rounds. With two or more, 68%. The table says how many rounds are in each cell, so a coach can judge." |
| 1:45-2:15 | Attack executes, Lotus | "On attack they plant Site 3 most, and win 76% there. Site 2 is their weak hit at 44%. The attacker spread shows what they look like before they commit." |
| 2:15-2:40 | Click Counter-card, scroll, press Print and show the PDF preview | "All of that collapses into one printable counter-card: how to attack them, how to defend against them, and what to do about the Operator. Sample sizes and caveats are printed on it." |
| 2:40-2:55 | `docs/METHODOLOGY.md` or the README limits list | "Everything is counts and rates over rounds, no black box. We list what it cannot say: sites are numbered not lettered, win rates are descriptive, and small cells are noise." |

## Before recording

- Restart the backend so all routes are loaded, and run `python -m pytest -q` once so you can say the tests pass.
- Keep the browser at a width where the three Scout columns are visible.
- Do not show `.scout-cache` files or the dataset folder. Do not show account tokens or the terminal history.
- If you mention JetBrains tools, say only what you actually used.

## Submission checklist

- Video under 3 minutes, public link.
- Repo link and branch merged to the default branch or named explicitly.
- README: fill in the `TODO(author)` JetBrains line, or delete the sentence.
- Check the hackathon rules on outside data before mentioning VLR; if unsure, leave VLR out of the video.
- Check the rules on how the data may be shown in public videos.
