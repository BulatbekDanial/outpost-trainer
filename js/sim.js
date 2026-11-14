/* OUTPOST simulation engine — pure functions, no DOM. Runs in the browser and in Node for tests.
   Code written by Team ITM with assistance from a Super Intelligence (SI) tool (Claude, Anthropic). */
(function (root) {
  const D = (typeof module !== "undefined") ? require("./data.js") : root;
  const { C, WING_KWH_1AU, SITES, MODULES } = D;

  function rngFrom(seedStr) {
    let h = 1779033703 ^ String(seedStr).length;
    for (const ch of String(seedStr)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const mod = (id) => MODULES.find((m) => m.id === id);
  const tierOf = (id, lo) => mod(id).tiers[lo[id] || 0];

  function available(m, siteId) { return !m.site || m.site === siteId; }

  function massOf(lo, siteId) {
    let systems = 0;
    for (const m of MODULES) {
      if (!available(m, siteId)) continue;
      systems += m.kind === "tier" ? m.tiers[lo[m.id] || 0].mass : (lo[m.id] || 0) * m.mass;
    }
    const supplies = (lo.food || 0) + (lo.water || 0) + (lo.o2 || 0) * C.o2TankFactor;
    return { systems, supplies, total: systems + supplies };
  }

  function newMission(siteId, loadout, seed) {
    const lo = { ...loadout };
    for (const m of MODULES) if (!available(m, siteId)) lo[m.id] = 0;
    const cap = (lo.battery || 0) * 100;
    return {
      siteId, lo, seed: seed || "ITM", rng: rngFrom((seed || "ITM") + siteId),
      turn: 0, day: 0,
      o2: lo.o2 || 0, water: lo.water || 0, food: lo.food || 0,
      battery: cap, batteryCap: cap,
      dose: 0, gcrDose: 0, speDoses: [], morale: 80, science: 0,
      toggles: { recycler: true, electrolysis: true, moxie: true, iceminer: true, greenhouse: true },
      broken: { recycler: false }, lastMaint: -9,
      storm: 0, events: [], pendingSPE: false, outcrop: false,
      history: [], log: [], emergencyDays: 0, shedDays: 0, status: "active", abortReason: ""
    };
  }

  /* ---------- turn start: roll events so the player can react ---------- */
  function startTurn(s) {
    const site = SITES[s.siteId];
    const r = s.rng;
    s.events = [];
    s.pendingSPE = r() < 0.13;
    s.outcrop = r() < 0.18;
    s.shadowDays = 0;
    if (site.id === "mars") {
      if (s.storm > 0) { s.storm--; if (s.storm === 0) s.events.push({ t: "good", msg: "The dust storm is clearing — solar arrays recover." }); }
      else if (r() < 0.17) { s.storm = 2 + Math.floor(r() * 2); s.events.push({ t: "bad", key: "dust", msg: `Dust storm! Sunlight at the surface drops to about a third for ~${s.storm * 5} sols.` }); }
      if (s.storm > 0 && !s.events.some((e) => e.key === "dust")) s.events.push({ t: "bad", key: "dust", msg: "Dust storm continues. Solar power is weak." });
    }
    if (site.id === "moonPole" && r() < 0.18) { s.shadowDays = 2; s.events.push({ t: "bad", msg: "A nearby peak will shadow your arrays for 2 days this period." }); }
    if (site.id === "moonEq") {
      const d0 = s.day, d1 = s.day + C.daysPerTurn;
      let nights = 0; for (let d = d0; d < d1; d++) if (site.night(d)) nights++;
      const prevNight = d0 > 0 && site.night(d0 - 1);
      if (nights > 0 && !prevNight) s.events.push({ t: "bad", msg: "Sunset is coming. The 14.8-day lunar night begins — no solar power, heaters on." });
      else if (nights > 0) s.events.push({ t: "bad", msg: "Lunar night: total darkness, −173 °C outside." });
      else if (prevNight) s.events.push({ t: "good", msg: "Sunrise! Solar arrays are producing again." });
    }
    const rec = tierOf("recycler", s.lo);
    if (rec.r > 0 && !s.broken.recycler) {
      const p = (s.turn - s.lastMaint) <= 2 ? 0.04 : 0.14;
      if (r() < p) { s.broken.recycler = true; s.events.push({ t: "bad", msg: "Water recycler fault! It stops working until the crew does Maintenance." }); }
    } else if (s.broken.recycler) s.events.push({ t: "bad", msg: "Water recycler is still broken — schedule Maintenance." });
    if (s.pendingSPE) s.events.push({ t: "alert", msg: "SPACE WEATHER ALERT: a solar particle event is heading your way. Take shelter or keep working?" });
    if (s.outcrop) s.events.push({ t: "good", msg: "Your geologist spotted an unusual outcrop — EVA science is doubled this period." });
    if (!s.events.length) s.events.push({ t: "info", msg: "All systems nominal. Plan your next 5 " + site.dayWord + "s." });
    return s.events;
  }

  /* ---------- one day of physics ---------- */
  function dayStep(s, focus, ev) {
    const site = SITES[s.siteId];
    const lo = s.lo, crew = C.crew, out = { shed: [], emergency: false };
    const rec = tierOf("recycler", lo);
    let solarF = site.solar(s.day);
    if (s.storm > 0) solarF *= 0.35;
    if (ev.shadowToday) solarF = 0;
    const solar = (lo.solar || 0) * WING_KWH_1AU * solarF;
    const fission = (lo.fission || 0) * 240;

    // requested loads in priority order (base cannot be shed)
    const o2Need = crew * C.o2PerCrewDay * (focus === "eva" ? 1.1 : 1);
    const moxO2 = (lo.moxie && s.toggles.moxie) ? 2.0 : 0;
    const wantElec = lo.electrolysis && s.toggles.electrolysis ? Math.max(0, o2Need - moxO2) : 0;
    const loads = [
      { id: "base", kwh: C.baseLoad + (site.night(s.day) ? C.nightHeat : 0) },
      { id: "recycler", kwh: rec.r > 0 && s.toggles.recycler && !s.broken.recycler ? rec.kwh : 0 },
      { id: "electrolysis", kwh: wantElec * C.electrolysisKwhPerKg },
      { id: "moxie", kwh: moxO2 ? 50 : 0 },
      { id: "iceminer", kwh: lo.iceminer && s.toggles.iceminer ? 40 : 0 },
      { id: "greenhouse", kwh: (lo.greenhouse || 0) && s.toggles.greenhouse ? 40 * lo.greenhouse : 0 },
      { id: "lab", kwh: focus === "eva" ? 20 : 0 }
    ].filter((l) => l.kwh > 0 || l.id === "base");

    const cap = s.batteryCap;
    const tryBalance = (set) => {
      const L = set.reduce((a, l) => a + l.kwh, 0);
      if (site.diurnal) {
        const dayRaw = s.battery + solar + fission / 2 - L / 2;
        if (dayRaw < 0) return null;
        const b1 = Math.min(cap, dayRaw);
        const b2 = b1 + fission / 2 - L / 2;
        return b2 < 0 ? null : b2;
      }
      const raw = s.battery + solar + fission - L;
      return raw < 0 ? null : Math.min(cap, raw);
    };
    let active = loads.slice();
    let b = tryBalance(active);
    while (b === null && active.length > 1) { out.shed.push(active.pop().id); b = tryBalance(active); }
    if (b === null) { out.emergency = true; b = 0; }
    s.battery = b;
    const on = (id) => active.some((l) => l.id === id);

    // oxygen
    const elecO2 = on("electrolysis") ? wantElec : 0;
    const madeO2 = elecO2 + (on("moxie") ? moxO2 : 0);
    s.o2 += madeO2 - o2Need;
    // water
    const use = crew * C.waterPerCrewDay;
    const recovered = on("recycler") ? use * rec.r : 0;
    s.water -= use - recovered + elecO2 * C.waterPerKgO2;
    if (on("iceminer")) s.water += 15;
    // food
    s.food -= crew * C.foodPerCrewDay - (on("greenhouse") ? 0.8 * lo.greenhouse : 0);
    // radiation (per crew member)
    const cut = tierOf("shield", lo).cut;
    const hab = site.gcr * (1 - cut);
    const g = focus === "eva" ? hab * 0.75 + site.gcr * 0.25 : hab;
    s.gcrDose += g; s.dose += g;

    out.solar = solar; out.fission = fission; out.madeO2 = madeO2; out.greenOn = on("greenhouse");
    s.history.push({ day: s.day + 1, o2: s.o2, water: s.water, food: s.food, battery: s.battery, dose: s.dose, morale: s.morale, solar });
    s.day++;
    return out;
  }

  /* ---------- run a full turn ---------- */
  function runTurn(s, focus) {
    const site = SITES[s.siteId];
    const msgs = [];
    if (focus === "maint") {
      s.lastMaint = s.turn;
      if (s.broken.recycler) { s.broken.recycler = false; msgs.push({ t: "good", msg: "Crew repaired the water recycler." }); }
    }
    // solar particle event
    if (s.pendingSPE) {
      let dose = site.speDose;
      if (focus === "shelter") dose *= s.lo.shelter ? 0.2 : 0.6;
      else dose *= (focus === "eva" ? 1.3 : 1) * (1 - tierOf("shield", s.lo).cut * 0.5);
      dose = Math.round(dose * 10) / 10;
      s.dose += dose; s.speDoses.push(dose);
      msgs.push({ t: dose > 40 ? "bad" : "info", msg: `Solar particle event dose: ${dose} mSv per crew member${focus === "shelter" ? " (sheltered)" : ""}.` });
    }
    let shed = new Set(), emerg = 0, greenDays = 0;
    for (let i = 0; i < C.daysPerTurn; i++) {
      const r = dayStep(s, focus, { shadowToday: i < (s.shadowDays || 0) });
      r.shed.forEach((x) => shed.add(x));
      if (r.emergency) emerg++;
      if (r.greenOn) greenDays++;
      if (s.o2 < 0 || s.water < 0 || s.food < 0) {
        s.status = "aborted";
        s.abortReason = s.o2 < 0 ? "oxygen" : s.water < 0 ? "water" : "food";
        break;
      }
    }
    if (shed.size) { s.shedDays++; msgs.push({ t: "bad", msg: "Not enough power — automatically switched off: " + [...shed].map(nice).join(", ") + "." }); }
    if (emerg) { s.emergencyDays += emerg; msgs.push({ t: "bad", msg: `Power emergency on ${emerg} ${site.dayWord}(s): batteries empty, habitat cold.` }); }

    // morale & science
    let m = -4;
    if (focus === "rest") m += 12;
    if (focus === "shelter") m -= 2;
    if (focus === "eva") m -= 2;
    m += Math.round(4 * greenDays / C.daysPerTurn) * (s.lo.greenhouse || 0);
    if (s.storm > 0 || site.night(s.day - 1)) m -= 2;
    m -= emerg * 4;
    s.morale = Math.max(0, Math.min(100, s.morale + m));
    const eff = 0.5 + s.morale / 100;
    let sci = focus === "eva" ? 25 : focus === "maint" ? 4 : focus === "rest" ? 4 : 0;
    if (focus === "eva" && s.outcrop) sci *= 2;
    if (focus === "rest" && greenDays) sci += 4;   // plant-growth experiments
    sci = Math.round(sci * eff);
    s.science += sci;
    if (sci) msgs.push({ t: "info", msg: `+${sci} science points.` });

    s.turn++;
    if (s.status === "active" && s.turn >= C.turns) s.status = "complete";
    s.log.push({ turn: s.turn, focus, events: s.events.slice(), results: msgs });
    return msgs;
  }

  function nice(id) {
    return { recycler: "water recycler", electrolysis: "oxygen generator", moxie: "MOXIE plant", iceminer: "ice miner", greenhouse: "greenhouse", lab: "science lab" }[id] || id;
  }

  /* ---------- deterministic forecast for the planner (no random events) ---------- */
  function forecast(siteId, lo) {
    const s = newMission(siteId, lo, "forecast");
    const f = { o2: null, water: null, food: null };
    let shedDays = 0, emergDays = 0;
    for (let d = 0; d < C.turns * C.daysPerTurn; d++) {
      const r = dayStep(s, "maint", {});
      if (r.shed.length) shedDays++;
      if (r.emergency) emergDays++;
      for (const k of ["o2", "water", "food"]) if (f[k] === null && s[k] < 0) f[k] = s.day;
    }
    return { history: s.history, runsOut: f, shedDays, emergDays, habRate: SITES[siteId].gcr * (1 - tierOf("shield", lo).cut), end: { o2: s.o2, water: s.water, food: s.food } };
  }

  function grade(s) {
    const site = SITES[s.siteId];
    const days = Math.max(1, s.day);
    const habRate = s.gcrDose / days;
    let score = s.science + s.morale * 0.5;
    score -= s.emergencyDays * 3;
    if (habRate > C.surfaceTarget) score -= 25;
    if (s.speDoses.some((d) => d > 40)) score -= 15;
    const reserve = Math.min(s.o2 / (C.crew * C.o2PerCrewDay), s.water / (C.crew * C.waterPerCrewDay), s.food / (C.crew * C.foodPerCrewDay));
    if (reserve >= 3) score += 10;
    if (s.status !== "complete") return { letter: "F", score: Math.round(score), habRate, reserve };
    const letter = score >= 260 ? "S" : score >= 200 ? "A" : score >= 150 ? "B" : score >= 100 ? "C" : "D";
    return { letter, score: Math.round(score), habRate, reserve };
  }

  const API = { rngFrom, massOf, newMission, startTurn, runTurn, forecast, grade, tierOf, available };
  if (typeof module !== "undefined") module.exports = API; else root.Sim = API;
})(this);
