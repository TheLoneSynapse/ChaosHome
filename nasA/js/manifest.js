/* =========================================================================
   manifest.js — A-to-Z machinery for every mission.
   EXTRA_PARTS: machinery defs shared across missions (satellites, experiments).
   UPGRADES: per-mission manifest chips, hidden diagram parts, extra fates.
   Everything is merged into MISSIONS at load time — data.js stays untouched.
   ========================================================================= */

const EXTRA_PARTS = [
  { id: "orbiter", name: "Orbiter / Satellite", label: "Orbiter",
    desc: "A solar-powered camera ship released to circle the planet — photographing the surface below and relaying the lander's signal back to Earth.",
    size: "≈2.3 t (Viking)" },
  { id: "alsep", name: "Surface Experiment Station", label: "Experiments",
    desc: "A radioisotope-powered package of seismometers, heat-flow probes and particle detectors that astronauts deployed by hand and left broadcasting.",
    size: "≈450 kg" },
  { id: "lrrr", name: "Laser Retroreflector", label: "Experiments",
    desc: "A tray of corner-cube mirrors that bounces laser pulses from Earth straight back to their sender. No power, no moving parts, no expiry date.",
    size: "46 cm array" },
  { id: "aquarius", name: "Lunar Module Aquarius", label: "Lifeboat LM",
    desc: "Apollo 13's lander, never meant to keep three men alive, improvised as a power, oxygen and navigation source for four days.",
    size: "≈15 t with life support" },
  { id: "mco", name: "Relay Satellite (Mars Climate Orbiter)", label: "Satellite",
    desc: "A companion satellite sent ahead to relay the lander's landing signals — lost before the lander ever arrived.",
    size: "338 kg" }
];

const UPGRADES = {
  /* ------------------------------------------------------------- THE MOON */
  surveyor1: {
    hide: {},
    manifest: [
      { p: "rBoost", n: "Atlas booster", t: "launch" },
      { p: "rCore", n: "Centaur upper stage", t: "launch" },
      { p: "rFairing", n: "Payload fairing", t: "launch" },
      { p: "svBody", n: "Surveyor spacecraft bus", t: "surface" },
      { p: "svEngine", n: "Retro-rocket", t: "edl" },
      { p: "svLegs", n: "Three-leg landing gear", t: "land" },
      { p: "svPanel", n: "Solar panel", t: "surface" },
      { p: "svDish", n: "Dish antenna", t: "surface" }
    ]
  },

  apollo11: {
    hide: { lm: ["rover"] },
    fates: {
      alsep: "The Early Apollo Surface Experiments Package — a seismometer and dust detector — was deployed 20 m from the lander. The seismometer could hear astronauts' footsteps; it fell silent in August 1969.",
      lrrr: "Still working today: observatories fire lasers at this mirror array and time the bounce to measure the Earth–Moon distance to millimetre precision."
    },
    manifest: [
      { p: "sic", n: "S-IC first stage", t: "launch" },
      { p: "sii", n: "S-II second stage", t: "launch" },
      { p: "sivb", n: "S-IVB third stage", t: "launch" },
      { p: "iu", n: "Instrument Unit", t: "launch" },
      { p: "adapter", n: "LM adapter panels", t: "launch" },
      { p: "cm", n: "Command Module", t: "crew" },
      { p: "sm", n: "Service Module", t: "crew" },
      { p: "lmAscent", n: "LM ascent stage", t: "crew" },
      { p: "lmHatch", n: "Docking hatch & target", t: "crew" },
      { p: "lmRCS", n: "RCS thruster quads", t: "crew" },
      { p: "lmDescent", n: "LM descent stage", t: "surface" },
      { p: "lmEngine", n: "Descent engine", t: "surface" },
      { p: "lmLegs", n: "Landing legs & footpads", t: "surface" },
      { p: "alsep", n: "EASEP experiments", t: "science" },
      { p: "lrrr", n: "Laser retroreflector", t: "science" }
    ]
  },

  apollo12: {
    hide: { lm: ["rover", "lrrr"] },
    fates: {
      alsep: "A full experiment station with a seismometer and solar-wind monitor; it kept broadcasting until mission control shut the whole ALSEP network down on 30 September 1977."
    },
    manifest: [
      { p: "sic", n: "S-IC first stage", t: "launch" },
      { p: "sii", n: "S-II second stage", t: "launch" },
      { p: "sivb", n: "S-IVB third stage", t: "launch" },
      { p: "iu", n: "Instrument Unit", t: "launch" },
      { p: "adapter", n: "LM adapter panels", t: "launch" },
      { p: "cm", n: "Command Module", t: "crew" },
      { p: "sm", n: "Service Module", t: "crew" },
      { p: "lmAscent", n: "LM ascent stage", t: "crew" },
      { p: "lmHatch", n: "Docking hatch & target", t: "crew" },
      { p: "lmRCS", n: "RCS thruster quads", t: "crew" },
      { p: "lmDescent", n: "LM descent stage", t: "surface" },
      { p: "lmEngine", n: "Descent engine", t: "surface" },
      { p: "lmLegs", n: "Landing legs & footpads", t: "surface" },
      { p: "alsep", n: "ALSEP experiment station", t: "science" }
    ]
  },

  apollo13: {
    hide: {},
    fates: {
      alsep: "Never deployed — Apollo 13 never landed. Its experiment station remains sealed inside the descent stage, which is somewhere on the Moon with the rest of Aquarius.",
      aquarius: "Used as a lifeboat for three men for four days, then jettisoned hours before re-entry on 17 April 1970. It burned up in Earth's atmosphere; nothing reached the surface."
    },
    manifest: [
      { p: "sic", n: "S-IC first stage", t: "launch" },
      { p: "sii", n: "S-II second stage", t: "launch" },
      { p: "sivb", n: "S-IVB third stage", t: "launch" },
      { p: "iu", n: "Instrument Unit", t: "launch" },
      { p: "adapter", n: "LM adapter panels", t: "launch" },
      { p: "cm", n: "Command Module", t: "crew" },
      { p: "sm", n: "Service Module", t: "crew" },
      { p: "aquarius", n: "LM Aquarius (lifeboat)", t: "crew" },
      { p: "imCraft", n: "S-IVB at impact", t: "edl" },
      { p: "imCrater", n: "The 30 m crater", t: "surface" }
    ]
  },

  apollo14: {
    hide: { lm: ["rover"] },
    fates: {
      alsep: "Seismic and solar-wind instruments deployed at Fra Mauro, silent since the 1977 network shutdown.",
      lrrr: "One of five Apollo laser reflectors still in service — it returns ranging signals to Earth to this day."
    },
    manifest: [
      { p: "sic", n: "S-IC first stage", t: "launch" },
      { p: "sii", n: "S-II second stage", t: "launch" },
      { p: "sivb", n: "S-IVB third stage", t: "launch" },
      { p: "iu", n: "Instrument Unit", t: "launch" },
      { p: "adapter", n: "LM adapter panels", t: "launch" },
      { p: "cm", n: "Command Module", t: "crew" },
      { p: "sm", n: "Service Module", t: "crew" },
      { p: "lmAscent", n: "LM ascent stage", t: "crew" },
      { p: "lmHatch", n: "Docking hatch & target", t: "crew" },
      { p: "lmRCS", n: "RCS thruster quads", t: "crew" },
      { p: "lmDescent", n: "LM descent stage", t: "surface" },
      { p: "lmEngine", n: "Descent engine", t: "surface" },
      { p: "lmLegs", n: "Landing legs & footpads", t: "surface" },
      { p: "alsep", n: "ALSEP experiment station", t: "science" },
      { p: "lrrr", n: "Laser retroreflector", t: "science" }
    ]
  },

  apollo15: {
    hide: {},
    fates: {
      alsep: "Included Apollo's first heat-flow experiment, drilled into the regolith; broadcast until the 1977 shutdown.",
      lrrr: "Still in service for Earth–Moon laser ranging from observatories worldwide."
    },
    manifest: [
      { p: "sic", n: "S-IC first stage", t: "launch" },
      { p: "sii", n: "S-II second stage", t: "launch" },
      { p: "sivb", n: "S-IVB third stage", t: "launch" },
      { p: "iu", n: "Instrument Unit", t: "launch" },
      { p: "adapter", n: "LM adapter panels", t: "launch" },
      { p: "cm", n: "Command Module", t: "crew" },
      { p: "sm", n: "Service Module", t: "crew" },
      { p: "lmAscent", n: "LM ascent stage", t: "crew" },
      { p: "lmHatch", n: "Docking hatch & target", t: "crew" },
      { p: "lmRCS", n: "RCS thruster quads", t: "crew" },
      { p: "lmDescent", n: "LM descent stage", t: "surface" },
      { p: "lmEngine", n: "Descent engine", t: "surface" },
      { p: "lmLegs", n: "Landing legs & footpads", t: "surface" },
      { p: "rover", n: "Lunar Roving Vehicle", t: "surface" },
      { p: "alsep", n: "ALSEP experiment station", t: "science" },
      { p: "lrrr", n: "Laser retroreflector", t: "science" }
    ]
  },

  apollo16: {
    hide: {},
    fates: {
      alsep: "Highlands seismic and heat-flow experiments, deployed at Descartes; shut down with the network in 1977.",
      lrrr: "Still in service for laser ranging."
    },
    manifest: [
      { p: "sic", n: "S-IC first stage", t: "launch" },
      { p: "sii", n: "S-II second stage", t: "launch" },
      { p: "sivb", n: "S-IVB third stage", t: "launch" },
      { p: "iu", n: "Instrument Unit", t: "launch" },
      { p: "adapter", n: "LM adapter panels", t: "launch" },
      { p: "cm", n: "Command Module", t: "crew" },
      { p: "sm", n: "Service Module", t: "crew" },
      { p: "lmAscent", n: "LM ascent stage", t: "crew" },
      { p: "lmHatch", n: "Docking hatch & target", t: "crew" },
      { p: "lmRCS", n: "RCS thruster quads", t: "crew" },
      { p: "lmDescent", n: "LM descent stage", t: "surface" },
      { p: "lmEngine", n: "Descent engine", t: "surface" },
      { p: "lmLegs", n: "Landing legs & footpads", t: "surface" },
      { p: "rover", n: "Lunar Roving Vehicle", t: "surface" },
      { p: "alsep", n: "ALSEP experiment station", t: "science" },
      { p: "lrrr", n: "Laser retroreflector", t: "science" }
    ]
  },

  apollo17: {
    hide: {},
    fates: {
      alsep: "The largest ALSEP, including a lunar-atmosphere composition experiment; silent since 30 September 1977.",
      lrrr: "Still in service — the last of the Apollo reflectors to be installed, and still returning lasers."
    },
    manifest: [
      { p: "sic", n: "S-IC first stage", t: "launch" },
      { p: "sii", n: "S-II second stage", t: "launch" },
      { p: "sivb", n: "S-IVB third stage", t: "launch" },
      { p: "iu", n: "Instrument Unit", t: "launch" },
      { p: "adapter", n: "LM adapter panels", t: "launch" },
      { p: "cm", n: "Command Module", t: "crew" },
      { p: "sm", n: "Service Module", t: "crew" },
      { p: "lmAscent", n: "LM ascent stage", t: "crew" },
      { p: "lmHatch", n: "Docking hatch & target", t: "crew" },
      { p: "lmRCS", n: "RCS thruster quads", t: "crew" },
      { p: "lmDescent", n: "LM descent stage", t: "surface" },
      { p: "lmEngine", n: "Descent engine", t: "surface" },
      { p: "lmLegs", n: "Landing legs & footpads", t: "surface" },
      { p: "rover", n: "Lunar Roving Vehicle", t: "surface" },
      { p: "alsep", n: "ALSEP experiment station", t: "science" },
      { p: "lrrr", n: "Laser retroreflector", t: "science" }
    ]
  },

  /* ---------------------------------------------------------------- MARS */
  viking1: {
    hide: {},
    fates: {
      orbiter: "When it ran out of attitude-control propellant, controllers raised its orbit so it could not fall onto Mars and contaminate it — then powered it down on 7 August 1980. It should still be circling Mars silently; its exact present status is unconfirmed.",
      deck: "The lander's deck — officially the Thomas Mutch Memorial Station — still sits where it landed on 20 July 1976.",
      payload: "Two cameras, a robotic sampler arm, an X-ray spectrometer, weather instruments, a soil chemistry lab and three biology experiments searching for life."
    },
    manifest: [
      { p: "rBoost", n: "Titan II core & strap-ons", t: "launch" },
      { p: "rCore", n: "Centaur upper stage", t: "launch" },
      { p: "rFairing", n: "Payload fairing", t: "launch" },
      { p: "orbiter", n: "Viking 1 Orbiter (satellite)", t: "orbit" },
      { p: "cruise", n: "Cruise stage", t: "cruise" },
      { p: "heatshield", n: "Heat shield", t: "edl" },
      { p: "backshell", n: "Backshell", t: "edl" },
      { p: "parachute", n: "Parachute", t: "edl" },
      { p: "engines", n: "Three descent engines", t: "land" },
      { p: "legs", n: "Landing legs", t: "land" },
      { p: "deck", n: "Lander deck (Mutch Station)", t: "surface" },
      { p: "payload", n: "Biology lab, arm & cameras", t: "science" }
    ]
  },

  pathfinder: {
    hide: { airbagEDL: ["orbiter"] },
    manifest: [
      { p: "rBoost", n: "Delta II first stage", t: "launch" },
      { p: "rCore", n: "Delta II upper stage", t: "launch" },
      { p: "rFairing", n: "Payload fairing", t: "launch" },
      { p: "abCruise", n: "Cruise stage", t: "cruise" },
      { p: "abShell", n: "Aeroshell & heat shield", t: "edl" },
      { p: "abChute", n: "Parachute", t: "edl" },
      { p: "abBags", n: "Airbag system", t: "edl" },
      { p: "abPetals", n: "Lander petals (Sagan Station)", t: "land" },
      { p: "abRover", n: "Sojourner rover", t: "surface" }
    ]
  },

  mpl: {
    hide: { marsLander: ["orbiter"] },
    fates: {
      mco: "The relay satellite meant to watch MPL land was lost on 23 September 1999 — a navigation error where one team used pound-force seconds while the software expected newton-seconds. MPL arrived with no relay waiting.",
      backshell: "Unknown — the lander most likely never completed descent. Any debris lies somewhere in the target region and has never been imaged.",
      heatshield: "Unknown; presumed to have separated during descent and come to rest in the south polar layered terrain, unfound.",
      parachute: "Unknown; if deployed, it fell somewhere near the intended site. No wreckage has ever been confirmed.",
      engines: "The pulsed retrorockets most likely shut down early, sending the lander into the surface at speed. Nothing survives that has been located.",
      legs: "Never confirmed — the landing never completed on radio, and no wreckage has been found.",
      payload: "A camera, laser altimeter, meteorology suite and soil-analysis instruments that never got the chance to send a single science packet.",
      cruise: "Coasted eleven months to the southern hemisphere of Mars before the lander separated for its final descent."
    },
    manifest: [
      { p: "rBoost", n: "Delta II first stage", t: "launch" },
      { p: "rCore", n: "Delta II upper stage", t: "launch" },
      { p: "rFairing", n: "Payload fairing", t: "launch" },
      { p: "mco", n: "Relay satellite (MCO)", t: "orbit" },
      { p: "cruise", n: "Cruise stage", t: "cruise" },
      { p: "heatshield", n: "Heat shield", t: "edl" },
      { p: "backshell", n: "Backshell", t: "edl" },
      { p: "parachute", n: "Parachute", t: "edl" },
      { p: "engines", n: "Pulsed retrorockets", t: "land" },
      { p: "legs", n: "Landing legs", t: "land" },
      { p: "payload", n: "Camera & soil lab", t: "science" }
    ]
  },

  spirit: {
    hide: { airbagEDL: ["orbiter"] },
    manifest: [
      { p: "rBoost", n: "Delta II first stage", t: "launch" },
      { p: "rCore", n: "Delta II upper stage", t: "launch" },
      { p: "rFairing", n: "Payload fairing", t: "launch" },
      { p: "abCruise", n: "Cruise stage", t: "cruise" },
      { p: "abShell", n: "Aeroshell & heat shield", t: "edl" },
      { p: "abChute", n: "Parachute", t: "edl" },
      { p: "abBags", n: "Airbag system", t: "edl" },
      { p: "abPetals", n: "Lander base station", t: "land" },
      { p: "abRover", n: "Spirit rover", t: "surface" }
    ]
  },

  opportunity: {
    hide: { airbagEDL: ["orbiter"] },
    manifest: [
      { p: "rBoost", n: "Delta II first stage", t: "launch" },
      { p: "rCore", n: "Delta II upper stage", t: "launch" },
      { p: "rFairing", n: "Payload fairing", t: "launch" },
      { p: "abCruise", n: "Cruise stage", t: "cruise" },
      { p: "abShell", n: "Aeroshell & heat shield", t: "edl" },
      { p: "abChute", n: "Parachute", t: "edl" },
      { p: "abBags", n: "Airbag system", t: "edl" },
      { p: "abPetals", n: "Lander base station", t: "land" },
      { p: "abRover", n: "Opportunity rover", t: "surface" }
    ]
  },

  phoenix: {
    hide: { marsLander: ["orbiter"] },
    manifest: [
      { p: "rBoost", n: "Delta II first stage", t: "launch" },
      { p: "rCore", n: "Delta II upper stage", t: "launch" },
      { p: "rFairing", n: "Payload fairing", t: "launch" },
      { p: "cruise", n: "Cruise stage", t: "cruise" },
      { p: "heatshield", n: "Heat shield", t: "edl" },
      { p: "backshell", n: "Backshell", t: "edl" },
      { p: "parachute", n: "Parachute", t: "edl" },
      { p: "engines", n: "Descent engines", t: "land" },
      { p: "legs", n: "Landing legs", t: "land" },
      { p: "deck", n: "Lander deck & arrays", t: "surface" },
      { p: "payload", n: "Digging arm & ice oven", t: "science" }
    ]
  },

  insight: {
    hide: { marsLander: ["orbiter"] },
    manifest: [
      { p: "rBoost", n: "Atlas V core & solids", t: "launch" },
      { p: "rCore", n: "Centaur upper stage", t: "launch" },
      { p: "rFairing", n: "Payload fairing", t: "launch" },
      { p: "cruise", n: "Cruise stage", t: "cruise" },
      { p: "heatshield", n: "Heat shield", t: "edl" },
      { p: "backshell", n: "Backshell", t: "edl" },
      { p: "parachute", n: "Parachute", t: "edl" },
      { p: "engines", n: "12 descent thrusters", t: "land" },
      { p: "legs", n: "Landing legs", t: "land" },
      { p: "deck", n: "Lander deck & solar arrays", t: "surface" },
      { p: "payload", n: "SEIS seismometer & mole", t: "science" }
    ]
  },

  perseverance: {
    hide: { roverEDL: ["orbiter"] },
    manifest: [
      { p: "rBoost", n: "Atlas V core & boosters", t: "launch" },
      { p: "rCore", n: "Centaur upper stage", t: "launch" },
      { p: "rFairing", n: "Payload fairing", t: "launch" },
      { p: "edCruise", n: "Cruise stage", t: "cruise" },
      { p: "edAeroshell", n: "Aeroshell: heat shield + backshell", t: "edl" },
      { p: "edParachute", n: "Supersonic parachute", t: "edl" },
      { p: "edCrane", n: "Sky crane", t: "land" },
      { p: "edRover", n: "Perseverance rover", t: "surface" },
      { p: "edHeli", n: "Ingenuity helicopter", t: "surface" }
    ]
  }
};

/* --------------------------------------------------------------- merging */
MISSIONS.forEach((m) => {
  const u = UPGRADES[m.id];
  if (!u) return;
  m.fates = { ...m.fates, ...(u.fates || {}) };
  if (u.hide) m.hide = u.hide;
  if (u.manifest) m.manifest = u.manifest;
});
