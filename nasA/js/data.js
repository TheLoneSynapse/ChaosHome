/* =========================================================================
   data.js — vehicle part catalogues + mission records
   Coordinates: decimal degrees. Lunar longitudes stored 0–360 east.
   Sources are listed at the bottom and rendered into the footer.
   ========================================================================= */

/* ---------------------------------------------------------------- vehicles */
const VEHICLES = {
  saturnV: {
    label: "Saturn V",
    parts: [
      { id: "sic", name: "S-IC First Stage", desc: "Five F-1 engines produced 7.6 million pounds of thrust to lift the fully fuelled 3,000-tonne rocket off the pad.", size: "42 m tall · 10 m across" },
      { id: "sii", name: "S-II Second Stage", desc: "Five J-2 engines kept accelerating the vehicle after the first stage fell away, nearly reaching orbit.", size: "24.8 m tall · 10 m across" },
      { id: "sivb", name: "S-IVB Third Stage", desc: "One J-2 engine first parked Apollo in Earth orbit, then fired again to send it toward the Moon.", size: "18 m long · 6.6 m across" },
      { id: "iu", name: "Instrument Unit", desc: "A 0.9 m-tall ring of guidance, control and telemetry hardware — the brain that steered the Saturn V.", size: "0.9 m tall · 6.6 m across" },
      { id: "sm", name: "Service Module", desc: "Carried the main engine, propellant, oxygen and electrical power that kept the crew alive.", size: "6.7 m long" },
      { id: "cm", name: "Command Module", desc: "The cone-shaped crew cabin — the single part of the entire stack designed to come home.", size: "3.4 m tall" },
      { id: "adapter", name: "LM Adapter Panels", desc: "Protective panels enclosing the folded Lunar Module beneath the Command Module during launch.", size: "opened in Earth orbit" }
    ]
  },

  lm: {
    label: "Apollo Lunar Module",
    parts: [
      { id: "lmAscent", name: "Ascent Stage", desc: "Pressurised cabin for two astronauts, plus the ascent engine that lifted the crew off the Moon. About 2.1–2.3 tonnes near the end of flight.", size: "≈3.7 m tall" },
      { id: "lmHatch", name: "Docking Hatch & Target", desc: "The hatch and visual docking target used to rendezvous and dock with the Command Module in lunar orbit.", size: "part of ascent stage" },
      { id: "lmRCS", name: "RCS Thruster Quads", desc: "Four clusters of small jets — 16 thrusters in total — that rolled, pitched and yawed the LM in space.", size: "4 quads" },
      { id: "lmDescent", name: "Descent Stage", desc: "Octagonal base holding landing propellant, avionics and equipment. It doubled as the launch pad for the ascent stage.", size: "3.2 m tall · 9.4 m leg span" },
      { id: "lmEngine", name: "Descent Engine", desc: "Throttleable rocket engine that slowed the LM from orbital speed to a soft, crew-controlled touchdown.", size: "45 kN throttleable" },
      { id: "lmLegs", name: "Landing Legs & Footpads", desc: "Four folding legs with shock-absorbing struts and broad pads that settled the LM on uneven lunar ground.", size: "9.4 m across, deployed" }
    ]
  },

  marsRocket: {
    label: "Launch Vehicle",
    parts: [
      { id: "rBoost", name: "First Stage & Boosters", desc: "Lifted the rocket through the thickest part of the atmosphere, then fell away into the ocean or burned up on re-entry.", size: "burns ≈2–4 min" },
      { id: "rCore", name: "Upper Stage", desc: "Circularised the orbit and then, on a second burn, injected the spacecraft onto its interplanetary path toward Mars.", size: "left as spent junk" },
      { id: "rFairing", name: "Payload Fairing", desc: "A protective shell that shielded the folded spacecraft from aerodynamic heat and noise during ascent.", size: "jettisoned ≈3 min after launch" },
      { id: "rCraft", name: "The Spacecraft", desc: "The lander or rover, folded inside the fairing — the only part of the rocket that has a ticket to Mars.", size: "coasts for months" }
    ]
  },

  marsLander: {
    label: "Mars Lander (Viking / InSight type)",
    parts: [
      { id: "cruise", name: "Cruise Stage", desc: "Provided power, propulsion and communications during the months-long coast from Earth to Mars.", size: "separated before entry" },
      { id: "backshell", name: "Aeroshell Backshell", desc: "Rear half of the protective shell that enclosed the lander; it carried the parachute and descent hardware.", size: "≈2.6 m across (InSight)" },
      { id: "heatshield", name: "Heat Shield", desc: "Front half of the aeroshell, absorbing entry temperatures near 1,500 °C while the craft decelerates from ~20,000 km/h.", size: "≈190 kg with backshell" },
      { id: "parachute", name: "Parachute", desc: "Supersonic supersonic chute that bled off speed in Mars' atmosphere — just 1% as thick as Earth's.", size: "≈16 m across (Viking)" },
      { id: "engines", name: "Descent Engines", desc: "Rockets that fired for the final powered drop after the parachute was cut free, easing the lander down.", size: "3 engines (Viking), 12 (InSight)" },
      { id: "legs", name: "Landing Legs & Footpads", desc: "Shock-absorbing legs that absorbed touchdown and held the lander stable on the Martian soil.", size: "3 legs (typical)" },
      { id: "deck", name: "Deck & Solar Arrays", desc: "The lander's working deck — computers, batteries, cameras — with solar panels unfolded after landing.", size: "≈6 m wingspan (InSight)" },
      { id: "payload", name: "Science Payload", desc: "Cameras, weather stations, seismometers, drills and soil labs that studied Mars from a fixed post.", size: "deployed on/near deck" }
    ]
  },

  roverEDL: {
    label: "Rover Entry, Descent & Landing Chain",
    parts: [
      { id: "edCruise", name: "Cruise Stage", desc: "Carried the encapsulated rover from Earth to Mars, supplying power, propulsion and communications on the way.", size: "separated before entry" },
      { id: "edAeroshell", name: "Aeroshell: Heat Shield + Backshell", desc: "The 4.5 m protective shell that carried the rover through Martian entry intact.", size: "4.5 m across (Mars 2020)" },
      { id: "edParachute", name: "Supersonic Parachute", desc: "The largest parachute ever flown at Mars, deployed while still travelling faster than sound.", size: "21.5 m across" },
      { id: "edCrane", name: "Sky Crane", desc: "A rocket-powered hovering crane that lowered the rover on a 7.5 m bridle, then flew itself away at touchdown.", size: "≈845 kg" },
      { id: "edRover", name: "The Rover", desc: "The mobile laboratory that survived the whole chain and now drives across Mars.", size: "3 m long · 1,025 kg" },
      { id: "edHeli", name: "Helicopter", desc: "A 1.8 kg solar-powered helicopter tucked beneath the rover's belly for the ride down.", size: "1.8 kg" }
    ]
  },

  airbagEDL: {
    label: "Airbag Landing Chain",
    parts: [
      { id: "abCruise", name: "Cruise Stage", desc: "Power, propulsion and communications for the interplanetary coast; dropped away just before entry.", size: "separated before entry" },
      { id: "abShell", name: "Aeroshell & Heat Shield", desc: "Protective shell that took the brunt of atmospheric entry before splitting apart.", size: "entry at ~7.3 km/s" },
      { id: "abChute", name: "Parachute", desc: "Deployed at supersonic speed to slow the craft enough for rocket-assisted final braking.", size: "tens of metres across" },
      { id: "abBags", name: "Airbag System", desc: "Four large interconnected bags, each made of smaller lobes, inflated around the lander to bounce it to a stop.", size: "≈5 m tall & wide" },
      { id: "abPetals", name: "Lander Petals & Ramps", desc: "Petal walls that opened the lander like a flower once it stopped rolling, exposing ramps for the rover.", size: "3 petals" },
      { id: "abRover", name: "The Rover", desc: "A small rover that drove down the ramp and off to inspect rocks and soil for the first time on Mars.", size: "≈65 cm long" }
    ]
  },

  surveyor: {
    label: "Surveyor Lander",
    parts: [
      { id: "svEngine", name: "Retro-Rocket", desc: "A radar-controlled engine that fired to kill most of the spacecraft's speed a few kilometres above the surface.", size: "single solid motor" },
      { id: "svBody", name: "Spacecraft Bus", desc: "The boxy frame holding electronics, batteries and the television camera that returned the first close-ups of lunar soil.", size: "≈1,000 kg at launch" },
      { id: "svLegs", name: "Three-Leg Landing Gear", desc: "A wide tripod of legs and footpads designed to survive a touchdown on unprepared ground.", size: "4.5 m footpad span" },
      { id: "svPanel", name: "Solar Panel", desc: "Fed the batteries between lunar day and night so the spacecraft could keep answering calls.", size: "body-mounted" },
      { id: "svDish", name: "High-Gain Antenna", desc: "The dish that beamed pictures and engineering data straight back to Earth across 380,000 km.", size: "cone antenna" }
    ]
  },

  impact: {
    label: "Deliberate Impact",
    parts: [
      { id: "imCraft", name: "The Discarded Stage", desc: "A spent stage or abandoned spacecraft redirected into the Moon at high speed — often on purpose, as a seismic experiment.", size: "thousands of tonnes" },
      { id: "imCrater", name: "The New Crater", desc: "The fresh scar left behind, later identified in imagery from the Lunar Reconnaissance Orbiter.", size: "14–35 m across (Apollo)" }
    ]
  }
};

/* ---------------------------------------------------------------- missions */
const MISSIONS = [
  /* =========================== THE MOON =========================== */
  {
    id: "surveyor1",
    name: "Surveyor 1",
    subtitle: "America's first soft landing",
    target: "moon",
    year: 1966,
    launchVehicle: "Atlas–Centaur",
    status: "Abandoned 1967",
    statusKind: "gone",
    photo: null,
    coords: { lat: -2.4745, lon: 316.6602, region: "Ocean of Storms — Flamsteed P",
      note: "Image-derived position of the lander (LROC); LPI historical values differ slightly." },
    fates: {
      svBody: "Left standing at Flamsteed P. Operations ran into January 1967; LROC photographed it from orbit decades later.",
      svEngine: "Fired once during the terminal descent, then stayed attached to the spacecraft forever.",
      svLegs: "Still carrying the lander on the mare basalts of the Ocean of Storms.",
      svPanel: "Sat in the lunar sunlight until the batteries and electronics gave out.",
      svDish: "Pointed at Earth, silent since early 1967."
    },
    facts: [
      "First U.S. spacecraft to soft-land on the Moon",
      "Returned 11,240 television images of the surface",
      "Apollo 12 astronauts later walked over to Surveyor 3, 190 m away, and flew parts home"
    ],
    phases: [
      { label: "Launch", date: "31 May 1966 · Cape Canaveral", title: "An unmanned scout lifts off",
        body: "An Atlas rocket with a Centaur upper stage sends Surveyor 1 toward the Moon — a dress rehearsal for Apollo, built to prove a soft landing was possible at all.",
        diagram: "marsRocket", focus: ["rFairing", "rCraft"] },
      { label: "Cruise", date: "31 May – 2 June 1966", title: "Three and a half days across the void",
        body: "The spacecraft coasts quietly toward the Moon with no landing gear deployed and no engine running — just navigation and radio calls home.",
        diagram: "marsRocket", focus: ["rCraft"] },
      { label: "Braking", date: "2 June 1966", title: "Rockets fire, then it free-falls",
        body: "Radar detects the surface and the retro-rocket fires to wipe out most of the speed a few kilometres up; the last stretch is a free-fall toward the mare.",
        diagram: "surveyor", focus: ["svEngine"] },
      { label: "Touchdown", date: "2 June 1966", title: "First contact — it bounces twice",
        body: "Surveyor touches down near Flamsteed P, bounces twice, settles, and sends the first picture: U.S. hardware resting on another world.",
        diagram: "surveyor", focus: ["svLegs", "svBody"] },
      { label: "End of life", date: "1966 → today", title: "A silent tripod on the mare",
        body: "After 11,240 images and engineering interrogations into January 1967, it fell quiet. It has stood in the Ocean of Storms for nearly sixty years — imaged from lunar orbit by LRO.",
        diagram: "surveyor", focus: ["svBody", "svLegs", "svDish", "svPanel", "svEngine"] }
    ]
  },

  {
    id: "apollo11",
    name: "Apollo 11",
    subtitle: "Lunar Module “Eagle” — Tranquility Base",
    target: "moon",
    year: 1969,
    launchVehicle: "Saturn V",
    status: "Abandoned 1969",
    statusKind: "gone",
    photo: "assets/apollo11.jpg",
    coords: { lat: 0.67416, lon: 23.47314, region: "Sea of Tranquility",
      note: "LRO-measured position of the descent stage (NSSDCA); uncertainty ≈15 m." },
    fates: {
      lmDescent: "Left standing at Tranquility Base — the crew launched from the top of it and never came back.",
      lmEngine: "Silent and frozen in vacuum since 24 July 1969, still bolted under the descent stage.",
      lmLegs: "Planted 9.4 m wide in the regolith, undisturbed by wind that never blows.",
      lmAscent: "Released in lunar orbit after crew transfer. Where it went — orbit, impact, or still up there — remains unknown to this day.",
      lmHatch: "Flew with the ascent stage; the last place it opened was on the way back to the Command Module.",
      lmRCS: "Flew with the ascent stage, used for the rendezvous burns before the stage was abandoned.",
      sic: "Burned out about 2.5 minutes after launch and fell into the Atlantic Ocean.",
      sii: "Jettisoned roughly nine minutes into flight; also dropped into the ocean.",
      sivb: "After helping send Apollo 11 to the Moon, it was released onto a solar orbit — not impacted. It is still circling the Sun somewhere.",
      iu: "Its job done, it separated with the S-IVB and was discarded in space.",
      cm: "Splashed down in the Pacific on 24 July 1969 with all three crewmen aboard.",
      sm: "Jettisoned just before re-entry and burned up in Earth's atmosphere.",
      adapter: "Panels jettisoned in Earth orbit once the crew had extracted the Lunar Module."
    },
    facts: [
      "Descent stage: 3.2 m tall, 9.4 m across its four legs",
      "The EASEP seismometer could hear astronauts' footsteps",
      "Its laser retroreflector is still used today for Earth–Moon laser ranging"
    ],
    phases: [
      { label: "Launch", date: "16 July 1969 · Kennedy LC-39A", title: "The stack leaves the pad",
        body: "Five F-1 engines light and Saturn V climbs. Two minutes later the first stage is in the ocean; about an hour after that, the S-IVB fires again and throws Apollo 11 toward the Moon.",
        diagram: "saturnV", focus: ["sic", "sii"] },
      { label: "Cruise", date: "16–19 July 1969", title: "Coasting to the Moon",
        body: "The Command Module turns around, pulls the folded Lunar Module out of its adapter panels, and docks. For three days the stack falls toward the Moon.",
        diagram: "saturnV", focus: ["sivb", "adapter", "cm"] },
      { label: "Arrival", date: "20 July 1969", title: "Powered descent to Tranquility Base",
        body: "Eagle separates and fires its descent engine, dropping from orbit toward the mare. With under 30 seconds of fuel left, Armstrong sets it down at 20:17 UTC.",
        diagram: "lm", focus: ["lmDescent", "lmEngine", "lmLegs"] },
      { label: "On the surface", date: "20–24 July 1969", title: "Two humans walk another world",
        body: "Armstrong and Aldrin spend 21½ hours on the surface: they deploy the EASEP experiments, collect 21.5 kg of samples, and leave footprints in untouched regolith.",
        diagram: "lm", focus: ["lmAscent", "lmHatch", "lmRCS"] },
      { label: "End of life", date: "24 July 1969 → forever", title: "The stage that never came home",
        body: "The ascent stage lifted off with the crew and was later released in lunar orbit — its ultimate fate is genuinely unknown. The descent stage, engine, legs and every experiment remain exactly where they were left.",
        diagram: "lm", focus: ["lmDescent", "lmEngine", "lmLegs"] }
    ]
  },

  {
    id: "apollo12",
    name: "Apollo 12",
    subtitle: "Lunar Module “Intrepid” — pinpoint landing",
    target: "moon",
    year: 1969,
    launchVehicle: "Saturn V",
    status: "Abandoned 1969",
    statusKind: "gone",
    photo: "assets/apollo12.jpg",
    coords: { lat: -3.0128, lon: 336.5781, region: "Ocean of Storms",
      note: "Descent-stage position (LROC). Its ascent stage impact lies 150 km away at 3.92°S, 338.83°E." },
    fates: {
      lmDescent: "Left in the Ocean of Storms a short walk from the robotic Surveyor 3.",
      lmEngine: "Fired three times to a pinpoint touchdown and stayed behind for good.",
      lmLegs: "Anchored beside the crater Conrad and Bean named itself after.",
      lmAscent: "Deliberately deorbited after rendezvous. Its impact site was later identified in LRO imagery at about 3.92°S, 338.83°E — a real, photographed crater.",
      lmHatch: "Flew with the ascent stage to orbit and was jettisoned with it before impact.",
      lmRCS: "Flew with the ascent stage and steered it into its intentional crash.",
      sic: "Fell into the Atlantic two and a half minutes after liftoff.",
      sii: "Dropped away nine minutes into the flight.",
      sivb: "The spent stage did not reach its planned lunar impact target; it drifted away rather than becoming a surface artifact.",
      iu: "Discarded in space with the upper-stage hardware.",
      cm: "Carried Conrad, Bean and Gordon home to a Pacific splashdown.",
      sm: "Burned up in the atmosphere before re-entry.",
      adapter: "Opened and jettisoned in Earth orbit."
    },
    facts: [
      "Struck by lightning twice during ascent — the crew kept flying",
      "Landed within 18 m of the robotic Surveyor 3, then walked over and took parts home",
      "Its ALSEP seismometer later recorded Apollo 13's booster crash 135 km away"
    ],
    phases: [
      { label: "Launch", date: "14 November 1969 · LC-39A", title: "Lightning on the way up",
        body: "About 36 seconds after liftoff the rocket flies through a thundercloud and is struck twice. The crew keeps going; the spacecraft's fuel cells recover on their own.",
        diagram: "saturnV", focus: ["sic", "sii"] },
      { label: "Cruise", date: "14–18 November 1969", title: "A three-day fall to the Moon",
        body: "The usual transit: extract the LM, dock, course-correct, and let the S-IVB drift off behind the spacecraft.",
        diagram: "saturnV", focus: ["sivb", "cm", "sm"] },
      { label: "Arrival", date: "19 November 1969", title: "Landing by the numbers",
        body: "Intrepid descends to the Ocean of Storms — not near Surveyor 3 by luck, but by navigation, touching down within 18 m of the target.",
        diagram: "lm", focus: ["lmDescent", "lmEngine", "lmLegs"] },
      { label: "On the surface", date: "19–21 November 1969", title: "A walk to a spacecraft from 1967",
        body: "Conrad and Bean hike over to Surveyor 3, photograph it, cut off its TV camera and scoop, and carry them back to Earth. Thirty-one hours of surface work begin.",
        diagram: "lm", focus: ["lmAscent", "lmRCS", "lmHatch"] },
      { label: "End of life", date: "1969 → today", title: "One stage buried, one left standing",
        body: "The ascent stage was deliberately flown into the Moon and its crater later spotted by LRO. The descent stage still sits in the Ocean of Storms, its ALSEP experiments broadcasting until mission control shut them down on 30 September 1977.",
        diagram: "lm", focus: ["lmDescent", "lmLegs", "lmAscent"] }
    ]
  },

  {
    id: "apollo13",
    name: "Apollo 13",
    subtitle: "The booster that finished the mission",
    target: "moon",
    year: 1970,
    launchVehicle: "Saturn V",
    status: "Impacted 1970",
    statusKind: "crash",
    photo: null,
    coords: { lat: -2.555, lon: 332.1125, region: "Mare Cognitum — north of",
      note: "LROC-identified impact crater from the deliberate S-IVB impact experiment." },
    fates: {
      sivb: "Deliberately rammed into the Moon on 14 April 1970 as a seismic experiment — the only Apollo 13 science objective that succeeded on schedule.",
      sic: "Discarded into the ocean during a normal ascent.",
      sii: "Discarded nine minutes into flight, also into the ocean.",
      iu: "Thrown away with the S-IVB in space.",
      cm: "Survived the free-return trajectory and brought the crew home on 17 April 1970.",
      sm: "Jettisoned before re-entry after its oxygen tank had exploded; drifted away in space.",
      adapter: "Opened normally in Earth orbit before the accident.",
      imCraft: "The empty S-IVB third stage was steered into the Moon at high speed on 14 April 1970.",
      imCrater: "A crater about 30 m across, later imaged by the Lunar Reconnaissance Orbiter."
    },
    facts: [
      "The crash made a crater ~30 m wide that LRO photographed decades later",
      "Apollo 12's seismometer registered the impact 135 km away",
      "An aborted landing still produced one clean, useful science experiment"
    ],
    phases: [
      { label: "Launch", date: "11 April 1970 · LC-39A", title: "A routine departure",
        body: "Saturn V performs flawlessly. Three days later, 320,000 km from Earth, an oxygen tank in the Service Module explodes and ends the landing attempt.",
        diagram: "saturnV", focus: ["sic", "sii", "sm"] },
      { label: "Cruise", date: "11–13 April 1970", title: "The ship becomes a lifeboat",
        body: "The crew shelters in the Lunar Module Aquarius, which was never built to keep three men alive. They swing around the Moon on a free-return path — no landing, no sample.",
        diagram: "saturnV", focus: ["cm", "sm"] },
      { label: "Stripped down", date: "14–17 April 1970", title: "Everything unnecessary is thrown away",
        body: "Aquarius is jettisoned hours before re-entry and burns up in Earth's atmosphere. The Service Module is cut loose just before re-entry, exposing the damaged panel to cameras.",
        diagram: "saturnV", focus: ["sm", "cm"] },
      { label: "Impact", date: "14 April 1970", title: "The spare part becomes an experiment",
        body: "While the crew is still falling home, the spent S-IVB third stage — carrying a seismometer package — is aimed at the Moon and impacts north of Mare Cognitum at over 2.5 km/s.",
        diagram: "impact", focus: ["imCraft"] },
      { label: "Legacy", date: "1970 → today", title: "A scar we can still see",
        body: "The impact was detected by Apollo 12's seismometer 135 km away, proving the technique. The resulting ~30 m crater was finally photographed by LRO in 2010 — a debris field with its own scientific legacy.",
        diagram: "impact", focus: ["imCrater"] }
    ]
  },

  {
    id: "apollo14",
    name: "Apollo 14",
    subtitle: "Lunar Module “Antares” — Fra Mauro",
    target: "moon",
    year: 1971,
    launchVehicle: "Saturn V",
    status: "Abandoned 1971",
    statusKind: "gone",
    photo: null,
    coords: { lat: -3.64589, lon: 342.52806, region: "Fra Mauro formation",
      note: "LRO-measured descent-stage position (NSSDCA); ascent-stage impact at 3.42°S, 340.36°E." },
    fates: {
      lmDescent: "Left at Fra Mauro, on soil blasted out by an ancient giant impact.",
      lmEngine: "Made the pinpoint landing possible, then never moved again.",
      lmLegs: "Standing in the ejecta blanket of the Fra Mauro formation.",
      lmAscent: "Deliberately deorbited on 7 February 1971; the impact site — a gouge-like feature with fresh ejecta — was later identified in LRO imagery.",
      lmHatch: "Left lunar orbit attached to the ascent stage.",
      lmRCS: "Steered the ascent stage into its controlled impact.",
      sic: "Into the Atlantic, two minutes after launch.",
      sii: "Into the ocean nine minutes after launch.",
      sivb: "Deliberately impacted on the Moon the day before landing — a practice seismic experiment.",
      iu: "Discarded in space.",
      cm: "Splashed down safely with Shepard, Roosa and Mitchell.",
      sm: "Burned up during re-entry.",
      adapter: "Jettisoned in Earth orbit."
    },
    facts: [
      "Alan Shepard hit two golf balls with a makeshift club — they are still up there",
      "The crew hauled a 42 kg equipment trolley uphill for hours to reach Cone Crater",
      "Its laser retroreflector still returns ranging signals to Earth"
    ],
    phases: [
      { label: "Launch", date: "31 January 1971 · LC-39A", title: "Back to the Moon",
        body: "After a scrub in January, Apollo 11's backup crew finally flies — Saturn V delivers them into a trans-lunar trajectory on schedule.",
        diagram: "saturnV", focus: ["sic", "sii"] },
      { label: "Cruise", date: "31 Jan – 4 Feb 1971", title: "Downrange, with a spare rocket",
        body: "While coasting, the crew watches the S-IVB third stage drift past — it is on its own collision course with the Moon as a seismic experiment.",
        diagram: "saturnV", focus: ["sivb", "cm"] },
      { label: "Arrival", date: "5 February 1971", title: "A landing at Fra Mauro",
        body: "Antares descends into the hilly Fra Mauro formation — terrain Apollo 13 was supposed to explore — and settles on a slope fine enough for the mission to proceed.",
        diagram: "lm", focus: ["lmDescent", "lmEngine", "lmLegs"] },
      { label: "On the surface", date: "5–6 February 1971", title: "Two EVAs and a golf shot",
        body: "Shepard and Mitchell deploy ALSEP experiments and struggle uphill to Cone Crater. At the end, Shepard tees up two golf balls with a makeshift club — they are still travelling at 1 m/s on the Moon.",
        diagram: "lm", focus: ["lmAscent", "lmRCS"] },
      { label: "End of life", date: "February 1971 → today", title: "Two ends, two fates",
        body: "The descent stage and experiments remain at Fra Mauro, silent since the 1977 shutdown. The ascent stage was pushed back down onto the Moon on 7 February; LRO later spotted the gouge it left.",
        diagram: "lm", focus: ["lmDescent", "lmLegs", "lmAscent"] }
    ]
  },

  {
    id: "apollo15",
    name: "Apollo 15",
    subtitle: "LM “Falcon” + the first lunar rover",
    target: "moon",
    year: 1971,
    launchVehicle: "Saturn V",
    status: "Abandoned 1971",
    statusKind: "gone",
    photo: null,
    coords: { lat: 26.13239, lon: 3.6333, region: "Hadley–Apennine",
      note: "LRO-measured descent-stage position; rover lies ~90 m away at 26.1317°N, 3.6380°E." },
    fates: {
      lmDescent: "Left at the foot of the Apennine Mountains beside the Hadley Rille.",
      lmEngine: "Performed the landing and remained with the descent stage.",
      lmLegs: "Parked on mare basalt next to a 400 m-deep winding channel.",
      lmAscent: "Sent toward lunar impact after the mission — but the impact site has never been identified. Do not confuse it with the landing coordinates.",
      lmHatch: "Jettisoned with the ascent stage in lunar orbit.",
      lmRCS: "Jettisoned with the ascent stage.",
      rover: "Parked facing the Lunar Module so its TV camera could film the crew's departure. Still there.",
      sic: "Fell into the ocean at booster burnout.",
      sii: "Discarded into the ocean.",
      sivb: "Deliberately impacted on 29 July 1971; the crater is catalogued at 1.29°S, 348.18°E.",
      iu: "Thrown away in space.",
      cm: "Carried Scott, Worden and Irwin home.",
      sm: "Burned up in Earth's atmosphere.",
      adapter: "Opened and discarded in Earth orbit."
    },
    facts: [
      "First Lunar Roving Vehicle — 27.8 km of driving over three EVAs",
      "The rover was parked so its camera could film the ascent stage lifting off",
      "Its heat-flow experiment drilled deeper than any Apollo experiment before it"
    ],
    phases: [
      { label: "Launch", date: "26 July 1971 · LC-39A", title: "The first 'J-class' mission",
        body: "Saturn V lifts the heaviest Apollo crew cargo yet — including a folded electric car strapped to the outside of the descent stage.",
        diagram: "saturnV", focus: ["sic", "sii"] },
      { label: "Cruise", date: "26–30 July 1971", title: "Coasting with a rover in the hold",
        body: "Three days of transit while the S-IVB stage behind them is nudged onto a deliberate collision course with the Moon.",
        diagram: "saturnV", focus: ["sivb", "adapter", "cm"] },
      { label: "Arrival", date: "30 July 1971", title: "Down beside the rille",
        body: "Falcon lands at Hadley–Apennine — a site chosen for terrain no one had ever visited: mountains rising 3.7 km and a sinuous valley floor below.",
        diagram: "lm", focus: ["lmDescent", "lmEngine", "lmLegs"] },
      { label: "On the surface", date: "31 July – 1 August 1971", title: "Driving on the Moon",
        body: "Scott and Irwin unfold the Lunar Roving Vehicle and drive 27.8 km in total, collecting 77 kg of samples including the famous Genesis Rock — then park the rover to film liftoff.",
        diagram: "lm", focus: ["lmAscent", "rover", "lmRCS"] },
      { label: "End of life", date: "1971 → today", title: "Falcon's stage, the rover, and a ghost",
        body: "The descent stage and rover remain at Hadley. The ascent stage was aimed at the Moon, but no one has ever located its crater — Apollo 15's upper stage is a genuinely missing artifact.",
        diagram: "lm", focus: ["lmDescent", "rover", "lmLegs"] }
    ],
    extraParts: [{ id: "rover", name: "Lunar Roving Vehicle", desc: "Battery-powered folding rover, 210 kg, that extended each EVA far beyond walking range.", size: "210 kg · 3.5 m long" }]
  },

  {
    id: "apollo16",
    name: "Apollo 16",
    subtitle: "LM “Orion” — the Descartes highlands",
    target: "moon",
    year: 1972,
    launchVehicle: "Saturn V",
    status: "Abandoned 1972",
    statusKind: "gone",
    photo: null,
    coords: { lat: -8.9734, lon: 15.5011, region: "Descartes Highlands",
      note: "LRO-measured descent-stage position (NSSDCA)." },
    fates: {
      lmDescent: "Left in the bright, cratered central highlands of the Moon.",
      lmEngine: "Softened the drop into rough highland terrain, then stopped forever.",
      lmLegs: "Planted among the Descartes breccias the crew came to study.",
      lmAscent: "Lost control before its intended impact — its final trajectory and resting place are unknown.",
      lmHatch: "Gone with the ascent stage, wherever that is.",
      lmRCS: "Gone with the ascent stage.",
      rover: "Parked at Descartes after its last traverse; its TV camera recorded the departure.",
      sic: "Dropped into the Atlantic.",
      sii: "Dropped into the ocean.",
      sivb: "Deliberately impacted on 19 April 1972; the site was identified later in LRO data (coordinate uncertainty ~19 m).",
      iu: "Discarded in space.",
      cm: "Splashed down with Young, Mattingly and Duke.",
      sm: "Burned up on re-entry.",
      adapter: "Jettisoned in Earth orbit."
    },
    facts: [
      "The rover's dead-reckoning navigation failed — the crew improvised with a hand timer",
      "Collected 95.7 kg of highland rock, including the large breccia 'House Rock'",
      "Its ascent stage is the one Apollo upper stage simply lost track of"
    ],
    phases: [
      { label: "Launch", date: "16 April 1972 · LC-39A", title: "Up from the pad",
        body: "Saturn V delivers Apollo 16 — the first mission to target the rugged lunar highlands rather than a dark mare plain.",
        diagram: "saturnV", focus: ["sic", "sii"] },
      { label: "Cruise", date: "16–20 April 1972", title: "Three days to the highlands",
        body: "Extraction, docking and coast. Behind the spacecraft the S-IVB is released and steered toward a hard landing of its own.",
        diagram: "saturnV", focus: ["sivb", "cm"] },
      { label: "Arrival", date: "21 April 1972", title: "Touchdown at Descartes",
        body: "Orion lands in terrain so rough the crew has to navigate manually around boulders — the mission reaches the Descartes Highlands on time.",
        diagram: "lm", focus: ["lmDescent", "lmEngine", "lmLegs"] },
      { label: "On the surface", date: "21–23 April 1972", title: "Roving through broken country",
        body: "Young and Duke drive 26.7 km in a rover whose navigation system has failed, using a stopwatch and dead reckoning — and haul back 95.7 kg of samples.",
        diagram: "lm", focus: ["lmAscent", "rover", "lmRCS"] },
      { label: "End of life", date: "1972 → today", title: "A descent stage, a rover — and a missing stage",
        body: "Descent stage and rover stand at Descartes as catalogued artifacts. The ascent stage was supposed to be crashed; ground control lost control of it instead, and it has never been found.",
        diagram: "lm", focus: ["lmDescent", "rover", "lmLegs"] }
    ],
    extraParts: [{ id: "rover", name: "Lunar Roving Vehicle", desc: "The second battery-powered moon rover; its navigation system failed early in the mission.", size: "210 kg" }]
  },

  {
    id: "apollo17",
    name: "Apollo 17",
    subtitle: "LM “Challenger” — the last bootprints",
    target: "moon",
    year: 1972,
    launchVehicle: "Saturn V",
    status: "Abandoned 1972",
    statusKind: "gone",
    photo: "assets/apollo17.jpg",
    coords: { lat: 20.1911, lon: 30.7723, region: "Taurus–Littrow valley",
      note: "LRO-measured descent-stage position; rover ~120 m away at 20.1896°N, 30.7769°E." },
    fates: {
      lmDescent: "Left on the valley floor of Taurus–Littrow, where it will outlast every human-built structure on Earth.",
      lmEngine: "Delivered the final lunar landing, then stayed put.",
      lmLegs: "Standing between 400 m highland massifs, at the last Apollo landing site.",
      lmAscent: "Intentionally deorbited on 15 December 1972, impacting about 0.7 nautical miles from its planned target — recorded by Apollo seismometers.",
      lmHatch: "Released with the ascent stage before its final plunge.",
      lmRCS: "Released with the ascent stage.",
      rover: "Parked facing the LM so its camera could film the last lunar liftoff. Still rolling no tape at all.",
      sic: "Fell into the Atlantic two minutes after launch.",
      sii: "Jettisoned into the ocean.",
      sivb: "Deliberately impacted 10 December 1972 — about 84 nautical miles northwest of the planned target, but a hit nonetheless.",
      iu: "Discarded in space.",
      cm: "Brought Cernan, Schmitt and Evans home on 19 December 1972.",
      sm: "Burned up on re-entry.",
      adapter: "Opened and discarded in Earth orbit."
    },
    facts: [
      "The last humans to leave the Moon did so from this descent stage, 11 December 1972",
      "Carried geologist Harrison Schmitt — the only scientist to walk on the Moon",
      "Rover traverse: 30.5 km; total surface time: 74 hours 59 minutes"
    ],
    phases: [
      { label: "Launch", date: "7 December 1972 · LC-39A", title: "The last Saturn V flight",
        body: "The heaviest Saturn V ever flown lifts off in the only night launch of the Apollo era. It is the final time this rocket will ever fly.",
        diagram: "saturnV", focus: ["sic", "sii"] },
      { label: "Cruise", date: "7–11 December 1972", title: "The last transit",
        body: "Three days out, the usual extraction and docking. The S-IVB is sent crashing into the Moon three days before the crew arrives — an intentional seismic experiment.",
        diagram: "saturnV", focus: ["sivb", "cm", "sm"] },
      { label: "Arrival", date: "11 December 1972", title: "Into the valley",
        body: "Challenger descends into Taurus–Littrow, a valley chosen to sample both ancient highland material and young volcanic deposits in one mission.",
        diagram: "lm", focus: ["lmDescent", "lmEngine", "lmLegs"] },
      { label: "On the surface", date: "11–14 December 1972", title: "75 hours on the Moon",
        body: "Cernan and Schmitt drive 30.5 km, collect 110.5 kg of samples — including orange soil from a 3.6-billion-year-old volcanic cinder cone.",
        diagram: "lm", focus: ["lmAscent", "rover", "lmRCS"] },
      { label: "End of life", date: "December 1972 → forever", title: "The final stage left behind",
        body: "Descent stage and rover remain in the valley. The ascent stage was crashed on 15 December 1972 near its target. Apollo left six descent stages behind — this was the last.",
        diagram: "lm", focus: ["lmDescent", "rover", "lmLegs"] }
    ],
    extraParts: [{ id: "rover", name: "Lunar Roving Vehicle", desc: "The third and last moon rover, parked for a farewell camera shot of the liftoff.", size: "210 kg · 30.5 km driven" }]
  },

  /* =========================== MARS =========================== */
  {
    id: "viking1",
    name: "Viking 1",
    subtitle: "First successful U.S. landing on Mars",
    target: "mars",
    year: 1976,
    launchVehicle: "Titan IIIE–Centaur",
    status: "Silent since 1982",
    statusKind: "gone",
    photo: "assets/viking.jpg",
    coords: { lat: 22.483, lon: 312.06, region: "Chryse Planitia",
      note: "NASA landing coordinate (47.94°W converted to east longitude)." },
    fates: {
      cruise: "Detached just before entry and burned up in the Martian atmosphere on 20 July 1976.",
      backshell: "Released during descent and came to rest on Chryse Planitia, visible in orbital images.",
      heatshield: "Jettisoned after entry heating ended; dropped to the surface ahead of the lander.",
      parachute: "Cut free before powered descent and left lying on Mars.",
      engines: "Three engines fired the final seconds of descent; they remain with the lander.",
      legs: "Landed Viking softly on the plains and never moved again.",
      deck: "The lander's deck — nicknamed the Thomas Mutch Memorial Station — still sits where it landed.",
      payload: "Cameras and soil experiments that made the first U.S. contact with the Martian surface.",
      rBoost: "Titan II core and engines dropped away; the two strap-ons were jettisoned early.",
      rCore: "The Centaur upper stage injected Viking 1 toward Mars and was left behind in space.",
      rFairing: "Opened above the atmosphere and fell away.",
      rCraft: "The orbiter–lander stack that coasted eleven months to Mars."
    },
    facts: [
      "First successful U.S. landing on Mars — and the first surface photos",
      "Ran over six years against a design life of 90 days",
      "Its soil experiments sparked a debate about Martian biology that never fully ended"
    ],
    phases: [
      { label: "Launch", date: "20 August 1975 · Cape Canaveral", title: "Viking rises",
        body: "A Titan IIIE–Centaur lifts the combined orbiter and lander toward Mars — the most expensive and ambitious planetary mission NASA had ever attempted.",
        diagram: "marsRocket", focus: ["rBoost", "rFairing"] },
      { label: "Cruise", date: "Aug 1975 – June 1976", title: "Eleven months to Mars",
        body: "The stack coasts for 304 days. In April 1976 the lander fires its engines for a trajectory correction that decides exactly where it will come down.",
        diagram: "marsRocket", focus: ["rCraft", "rCore"] },
      { label: "Arrival", date: "20 July 1976", title: "Nine minutes to Chryse",
        body: "The lander separates, dives into the atmosphere behind a heat shield, opens a parachute, then drops it and lands on three engines — touching down within minutes of the U.S. bicentennial.",
        diagram: "marsLander", focus: ["heatshield", "backshell", "parachute", "engines"] },
      { label: "On the surface", date: "1976 – 1982", title: "Six years of pictures and soil",
        body: "Viking returns the first colour panorama from Mars, digs the first soil samples, and searches for life chemistry for over six years while its orbiter maps 97% of the planet.",
        diagram: "marsLander", focus: ["deck", "legs", "payload"] },
      { label: "End of life", date: "November 1982", title: "A wrong command, and silence",
        body: "A routine command accidentally reboots the lander's computer and severs the link. Recovery attempts fail; the Thomas Mutch Memorial Station goes quiet for good — and remains on Chryse Planitia today.",
        diagram: "marsLander", focus: ["deck", "legs", "payload", "engines"] }
    ]
  },

  {
    id: "pathfinder",
    name: "Mars Pathfinder",
    subtitle: "Airbags, bounces and the first Mars rover",
    target: "mars",
    year: 1997,
    launchVehicle: "Delta II",
    status: "Silent since 1997",
    statusKind: "gone",
    photo: "assets/pathfinder.jpg",
    coords: { lat: 19.13, lon: 326.78, region: "Ares Vallis",
      note: "NASA nominal landing coordinate (33.22°W converted); secondary sources vary." },
    fates: {
      abCruise: "Released just before entry and burned up in the atmosphere.",
      abShell: "Split apart during descent; fragments lie near the landing site.",
      abChute: "Deployed supersonic, then cut free — visible from orbit beside the lander.",
      abBags: "Deflated where they stopped rolling and stayed beside the lander forever.",
      abPetals: "Opened after the bounces stopped, becoming the Carl Sagan Memorial Station.",
      abRover: "Sojourner drove off the ramp, inspected rocks, and stopped a few metres away — its last position proposed from orbital images.",
      rBoost: "Delta II first stage and strap-ons dropped into the ocean.",
      rCore: "Upper stage burned to send Pathfinder onto its Mars transfer trajectory.",
      rFairing: "Discarded a few minutes after launch.",
      rCraft: "The lander–rover stack, folded inside a tetrahedron of airbags."
    },
    facts: [
      "The airbags inflated to about 5 m tall and bounced the lander ~15 times",
      "Sojourner — 10.6 kg — was the first rover to move on another planet",
      "Final transmission: 27 September 1997 after 85 days on Mars"
    ],
    phases: [
      { label: "Launch", date: "4 December 1996 · Cape Canaveral", title: "Faster, better, cheaper",
        body: "A low-cost Delta II sends Pathfinder toward Mars — a technology demo meant to prove you could land on a shoestring budget.",
        diagram: "marsRocket", focus: ["rBoost", "rFairing"] },
      { label: "Cruise", date: "Dec 1996 – July 1997", title: "Seven months of coasting",
        body: "The spacecraft spends seven months falling toward Ares Vallis, an ancient floodplain chosen because a long-ago flood would have washed interesting rocks downstream into one place.",
        diagram: "marsRocket", focus: ["rCraft"] },
      { label: "Arrival", date: "4 July 1997", title: "Bounce, bounce, bounce",
        body: "Parachute, retro-rockets, airbag inflation — then the enclosed lander is dropped and bounces about fifteen times across Ares Vallis before rolling to a stop.",
        diagram: "airbagEDL", focus: ["abChute", "abShell", "abBags"] },
      { label: "On the surface", date: "July – September 1997", title: "The petals open, a rover rolls out",
        body: "The petals unfold to reveal Sojourner, which drives down the ramp and starts sniffing rocks — humanity's first drive on Mars. 16,500 images come back.",
        diagram: "airbagEDL", focus: ["abPetals", "abRover"] },
      { label: "End of life", date: "27 September 1997", title: "Out of power, out of contact",
        body: "The lander's batteries weaken, its radio fails, and Pathfinder falls silent after 85 days. Deflated airbags, backshell, parachute and rover all remain scattered at Ares Vallis — imaged from orbit years later.",
        diagram: "airbagEDL", focus: ["abBags", "abPetals", "abRover", "abChute"] }
    ]
  },

  {
    id: "mpl",
    name: "Mars Polar Lander",
    subtitle: "Lost during descent, December 1999",
    target: "mars",
    year: 1999,
    launchVehicle: "Delta II",
    status: "Lost — presumed crashed",
    statusKind: "crash",
    photo: "assets/mpl.png",
    coords: { lat: -76.0, lon: 165.0, region: "South polar layered terrain (target area)",
      note: "PLANNED target, not a confirmed wreck coordinate — no wreckage has ever been located." },
    fates: {
      rBoost: "Delta II first stage fell away normally in January 1999.",
      rCore: "Centaur/upper stage completed the Mars injection burn and was discarded.",
      rFairing: "Released during ascent, normal.",
      rCraft: "The lander stack that coasted eleven months to the Martian south pole.",
      imCraft: "Most likely descended too fast and hit the surface at high velocity after its retrorockets shut down early.",
      imCrater: "Unknown — NASA imaged the target region and found no confirmed wreckage."
    },
    facts: [
      "Most likely cause: retrorockets shut off prematurely during descent",
      "NASA spent months imaging the landing region — no wreckage was ever confirmed",
      "Its failure report became the template for every later Mars landing review"
    ],
    phases: [
      { label: "Launch", date: "3 January 1999 · Cape Canaveral", title: "To the south pole",
        body: "A Delta II sends Mars Polar Lander toward the layered ice deposits near Mars' south pole — an orbiter and a lander flying together.",
        diagram: "marsRocket", focus: ["rBoost", "rFairing"] },
      { label: "Cruise", date: "Jan – Dec 1999", title: "Eleven months in the dark",
        body: "The spacecraft coasts toward the southern hemisphere of Mars while its companion, the Mars Climate Orbiter, is lost in September to a unit-conversion error.",
        diagram: "marsRocket", focus: ["rCraft"] },
      { label: "Arrival", date: "3 December 1999", title: "Radio silence at touchdown",
        body: "Entry, descent-engine firing and parachute deployment are all reported nominally — then transmission stops moments before expected touchdown. No signal ever returns.",
        diagram: "marsLander", focus: ["heatshield", "backshell", "parachute", "engines"] },
      { label: "Search", date: "Dec 1999 – 2000", title: "Looking for a wreck",
        body: "Orbiters photograph the target region repeatedly. Scientists find no confirmed wreckage — only a pre-existing dark spot that may or may not have been there before.",
        diagram: "impact", focus: ["imCrater"] },
      { label: "Legacy", date: "2000 → today", title: "A failure that improved everything",
        body: "The review board concluded the most likely cause was premature engine shutdown. The investigation reshaped how NASA validates Mars landings — and the debris, if it exists, remains unfound at 76°S.",
        diagram: "impact", focus: ["imCraft"] }
    ]
  },

  {
    id: "spirit",
    name: "Spirit (MER-A)",
    subtitle: "The rover that refused to die",
    target: "mars",
    year: 2004,
    launchVehicle: "Delta II",
    status: "Silent since 2010",
    statusKind: "gone",
    photo: "assets/spirit.jpg",
    coords: { lat: -14.572, lon: 175.478, region: "Gusev Crater",
      note: "Landing-site coordinate; Spirit's final resting position is within this site." },
    fates: {
      abCruise: "Dropped away before entry and burned up in Mars' atmosphere.",
      abShell: "Split during descent; pieces lie in Gusev Crater near the lander.",
      abChute: "Released above the surface and left where it fell.",
      abBags: "Inflated for landing, deflated forever beside the petal lander.",
      abPetals: "Opened to become Spirit's base station and radio link for 90 sols — and then six more years.",
      abRover: "Spirit sank its wheels into soft soil at a drift called 'Troy' in 2009, tilted into its final winter position, and never drove again. It sits in Gusev Crater to this day.",
      rBoost: "Delta II first stage fell into the ocean.",
      rCore: "Spent upper stage on the Mars trajectory.",
      rFairing: "Discarded minutes after launch.",
      rCraft: "The rover inside its airbag cocoon, launched 10 June 2003."
    },
    facts: [
      "Designed for 90 sols — it kept working for over six years",
      "Drove 7.7 km and climbed a hill it was never designed to climb",
      "Got stuck in soft soil in 2009 and powered down during its last Martian winter"
    ],
    phases: [
      { label: "Launch", date: "10 June 2003 · Cape Canaveral", title: "One of two rovers",
        body: "Delta II launches Spirit toward Gusev Crater — a basin chosen because a dried-up lake bed should have left readable rocks. Its twin, Opportunity, follows one month later.",
        diagram: "marsRocket", focus: ["rBoost", "rFairing"] },
      { label: "Cruise", date: "June 2003 – Jan 2004", title: "Half a year to Gusev",
        body: "Seven months of coasting with the rover folded up inside its aeroshell like a piece of very expensive luggage.",
        diagram: "marsRocket", focus: ["rCraft"] },
      { label: "Arrival", date: "4 January 2004", title: "Airbags at Gusev",
        body: "Spirit enters the atmosphere, parachutes, drops to an airbag cocoon and bounces to a stop — then spends three nights checking itself out before opening its petals.",
        diagram: "airbagEDL", focus: ["abChute", "abBags", "abShell"] },
      { label: "On the surface", date: "2004 – 2009", title: "Mountains and setbacks",
        body: "Spirit climbs the Husband Hill summit, drives 7.7 km, and conducts eight years of geology. In 2009 a wheel drags a trench through hidden soft soil — and the rover becomes permanently stuck.",
        diagram: "airbagEDL", focus: ["abRover", "abPetals"] },
      { label: "End of life", date: "22 March 2010", title: "Silenced by a Martian winter",
        body: "Struck at an angle that shadows its solar panels, Spirit fails to survive the winter. On 22 March 2010 NASA ends the mission. It lies tilted in Gusev Crater — a possible future museum piece.",
        diagram: "airbagEDL", focus: ["abRover", "abPetals", "abBags"] }
    ]
  },

  {
    id: "opportunity",
    name: "Opportunity (MER-B)",
    subtitle: "90 sols that lasted 14 years",
    target: "mars",
    year: 2004,
    launchVehicle: "Delta II",
    status: "Silent since 2018",
    statusKind: "gone",
    photo: "assets/opportunity.jpg",
    coords: { lat: -1.946, lon: 354.473, region: "Meridiani Planum",
      note: "Landing-site coordinate (5.53°W converted to east longitude)." },
    fates: {
      abCruise: "Burned up in Mars' atmosphere just before entry.",
      abShell: "Left on Meridiani Planum during descent.",
      abChute: "Fell to the surface after slowing the descent, where it remains.",
      abBags: "Deflated beside the lander after bouncing to rest.",
      abPetals: "Opened to release the rover and then served as a relay until its batteries died.",
      abRover: "Drove 45.16 km across Meridiani, collected its last data on 10 June 2018, and lies there still — silenced by a global dust storm.",
      rBoost: "Delta II first stage dropped into the Atlantic.",
      rCore: "Spent upper stage left on the departure trajectory.",
      rFairing: "Released minutes after launch.",
      rCraft: "Launched July 2003, bound for a small crater named Endurance."
    },
    facts: [
      "Drove 45.16 km — a distance record on another planet for years",
      "Built for 90 sols, worked for 14 years and 28 minutes",
      "Its final message arrived on 10 June 2018 as a planet-wide dust storm blotted out the Sun"
    ],
    phases: [
      { label: "Launch", date: "July 2003 · Cape Canaveral", title: "The second rover",
        body: "Delta II sends Opportunity toward Meridiani Planum, where orbital instruments had detected exposed bedrock — a place where water might once have soaked the ground.",
        diagram: "marsRocket", focus: ["rBoost", "rFairing"] },
      { label: "Cruise", date: "July 2003 – Jan 2004", title: "Catching up to Spirit",
        body: "Opportunity spends seven months in transit, arriving a few weeks after its twin and giving scientists two independent laboratories on two continents of Mars.",
        diagram: "marsRocket", focus: ["rCraft"] },
        { label: "Arrival", date: "25 January 2004", title: "The luckiest landing in history",
        body: "Opportunity bounces into a tiny crater barely 22 m across — a 'hole in one' that put it within eyeshot of exposed bedrock immediately.",
        diagram: "airbagEDL", focus: ["abChute", "abBags", "abShell"] },
      { label: "On the surface", date: "2004 – 2018", title: "The long drive",
        body: "Rooftop strata, hematite 'blueberries', Endurance Crater, Victoria Crater, 45.16 km of driving and evidence of ancient hot springs — Opportunity rewrote the story of water on Mars.",
        diagram: "airbagEDL", focus: ["abRover", "abPetals"] },
      { label: "End of life", date: "10 June 2018", title: "'My battery is low and it's getting dark'",
        body: "A planet-wide dust storm starves Opportunity of sunlight. NASA listens for months and hears nothing; on 14 February 2019 the mission is formally closed. The rover sleeps on Meridiani Planum.",
        diagram: "airbagEDL", focus: ["abRover", "abPetals", "abBags"] }
    ]
  },

  {
    id: "phoenix",
    name: "Phoenix",
    subtitle: "Ice under the arctic lander",
    target: "mars",
    year: 2008,
    launchVehicle: "Delta II",
    status: "Silent since 2008",
    statusKind: "gone",
    photo: "assets/phoenix.jpg",
    coords: { lat: 68.22, lon: 234.25, region: "Vastitas Borealis (northern plains)",
      note: "NASA landing coordinate (125.75°W converted to east longitude)." },
    fates: {
      cruise: "Discarded just before entry and burned up in the atmosphere.",
      backshell: "Left on the northern plains during descent.",
      heatshield: "Jettisoned after entry; still lying in Vastitas Borealis.",
      parachute: "Captured mid-descent in an image from orbit, then dropped on Mars.",
      engines: "Performed the final soft landing and stayed with the lander.",
      legs: "Planted at 68°N — the first landing in the Martian arctic.",
      deck: "The lander deck with solar arrays that eventually froze under carbon-dioxide frost.",
      payload: "A robotic arm that dug to the ice table and confirmed water ice — plus a TEGA oven that tasted the soil.",
      rBoost: "Delta II first stage fell into the ocean.",
      rCore: "Spent upper stage left in solar orbit.",
      rFairing: "Jettisoned during ascent.",
      rCraft: "The lander stack launched 4 August 2007 toward the Martian north."
    },
    facts: [
      "First successful landing in Mars' northern arctic region, at 68°N",
      "Its scoop scraped down to the ice table and confirmed subsurface water ice",
      "An orbiting spacecraft photographed Phoenix descending under its parachute"
    ],
    phases: [
      { label: "Launch", date: "4 August 2007 · Cape Canaveral", title: "A reused lander",
        body: "Phoenix is built from spare parts of two cancelled missions and launches on a Delta II toward Mars' north pole — where water ice is predicted just centimeters down.",
        diagram: "marsRocket", focus: ["rBoost", "rFairing"] },
      { label: "Cruise", date: "Aug 2007 – May 2008", title: "Nine and a half months",
        body: "The lander coasts toward the northern hemisphere while its radio waits, silent, for the one landing window.",
        diagram: "marsRocket", focus: ["rCraft"] },
      { label: "Arrival", date: "25 May 2008", title: "Touchdown in the arctic",
        body: "Heat shield, parachute, retro-propulsion — Phoenix sets down in Vastitas Borealis, farther north than any successful Mars landing before or since.",
        diagram: "marsLander", focus: ["heatshield", "backshell", "parachute", "engines"] },
      { label: "On the surface", date: "May – August 2008", title: "Touching water ice",
        body: "The robotic arm digs through the regolith and exposes bright ice that sublimates in front of the camera — direct confirmation of water ice at 68°N.",
        diagram: "marsLander", focus: ["deck", "legs", "payload"] },
      { label: "End of life", date: "2 November 2008", title: "The dark returns",
        body: "As polar night closes in, the lander's last brief signal arrives on 2 November. Panels can't charge; NASA stops listening later that month. Phoenix stays encased in seasonal ice.",
        diagram: "marsLander", focus: ["deck", "legs", "payload"] }
    ]
  },

  {
    id: "insight",
    name: "InSight",
    subtitle: "The lander that listened to Mars' heartbeat",
    target: "mars",
    year: 2018,
    launchVehicle: "Atlas V-401",
    status: "Silent since 2022",
    statusKind: "gone",
    photo: "assets/insight.jpg",
    coords: { lat: 4.502384, lon: 135.623447, region: "Elysium Planitia",
      note: "Peer-reviewed georeferenced lander position; heat shield and backshell lie within ~300 m." },
    fates: {
      cruise: "Released before entry and burned up in Mars' atmosphere.",
      backshell: "Came to rest on Elysium Planitia within ~300 m of the lander, imaged by HiRISE.",
      heatshield: "Dropped after entry heating; a bright spot in orbital images beside the lander.",
      parachute: "Left lying near the lander when the backshell separated.",
      engines: "Twelve small thrusters guided the final touchdown; they stayed with the lander.",
      legs: "Three shock-absorbing legs that held InSight steady for four years.",
      deck: "The deck with two circular solar arrays — eventually dusted over until it could no longer charge.",
      payload: "SEIS, the seismometer that recorded hundreds of marsquakes, plus a heat-flow probe (the 'mole') that got stuck.",
      rBoost: "Atlas V core and solids dropped away over the Atlantic.",
      rCore: "Centaur upper stage completed the Mars injection and was discarded.",
      rFairing: "Opened above the atmosphere and fell away.",
      rCraft: "The lander launched 5 May 2018 toward Elysium Planitia."
    },
    facts: [
      "SEIS recorded the first marsquake catalogue ever assembled",
      "Its heat shield, backshell and parachute lie within ~300 m of the lander",
      "Dust accumulating on its panels starved it of power over four years"
    ],
    phases: [
      { label: "Launch", date: "5 May 2018 · Vandenberg", title: "First West Coast Mars launch",
        body: "An Atlas V lifts InSight from California — the first interplanetary mission ever launched from the U.S. West Coast.",
        diagram: "marsRocket", focus: ["rBoost", "rFairing"] },
      { label: "Cruise", date: "May – November 2018", title: "Six months in cruise",
        body: "The lander coasts to Mars with its instruments folded flat, arriving on 26 November 2018 after six and a half months.",
        diagram: "marsRocket", focus: ["rCraft"] },
      { label: "Arrival", date: "26 November 2018", title: "A seven-minute descent",
        body: "Aeroshell, parachute, twelve thrusters: InSight lands upright on the smooth plain — deliberately chosen as the quietest place on Mars for a seismometer.",
        diagram: "marsLander", focus: ["heatshield", "backshell", "parachute", "engines"] },
      { label: "On the surface", date: "2019 – 2022", title: "Hearing the planet",
        body: "A robotic arm places SEIS on the ground under a wind-and-thermal shield. The instrument records 1,300+ marsquakes, revealing Mars' crust, mantle and core.",
        diagram: "marsLander", focus: ["payload", "deck", "legs"] },
      { label: "End of life", date: "15 December 2022", title: "Dusted out",
        body: "Dust blankets the solar panels; a last attempt to clear it with the lander's own arm fails. The final transmission arrives 15 December 2022. InSight, heat shield, backshell and parachute stay within a 300 m debris field.",
        diagram: "marsLander", focus: ["deck", "heatshield", "backshell", "parachute"] }
    ]
  },

  {
    id: "perseverance",
    name: "Perseverance",
    subtitle: "Jezero Crater — and the parts it dropped on the way",
    target: "mars",
    year: 2021,
    launchVehicle: "Atlas V-541",
    status: "Still operating",
    statusKind: "live",
    photo: "assets/perseverance.jpg",
    coords: { lat: 18.44463, lon: 77.45088, region: "Jezero Crater",
      note: "Landing point; descent-stage debris and heat shield lie scattered nearby, imaged by HiRISE." },
    fates: {
      edCruise: "Released before entry and burned up in Mars' atmosphere on 18 February 2021.",
      edAeroshell: "Split open during descent: heat shield fell away first, backshell later — both left on the surface.",
      edParachute: "Cut loose with the backshell at supersonic speed and photographed by orbiters the next day.",
      edCrane: "Lowered the rover on a 7.5 m bridle, cut the tethers and flew itself into the ground — leaving a V-shaped debris pattern.",
      edRover: "Alive and driving: still collecting and caching samples in Jezero Crater in 2026.",
      edHeli: "Flew 72 flights between April 2021 and January 2024, then retired in place beneath the rover.",
      rBoost: "Atlas V core stage and solid boosters dropped into the Atlantic.",
      rCore: "Centaur upper stage sent Perseverance onto its Mars trajectory and was discarded.",
      rFairing: "Split and fell away a few minutes after launch.",
      rCraft: "The 1,025 kg rover stack, launched 30 July 2020."
    },
    facts: [
      "Sky crane lowered the rover on a 7.5 m bridle, then flew itself into the ground",
      "Its heat shield, backshell, parachute and sky crane are all separately visible from orbit",
      "Ingenuity — carried beneath the belly — flew 72 flights before retiring in 2024"
    ],
    phases: [
      { label: "Launch", date: "30 July 2020 · Cape Canaveral", title: "The heaviest rover yet",
        body: "An Atlas V-541 lifts the 1,025 kg Perseverance toward Jezero Crater — an ancient lake bed with a fossil river delta that could preserve signs of past life.",
        diagram: "marsRocket", focus: ["rBoost", "rFairing"] },
      { label: "Cruise", date: "July 2020 – Feb 2021", title: "Seven months with a helicopter",
        body: "The rover rides inside its aeroshell, Ingenuity tucked underneath it like a passenger in the hold. One course correction burn, then pure falling.",
        diagram: "marsRocket", focus: ["rCraft"] },
      { label: "Arrival", date: "18 February 2021", title: "Seven minutes of terror, with a map",
        body: "Parachute, heat-shield release, terrain-relative navigation that steers away from boulders, then a sky crane lowers the rover on tethers and flies away to crash nearby.",
        diagram: "roverEDL", focus: ["edAeroshell", "edParachute", "edCrane"] },
      { label: "On the surface", date: "2021 → today", title: "Sampling an ancient delta",
        body: "Perseverance drills and seals rock cores for a future return mission, while Ingenuity performs the first powered flight ever on another planet — 72 flights in all.",
        diagram: "roverEDL", focus: ["edRover", "edHeli"] },
      { label: "What it left", date: "February 2021 → today", title: "A debris field with names",
        body: "The rover survives — but its cruise stage, heat shield, backshell, parachute and sky crane were all discarded during landing, and every piece has been photographed from orbit. The mission works precisely because it abandons so much.",
        diagram: "roverEDL", focus: ["edCrane", "edAeroshell", "edParachute", "edCruise"] }
    ]
  }
];

/* ------------------------------------------------------------------ sources */
const SOURCES = [
  { label: "NASA NSSDCA — Apollo lunar site coordinates", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html" },
  { label: "LROC measured coordinate table (landers, rovers, impact craters)", url: "https://lroc.im-ldi.com/images/938" },
  { label: "The Planetary Society — locating Apollo impact sites", url: "https://www.planetary.org/articles/0207-finding-spacecraft-impacts-on-the-moon" },
  { label: "NASA — Apollo 17 mission details", url: "https://www.nasa.gov/missions/apollo/apollo-17-mission-details/" },
  { label: "NASA SVS — Apollo 13 S-IVB impact visualization", url: "https://svs.gsfc.nasa.gov/4803/" },
  { label: "Lunar & Planetary Institute — Surveyor and Ranger programs", url: "https://www.lpi.usra.edu/lunar/missions/surveyor/" },
  { label: "NASA — Viking 1 & 2 mission pages", url: "https://science.nasa.gov/mission/viking-1/" },
  { label: "NASA — Mars Pathfinder, Spirit, Opportunity, Phoenix, InSight, Perseverance", url: "https://science.nasa.gov/mars/" },
  { label: "NASA/JPL — annotated Perseverance landing components", url: "https://www.jpl.nasa.gov/images/pia24333-perseverance-and-mars-2020-spacecraft-components-on-the-surface/" },
  { label: "HiRISE — landing-site hardware imagery", url: "https://www.uahirise.org/" },
  { label: "NASA — How we land on Mars", url: "https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/how-we-land-on-mars/" }
];
