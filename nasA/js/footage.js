/* ================================================================ FOOTAGE
   One dedicated section, one place: for every mission in the exhibit, the
   launch clip and the final-movement clip. All IDs below were verified
   against their YouTube watch pages before being written in. Cards render
   thumbnails only; the iframe exists solely while the lightbox is open, so
   the section costs 32 lazy images on first paint and zero players.      */
(function () {
  "use strict";

  /* name, year, target — kept for the card header; clips: launch + final
     (id = 11-char YouTube id, t = title on YouTube, ch = channel,
      n = what this clip actually shows)                                    */
  const FOOTAGE = [
    { name: "Surveyor 1", year: 1966,
      launch: { id: "kiK8_cgTX2I", t: "The launch of Surveyor 1, May 30, 1966", ch: "NASA Archives", n: "Atlas–Centaur lifts the first American soft-lander" },
      final:  { id: "sqLtNzB_S18", t: "Surveyor 1 - Landing on the Moon", ch: "lunarmodule5", n: "Touchdown at Flamsteed P, 2 June 1966" } },
    { name: "Apollo 11", year: 1969,
      launch: { id: "T1F6PLup_rI", t: "Apollo 11 Launch, July 16, 1969, HD raw footage", ch: "MechDesignTV", n: "Saturn V from Pad 39A, raw HD" },
      final:  { id: "iZKwuY6kyAY", t: "Manned Space History | Apollo 11 Splashdown | July 24, 1969", ch: "Manned Space", n: "Splashdown — the only part that came home" } },
    { name: "Apollo 12", year: 1969,
      launch: { id: "GNEsrCB2CMY", t: "When Lightning Strikes | The Launch of Apollo 12", ch: "Manned Space", n: "The launch hit twice — by rocket and by lightning" },
      final:  { id: "jYU04LNV1B4", t: "APOLLO 12 - Reentry & Splashdown - Film + TV (1969/11/24)", ch: "Retro Space HD", n: "Re-entry and splashdown" } },
    { name: "Apollo 13", year: 1970,
      launch: { id: "cX9f9USfz5c", t: "Flashback: Apollo 13 - Watch the Launch of the Ill-Fated NASA Mission", ch: "VideoFromSpace", n: "Liftoff of the mission that never landed" },
      final:  { id: "kmGP4o272ac", t: "Apollo 13 re-entry and splashdown as seen live on tv", ch: "Matthew Travis", n: "Live TV coverage of the safe return" } },
    { name: "Apollo 14", year: 1971,
      launch: { id: "w8GgLdD0big", t: "LAUNCH OF APOLLO 14 - January 31, 1971", ch: "Rearview Mirror Media", n: "Liftoff toward Fra Mauro" },
      final:  { id: "JWDTchhjX8w", t: "Apollo 14 Moon Landing 16mm Film Footage Upscaled with Synchronised Mission Audio", ch: "Moonpans", n: "Touchdown at Fra Mauro with mission audio" } },
    { name: "Apollo 15", year: 1971,
      launch: { id: "O7jnZlFqWtU", t: "Apollo 15 - Launch (Full Mission 1)", ch: "lunarmodule5", n: "Full launch broadcast" },
      final:  { id: "eOjkSjF-3nw", t: "Apollo 15 - Lunar Lift-Off - 50th Anniversary (1971-2021)", ch: "lunarmodule5", n: "Ascent stage leaves — descent stage stays forever" } },
    { name: "Apollo 16", year: 1972,
      launch: { id: "pfqvBh8xEJk", t: "Apollo 16 Launch with Various Launch Pad Cameras", ch: "lunarmodule5", n: "Liftoff from every pad camera" },
      final:  { id: "vZi295LcBRQ", t: "Apollo 16 - Lunar Lift-off (50th Anniversary)", ch: "lunarmodule5", n: "Lunar liftoff from Descartes Highlands" } },
    { name: "Apollo 17", year: 1972,
      launch: { id: "rmwc8E9fCLI", t: "Launch of Apollo 17 (TV Feed and NASA Footage)", ch: "lunarmodule5", n: "The last crewed Saturn V, night launch" },
      final:  { id: "yfUwe7PB8jM", t: "Apollo 17 - Lunar Liftoff 50th Anniversary", ch: "lunarmodule5", n: "The final lunar liftoff of the Apollo era" } },
    { name: "Viking 1", year: 1976,
      launch: { id: "TDzmsrRLTW0", t: "Viking 1 Launch - AI Upscale, Multiple Camera Angles", ch: "Retro Space HD", n: "Titan IIIE lifts off for Mars" },
      final:  { id: "WezyH0wrnDI", t: "Animation depicting Viking 1's Mars landing and mission team reaction, July 20, 1976", ch: "Cosmosphere", n: "Landing at Chryse, 20 July 1976" } },
    { name: "Mars Pathfinder", year: 1997,
      launch: { id: "v63ZwrHAKxg", t: "Mars Pathfinder Media Reel (1 of 2)", ch: "JPLraw", n: "Launch media reel, Delta II" },
      final:  { id: "3E9BcdFYENg", t: "Mars Pathfinder Animations Media Reel (2 of 2)", ch: "JPLraw", n: "Airbag landing animations from JPL" } },
    { name: "Mars Polar Lander", year: 1999,
      launch: { id: "X0Na9lEn93w", t: "USA: NASA'S MARS POLAR LANDER BLASTS OFF FROM CAPE CANAVERAL", ch: "AP Archive", n: "Liftoff, 3 January 1999" },
      final:  { id: "QaaRqx8vp58", t: "Update: Mars Mission, Mars Polar Lander Failure, PBS NewsHour, December 7, 1999", ch: "PBS NewsHour", n: "The silent landing — mission lost" } },
    { name: "Spirit (MER-A)", year: 2003,
      launch: { id: "G_TgTeAF9SA", t: "MER-A Spirit Launch", ch: "ShuttleFilms", n: "Delta II launches Spirit" },
      final:  { id: "7V54LRRJaGk", t: "Mars: What happened to the Spirit Rover?", ch: "ElderFox Documentaries", n: "Stuck in sand — last contact, 2010" } },
    { name: "Opportunity (MER-B)", year: 2003,
      launch: { id: "_AUjolWcATE", t: "Watch NASA's Opportunity Rover Launch to Mars", ch: "VideoFromSpace", n: "Delta II launches Opportunity" },
      final:  { id: "JC70jJgQJyM", t: "Video file: Mars Opportunity Rover Mission is Complete", ch: "NASA/JPL", n: "\"My battery is low and it's getting dark\" — 2018" } },
    { name: "Phoenix", year: 2007,
      launch: { id: "eZZ1b567GoA", t: "Phoenix Mars Lander Launched - 2007", ch: "VideoFromSpace", n: "Delta II launches Phoenix" },
      final:  { id: "5TaP8YMM524", t: "Phoenix Mars Lander: 7 minutes of Terror", ch: "NASA Jet Propulsion Laboratory", n: "Parachute + pulses to touchdown at the pole" } },
    { name: "InSight", year: 2018,
      launch: { id: "gfwEc6_Bv78", t: "Atlas V InSight Launch Highlights", ch: "United Launch Alliance", n: "Atlas V liftoff from Vandenberg" },
      final:  { id: "KHrApNV2b00", t: "InSight's Final Selfie and Last Images", ch: "NASA/JPL-Caltech", n: "Dust-covered panels — the last images, 2022" } },
    { name: "Perseverance", year: 2020,
      launch: { id: "JIB3JbIIbPU", t: "Watch NASA's Perseverance Rover Launch to Mars!", ch: "NASA", n: "Atlas V launches the rover to Jezero" } ,
      final:  { id: "4czjS9h4Fpg", t: "Perseverance Rover's Descent and Touchdown on Mars (Official NASA Video)", ch: "NASA", n: "Sky-crane touchdown, 18 February 2021" } }
  ];

  const $ = (s) => document.querySelector(s);
  const grid = $("#footageGrid");
  if (!grid) return;

  /* ------------------------------------------------------------ render */
  grid.innerHTML = FOOTAGE.map((m) => {
    const clip = (c, tag) => `
      <button class="clip" data-yt="${c.id}" data-tag="${tag}" data-title="${c.t}"
              data-ch="${c.ch}" aria-label="Play ${m.name} ${tag.toLowerCase()} clip">
        <span class="clip-thumb">
          <img src="https://i.ytimg.com/vi/${c.id}/hqdefault.jpg" alt=""
               loading="lazy" decoding="async" referrerpolicy="no-referrer" />
          <span class="clip-play" aria-hidden="true">▶</span>
        </span>
        <span class="clip-body">
          <span class="clip-tag">${tag}</span>
          <span class="clip-title">${c.t}</span>
          <span class="clip-note">${c.n}</span>
          <span class="clip-ch">${c.ch} · youtube ↗</span>
        </span>
      </button>`;
    return `
      <article class="fcard">
        <header class="fcard-head"><b>${m.name}</b><span>${m.year}</span></header>
        ${clip(m.launch, "LAUNCH")}
        ${clip(m.final, "FINAL MOVEMENT")}
      </article>`;
  }).join("");

  /* a dead thumbnail (offline viewer, removed video) degrades to the
     gradient tile instead of a broken-image icon */
  grid.querySelectorAll(".clip-thumb img").forEach((img) => {
    img.addEventListener("error", () => img.closest(".clip-thumb").classList.add("no-thumb"), { once: true });
  });

  /* ----------------------------------------------------------- lightbox */
  const lb = $("#footLightbox");
  const frame = $("#flbxFrame");
  let lastFocus = null;

  function open(btn) {
    const id = btn.dataset.yt;
    lastFocus = btn;
    $("#flbxTag").textContent = btn.dataset.tag;
    $("#flbxTitle").textContent = btn.dataset.title;
    $("#flbxYt").href = "https://www.youtube.com/watch?v=" + id;
    frame.innerHTML =
      `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" ` +
      `title="${btn.dataset.title.replace(/"/g, "&quot;")}" allow="autoplay; encrypted-media; picture-in-picture" ` +
      `allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    $("#flbxClose").focus();
  }

  function close() {
    if (lb.hidden) return;
    lb.hidden = true;
    frame.innerHTML = "";            /* stops playback dead */
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".clip");
    if (btn) open(btn);
  });
  $("#flbxClose").addEventListener("click", close);
  $("#flbxBd").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  /* ---------------------------------------- warm the thumbnail cache
     The card thumbnails live on YouTube's CDN, so the service worker can
     only serve them offline once they've been fetched. Pull all 32 into
     the app cache up-front (no-cors, ~20 kB each, skipped when already
     cached) instead of waiting for the lazy loader to reach them — one
     visit then makes the whole section work with no network. */
  if ("caches" in window && location.protocol.startsWith("http")) {
    const thumbs = FOOTAGE.flatMap((m) => [m.launch, m.final]).map(
      (c) => `https://i.ytimg.com/vi/${c.id}/hqdefault.jpg`
    );
    caches
      .keys()
      .then((keys) => keys.filter((k) => k.startsWith("abnf-")).sort().pop() || "abnf-v3")
      .then((name) =>
        caches.open(name).then((cache) =>
          Promise.all(
            thumbs.map((u) =>
              cache.match(u).then((hit) =>
                hit
                  ? undefined
                  : fetch(u, { mode: "no-cors" })
                      .then((r) => (r ? cache.put(u, r) : undefined))
                      .catch(() => undefined)
              )
            )
          )
        )
      )
      .catch(() => undefined);
  }
})();
