# C9 Oracle Scout: methodology

How the Scout numbers are produced, what they can and cannot say, and where each step lives in the code. Every figure is a count or a rate over rounds. Nothing here is a fitted or predictive model.

## 1. Data

- Source: GRID series feeds (`.jsonl.zst`) and ability supplements for 857 VALORANT series (1,396,475 casts). Streamed from the compressed files with a substring prefilter and never decompressed to disk.
- Positions are in centimetres. VCT Americas 2025 is sampled at 1 Hz, so its positions are coarser. Events can arrive out of timestamp order, so time is measured as seconds since freezetime end.
- The supplement joins to the feed on `grid_event_id`.
- Ability and kill events carry a partial game state with all ten players' positions. Only full-state events (such as round end of freezetime) carry alive, health and inventory.

Code: `backend/src/scouting/extractor.py`, cached per series in `.scout-cache/` (git-ignored, format v2).

## 2. Per-round facts

For every round the extractor stores: both teams, sides, winner, players and agents, loadout value, casts (time, player, ability, position), kills (time, killer, victim, weapon, positions), the spike plant (time, planter, position) and position snapshots of all living players at 5, 10, 15, 20, 30, 45, 60 and 80 seconds (tolerance 8 s). Players killed before a snapshot are removed.

## 3. Buy type

Each team-round is labelled from the team's mean loadout value (`buys.py`): pistol for rounds 1 and 13, otherwise eco below 1,500, half from 1,500 to 3,499, full from 3,500. Every tab can be filtered by buy type.

## 4. Sites

The feed has no site labels. `sites.py` clusters spike-plant positions across the whole dataset with deterministic k-means (k-means++ seeding, fixed seed): three sites on Haven and Lotus, two elsewhere. Sites are numbered left to right on the map overlay (Site 1, 2, 3). They are not mapped to Valorant's site letters. A map needs at least 12 plants to get sites, and Summit has too few to trust.

## 5. Tabs

**Utility placement** (`aggregate.utility_query`): casts filtered by team, map, side, agent, player, ability type and buy. Hotspots are found on the cast positions of a single map and reported with the rounds they appear in and their median timing. The position is where the caster stood, not where the ability landed.

**Operator profiler** (`aggregate.operator_query`): a player has an Operator when it is in their inventory at the round's full-state snapshot. Kills use the kill event's weapon. Reports rounds with an Operator per side, map and buy type, the holder, agent and loadout, kill timing and distance from spawn.

**Defensive setups** (`setups.py`): for each defender round take the 10, 15 or 20 s snapshot nearest the chosen time with at least four living defenders. Each defender is assigned to the site whose centre is nearest if within 22 m, otherwise to mid/other. A round's setup is the count per zone. Reported: setups with rounds and defense win rate, a pooled table of win rate by defender count per zone (which fixes the fragmentation of exact splits), and where each player stands.

**Attack executes** (`attack.py`): each attacking round is described by its plant site (nearest site within 35 m of the plant), plant pace (early by 40 s, standard, late after 65 s), the attacker spread at 20, 30 or 45 s (a player within 45 m of a site counts toward it, the rest are uncommitted), and the utility cast before the plant.

**Counter-card** (`card.py`): runs the three profilers for one map and arranges their own advice lines into three plans (attacking them, defending against them, their Operator) with the evidence and confidence of each. It adds no analysis of its own.

**2D replay** (`replay.py`): the scouting cache keeps only eight position snapshots per round, so the replay makes one extra pass over a single series and reads the positions of all ten players from every event type that carries them (ability, damage, kill, item pickup, item drop, clock tick). Frames closer than 0.5 s are merged, and the track is cached per series. The viewer interpolates linearly between frames, holds a player at the last known position after the final frame, and keeps a dead player where the kill event put the victim. Round-end type is inferred (elimination if a team is all dead, detonation or defuse from the plant and winner, otherwise time) and marked as inferred. On a sample Haven game the median gap between frames was 1.2 s, the 90th percentile 7 s and one round had no frames, so movement is exact in fights and estimated elsewhere.

**Timeout advisor** (`timeout.py`): the caller is the team taking the timeout and the scouted team is the opponent. Inputs are the map, the opponent's side next round, their run going in (+k won the last k rounds, -k lost the last k, computed from round order) and optionally the sites they planted in recent rounds. The run is bucketed as behind (lost 2 or more), ahead (won 2 or more) or even. The attack or defense profile is run twice, once for that situation and once as the baseline. The situation profile is used only if it has at least 10 plants or setups, otherwise the baseline is used and the page says so. Up to three adjustments are chosen in a fixed order: the likely site (or lightest defended site), a live tell (a site planted in at least 3 recent rounds and 25 points above its baseline share), a weak spot, a buying shift (15 points or more more or fewer eco/half buys in the situation), pace, and Operator. The feed does carry timeout events, but they name no team, so timeout history is not used.

**Gemini wording layer** (`ai/gemini.py`, optional): turns the advisor's lines into a short timeout call. It sends only those lines, the model is told to use nothing else, and the answer is thrown away if it contains any number that is not in the lines. No raw match data is sent, and nothing is trained or fine-tuned.

## 6. Confidence and advice rules

- Confidence is by rounds analysed: high at 80 or more, medium at 25 or more, otherwise low.
- Advice lines only appear above fixed sample floors (8 rounds per cell, 16 rounds overall) and fixed effect sizes (a 15-point win-rate gap, a 0.5 defender gap between sites, a 40% share for a default plant site). They are written as leads to confirm in VOD.
- Low-confidence sections are flagged on the card.

## 7. What it cannot say

- Win rates are descriptive. A site with fewer defenders may have been left light on purpose, or because players died or rotated earlier.
- Win rate after a plant is naturally high; compare plant sites with each other, not with the team average.
- A snapshot is one moment. About a quarter of defender rounds have no usable snapshot near the chosen time and are left out; the page reports how many were read.
- No opponent-quality adjustment is made, and teams change rosters between events.

## 8. Reproducing

```bash
cd backend
python -m src.scouting.ingest --all     # builds .scout-cache (about 4 minutes)
python -m pytest -q                     # tests that need the dataset skip themselves without it
```

## 9. Outside data

Gemini is used only as an optional wording layer (section 5) and is off without a key. Check the hackathon's rules on outside AI services before using it in a submission.

VLR.gg map win rates and rosters are available through a self-hosted [vlrggapi](https://github.com/axsddlr/vlrggapi) client (`backend/src/vlr/client.py`). vlrggapi is an unofficial scraper. Before this is used in a submission, check vlr.gg's terms and the hackathon's rules on outside data.
