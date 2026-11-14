/* OUTPOST: Junior Astronaut Mission Trainer — game data.
   Every number that comes from a real source is tagged with a source id (see SOURCES).
   Values marked "game estimate" are simplified for play and explained in the Data Library.
   Code written by Team ITM with assistance from a Super Intelligence (SI) tool (Claude, Anthropic). */

const SOURCES = {
  bvad: {
    title: "NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570 Rev2 (2022)",
    url: "https://ntrs.nasa.gov/citations/20210024855",
    note: "Oxygen use ≈ 0.82 kg and food ≈ 1.8 kg (packaged) per crew member per day."
  },
  issWater: {
    title: "NASA: ISS life support reaches 98% water recovery (Brine Processor Assembly), June 2023",
    url: "https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station",
    note: "Each crew member uses about a gallon (3.8 L) of water per day; recovery rose from 93–94% to 98%."
  },
  rad: {
    title: "Hassler et al. (2014), Mars' Surface Radiation Environment Measured with Curiosity's RAD, Science 343",
    url: "https://doi.org/10.1126/science.1244797",
    note: "0.67 mSv/day on the surface of Mars (Gale Crater); 1.8 mSv/day inside the spacecraft during cruise."
  },
  crater: {
    title: "NASA LRO / CRaTER — Cosmic Ray Telescope for the Effects of Radiation (lunar radiation data)",
    url: "https://iswa.gsfc.nasa.gov/iswa_data_tree/information/CRaTER.html",
    note: "Measures galactic cosmic rays and solar particles near the Moon since 2009."
  },
  change4: {
    title: "Zhang et al. (2020), First measurements of the radiation dose on the lunar surface, Science Advances 6",
    url: "https://doi.org/10.1126/sciadv.aaz1334",
    note: "≈1.37 mSv/day dose equivalent on the lunar surface (Chang'e-4 LND, CNSA)."
  },
  std3001: {
    title: "NASA-STD-3001 Technical Brief: Design for Ionizing Radiation Protection (OCHMO)",
    url: "https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf",
    note: "Career limit 600 mSv; 250 mSv per solar particle event; design target below 0.8 mSv/day GCR on planetary surfaces."
  },
  moxie: {
    title: "NASA/JPL: Oxygen-generating experiment MOXIE completes Mars mission (Sept 2023)",
    url: "https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/",
    note: "122 g of O₂ in 16 runs; best rate 12 g/hour at ≥98% purity."
  },
  marsFact: {
    title: "NASA NSSDCA Mars Fact Sheet",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
    note: "Solar irradiance at Mars ≈ 586 W/m² (43% of Earth's 1361 W/m²); a sol lasts 24 h 39.6 min."
  },
  moonFact: {
    title: "NASA NSSDCA Moon Fact Sheet",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
    note: "Synodic period 29.53 days → about 14.8 days of light and 14.8 days of night at the equator."
  },
  oppy: {
    title: "NASA: Record-setting Opportunity rover mission on Mars comes to end (2019)",
    url: "https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end",
    note: "A global dust storm blocked sunlight and the solar-powered rover lost power."
  },
  kilopower: {
    title: "NASA Fission Surface Power project (successor to Kilopower)",
    url: "https://www.nasa.gov/exploration-systems-development-mission-directorate/fission-surface-power",
    note: "Continuous power regardless of night or dust. NASA's 10 kWe transportable concept had a 4,000 kg mass requirement."
  },
  lcross: {
    title: "NASA LCROSS: water ice confirmed in a permanently shadowed lunar south-pole crater (2009)",
    url: "https://science.nasa.gov/mission/lcross/",
    note: "Water ice in polar craters can be mined for drinking water and oxygen."
  },
  veggie: {
    title: "NASA: Veggie plant growth system on the International Space Station",
    url: "https://www.nasa.gov/missions/station/veggie-plant-growth-system-activated-on-international-space-station",
    note: "Fresh crops add nutrition and improve crew mood on long missions."
  },
  artemis: {
    title: "NASA Artemis — lunar south pole exploration",
    url: "https://www.nasa.gov/humans-in-space/artemis/",
    note: "Near-continuous sunlight on some polar ridges and nearby water ice make the south pole a prime target."
  }
};

const C = {
  crew: 4,
  turns: 12,
  daysPerTurn: 5,
  massBudget: 8000,           // kg of systems + supplies on the cargo lander (game estimate)
  o2PerCrewDay: 0.82,         // kg  [bvad]
  waterPerCrewDay: 3.8,       // kg  [issWater] "about a gallon"
  foodPerCrewDay: 1.8,        // kg packaged  [bvad]
  solarConst: 1361,           // W/m² at 1 AU  [marsFact]
  panelArea: 50,              // m² per wing
  panelEff: 0.25,
  baseLoad: 120,              // kWh/day habitat: thermal, avionics, comms (game estimate, 5 kW)
  nightHeat: 48,              // kWh/day extra heaters during lunar night (game estimate, 2 kW)
  electrolysisKwhPerKg: 6,    // kWh per kg O2 (theory ≈ 5, game estimate with losses)
  waterPerKgO2: 1.125,        // kg water split per kg O2 (stoichiometry 18/16)
  o2TankFactor: 1.6,          // stored O2 mass × tankage
  careerLimit: 600,           // mSv  [std3001]
  surfaceTarget: 0.8,         // mSv/day habitat GCR design target on planetary surfaces [std3001]
  speLimit: 250               // mSv per event [std3001]
};

/* Peak power of one wing at 1 AU = 1361 × 0.25 × 50 ≈ 17 kW → 408 kWh per 24 h if always overhead. */
const WING_KWH_1AU = C.solarConst * C.panelEff * C.panelArea * 24 / 1000;

const SITES = {
  moonPole: {
    id: "moonPole",
    body: "Moon",
    name: "Shackleton Crater rim",
    region: "Lunar south pole · Beginner",
    dayWord: "day",
    gcr: 1.37,               // mSv/day [change4, crater]
    speDose: 100,            // mSv unsheltered, lunar surface (NASA ASCEND 2025 estimate) [std3001]
    // Sun skims the horizon: vertical, sun-tracking panels are lit ~85% of the time [artemis]
    solar: () => 0.85,
    diurnal: false,
    night: () => false,
    features: ["iceminer"],
    facts: [
      ["Sunlight", "≈85% of the time on ridge tops, sun always low"],
      ["Radiation", "1.37 mSv/day — no air, no magnetic field"],
      ["Resource", "Water ice in shadowed craters"],
      ["Day length", "Sun circles the horizon every 29.5 days"]
    ],
    sources: ["change4", "artemis", "lcross", "moonFact"],
    sky: ["#02030a", "#0b1024"], ground: ["#6f7178", "#3d3f45"],
    blurb: "Almost endless sunlight on the crater rim and ice in the dark crater below — but radiation is double that of Mars."
  },
  moonEq: {
    id: "moonEq",
    body: "Moon",
    name: "Mare Tranquillitatis",
    region: "Lunar equator · Hard",
    dayWord: "day",
    gcr: 1.37,
    speDose: 100,
    solar: (d) => (moonEqNight(d) ? 0 : 0.637),   // average cos(sun angle) for flat panels
    diurnal: false,
    night: (d) => moonEqNight(d),
    features: [],
    facts: [
      ["Sunlight", "14.8 days of light, then 14.8 days of night"],
      ["Radiation", "1.37 mSv/day"],
      ["Night", "−173 °C — heaters must keep running"],
      ["Resource", "Flat, safe landing plains, no easy ice"]
    ],
    sources: ["moonFact", "change4"],
    sky: ["#02030a", "#0d0f1a"], ground: ["#8a8a8a", "#4a4a4e"],
    blurb: "The classic Apollo landing zone. Easy to land, but the 2-week lunar night is the hardest power problem in the Solar System."
  },
  mars: {
    id: "mars",
    body: "Mars",
    name: "Jezero Crater",
    region: "Perseverance landing site · Medium",
    dayWord: "sol",
    gcr: 0.67,               // mSv/day [rad]
    speDose: 10,             // mSv — thin atmosphere absorbs most solar particles (game estimate)
    // 586/1361 = 0.43 of Earth's sunlight, × ~0.25 for night, sun angle and dust = 0.108
    solar: () => 0.108,
    diurnal: true,
    night: () => false,
    features: ["moxie"],
    facts: [
      ["Sunlight", "43% of Earth's, plus dust and night every sol"],
      ["Radiation", "0.67 mSv/sol — the atmosphere helps a little"],
      ["Resource", "CO₂ air → oxygen with MOXIE-type plants"],
      ["Hazard", "Dust storms can last weeks"]
    ],
    sources: ["rad", "marsFact", "moxie", "oppy"],
    sky: ["#c99a72", "#e6c29a"], ground: ["#a4572f", "#6b3219"],
    blurb: "Half the radiation of the Moon and air you can turn into oxygen — but weak sunlight and dust storms test your power plan."
  }
};

function moonEqNight(day) {
  const cycle = 29.53;
  return (day % cycle) >= cycle / 2;   // mission lands at local dawn
}

/* Modules. kind "count" = 0..max units; kind "tier" = pick one level. */
const MODULES = [
  { id: "solar", kind: "count", name: "Solar array wing", spec: "50 m², 25% cells", mass: 200, max: 14, icon: "☀",
    learn: "Output depends on how much sunlight reaches the site. One wing gives ≈350 kWh/day at the lunar pole but only ≈44 kWh/sol on Mars.",
    src: ["marsFact"] },
  { id: "battery", kind: "count", name: "Battery bank", spec: "100 kWh", mass: 500, max: 12, icon: "▮",
    learn: "Stores daytime energy for the night. On Mars you need it every sol; at the lunar equator you would need ≈30 banks for one night.",
    src: [] },
  { id: "fission", kind: "count", name: "Fission power unit", spec: "10 kWe, 240 kWh/day", mass: 4000, max: 2, icon: "⚛",
    learn: "Steady power regardless of night or dust. NASA's Fission Surface Power project targets exactly this problem; its 10 kWe concept was sized at about 4 tonnes.",
    src: ["kilopower"] },
  { id: "recycler", kind: "tier", name: "Water recycler", icon: "💧",
    tiers: [
      { label: "None", spec: "open loop", mass: 0, kwh: 0, r: 0 },
      { label: "Basic", spec: "93% recovery, 24 kWh/day", mass: 400, kwh: 24, r: 0.93 },
      { label: "ISS-grade + brine", spec: "98% recovery, 36 kWh/day", mass: 600, kwh: 36, r: 0.98 }
    ],
    learn: "The ISS recovers 98% of its water after adding a Brine Processor. Every 1% of recovery saves ≈9 kg of water per 60-day mission for 4 crew.",
    src: ["issWater"] },
  { id: "electrolysis", kind: "count", name: "Oxygen generator", spec: "splits water → O₂, 6 kWh/kg", mass: 300, max: 1, icon: "O₂",
    learn: "Makes breathable oxygen from water — but each kg of O₂ costs 1.125 kg of water and about 6 kWh.",
    src: ["bvad"] },
  { id: "moxie", kind: "count", name: "MOXIE-class O₂ plant", spec: "Mars air → 2 kg O₂/sol, 50 kWh", mass: 600, max: 1, icon: "M", site: "mars",
    learn: "MOXIE made 122 g of oxygen from Martian CO₂. A scaled-up plant is how astronauts would breathe — and make rocket propellant — on Mars.",
    src: ["moxie"] },
  { id: "iceminer", kind: "count", name: "Ice mining rover", spec: "+15 kg water/day, 40 kWh", mass: 700, max: 1, icon: "❄", site: "moonPole",
    learn: "LCROSS proved there is water ice in the polar craters. Mining it beats carrying every kilogram from Earth.",
    src: ["lcross"] },
  { id: "greenhouse", kind: "count", name: "Greenhouse module", spec: "+0.8 kg food/day, 40 kWh", mass: 700, max: 2, icon: "🌱",
    learn: "Fresh food and plants raise crew morale. For a short mission it costs more mass than it saves; for years-long missions it becomes essential.",
    src: ["veggie"] },
  { id: "shield", kind: "tier", name: "Regolith shielding", icon: "⛰",
    tiers: [
      { label: "None", spec: "bare habitat walls", mass: 0, cut: 0 },
      { label: "0.5 m berm", spec: "−30% cosmic-ray dose", mass: 500, cut: 0.30 },
      { label: "1.5 m cover", spec: "−50% cosmic-ray dose", mass: 900, cut: 0.50 }
    ],
    learn: "Local soil piled over the habitat blocks part of the cosmic rays (game estimate). On the Moon you need it to meet NASA's 0.8 mSv/day surface design target.",
    src: ["std3001"] },
  { id: "shelter", kind: "count", name: "Storm shelter", spec: "water-wall bunker, −80% solar storm dose", mass: 250, max: 1, icon: "⛨",
    learn: "Solar particle events can deliver a big dose in hours. Hiding behind water and supplies cuts it sharply. NASA limits one event to 250 mSv.",
    src: ["std3001"] }
];

const SUPPLIES = [
  { id: "food", name: "Food (packaged)", unit: "kg", step: 10, max: 900, perDay: C.foodPerCrewDay * C.crew, massFactor: 1, src: "bvad" },
  { id: "water", name: "Water", unit: "kg", step: 20, max: 1600, perDay: C.waterPerCrewDay * C.crew, massFactor: 1, src: "issWater" },
  { id: "o2", name: "Oxygen (tanks)", unit: "kg", step: 5, max: 400, perDay: C.o2PerCrewDay * C.crew, massFactor: C.o2TankFactor, src: "bvad" }
];

const FOCI = {
  eva:   { name: "Science EVA", desc: "Explore outside. Big science, but more radiation and fatigue.", icon: "🛰" },
  maint: { name: "Maintenance", desc: "Fix and service systems. Prevents and repairs breakdowns.", icon: "🔧" },
  rest:  { name: "Habitat care", desc: "Rest, tend plants, talk to family. Restores morale.", icon: "🏠" },
  shelter: { name: "Take shelter", desc: "Everyone into the most shielded room until the storm passes.", icon: "⛨" }
};

const OUTPOST_DATA = { SOURCES, C, WING_KWH_1AU, SITES, MODULES, SUPPLIES, FOCI, moonEqNight };
if (typeof module !== "undefined") module.exports = OUTPOST_DATA;
else Object.assign(window, OUTPOST_DATA);
