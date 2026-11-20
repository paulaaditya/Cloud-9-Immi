"""Ability taxonomy for scouting.

Ability IDs are the GRID ability identifiers observed in the dataset. Categories follow the
Category 1 brief's priority order: placeable utility first, then recon, smokes, reactive
stall and flashes. Anything not listed falls into "other" so it stays filterable and is never
silently mislabeled. `unmapped_abilities()` in the tests reports IDs the dataset uses that are
missing here.
"""

from typing import Dict, Optional, Tuple

# ability id -> (agent, category)
# Categories: placeable, recon, smoke, stall, flash, molly, other
ABILITIES: Dict[str, Tuple[str, str]] = {
    # Cypher
    "trapwire": ("cypher", "placeable"),
    "cyber-cage": ("cypher", "placeable"),
    "spycam": ("cypher", "recon"),
    "neural-theft": ("cypher", "other"),
    # Killjoy
    "alarmbot": ("killjoy", "placeable"),
    "turret": ("killjoy", "placeable"),
    "nanoswarm": ("killjoy", "placeable"),
    "lockdown": ("killjoy", "other"),
    # Vyse
    "razorvine": ("vyse", "placeable"),
    "shear": ("vyse", "placeable"),
    "arc-rose": ("vyse", "flash"),
    "steel-garden": ("vyse", "other"),
    # Chamber
    "trademark": ("chamber", "placeable"),
    "headhunter": ("chamber", "other"),
    "rendezvous": ("chamber", "other"),
    "tour-de-force": ("chamber", "other"),
    # Deadlock
    "sonic-sensor": ("deadlock", "placeable"),
    "barrier-mesh": ("deadlock", "placeable"),
    "gravnet": ("deadlock", "stall"),
    "annihilation": ("deadlock", "other"),
    # Sova
    "recon-bolt": ("sova", "recon"),
    "owl-drone": ("sova", "recon"),
    "shock-bolt": ("sova", "other"),
    "hunter's-fury": ("sova", "other"),
    # Fade
    "prowler": ("fade", "recon"),
    "haunt": ("fade", "recon"),
    "seize": ("fade", "stall"),
    "nightfall": ("fade", "other"),
    # Tejo
    "stealth-drone": ("tejo", "recon"),
    "special-delivery": ("tejo", "stall"),
    "guided-salvo": ("tejo", "other"),
    "armageddon": ("tejo", "other"),
    # Jett
    "cloudburst": ("jett", "smoke"),
    "updraft": ("jett", "other"),
    "tailwind": ("jett", "other"),
    "blade-storm": ("jett", "other"),
    # Brimstone
    "sky-smoke": ("brimstone", "smoke"),
    "incendiary": ("brimstone", "molly"),
    "stim-beacon": ("brimstone", "other"),
    "orbital-strike": ("brimstone", "other"),
    # KAY/O
    "flash-drive": ("kayo", "flash"),
    "zero-point": ("kayo", "recon"),
    "frag-ment": ("kayo", "molly"),
    "null-cmd": ("kayo", "other"),
    # Breach
    "flashpoint": ("breach", "flash"),
    "fault-line": ("breach", "stall"),
    "aftershock": ("breach", "molly"),
    "rolling-thunder": ("breach", "stall"),
    # Omen
    "paranoia": ("omen", "flash"),
    "dark-cover": ("omen", "smoke"),
    "shrouded-step": ("omen", "other"),
    "from-the-shadows": ("omen", "other"),
    # Viper
    "poison-cloud": ("viper", "smoke"),
    "toxic-screen": ("viper", "smoke"),
    "snake-bite": ("viper", "molly"),
    "viper's-pit": ("viper", "smoke"),
    # Raze
    "boom-bot": ("raze", "recon"),
    "blast-pack": ("raze", "other"),
    "paint-shells": ("raze", "molly"),
    "showstopper": ("raze", "other"),
    # Yoru
    "blindside": ("yoru", "flash"),
    "gatecrash": ("yoru", "recon"),
    "fakeout": ("yoru", "flash"),
    "dimensional-drift": ("yoru", "other"),
    # Astra
    "nova-pulse": ("astra", "stall"),
    "nebula-dissipate": ("astra", "smoke"),
    "gravity-well": ("astra", "stall"),
    "stars": ("astra", "other"),
    "cosmic-divide": ("astra", "other"),
    # Neon
    "high-gear": ("neon", "other"),
    "relay-bolt": ("neon", "stall"),
    "fast-lane": ("neon", "stall"),
    "overdrive": ("neon", "other"),
    # Clove
    "ruse": ("clove", "smoke"),
    "meddle": ("clove", "other"),
    "pick-me-up": ("clove", "other"),
    "not-dead-yet": ("clove", "other"),
    # Waylay
    "saturate": ("waylay", "stall"),
    "light-speed": ("waylay", "other"),
    "refract": ("waylay", "other"),
    "convergent-paths": ("waylay", "other"),
    # Skye (IDs inferred from ability names; verified against data by the unmapped check)
    "trailblazer": ("skye", "recon"),
    "guiding-light": ("skye", "flash"),
    "seekers": ("skye", "recon"),
    "regrowth": ("skye", "other"),
    # Sage
    "slow-orb": ("sage", "stall"),
    "barrier-orb": ("sage", "stall"),
    "healing-orb": ("sage", "other"),
    "resurrection": ("sage", "other"),
    # Harbor
    "cascade": ("harbor", "stall"),
    "cove": ("harbor", "smoke"),
    "high-tide": ("harbor", "stall"),
    "reckoning": ("harbor", "other"),
    # Gekko
    "dizzy": ("gekko", "flash"),
    "mosh-pit": ("gekko", "molly"),
    "thrash": ("gekko", "other"),
    "wingman": ("gekko", "other"),
    # Iso
    "undercut": ("iso", "stall"),
    "contingency": ("iso", "stall"),
    "double-tap": ("iso", "other"),
    "kill-contract": ("iso", "other"),
    # Phoenix
    "curveball": ("phoenix", "flash"),
    "hot-hands": ("phoenix", "molly"),
    "blaze": ("phoenix", "stall"),
    # Veto (placed utility)
    "chokehold": ("veto", "placeable"),
    "crosscut": ("veto", "placeable"),
    "interceptor": ("veto", "placeable"),
    # Reyna
    "leer": ("reyna", "flash"),
    "devour": ("reyna", "other"),
    # Miks
    "m-pulse": ("miks", "stall"),
    "waveform": ("miks", "smoke"),
    "harmonize": ("miks", "other"),
    "bassquake": ("miks", "other"),
    # Harbor (grenade-slot wave)
    "storm-surge": ("harbor", "stall"),
    # Every ability ID in the dataset's 857 series (1.4M casts) is now covered; agent attributions
    # above were confirmed against which agent actually cast each ability. New IDs fall back to
    # ("unknown", "other").
}

CATEGORIES = ["placeable", "recon", "smoke", "stall", "flash", "molly", "other"]

UNKNOWN: Tuple[str, str] = ("unknown", "other")


def classify(ability_id: Optional[str]) -> Tuple[str, str]:
    if not ability_id:
        return UNKNOWN
    return ABILITIES.get(ability_id, UNKNOWN)


def category_of(ability_id: Optional[str]) -> str:
    return classify(ability_id)[1]


def agent_of(ability_id: Optional[str]) -> str:
    return classify(ability_id)[0]
