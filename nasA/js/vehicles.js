/* =========================================================================
   vehicles.js — clickable SVG diagrams for every mission phase.
   Each builder returns SVG markup; parts are <g class="vpart" data-part="id">.
   ========================================================================= */

/* Reusable deep-space satellite (orbiter / relay) glyph. */
const satellite = (cx, cy, s) => `
  <g transform="translate(${cx} ${cy}) scale(${s})">
    <rect x="-20" y="-14" width="40" height="28" rx="5" fill="#c9d0dc" stroke="#20242e" stroke-width="1.6"/>
    <rect x="-60" y="-9" width="36" height="18" rx="2" fill="#2f3a52" stroke="#20242e" stroke-width="1.3"/>
    <path d="M-51 -9 L-51 9 M-42 -9 L-42 9 M-33 -9 L-33 9" stroke="#5a6a92" stroke-width="1.2"/>
    <rect x="24" y="-9" width="36" height="18" rx="2" fill="#2f3a52" stroke="#20242e" stroke-width="1.3"/>
    <path d="M33 -9 L33 9 M42 -9 L42 9 M51 -9 L51 9" stroke="#5a6a92" stroke-width="1.2"/>
    <path d="M0 -14 L0 -24" stroke="#5b6270" stroke-width="2.4"/>
    <ellipse cx="0" cy="-30" rx="11" ry="6" fill="#d7dce5" stroke="#20242e" stroke-width="1.4"/>
    <circle cx="12" cy="7" r="4" fill="#5b6270" stroke="#20242e" stroke-width="1.1"/>
  </g>`;

const DIAGRAMS = {

  /* ---------------------------------------------------------------- Saturn V */
  saturnV: () => `
  <svg class="veh" viewBox="0 0 300 605" role="img" aria-label="Saturn V diagram">
    <defs>
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#cfd5e0"/><stop offset=".45" stop-color="#f2f4f8"/>
        <stop offset="1" stop-color="#aeb6c4"/>
      </linearGradient>
    </defs>

    <g class="vpart" data-part="cm" tabindex="0">
      <path d="M140 46 L144 74" stroke="#5b6270" stroke-width="3"/>
      <path d="M137 46 L143 32 L149 46 Z" fill="#5b6270"/>
      <path d="M126 122 L133 80 L147 80 L154 122 Z" fill="url(#bodyGrad)" stroke="#20242e" stroke-width="1.4"/>
      <path d="M131 100 L149 100" stroke="#20242e" stroke-width="1"/>
      <line class="vlead" x1="154" y1="96" x2="196" y2="88"/>
      <text class="vlabel" x="200" y="91">COMMAND MODULE</text>
    </g>

    <g class="vpart" data-part="sm" tabindex="0">
      <rect x="118" y="122" width="44" height="50" fill="url(#bodyGrad)" stroke="#20242e" stroke-width="1.4"/>
      <rect x="118" y="134" width="44" height="9" fill="#20242e" opacity=".85"/>
      <line class="vlead" x1="162" y1="146" x2="196" y2="146"/>
      <text class="vlabel" x="200" y="149">SERVICE MODULE</text>
    </g>

    <g class="vpart" data-part="adapter" tabindex="0">
      <path d="M112 222 L118 172 L162 172 L168 222 Z" fill="url(#bodyGrad)" stroke="#20242e" stroke-width="1.4"/>
      <path d="M124 172 L124 222 M140 172 L140 222 M156 172 L156 222" stroke="#20242e" stroke-width=".7" opacity=".5"/>
      <line class="vlead" x1="168" y1="197" x2="196" y2="197"/>
      <text class="vlabel" x="200" y="200">LM ADAPTER</text>
    </g>

    <g class="vpart" data-part="iu" tabindex="0">
      <rect x="109" y="222" width="62" height="13" fill="#3d4452" stroke="#20242e" stroke-width="1.2"/>
      <line class="vlead" x1="171" y1="228" x2="196" y2="228"/>
      <text class="vlabel" x="200" y="231">INSTRUMENT UNIT</text>
    </g>

    <g class="vpart" data-part="sivb" tabindex="0">
      <rect x="112" y="235" width="56" height="66" fill="url(#bodyGrad)" stroke="#20242e" stroke-width="1.4"/>
      <rect x="112" y="243" width="56" height="8" fill="#20242e" opacity=".85"/>
      <rect x="112" y="286" width="56" height="6" fill="#20242e" opacity=".55"/>
      <line class="vlead" x1="168" y1="268" x2="196" y2="264"/>
      <text class="vlabel" x="200" y="267">S-IVB 3RD STAGE</text>
    </g>

    <g class="vpart" data-part="sii" tabindex="0">
      <path d="M112 301 L98 332 L182 332 L168 301 Z" fill="url(#bodyGrad)" stroke="#20242e" stroke-width="1.4"/>
      <rect x="98" y="332" width="84" height="116" fill="url(#bodyGrad)" stroke="#20242e" stroke-width="1.4"/>
      <rect x="98" y="332" width="84" height="11" fill="#20242e" opacity=".85"/>
      <path d="M98 372 L120 372 L120 448 L98 448 Z" fill="#20242e" opacity=".8"/>
      <line class="vlead" x1="182" y1="392" x2="196" y2="392"/>
      <text class="vlabel" x="200" y="395">S-II 2ND STAGE</text>
    </g>

    <g class="vpart" data-part="sic" tabindex="0">
      <rect x="95" y="460" width="90" height="102" fill="url(#bodyGrad)" stroke="#20242e" stroke-width="1.4"/>
      <rect x="95" y="460" width="90" height="12" fill="#20242e" opacity=".85"/>
      <path d="M95 496 L122 496 L122 562 L95 562 Z" fill="#20242e" opacity=".8"/>
      <path d="M165 496 L185 496 L185 562 L165 562 Z" fill="#20242e" opacity=".8"/>
      <g fill="#5b6270" stroke="#20242e" stroke-width="1">
        <path d="M100 562 L124 562 L118 588 L106 588 Z"/>
        <path d="M126 562 L150 562 L146 590 L130 590 Z"/>
        <path d="M152 562 L176 562 L170 588 L158 588 Z"/>
        <path d="M133 560 L147 560 L145 578 L135 578 Z" opacity=".8"/>
      </g>
      <line class="vlead" x1="185" y1="520" x2="196" y2="520"/>
      <text class="vlabel" x="200" y="523">S-IC 1ST STAGE</text>
      <text class="vlabel dim" x="200" y="538">+ 5 F-1 ENGINES</text>
    </g>
    <text class="vaxis" x="18" y="300" transform="rotate(-90 18 300)">110.6 m TALL · 2.8 M TONNES FUELLED</text>
  </svg>`,

  /* ---------------------------------------------------------- Apollo Lunar Module */
  lm: () => `
  <svg class="veh" viewBox="0 0 455 345" role="img" aria-label="Apollo Lunar Module diagram">
    <defs>
      <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#e6bd4f"/><stop offset=".5" stop-color="#c8992b"/><stop offset="1" stop-color="#8f6a1c"/>
      </linearGradient>
      <linearGradient id="ascentGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#9aa3b2"/><stop offset=".45" stop-color="#d7dce5"/><stop offset="1" stop-color="#7d8697"/>
      </linearGradient>
    </defs>

    <g class="vpart" data-part="lmLegs" tabindex="0">
      <g stroke="#b9c0cc" stroke-width="5" stroke-linecap="round" fill="none">
        <path d="M158 252 L74 312"/><path d="M242 252 L326 312"/>
        <path d="M176 256 L126 314"/><path d="M224 256 L274 314"/>
      </g>
      <g stroke="#7d8697" stroke-width="2" fill="none">
        <path d="M158 240 L96 300"/><path d="M242 240 L304 300"/>
      </g>
      <g fill="#cfd5e0" stroke="#5b6270" stroke-width="1.5">
        <ellipse cx="74" cy="316" rx="18" ry="6"/><ellipse cx="326" cy="316" rx="18" ry="6"/>
        <ellipse cx="126" cy="318" rx="14" ry="5"/><ellipse cx="274" cy="318" rx="14" ry="5"/>
      </g>
      <line class="vlead" x1="330" y1="316" x2="352" y2="306"/>
      <text class="vlabel" x="356" y="309">LEGS</text>
    </g>

    <g class="vpart" data-part="rover" tabindex="0">
      <rect x="70" y="278" width="64" height="14" rx="4" fill="#e3e7ee" stroke="#20242e" stroke-width="1.4"/>
      <path d="M126 278 L126 262" stroke="#5b6270" stroke-width="3"/>
      <rect x="119" y="251" width="15" height="11" rx="2" fill="#5b6270" stroke="#20242e" stroke-width="1.2"/>
      <g fill="#3d4452" stroke="#20242e" stroke-width="1.2">
        <circle cx="82" cy="296" r="8"/><circle cx="102" cy="296" r="8"/><circle cx="122" cy="296" r="8"/>
      </g>
      <line class="vlead" x1="90" y1="276" x2="90" y2="252"/>
      <text class="vlabel" x="90" y="244" text-anchor="middle">LUNAR ROVER</text>
    </g>

    <g class="vpart" data-part="lmEngine" tabindex="0">
      <path d="M182 254 L218 254 L212 296 L188 296 Z" fill="#4a5160" stroke="#20242e" stroke-width="1.4"/>
      <ellipse cx="200" cy="296" rx="14" ry="5" fill="#20242e"/>
      <line class="vlead" x1="214" y1="284" x2="352" y2="330"/>
      <text class="vlabel" x="356" y="333">DESCENT ENGINE</text>
    </g>

    <g class="vpart" data-part="lmDescent" tabindex="0">
      <path d="M162 196 L238 196 L264 216 L264 246 L238 260 L162 260 L136 246 L136 216 Z"
            fill="url(#goldGrad)" stroke="#6b4e14" stroke-width="1.6"/>
      <path d="M150 206 L250 206 M150 226 L250 226 M150 246 L250 246" stroke="#6b4e14" stroke-width=".8" opacity=".55"/>
      <rect x="176" y="204" width="48" height="20" rx="3" fill="#3d4452" opacity=".85"/>
      <line class="vlead" x1="264" y1="232" x2="352" y2="248"/>
      <text class="vlabel" x="356" y="251">DESCENT STAGE</text>
    </g>

    <g class="vpart" data-part="lmAscent" tabindex="0">
      <path d="M158 118 L242 118 L252 152 L250 198 L150 198 L148 152 Z"
            fill="url(#ascentGrad)" stroke="#20242e" stroke-width="1.6"/>
      <path d="M162 140 L188 132 L188 152 L162 156 Z" fill="#20242e" opacity=".8"/>
      <path d="M238 140 L212 132 L212 152 L238 156 Z" fill="#20242e" opacity=".8"/>
      <rect x="188" y="164" width="24" height="34" fill="#5b6270" stroke="#20242e" stroke-width="1"/>
      <line class="vlead" x1="252" y1="176" x2="352" y2="180"/>
      <text class="vlabel" x="356" y="183">ASCENT STAGE</text>
    </g>

    <g class="vpart" data-part="lmHatch" tabindex="0">
      <rect x="182" y="96" width="36" height="24" rx="3" fill="#b9c0cc" stroke="#20242e" stroke-width="1.4"/>
      <line x1="200" y1="96" x2="200" y2="72" stroke="#5b6270" stroke-width="3"/>
      <rect x="192" y="62" width="16" height="12" fill="none" stroke="#5b6270" stroke-width="3"/>
      <line class="vlead" x1="218" y1="104" x2="352" y2="116"/>
      <text class="vlabel" x="356" y="119">HATCH &amp; TARGET</text>
    </g>

    <g class="vpart" data-part="lrrr" tabindex="0">
      <rect x="150" y="310" width="24" height="10" rx="2" fill="#d7dce5" stroke="#20242e" stroke-width="1.4"/>
      <path d="M154 310 L158 304 L166 304 L170 310" fill="none" stroke="#5b6270" stroke-width="1.2"/>
      <line class="vlead" x1="162" y1="320" x2="162" y2="328"/>
      <text class="vlabel" x="162" y="338" text-anchor="middle">RETROREFLECTOR</text>
    </g>

    <g class="vpart" data-part="alsep" tabindex="0">
      <rect x="30" y="268" width="28" height="17" rx="3" fill="#cfd5e0" stroke="#20242e" stroke-width="1.4"/>
      <path d="M44 268 L44 252" stroke="#5b6270" stroke-width="2.4"/>
      <rect x="16" y="292" width="12" height="9" rx="2" fill="#8f97a6" stroke="#20242e" stroke-width="1.2"/>
      <circle cx="64" cy="294" r="6" fill="#8f97a6" stroke="#20242e" stroke-width="1.2"/>
      <line class="vlead" x1="44" y1="286" x2="44" y2="304"/>
      <text class="vlabel" x="42" y="316" text-anchor="middle">ALSEP</text>
      <text class="vlabel dim" x="42" y="330" text-anchor="middle">EXPERIMENTS</text>
    </g>

    <g class="vpart" data-part="lmRCS" tabindex="0">
      <rect x="128" y="146" width="20" height="28" rx="3" fill="#8f97a6" stroke="#20242e" stroke-width="1.3"/>
      <path d="M128 150 L120 146 M128 170 L120 174" stroke="#20242e" stroke-width="3"/>
      <rect x="252" y="146" width="20" height="28" rx="3" fill="#8f97a6" stroke="#20242e" stroke-width="1.3"/>
      <path d="M272 150 L280 146 M272 170 L280 174" stroke="#20242e" stroke-width="3"/>
      <line class="vlead" x1="128" y1="152" x2="66" y2="138"/>
      <text class="vlabel" x="62" y="135" text-anchor="end">RCS QUADS</text>
    </g>
    <text class="vaxis" x="24" y="250" transform="rotate(-90 24 250)">5.2 m TALL · 9.4 m LEG SPAN</text>
  </svg>`,

  /* ------------------------------------------------------------- Launch vehicle */
  marsRocket: () => `
  <svg class="veh" viewBox="0 0 250 475" role="img" aria-label="Launch vehicle diagram">
    <defs>
      <linearGradient id="rocketGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#b8bfcc"/><stop offset=".4" stop-color="#eef1f6"/><stop offset="1" stop-color="#9aa3b2"/>
      </linearGradient>
    </defs>

    <g class="vpart" data-part="rFairing" tabindex="0">
      <path d="M105 18 C132 48 140 74 140 98 L70 98 C70 74 78 48 105 18 Z"
            fill="url(#rocketGrad)" fill-opacity=".55" stroke="#20242e" stroke-width="1.6"/>
      <path d="M105 18 L105 98" stroke="#20242e" stroke-width=".8" stroke-dasharray="4 5" opacity=".5"/>
      <line class="vlead" x1="140" y1="62" x2="168" y2="52"/>
      <text class="vlabel" x="172" y="55">FAIRING</text>
    </g>

    <g class="vpart" data-part="rCraft" tabindex="0">
      <path d="M86 92 L86 74 L96 58 L114 58 L124 74 L124 92 Z" fill="#c8992b" stroke="#6b4e14" stroke-width="1.4"/>
      <path d="M96 58 L96 48 M114 58 L114 48" stroke="#6b4e14" stroke-width="2"/>
      <line class="vlead" x1="86" y1="76" x2="72" y2="76"/>
      <text class="vlabel" x="68" y="79" text-anchor="end">SPACECRAFT</text>
    </g>

    <g class="vpart" data-part="rCore" tabindex="0">
      <rect x="76" y="98" width="58" height="276" fill="url(#rocketGrad)" stroke="#20242e" stroke-width="1.6"/>
      <path d="M76 130 L134 130 M76 240 L134 240" stroke="#20242e" stroke-width="1" opacity=".5"/>
      <rect x="76" y="196" width="58" height="12" fill="#20242e" opacity=".8"/>
      <line class="vlead" x1="134" y1="160" x2="168" y2="158"/>
      <text class="vlabel" x="172" y="161">UPPER STAGE</text>
    </g>

    <g class="vpart" data-part="rBoost" tabindex="0">
      <path d="M52 218 C52 202 58 192 64 186 C70 192 76 202 76 218 Z" fill="#d7dce5" stroke="#20242e" stroke-width="1.4"/>
      <rect x="52" y="218" width="24" height="164" fill="url(#rocketGrad)" stroke="#20242e" stroke-width="1.5"/>
      <path d="M134 218 C134 202 140 192 146 186 C152 192 158 202 158 218 Z" fill="#d7dce5" stroke="#20242e" stroke-width="1.4"/>
      <rect x="134" y="218" width="24" height="164" fill="url(#rocketGrad)" stroke="#20242e" stroke-width="1.5"/>
      <g fill="#5b6270" stroke="#20242e" stroke-width="1.1">
        <path d="M78 374 L132 374 L126 412 L84 412 Z"/>
        <path d="M86 412 L100 412 L97 424 L89 424 Z"/>
        <path d="M110 412 L124 412 L121 424 L113 424 Z"/>
      </g>
      <line class="vlead" x1="158" y1="330" x2="168" y2="330"/>
      <text class="vlabel" x="172" y="333">1ST STAGE</text>
      <text class="vlabel dim" x="172" y="348">&amp; BOOSTERS</text>
    </g>
    <text class="vaxis" x="16" y="300" transform="rotate(-90 16 300)">FALLS AWAY → OCEAN / ATMOSPHERE</text>
  </svg>`,

  /* ------------------------------------------------------ Stationary Mars lander */
  marsLander: () => `
  <svg class="veh" viewBox="0 0 575 355" role="img" aria-label="Mars lander descent diagram">
    <g class="vpart" data-part="cruise" tabindex="0">
      <ellipse cx="80" cy="58" rx="46" ry="14" fill="none" stroke="#cfd5e0" stroke-width="7"/>
      <rect x="24" y="46" width="26" height="24" rx="3" fill="#3d4452" stroke="#20242e" stroke-width="1.3"/>
      <rect x="110" y="46" width="26" height="24" rx="3" fill="#3d4452" stroke="#20242e" stroke-width="1.3"/>
      <line class="vlead" x1="80" y1="74" x2="76" y2="96"/>
      <text class="vlabel" x="74" y="110" text-anchor="middle">CRUISE STAGE</text>
      <text class="vlabel dim" x="74" y="124" text-anchor="middle">burns up at entry</text>
    </g>

    <g class="vpart" data-part="orbiter" tabindex="0">
      ${satellite(120, 226, 1)}
      <line class="vlead" x1="120" y1="272" x2="120" y2="280"/>
      <text class="vlabel" x="120" y="292" text-anchor="middle">THE ORBITER</text>
      <text class="vlabel dim" x="120" y="306" text-anchor="middle">stays in Mars orbit</text>
    </g>

    <g class="vpart" data-part="parachute" tabindex="0">
      <path d="M212 66 A70 52 0 0 1 352 66 Z" fill="#e8b14a" stroke="#8f6a1c" stroke-width="1.6"/>
      <path d="M212 66 L240 40 M238 40 L266 66 M266 66 L282 34 M282 34 L298 66 M298 66 L326 40 M326 40 L352 66"
            stroke="#8f6a1c" stroke-width="1" opacity=".8" fill="none"/>
      <g stroke="#b9c0cc" stroke-width="1.4">
        <path d="M212 66 L266 148"/><path d="M246 66 L272 148"/><path d="M282 66 L282 148"/>
        <path d="M318 66 L292 148"/><path d="M352 66 L298 148"/>
      </g>
      <line class="vlead" x1="352" y1="58" x2="408" y2="46"/>
      <text class="vlabel" x="412" y="49">PARACHUTE</text>
    </g>

    <g class="vpart" data-part="backshell" tabindex="0">
      <path d="M252 152 A30 26 0 0 1 312 152 L312 160 L252 160 Z" fill="#c9d0dc" stroke="#20242e" stroke-width="1.5"/>
      <line class="vlead" x1="312" y1="150" x2="408" y2="138"/>
      <text class="vlabel" x="412" y="141">BACKSHELL</text>
    </g>

    <g class="vpart" data-part="heatshield" tabindex="0">
      <path d="M250 194 A32 26 0 0 0 314 194 L314 202 A32 26 0 0 1 250 202 Z" fill="#8f6a1c" stroke="#5b4112" stroke-width="1.5"/>
      <path d="M252 194 A30 24 0 0 0 312 194" fill="#5b4112"/>
      <line class="vlead" x1="314" y1="200" x2="408" y2="196"/>
      <text class="vlabel" x="412" y="199">HEAT SHIELD</text>
    </g>

    <g class="vpart" data-part="deck" tabindex="0">
      <circle cx="352" cy="246" r="26" fill="#c8992b" stroke="#6b4e14" stroke-width="1.6"/>
      <path d="M352 246 L368 246" stroke="#6b4e14" stroke-width="2"/>
      <path d="M326 246 A26 26 0 0 1 378 246" fill="#e6bd4f" opacity=".65"/>
      <rect x="388" y="232" width="44" height="30" rx="4" fill="#c8992b" stroke="#6b4e14" stroke-width="1.5"/>
      <path d="M388 247 L432 247" stroke="#6b4e14" stroke-width="1"/>
      <line class="vlead" x1="432" y1="238" x2="470" y2="226"/>
      <text class="vlabel" x="472" y="229">DECK &amp; ARRAYS</text>
    </g>

    <g class="vpart" data-part="engines" tabindex="0">
      <g fill="#4a5160" stroke="#20242e" stroke-width="1.2">
        <path d="M336 262 L350 262 L347 280 L339 280 Z"/>
        <path d="M356 262 L370 262 L367 280 L359 280 Z"/>
        <path d="M346 268 L360 268 L358 288 L348 288 Z"/>
      </g>
      <line class="vlead" x1="370" y1="276" x2="470" y2="272"/>
      <text class="vlabel" x="472" y="275">DESCENT ENGINES</text>
    </g>

    <g class="vpart" data-part="legs" tabindex="0">
      <g stroke="#b9c0cc" stroke-width="5" stroke-linecap="round">
        <path d="M334 256 L300 306"/><path d="M372 256 L404 306"/><path d="M354 258 L356 310"/>
      </g>
      <g fill="#cfd5e0" stroke="#5b6270" stroke-width="1.5">
        <ellipse cx="298" cy="310" rx="15" ry="5"/><ellipse cx="406" cy="310" rx="15" ry="5"/>
        <ellipse cx="356" cy="314" rx="13" ry="5"/>
      </g>
      <line class="vlead" x1="406" y1="312" x2="470" y2="304"/>
      <text class="vlabel" x="472" y="307">LANDING LEGS</text>
    </g>

    <g class="vpart" data-part="payload" tabindex="0">
      <rect x="344" y="236" width="16" height="12" fill="#3d4452" stroke="#20242e" stroke-width="1.2"/>
      <path d="M344 246 L316 296" stroke="#7d8697" stroke-width="2.5" fill="none"/>
      <rect x="304" y="296" width="24" height="14" rx="3" fill="#d7dce5" stroke="#20242e" stroke-width="1.3"/>
      <line class="vlead" x1="316" y1="304" x2="240" y2="318"/>
      <text class="vlabel" x="236" y="322" text-anchor="end">SCIENCE PAYLOAD</text>
    </g>

    <path d="M270 332 L470 332" stroke="#8a5a3b" stroke-width="4" stroke-linecap="round" opacity=".8"/>
    <path d="M280 340 L440 340" stroke="#8a5a3b" stroke-width="2" opacity=".4"/>
    <text class="vaxis" x="24" y="250" transform="rotate(-90 24 250)">ENTRY 20,000 KM/H → TOUCHDOWN 0</text>
  </svg>`,

  /* --------------------------------------------------------- Rover EDL chain */
  roverEDL: () => `
  <svg class="veh" viewBox="0 0 555 360" role="img" aria-label="Rover sky crane landing diagram">
    <g class="vpart" data-part="edCruise" tabindex="0">
      <ellipse cx="76" cy="56" rx="44" ry="14" fill="none" stroke="#cfd5e0" stroke-width="7"/>
      <rect x="22" y="44" width="26" height="24" rx="3" fill="#3d4452" stroke="#20242e" stroke-width="1.3"/>
      <rect x="104" y="44" width="26" height="24" rx="3" fill="#3d4452" stroke="#20242e" stroke-width="1.3"/>
      <line class="vlead" x1="76" y1="72" x2="74" y2="94"/>
      <text class="vlabel" x="72" y="108" text-anchor="middle">CRUISE STAGE</text>
      <text class="vlabel dim" x="72" y="122" text-anchor="middle">burns up at entry</text>
    </g>

    <g class="vpart" data-part="orbiter" tabindex="0">
      ${satellite(112, 208, 0.9)}
      <line class="vlead" x1="112" y1="250" x2="112" y2="256"/>
      <text class="vlabel" x="112" y="266" text-anchor="middle">THE ORBITER</text>
      <text class="vlabel dim" x="112" y="280" text-anchor="middle">relay satellite above</text>
    </g>

    <g class="vpart" data-part="edParachute" tabindex="0">
      <path d="M186 58 A66 50 0 0 1 318 58 Z" fill="#e8b14a" stroke="#8f6a1c" stroke-width="1.6"/>
      <path d="M186 58 L214 34 M244 34 L252 58 M252 58 L282 30 M318 58 L290 34"
            stroke="#8f6a1c" stroke-width="1" opacity=".85" fill="none"/>
      <g stroke="#b9c0cc" stroke-width="1.4">
        <path d="M186 58 L240 138"/><path d="M220 58 L246 138"/><path d="M252 58 L252 138"/>
        <path d="M284 58 L258 138"/><path d="M318 58 L264 138"/>
      </g>
      <line class="vlead" x1="318" y1="52" x2="414" y2="44"/>
      <text class="vlabel" x="418" y="47">PARACHUTE</text>
    </g>

    <g class="vpart" data-part="edAeroshell" tabindex="0">
      <path d="M216 146 A36 30 0 0 1 288 146 L288 156 L216 156 Z" fill="#c9d0dc" stroke="#20242e" stroke-width="1.5"/>
      <path d="M214 196 A38 24 0 0 0 290 196 L290 206 A38 24 0 0 1 214 206 Z" fill="#8f6a1c" stroke="#5b4112" stroke-width="1.5"/>
      <line class="vlead" x1="290" y1="176" x2="414" y2="150"/>
      <text class="vlabel" x="418" y="153">AEROSHELL</text>
      <text class="vlabel dim" x="418" y="168">HEAT SHIELD + BACKSHELL</text>
    </g>

    <g class="vpart" data-part="edCrane" tabindex="0">
      <path d="M218 232 L286 232 L278 254 L226 254 Z" fill="#d7dce5" stroke="#20242e" stroke-width="1.5"/>
      <g fill="#4a5160" stroke="#20242e" stroke-width="1.1">
        <path d="M214 224 L232 224 L230 240 L216 240 Z"/>
        <path d="M272 224 L290 224 L288 240 L274 240 Z"/>
        <path d="M220 254 L234 254 L232 268 L222 268 Z"/>
        <path d="M270 254 L284 254 L282 268 L272 268 Z"/>
      </g>
      <g stroke="#e8b14a" stroke-width="2.4">
        <path d="M232 254 L236 284"/><path d="M252 256 L252 286"/><path d="M272 254 L268 284"/>
      </g>
      <line class="vlead" x1="286" y1="240" x2="414" y2="228"/>
      <text class="vlabel" x="418" y="231">SKY CRANE</text>
      <text class="vlabel dim" x="418" y="246">flies away &amp; crashes</text>
    </g>

    <g class="vpart" data-part="edRover" tabindex="0">
      <rect x="212" y="286" width="82" height="24" rx="5" fill="#e3e7ee" stroke="#20242e" stroke-width="1.6"/>
      <rect x="220" y="278" width="34" height="10" rx="3" fill="#cfd5e0" stroke="#20242e" stroke-width="1.2"/>
      <path d="M286 286 L286 262" stroke="#5b6270" stroke-width="4"/>
      <rect x="278" y="250" width="20" height="14" rx="3" fill="#5b6270" stroke="#20242e" stroke-width="1.3"/>
      <g fill="#3d4452" stroke="#20242e" stroke-width="1.2">
        <circle cx="226" cy="316" r="11"/><circle cx="253" cy="316" r="11"/><circle cx="280" cy="316" r="11"/>
      </g>
      <line class="vlead" x1="212" y1="296" x2="150" y2="304"/>
      <text class="vlabel" x="146" y="307" text-anchor="end">THE ROVER</text>
    </g>

    <g class="vpart" data-part="edHeli" tabindex="0">
      <rect x="238" y="332" width="30" height="12" rx="4" fill="#8f97a6" stroke="#20242e" stroke-width="1.3"/>
      <path d="M216 332 L292 332 M253 332 L253 326" stroke="#5b6270" stroke-width="2.4"/>
      <path d="M268 338 L284 344" stroke="#5b6270" stroke-width="2"/>
      <line class="vlead" x1="292" y1="334" x2="356" y2="344"/>
      <text class="vlabel" x="360" y="347">HELICOPTER</text>
    </g>
    <text class="vaxis" x="24" y="240" transform="rotate(-90 24 240)">ONE CHAIN · SIX DISCARDS</text>
  </svg>`,

  /* ------------------------------------------------------- Airbag EDL chain */
  airbagEDL: () => `
  <svg class="veh" viewBox="0 0 555 360" role="img" aria-label="Airbag landing diagram">
    <g class="vpart" data-part="abCruise" tabindex="0">
      <ellipse cx="76" cy="56" rx="44" ry="14" fill="none" stroke="#cfd5e0" stroke-width="7"/>
      <rect x="22" y="44" width="26" height="24" rx="3" fill="#3d4452" stroke="#20242e" stroke-width="1.3"/>
      <rect x="104" y="44" width="26" height="24" rx="3" fill="#3d4452" stroke="#20242e" stroke-width="1.3"/>
      <line class="vlead" x1="76" y1="72" x2="74" y2="94"/>
      <text class="vlabel" x="72" y="108" text-anchor="middle">CRUISE STAGE</text>
      <text class="vlabel dim" x="72" y="122" text-anchor="middle">burns up at entry</text>
    </g>

    <g class="vpart" data-part="orbiter" tabindex="0">
      ${satellite(505, 70, 0.62)}
      <text class="vlabel" x="505" y="118" text-anchor="middle">ORBITER</text>
    </g>

    <g class="vpart" data-part="abChute" tabindex="0">
      <path d="M190 58 A64 48 0 0 1 314 58 Z" fill="#e8b14a" stroke="#8f6a1c" stroke-width="1.6"/>
      <path d="M190 58 L218 34 M252 34 L252 58 M286 34 L314 58" stroke="#8f6a1c" stroke-width="1" opacity=".85" fill="none"/>
      <g stroke="#b9c0cc" stroke-width="1.4">
        <path d="M190 58 L240 140"/><path d="M224 58 L246 140"/><path d="M252 58 L252 140"/>
        <path d="M280 58 L258 140"/><path d="M314 58 L264 140"/>
      </g>
      <line class="vlead" x1="314" y1="52" x2="414" y2="44"/>
      <text class="vlabel" x="418" y="47">PARACHUTE</text>
    </g>

    <g class="vpart" data-part="abShell" tabindex="0">
      <path d="M218 148 A35 28 0 0 1 286 148 L286 158 L218 158 Z" fill="#c9d0dc" stroke="#20242e" stroke-width="1.5"/>
      <path d="M216 198 A37 24 0 0 0 288 198 L288 208 A37 24 0 0 1 216 208 Z" fill="#8f6a1c" stroke="#5b4112" stroke-width="1.5"/>
      <line class="vlead" x1="288" y1="178" x2="414" y2="160"/>
      <text class="vlabel" x="418" y="163">AEROSHELL</text>
      <text class="vlabel dim" x="418" y="178">HEAT SHIELD + BACKSHELL</text>
    </g>

    <g class="vpart" data-part="abBags" tabindex="0">
      <g fill="#eef1f6" stroke="#9aa3b2" stroke-width="2">
        <circle cx="150" cy="248" r="46"/><circle cx="112" cy="222" r="30"/>
        <circle cx="196" cy="226" r="30"/><circle cx="116" cy="282" r="30"/>
        <circle cx="192" cy="284" r="30"/><circle cx="152" cy="304" r="30"/>
        <circle cx="152" cy="206" r="28"/>
      </g>
      <path d="M128 240 L176 240 M136 268 L172 268" stroke="#9aa3b2" stroke-width="1.4" opacity=".7"/>
      <line class="vlead" x1="112" y1="186" x2="112" y2="174"/>
      <text class="vlabel" x="112" y="166" text-anchor="middle">AIRBAG SYSTEM</text>
      <text class="vlabel dim" x="112" y="152" text-anchor="middle">≈5 m of bouncing</text>
    </g>

    <g class="vpart" data-part="abPetals" tabindex="0">
      <path d="M330 276 L392 276 L392 302 L330 302 Z" fill="#c8992b" stroke="#6b4e14" stroke-width="1.6"/>
      <path d="M330 276 L296 306 L330 302 Z" fill="#e6bd4f" stroke="#6b4e14" stroke-width="1.5"/>
      <path d="M392 276 L426 306 L392 302 Z" fill="#e6bd4f" stroke="#6b4e14" stroke-width="1.5"/>
      <path d="M330 276 L360 252 L392 276" fill="none" stroke="#6b4e14" stroke-width="1.5"/>
      <path d="M392 302 L416 318" stroke="#b9c0cc" stroke-width="4"/>
      <line class="vlead" x1="360" y1="252" x2="372" y2="216"/>
      <text class="vlabel" x="374" y="212">LANDER PETALS</text>
      <text class="vlabel dim" x="374" y="227">&amp; ROVER RAMP</text>
    </g>

    <g class="vpart" data-part="abRover" tabindex="0">
      <rect x="432" y="290" width="52" height="16" rx="4" fill="#e3e7ee" stroke="#20242e" stroke-width="1.5"/>
      <path d="M476 290 L476 274" stroke="#5b6270" stroke-width="3"/>
      <rect x="470" y="266" width="13" height="9" rx="2" fill="#5b6270" stroke="#20242e" stroke-width="1.2"/>
      <g fill="#3d4452" stroke="#20242e" stroke-width="1.1">
        <circle cx="442" cy="310" r="7"/><circle cx="458" cy="310" r="7"/><circle cx="474" cy="310" r="7"/>
      </g>
      <line class="vlead" x1="458" y1="316" x2="452" y2="336"/>
      <text class="vlabel" x="450" y="350" text-anchor="middle">THE ROVER</text>
    </g>

    <path d="M100 336 L470 336" stroke="#8a5a3b" stroke-width="4" stroke-linecap="round" opacity=".8"/>
  </svg>`,

  /* ------------------------------------------------------------- Surveyor */
  surveyor: () => `
  <svg class="veh" viewBox="0 0 372 305" role="img" aria-label="Surveyor lander diagram">
    <defs>
      <linearGradient id="rocketGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#b8bfcc"/><stop offset=".4" stop-color="#eef1f6"/><stop offset="1" stop-color="#9aa3b2"/>
      </linearGradient>
    </defs>
    <g class="vpart" data-part="svDish" tabindex="0">
      <path d="M158 116 L150 92" stroke="#5b6270" stroke-width="3"/>
      <path d="M134 82 A20 20 0 0 1 166 82 L160 96 L140 96 Z" fill="#d7dce5" stroke="#20242e" stroke-width="1.5"/>
      <line class="vlead" x1="166" y1="86" x2="252" y2="70"/>
      <text class="vlabel" x="256" y="73">DISH ANTENNA</text>
    </g>

    <g class="vpart" data-part="svPanel" tabindex="0">
      <g transform="rotate(-18 214 128)">
        <rect x="210" y="110" width="58" height="34" rx="3" fill="#2f3a52" stroke="#20242e" stroke-width="1.5"/>
        <path d="M224 110 L224 144 M239 110 L239 144 M254 110 L254 144" stroke="#5a6a92" stroke-width="1.4"/>
        <path d="M210 127 L268 127" stroke="#5a6a92" stroke-width="1.4"/>
      </g>
      <line class="vlead" x1="268" y1="120" x2="290" y2="112"/>
      <text class="vlabel" x="294" y="115">SOLAR PANEL</text>
    </g>

    <g class="vpart" data-part="svBody" tabindex="0">
      <path d="M142 124 L214 124 L230 150 L214 178 L142 178 L126 150 Z"
            fill="url(#rocketGrad)" stroke="#20242e" stroke-width="1.7"/>
      <rect x="152" y="136" width="30" height="22" rx="3" fill="#20242e" opacity=".8"/>
      <circle cx="196" cy="147" r="8" fill="#5b6270" stroke="#20242e" stroke-width="1.3"/>
      <path d="M126 156 L86 196" stroke="#7d8697" stroke-width="3"/>
      <path d="M80 196 A9 9 0 1 1 98 196 Z" fill="#cfd5e0" stroke="#20242e" stroke-width="1.4"/>
      <line class="vlead" x1="230" y1="152" x2="278" y2="160"/>
      <text class="vlabel" x="282" y="163">BUS</text>
      <text class="vlabel dim" x="282" y="178">+ CAMERA</text>
    </g>

    <g class="vpart" data-part="svEngine" tabindex="0">
      <path d="M154 178 L186 178 L180 214 L160 214 Z" fill="#4a5160" stroke="#20242e" stroke-width="1.5"/>
      <ellipse cx="170" cy="214" rx="12" ry="4" fill="#20242e"/>
      <line class="vlead" x1="180" y1="206" x2="264" y2="220"/>
      <text class="vlabel" x="268" y="223">RETRO-ROCKET</text>
    </g>

    <g class="vpart" data-part="svLegs" tabindex="0">
      <g stroke="#b9c0cc" stroke-width="5.5" stroke-linecap="round">
        <path d="M140 174 L66 258"/><path d="M204 174 L276 258"/><path d="M172 178 L178 262"/>
      </g>
      <g stroke="#7d8697" stroke-width="2">
        <path d="M140 166 L84 244"/><path d="M204 166 L258 244"/>
      </g>
      <g fill="#cfd5e0" stroke="#5b6270" stroke-width="1.5">
        <ellipse cx="66" cy="262" rx="17" ry="6"/><ellipse cx="276" cy="262" rx="17" ry="6"/>
        <ellipse cx="178" cy="266" rx="14" ry="5"/>
      </g>
      <line class="vlead" x1="66" y1="266" x2="48" y2="286"/>
      <text class="vlabel" x="44" y="292" text-anchor="middle">LANDING GEAR</text>
    </g>
    <path d="M40 274 L300 274" stroke="#6b6b74" stroke-width="4" opacity=".55"/>
    <text class="vaxis" x="22" y="200" transform="rotate(-90 22 200)">FIRST U.S. SOFT LANDING · 1966</text>
  </svg>`,

  /* --------------------------------------------------------- Impact scene */
  impact: () => `
  <svg class="veh" viewBox="0 0 480 300" role="img" aria-label="Deliberate impact diagram">
    <defs>
      <radialGradient id="moonGrad" cx=".4" cy=".15" r=".9">
        <stop offset="0" stop-color="#b9b6b0"/><stop offset=".7" stop-color="#8d8a85"/><stop offset="1" stop-color="#6a6863"/>
      </radialGradient>
    </defs>
    <circle cx="230" cy="560" r="420" fill="url(#moonGrad)"/>
    <g fill="#7a7873" opacity=".8">
      <ellipse cx="120" cy="168" rx="26" ry="8"/><ellipse cx="380" cy="168" rx="34" ry="10"/>
      <ellipse cx="205" cy="150" rx="14" ry="5"/><ellipse cx="60" cy="196" rx="18" ry="6"/>
    </g>
    <g stroke="#efeae0" stroke-width="1.4" stroke-dasharray="7 8" fill="none" opacity=".9">
      <path d="M26 34 Q170 52 300 146"/>
    </g>
    <path d="M300 146 L286 140 M300 146 L292 132" stroke="#efeae0" stroke-width="2.4" fill="none"/>

    <g class="vpart" data-part="imCraft" tabindex="0">
      <g transform="rotate(24 96 52)">
        <rect x="78" y="42" width="46" height="22" rx="6" fill="#d7dce5" stroke="#20242e" stroke-width="1.6"/>
        <path d="M78 47 L66 52 L78 60 Z" fill="#8f97a6" stroke="#20242e" stroke-width="1.4"/>
        <path d="M124 46 L136 44 M124 60 L136 62" stroke="#e8b14a" stroke-width="3"/>
      </g>
      <line class="vlead" x1="96" y1="70" x2="86" y2="110"/>
      <text class="vlabel" x="82" y="124" text-anchor="middle">SPENT STAGE</text>
      <text class="vlabel dim" x="82" y="139" text-anchor="middle">aimed at the surface</text>
    </g>

    <g class="vpart" data-part="imCrater" tabindex="0">
      <ellipse cx="300" cy="150" rx="34" ry="11" fill="#54524e" stroke="#d9d4ca" stroke-width="2"/>
      <ellipse cx="300" cy="150" rx="17" ry="5" fill="#3a3936"/>
      <g stroke="#efeae0" stroke-width="1.6" opacity=".85">
        <path d="M300 150 L338 128"/><path d="M300 150 L356 146"/><path d="M300 150 L266 128"/><path d="M300 150 L246 148"/>
      </g>
      <path d="M300 150 L306 132 L314 146 L330 138 L318 154 L304 158 Z" fill="#ffd479" opacity=".95"/>
      <line class="vlead" x1="338" y1="158" x2="392" y2="188"/>
      <text class="vlabel" x="396" y="192">FRESH CRATER</text>
    </g>
    <text class="vaxis" x="22" y="252" transform="rotate(-90 22 252)">2.5 KM/S AT CONTACT</text>
  </svg>`
};

/** Render a diagram; highlight `focus` parts, drop `hide` parts entirely. */
function buildDiagram(kind, focus, hide) {
  const builder = DIAGRAMS[kind];
  if (!builder) return "";
  const svg = builder();
  const set = new Set(focus || []);
  const hideSet = new Set(hide || []);
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;

  /* Namespace every def/gradient id so 16 simultaneously-rendered diagrams
     can't collide (and a diagram that references a gradient it doesn't
     define can't silently borrow another mission's). */
  const suffix = "__" + kind + "_" + (buildDiagram._n = (buildDiagram._n || 0) + 1);
  const idMap = new Map();
  root.querySelectorAll("[id]").forEach((el) => {
    const old = el.getAttribute("id");
    const fresh = old + suffix;
    idMap.set(old, fresh);
    el.setAttribute("id", fresh);
  });
  if (idMap.size) {
    root.querySelectorAll("*").forEach((el) => {
      for (const attr of ["fill", "stroke", "filter", "clip-path", "mask", "href"]) {
        const v = el.getAttribute(attr);
        if (v && v.indexOf("url(#") !== -1) {
          el.setAttribute(attr, v.replace(/url\(#([^)]+)\)/g, (m, id) =>
            idMap.has(id) ? `url(#${idMap.get(id)})` : m));
        }
      }
    });
  }

  root.querySelectorAll(".vpart").forEach((el) => {
    const id = el.getAttribute("data-part");
    if (!id) return;
    if (hideSet.has(id)) { el.remove(); return; }
    if (set.has(id)) el.classList.add("focus");
  });
  return new XMLSerializer().serializeToString(root);
}
