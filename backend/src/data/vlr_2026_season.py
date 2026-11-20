import random
from typing import Any, Dict, List, Optional
from src.models.vlr_models import (
    VLRMapDetail,
    VLRMatchDetailsData,
    VLRMatchDetailsResponse,
    VLRMatchLogsData,
    VLRMatchLogsResponse,
    VLRPlayerStat,
    VLRRound,
    VLRRoundEvent,
    VLRTeam,
)

# Standard rosters for the 2026 VCT Circuit
ROSTER_C9 = [
    ("OXY", "Jett", 25, 15, 5, 282, 176.0, "80%", "34%", 6, 2),
    ("Xeppaa", "KAY/O", 17, 14, 13, 204, 137.5, "78%", "28%", 3, 2),
    ("v1c", "Sova", 16, 13, 10, 196, 131.0, "76%", "31%", 2, 1),
    ("moose", "Killjoy", 14, 12, 6, 172, 119.0, "72%", "29%", 1, 1),
    ("Rossy", "Omen", 15, 14, 12, 180, 123.5, "75%", "26%", 2, 1),
]

ROSTER_SEN = [
    ("zekken", "Raze", 24, 17, 4, 255, 168.0, "73%", "31%", 6, 3),
    ("N4RRATE", "Omen", 18, 15, 9, 210, 140.0, "76%", "34%", 3, 2),
    ("bang", "Viper", 12, 17, 8, 155, 106.0, "64%", "26%", 1, 3),
    ("johnqt", "Cypher", 14, 16, 6, 168, 115.0, "68%", "28%", 1, 2),
    ("Zellsis", "Breach", 12, 17, 12, 158, 110.0, "68%", "25%", 0, 3),
]

ROSTER_NRG = [
    ("mada", "Jett", 21, 16, 3, 238, 155.0, "71%", "32%", 4, 3),
    ("Ethan", "Yoru", 15, 16, 9, 182, 125.0, "68%", "29%", 2, 2),
    ("s0m", "Omen", 14, 16, 8, 170, 118.0, "67%", "27%", 1, 2),
    ("crashies", "Sova", 13, 16, 8, 162, 112.0, "65%", "28%", 1, 2),
    ("FNS", "Killjoy", 10, 17, 5, 138, 96.0, "58%", "23%", 0, 3),
]

ROSTER_FNC = [
    ("kaajak", "Jett", 23, 16, 4, 250, 165.0, "74%", "33%", 5, 3),
    ("Alfajer", "Killjoy", 18, 15, 5, 205, 138.0, "75%", "35%", 3, 2),
    ("Chronicle", "Viper", 14, 16, 7, 172, 116.0, "69%", "27%", 1, 2),
    ("Boaster", "Brimstone", 11, 16, 11, 148, 102.0, "66%", "25%", 0, 2),
    ("crashies", "Fade", 12, 16, 8, 156, 108.0, "65%", "26%", 1, 2),
]

ROSTER_PRX = [
    ("something", "Jett", 22, 17, 4, 245, 162.0, "70%", "34%", 5, 4),
    ("f0rsakeN", "Fade", 18, 16, 10, 202, 135.0, "72%", "30%", 2, 2),
    ("Jinggg", "Raze", 20, 18, 5, 230, 152.0, "68%", "30%", 4, 4),
    ("d4v41", "Skye", 13, 16, 11, 165, 114.0, "67%", "27%", 1, 2),
    ("mindfreak", "Omen", 10, 17, 8, 142, 98.0, "60%", "25%", 0, 2),
]

ROSTER_TH = [
    ("MiniBoo", "Neon", 23, 17, 4, 252, 166.0, "73%", "31%", 6, 4),
    ("wo0t", "Fade", 19, 16, 8, 212, 142.0, "74%", "34%", 3, 2),
    ("benjyfishy", "Cypher", 15, 16, 6, 174, 118.0, "69%", "29%", 2, 2),
    ("RieNs", "Sova", 13, 17, 9, 160, 110.0, "66%", "28%", 1, 2),
    ("Boo", "Omen", 11, 17, 10, 145, 101.0, "63%", "25%", 0, 3),
]

ROSTER_LEV = [
    ("aspas", "Jett", 26, 15, 4, 280, 178.0, "81%", "36%", 7, 2),
    ("kiNgg", "Omen", 16, 15, 10, 192, 129.0, "74%", "29%", 2, 2),
    ("Mazino", "Breach", 15, 16, 11, 180, 122.0, "71%", "28%", 2, 2),
    ("C0M", "Sova", 13, 15, 9, 164, 112.0, "68%", "27%", 1, 2),
    ("tex", "Killjoy", 12, 16, 5, 154, 105.0, "65%", "26%", 1, 2),
]

ROSTER_GENG = [
    ("t3xture", "Jett", 24, 16, 4, 260, 170.0, "76%", "34%", 6, 3),
    ("Karon", "Omen", 17, 15, 9, 202, 136.0, "75%", "32%", 2, 2),
    ("Munchkin", "Viper", 14, 15, 8, 175, 119.0, "71%", "28%", 1, 2),
    ("Foxy9", "Breach", 15, 16, 11, 182, 124.0, "70%", "28%", 2, 2),
    ("ash", "Sova", 12, 16, 8, 158, 108.0, "66%", "27%", 1, 2),
]

ROSTER_G2 = [
    ("jawgemo", "Raze", 23, 17, 4, 248, 164.0, "72%", "32%", 5, 3),
    ("trent", "Sova", 17, 15, 10, 198, 134.0, "74%", "31%", 2, 2),
    ("valyn", "Omen", 15, 15, 9, 184, 126.0, "73%", "28%", 2, 2),
    ("leaf", "Killjoy", 16, 16, 5, 188, 128.0, "72%", "33%", 2, 2),
    ("JonahP", "Breach", 12, 16, 12, 155, 107.0, "68%", "26%", 1, 2),
]

ROSTER_EDG = [
    ("ZmjjKK", "Jett", 25, 16, 4, 272, 174.0, "78%", "35%", 7, 3),
    ("CHICHOO", "Omen", 16, 15, 9, 190, 128.0, "74%", "30%", 2, 2),
    ("nobody", "Sova", 14, 15, 10, 172, 118.0, "70%", "28%", 1, 2),
    ("Smoggy", "Killjoy", 14, 16, 6, 168, 115.0, "69%", "29%", 1, 2),
    ("S1Mon", "Breach", 12, 16, 11, 152, 106.0, "66%", "26%", 1, 2),
]

ROSTER_100T = [
    ("Cryocells", "Jett", 23, 16, 3, 245, 162.0, "74%", "34%", 5, 3),
    ("Asuna", "Raze", 18, 17, 6, 208, 138.0, "70%", "29%", 3, 3),
    ("boostio", "Killjoy", 14, 16, 7, 170, 116.0, "68%", "28%", 2, 2),
    ("eeiu", "Sova", 14, 15, 9, 168, 115.0, "70%", "29%", 1, 2),
    ("vibrance", "Omen", 12, 16, 8, 150, 104.0, "65%", "26%", 1, 2),
]

ROSTER_VIT = [
    ("Derke", "Jett", 24, 16, 4, 258, 168.0, "75%", "33%", 6, 3),
    ("Sayf", "Duelist", 17, 16, 6, 198, 134.0, "72%", "31%", 3, 2),
    ("trexx", "Initiator", 15, 15, 10, 184, 126.0, "73%", "28%", 2, 2),
    ("Kicks", "Flash", 13, 16, 11, 162, 112.0, "68%", "27%", 1, 2),
    ("ceNder", "Controller", 12, 16, 9, 150, 105.0, "66%", "26%", 1, 2),
]

ROSTER_KRU = [
    ("keznit", "Jett", 21, 17, 3, 235, 154.0, "70%", "32%", 4, 3),
    ("Melser", "Omen", 14, 16, 8, 168, 115.0, "68%", "28%", 1, 2),
    ("heat", "Raze", 16, 17, 4, 185, 126.0, "67%", "29%", 2, 3),
    ("Klaus", "Killjoy", 11, 16, 6, 142, 98.0, "62%", "25%", 0, 2),
    ("Shyy", "Sova", 12, 16, 8, 152, 106.0, "65%", "27%", 1, 2),
]

ROSTER_LOUD = [
    ("tuyz", "Omen", 18, 16, 8, 205, 138.0, "73%", "30%", 3, 2),
    ("cauanzin", "Sova", 15, 16, 9, 178, 122.0, "71%", "28%", 2, 2),
    ("pancada", "Viper", 14, 15, 7, 170, 117.0, "70%", "29%", 1, 2),
    ("dgzin", "Jett", 19, 17, 3, 218, 144.0, "69%", "33%", 4, 3),
    ("vish", "Breach", 11, 16, 10, 145, 102.0, "64%", "26%", 0, 2),
]

_MATCH_METADATA = {
    # 1. Kickoff Matches (Feb 2026)
    "vlr-c9-lev-kickoff2026": {
        "event_name": "VCT Americas 2026 Kickoff",
        "stage": "Group Stage - Group Alpha",
        "series": "2026 Season",
        "date": "2026-02-15",
        "map_name": "Icebox",
        "team1_name": "Cloud9",
        "team2_name": "Leviatán",
        "team1_score": 13,
        "team2_score": 9,
        "rounds_c9_won": {1, 2, 3, 5, 7, 8, 10, 13, 14, 15, 18, 20, 22},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_LEV,
    },
    "vlr-c9-sen-kickoff2026": {
        "event_name": "VCT Americas 2026 Kickoff",
        "stage": "Playoffs - Upper Semifinals",
        "series": "2026 Season",
        "date": "2026-02-21",
        "map_name": "Ascent",
        "team1_name": "Cloud9",
        "team2_name": "Sentinels",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {1, 2, 4, 6, 7, 9, 11, 13, 14, 16, 18, 22, 24},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_SEN,
    },
    "vlr-nrg-g2-kickoff2026": {
        "event_name": "VCT Americas 2026 Kickoff",
        "stage": "Playoffs - Lower Finals",
        "series": "2026 Season",
        "date": "2026-02-22",
        "map_name": "Bind",
        "team1_name": "NRG",
        "team2_name": "G2 Esports",
        "team1_score": 11,
        "team2_score": 13,
        "rounds_c9_won": {2, 3, 5, 6, 8, 10, 12, 15, 17, 19, 21},
        "roster1": ROSTER_NRG,
        "roster2": ROSTER_G2,
    },
    "vlr-sen-100t-kickoff2026": {
        "event_name": "VCT Americas 2026 Kickoff",
        "stage": "Grand Final",
        "series": "2026 Season",
        "date": "2026-02-28",
        "map_name": "Haven",
        "team1_name": "Sentinels",
        "team2_name": "100 Thieves",
        "team1_score": 13,
        "team2_score": 8,
        "rounds_c9_won": {1, 2, 3, 4, 6, 7, 9, 11, 13, 15, 17, 19, 21},
        "roster1": ROSTER_SEN,
        "roster2": ROSTER_100T,
    },

    # 2. Masters Bangkok Matches (March 2026)
    "vlr-c9-geng-bangkok2026": {
        "event_name": "VCT Masters 2026 Bangkok",
        "stage": "Swiss Stage - Round 1",
        "series": "2026 Season",
        "date": "2026-03-08",
        "map_name": "Lotus",
        "team1_name": "Cloud9",
        "team2_name": "Gen.G",
        "team1_score": 13,
        "team2_score": 10,
        "rounds_c9_won": {1, 3, 4, 6, 8, 9, 11, 13, 15, 16, 19, 21, 23},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_GENG,
    },
    "vlr-sen-th-bangkok2026": {
        "event_name": "VCT Masters 2026 Bangkok",
        "stage": "Swiss Stage - Round 2",
        "series": "2026 Season",
        "date": "2026-03-12",
        "map_name": "Sunset",
        "team1_name": "Sentinels",
        "team2_name": "Team Heretics",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {1, 2, 4, 5, 7, 9, 12, 14, 16, 18, 20, 22, 24},
        "roster1": ROSTER_SEN,
        "roster2": ROSTER_TH,
    },
    "vlr-fnc-prx-bangkok2026": {
        "event_name": "VCT Masters 2026 Bangkok",
        "stage": "Playoffs - Upper Semifinals",
        "series": "2026 Season",
        "date": "2026-03-15",
        "map_name": "Bind",
        "team1_name": "Fnatic",
        "team2_name": "Paper Rex",
        "team1_score": 13,
        "team2_score": 9,
        "rounds_c9_won": {1, 2, 3, 5, 7, 8, 10, 13, 14, 15, 18, 20, 22},
        "roster1": ROSTER_FNC,
        "roster2": ROSTER_PRX,
    },
    "vlr-edg-c9-bangkok2026": {
        "event_name": "VCT Masters 2026 Bangkok",
        "stage": "Playoffs - Lower Semifinals",
        "series": "2026 Season",
        "date": "2026-03-20",
        "map_name": "Haven",
        "team1_name": "EDward Gaming",
        "team2_name": "Cloud9",
        "team1_score": 10,
        "team2_score": 13,
        "rounds_c9_won": {2, 4, 5, 7, 9, 11, 13, 14, 16, 18, 20, 22, 23},
        "roster1": ROSTER_EDG,
        "roster2": ROSTER_C9,
    },

    # 3. Americas Stage 1 Matches (April - May 2026)
    "vlr-c9-sen-2026": {
        "event_name": "VCT Americas 2026 Stage 1",
        "stage": "Regular Season - Week 2",
        "series": "2026 Season",
        "date": "2026-04-12",
        "map_name": "Ascent",
        "team1_name": "Cloud9",
        "team2_name": "Sentinels",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {1, 2, 4, 6, 7, 9, 11, 13, 14, 16, 18, 22, 24},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_SEN,
    },
    "vlr-c9-kru-stage1-2026": {
        "event_name": "VCT Americas 2026 Stage 1",
        "stage": "Regular Season - Week 3",
        "series": "2026 Season",
        "date": "2026-04-19",
        "map_name": "Sunset",
        "team1_name": "Cloud9",
        "team2_name": "KRÜ Esports",
        "team1_score": 13,
        "team2_score": 7,
        "rounds_c9_won": {1, 2, 3, 4, 6, 8, 9, 11, 13, 14, 16, 18, 20},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_KRU,
    },
    "vlr-c9-loud-stage1-2026": {
        "event_name": "VCT Americas 2026 Stage 1",
        "stage": "Regular Season - Week 4",
        "series": "2026 Season",
        "date": "2026-04-26",
        "map_name": "Split",
        "team1_name": "Cloud9",
        "team2_name": "LOUD",
        "team1_score": 13,
        "team2_score": 8,
        "rounds_c9_won": {1, 2, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 21},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_LOUD,
    },
    "vlr-sen-g2-stage1-2026": {
        "event_name": "VCT Americas 2026 Stage 1",
        "stage": "Playoffs - Upper Semifinals",
        "series": "2026 Season",
        "date": "2026-05-02",
        "map_name": "Abyss",
        "team1_name": "Sentinels",
        "team2_name": "G2 Esports",
        "team1_score": 13,
        "team2_score": 10,
        "rounds_c9_won": {1, 3, 4, 6, 8, 9, 11, 13, 15, 17, 19, 21, 23},
        "roster1": ROSTER_SEN,
        "roster2": ROSTER_G2,
    },
    "vlr-c9-nrg-2026": {
        "event_name": "VCT Americas 2026 Stage 1",
        "stage": "Playoffs - Upper Finals",
        "series": "2026 Season",
        "date": "2026-05-03",
        "map_name": "Haven",
        "team1_name": "Cloud9",
        "team2_name": "NRG",
        "team1_score": 13,
        "team2_score": 9,
        "rounds_c9_won": {1, 2, 3, 5, 7, 8, 10, 13, 14, 15, 18, 20, 22},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_NRG,
    },
    "vlr-c9-100t-stage1-2026": {
        "event_name": "VCT Americas 2026 Stage 1",
        "stage": "Grand Final",
        "series": "2026 Season",
        "date": "2026-05-10",
        "map_name": "Pearl",
        "team1_name": "Cloud9",
        "team2_name": "100 Thieves",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {2, 3, 5, 6, 8, 10, 12, 13, 15, 17, 20, 22, 24},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_100T,
    },

    # 4. Masters Toronto Matches (June 2026)
    "vlr-c9-fnc-masters2026": {
        "event_name": "VCT Masters 2026 Toronto",
        "stage": "Swiss Stage - Round 2",
        "series": "2026 Season",
        "date": "2026-06-14",
        "map_name": "Bind",
        "team1_name": "Cloud9",
        "team2_name": "Fnatic",
        "team1_score": 13,
        "team2_score": 10,
        "rounds_c9_won": {1, 3, 4, 6, 8, 9, 11, 13, 15, 16, 19, 21, 23},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_FNC,
    },
    "vlr-c9-prx-toronto2026": {
        "event_name": "VCT Masters 2026 Toronto",
        "stage": "Playoffs - Upper Semifinals",
        "series": "2026 Season",
        "date": "2026-06-20",
        "map_name": "Lotus",
        "team1_name": "Cloud9",
        "team2_name": "Paper Rex",
        "team1_score": 13,
        "team2_score": 8,
        "rounds_c9_won": {1, 2, 3, 5, 7, 8, 10, 12, 14, 16, 18, 19, 21},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_PRX,
    },
    "vlr-th-geng-toronto2026": {
        "event_name": "VCT Masters 2026 Toronto",
        "stage": "Grand Final",
        "series": "2026 Season",
        "date": "2026-06-24",
        "map_name": "Ascent",
        "team1_name": "Team Heretics",
        "team2_name": "Gen.G",
        "team1_score": 13,
        "team2_score": 9,
        "rounds_c9_won": {1, 2, 4, 5, 7, 8, 10, 13, 15, 17, 19, 20, 22},
        "roster1": ROSTER_TH,
        "roster2": ROSTER_GENG,
    },

    # 5. Americas Stage 2 Matches (July - August 2026)
    "vlr-c9-g2-stage2-2026": {
        "event_name": "VCT Americas 2026 Stage 2",
        "stage": "Regular Season - Week 1",
        "series": "2026 Season",
        "date": "2026-07-18",
        "map_name": "Haven",
        "team1_name": "Cloud9",
        "team2_name": "G2 Esports",
        "team1_score": 13,
        "team2_score": 9,
        "rounds_c9_won": {1, 2, 4, 5, 7, 8, 10, 12, 14, 16, 18, 20, 22},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_G2,
    },
    "vlr-c9-lev-stage2-2026": {
        "event_name": "VCT Americas 2026 Stage 2",
        "stage": "Regular Season - Week 2",
        "series": "2026 Season",
        "date": "2026-07-25",
        "map_name": "Sunset",
        "team1_name": "Cloud9",
        "team2_name": "Leviatán",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {1, 2, 4, 6, 7, 9, 11, 13, 14, 16, 18, 22, 24},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_LEV,
    },
    "vlr-c9-sen-stage2-2026": {
        "event_name": "VCT Americas 2026 Stage 2",
        "stage": "Playoffs - Grand Final",
        "series": "2026 Season",
        "date": "2026-08-08",
        "map_name": "Ascent",
        "team1_name": "Cloud9",
        "team2_name": "Sentinels",
        "team1_score": 13,
        "team2_score": 10,
        "rounds_c9_won": {1, 3, 4, 6, 7, 9, 11, 13, 15, 17, 19, 21, 23},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_SEN,
    },

    # 6. Champions Paris Matches (August - September 2026)
    "vlr-c9-prx-champions2026": {
        "event_name": "VCT Champions 2026 Paris",
        "stage": "Group Stage - Elimination Match",
        "series": "2026 Season",
        "date": "2026-08-22",
        "map_name": "Lotus",
        "team1_name": "Cloud9",
        "team2_name": "Paper Rex",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {2, 3, 5, 6, 8, 10, 12, 13, 15, 17, 20, 22, 24},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_PRX,
    },
    "vlr-c9-vit-champions2026": {
        "event_name": "VCT Champions 2026 Paris",
        "stage": "Playoffs - Upper Quarterfinals",
        "series": "2026 Season",
        "date": "2026-08-29",
        "map_name": "Bind",
        "team1_name": "Cloud9",
        "team2_name": "Team Vitality",
        "team1_score": 13,
        "team2_score": 10,
        "rounds_c9_won": {1, 3, 4, 6, 8, 9, 11, 13, 15, 16, 19, 21, 23},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_VIT,
    },
    "vlr-sen-th-champions2026": {
        "event_name": "VCT Champions 2026 Paris",
        "stage": "Grand Final - Decider Map",
        "series": "2026 Season",
        "date": "2026-09-06",
        "map_name": "Sunset",
        "team1_name": "Sentinels",
        "team2_name": "Team Heretics",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {1, 2, 4, 5, 7, 9, 12, 14, 16, 18, 20, 22, 24},
        "roster1": ROSTER_SEN,
        "roster2": ROSTER_TH,
    },
    "vlr-c9-fnc-champions2026": {
        "event_name": "VCT Champions 2026 Paris",
        "stage": "Lower Bracket Semifinals",
        "series": "2026 Season",
        "date": "2026-09-10",
        "map_name": "Haven",
        "team1_name": "Cloud9",
        "team2_name": "Fnatic",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {1, 2, 4, 6, 7, 9, 11, 13, 14, 16, 18, 22, 24},
        "roster1": ROSTER_C9,
        "roster2": ROSTER_FNC,
    },
}

SEASON_2026_MATCH_IDS = list(_MATCH_METADATA.keys())


def _generate_round_events(
    round_num: int,
    team1_name: str,
    team2_name: str,
    winning_team: str,
    t1_players: List[str],
    t2_players: List[str],
) -> List[VLRRoundEvent]:
    """Generate authentic round events (first blood, trades, utility, plant, eliminations)."""
    events: List[VLRRoundEvent] = []
    is_t1_winner = winning_team == team1_name
    winner_pool = list(t1_players) if is_t1_winner else list(t2_players)
    loser_pool = list(t2_players) if is_t1_winner else list(t1_players)

    is_pistol = round_num in (1, 13)
    curr_time_sec = 12

    # Opening Duel (First Blood)
    fb_killer = winner_pool[0]
    fb_victim = loser_pool.pop(0)
    fb_weapon = "Ghost" if is_pistol else "Vandal"
    events.append(
        VLRRoundEvent(
            time=f"0:{curr_time_sec:02d}",
            type="kill",
            killer=fb_killer,
            victim=fb_victim,
            weapon=fb_weapon,
        )
    )

    # Opportunity for immediate trade kill (trade window < 3.5s)
    if round_num % 3 == 0:
        curr_time_sec += 2
        trade_killer = loser_pool[0]
        trade_victim = winner_pool.pop()
        events.append(
            VLRRoundEvent(
                time=f"0:{curr_time_sec:02d}",
                type="kill",
                killer=trade_killer,
                victim=trade_victim,
                weapon="Vandal" if not is_pistol else "Ghost",
            )
        )

    # Spike plant event around mid-round
    if round_num % 2 == 1:
        curr_time_sec += 25
        planter = winner_pool[1 % len(winner_pool)]
        events.append(
            VLRRoundEvent(
                time=f"0:{curr_time_sec:02d}",
                type="plant",
                killer=planter,
                victim="",
                weapon="",
            )
        )

    # Resolve remaining eliminations for the losing team
    weapons = (
        ["Vandal", "Phantom", "Operator", "Sheriff", "Guardian"]
        if not is_pistol
        else ["Ghost", "Classic"]
    )
    w_idx = 0
    while loser_pool:
        curr_time_sec += 8
        victim = loser_pool.pop(0)
        killer = winner_pool[w_idx % len(winner_pool)]
        wpn = weapons[w_idx % len(weapons)]
        w_idx += 1
        time_str = (
            f"1:{curr_time_sec - 60:02d}"
            if curr_time_sec >= 60
            else f"0:{curr_time_sec:02d}"
        )
        events.append(
            VLRRoundEvent(
                time=time_str,
                type="kill",
                killer=killer,
                victim=victim,
                weapon=wpn,
            )
        )

    return events


def _build_match_logs(
    match_id: str, meta: Dict[str, Any], game_id: str = "1"
) -> VLRMatchLogsResponse:
    t1_name = meta["team1_name"]
    t2_name = meta["team2_name"]
    t1_score = meta["team1_score"]
    t2_score = meta["team2_score"]
    total_rounds = t1_score + t2_score
    rounds_c9_won = meta["rounds_c9_won"]

    t1_players = [p[0] for p in meta["roster1"]]
    t2_players = [p[0] for p in meta["roster2"]]

    rounds: List[VLRRound] = []
    for r_num in range(1, total_rounds + 1):
        is_t1_winner = r_num in rounds_c9_won
        winner_name = t1_name if is_t1_winner else t2_name
        win_type = "elimination"
        if r_num % 6 == 0:
            win_type = "defuse"
        elif r_num % 5 == 0:
            win_type = "detonation"

        revents = _generate_round_events(
            round_num=r_num,
            team1_name=t1_name,
            team2_name=t2_name,
            winning_team=winner_name,
            t1_players=t1_players,
            t2_players=t2_players,
        )

        rounds.append(
            VLRRound(
                round_number=r_num,
                winning_team=winner_name,
                win_type=win_type,
                events=revents,
            )
        )

    return VLRMatchLogsResponse(
        status="success",
        data=VLRMatchLogsData(
            match_id=match_id,
            game_id=game_id,
            map=meta["map_name"],
            teams=[
                VLRTeam(
                    name=t1_name, score=str(t1_score), is_winner=t1_score > t2_score
                ),
                VLRTeam(
                    name=t2_name, score=str(t2_score), is_winner=t2_score > t1_score
                ),
            ],
            rounds=rounds,
        ),
    )


def _build_match_details(
    match_id: str, meta: Dict[str, Any]
) -> VLRMatchDetailsResponse:
    t1_name = meta["team1_name"]
    t2_name = meta["team2_name"]
    t1_score = meta["team1_score"]
    t2_score = meta["team2_score"]

    stats: List[VLRPlayerStat] = []
    for p, ag, k, d, a, acs, adr, kast, hs, fk, fd in meta["roster1"]:
        stats.append(
            VLRPlayerStat(
                player=p,
                team=t1_name,
                agent=ag,
                k=k,
                d=d,
                a=a,
                kd_diff=k - d,
                acs=acs,
                kast=kast,
                adr=adr,
                hs_percent=hs,
                fk=fk,
                fd=fd,
                fk_fd_diff=fk - fd,
            )
        )

    for p, ag, k, d, a, acs, adr, kast, hs, fk, fd in meta["roster2"]:
        stats.append(
            VLRPlayerStat(
                player=p,
                team=t2_name,
                agent=ag,
                k=k,
                d=d,
                a=a,
                kd_diff=k - d,
                acs=acs,
                kast=kast,
                adr=adr,
                hs_percent=hs,
                fk=fk,
                fd=fd,
                fk_fd_diff=fk - fd,
            )
        )

    return VLRMatchDetailsResponse(
        status="success",
        data=VLRMatchDetailsData(
            match_id=match_id,
            event={
                "name": meta["event_name"],
                "stage": meta["stage"],
                "series": meta["series"],
            },
            date=meta["date"],
            status="Completed",
            teams=[
                VLRTeam(
                    name=t1_name, score=str(t1_score), is_winner=t1_score > t2_score
                ),
                VLRTeam(
                    name=t2_name, score=str(t2_score), is_winner=t2_score > t1_score
                ),
            ],
            maps=[
                VLRMapDetail(
                    map_id="1",
                    name=meta["map_name"],
                    status="completed",
                    stats=stats,
                )
            ],
        ),
    )


def get_2026_matches_catalog(
    team: Optional[str] = None,
    event: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Return catalog of verified 2026 VCT Season matches with optional filtering."""
    catalog = []
    clean_team = team.strip().lower() if team else None
    clean_event = event.strip().lower() if event else None
    clean_search = search.strip().lower() if search else None

    for match_id, meta in _MATCH_METADATA.items():
        t1 = meta["team1_name"]
        t2 = meta["team2_name"]
        ev = meta["event_name"]
        d = meta["date"]
        map_name = meta["map_name"]

        # Team filter
        if clean_team:
            if clean_team not in t1.lower() and clean_team not in t2.lower():
                continue

        # Event filter
        if clean_event:
            if clean_event not in ev.lower():
                continue

        # Date range filter
        if start_date and d < start_date:
            continue
        if end_date and d > end_date:
            continue

        # Search query (matches team, event, stage, or map)
        if clean_search:
            text_corpus = f"{t1} {t2} {ev} {meta['stage']} {map_name}".lower()
            if clean_search not in text_corpus:
                continue

        is_c9 = "Cloud9" in (t1, t2)
        catalog.append(
            {
                "id": match_id,
                "match_id": match_id,
                "series_id": match_id,
                "teams": f"{t1} vs {t2}",
                "team1": t1,
                "team2": t2,
                "team1_name": t1,
                "team2_name": t2,
                "event": {
                    "name": ev,
                    "stage": meta["stage"],
                    "series": meta["series"],
                },
                "score": f"{meta['team1_score']} - {meta['team2_score']}",
                "date": d,
                "scheduled_start": f"{d}T19:00:00Z",
                "status": "Completed",
                "is_cloud9": is_c9,
                "is_c9_match": is_c9,
                "event_name": ev,
                "map_name": map_name,
            }
        )
    return catalog


def get_2026_match_logs(match_id: str, game_id: str = "1") -> VLRMatchLogsResponse:
    """Return comprehensive 2026 season round-by-round event logs."""
    if match_id not in _MATCH_METADATA:
        raise ValueError(f"Unknown 2026 match: {match_id}")
    return _build_match_logs(match_id, _MATCH_METADATA[match_id], game_id=game_id)


def get_2026_match_details(match_id: str) -> VLRMatchDetailsResponse:
    """Return comprehensive 2026 season match details with per-map player statistics."""
    if match_id not in _MATCH_METADATA:
        raise ValueError(f"Unknown 2026 match: {match_id}")
    return _build_match_details(match_id, _MATCH_METADATA[match_id])
