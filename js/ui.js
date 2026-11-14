/* OUTPOST UI. Code written by Team ITM with assistance from a Super Intelligence (SI) tool (Claude, Anthropic). */
(function () {
  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); e.innerHTML = html; return e; };
  const fmt = (n, d = 0) => Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
  const NEED = { o2: C.crew * C.o2PerCrewDay, water: C.crew * C.waterPerCrewDay, food: C.crew * C.foodPerCrewDay };
  const DAYS = C.turns * C.daysPerTurn;

  const PRESETS = {
    moonPole: { solar: 1, battery: 1, recycler: 2, electrolysis: 1, iceminer: 1, shield: 2, shelter: 1, food: 440, water: 300, o2: 40 },
    moonEq: { solar: 1, battery: 1, fission: 1, recycler: 1, electrolysis: 1, shield: 1, shelter: 1, food: 440, water: 600, o2: 40 },
    mars: { solar: 8, battery: 3, recycler: 2, electrolysis: 1, moxie: 1, greenhouse: 1, shield: 1, shelter: 1, food: 440, water: 450, o2: 100 }
  };
  const S = { siteId: null, lo: {}, m: null, focus: "maint" };

  /* ---------------- navigation ---------------- */
  function go(name) {
    document.querySelectorAll(".screen").forEach((x) => x.classList.remove("active"));
    $("#scr-" + name).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "plan") renderPlan();
  }
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go);
    const o = e.target.closest("[data-open]"); if (o) $("#dlg-" + o.dataset.open).showModal();
    const c = e.target.closest("[data-close]"); if (c) c.closest("dialog").close();
  });

  /* ---------------- scene drawing ---------------- */
  function scene(siteId, lo, opt = {}) {
    const site = SITES[siteId], W = 600, H = 260, gy = 190;
    const night = opt.night, storm = opt.storm;
    let s = `<defs><linearGradient id="sky${opt.k || ""}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${site.sky[0]}"/><stop offset="1" stop-color="${night ? "#000" : site.sky[1]}"/></linearGradient>
      <linearGradient id="gr${opt.k || ""}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${site.ground[0]}"/><stop offset="1" stop-color="${site.ground[1]}"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#sky${opt.k || ""})"/>`;
    if (site.body === "Moon") {
      const r = Sim.rngFrom("stars" + siteId);
      for (let i = 0; i < 60; i++) s += `<circle cx="${r() * W}" cy="${r() * 150}" r="${r() * 1.2 + 0.3}" fill="#fff" opacity="${0.4 + r() * 0.6}"/>`;
      s += `<circle cx="520" cy="46" r="16" fill="#5aa0f2"/><path d="M510 40q8 -6 14 2q-4 8 -12 4z" fill="#7ad08a"/>`;
      if (!night) s += siteId === "moonPole" ? `<circle cx="60" cy="${gy - 18}" r="14" fill="#fff6d8"/>` : `<circle cx="120" cy="40" r="16" fill="#fff6d8"/>`;
    } else if (!night) s += `<circle cx="470" cy="50" r="10" fill="#fff4e0" opacity=".85"/>`;
    s += siteId === "moonPole"
      ? `<path d="M0 ${gy} L80 150 L170 ${gy - 8} L260 160 L360 ${gy - 6} L470 140 L600 ${gy - 4} V${H} H0Z" fill="${site.ground[1]}" opacity=".7"/>`
      : `<path d="M0 ${gy} Q120 ${gy - 30} 240 ${gy - 6} T600 ${gy - 12} V${H} H0Z" fill="${site.ground[1]}" opacity=".6"/>`;
    s += `<rect y="${gy}" width="${W}" height="${H - gy}" fill="url(#gr${opt.k || ""})"/>`;
    // solar wings
    const n = Math.min(lo.solar || 0, 14);
    for (let i = 0; i < n; i++) {
      const x = 22 + (i % 7) * 34, y = gy - 34 + Math.floor(i / 7) * 26;
      s += `<line x1="${x + 12}" y1="${y + 22}" x2="${x + 12}" y2="${y + 34}" stroke="#999" stroke-width="2"/><rect x="${x}" y="${y}" width="26" height="22" rx="2" fill="${night ? "#1a2238" : "#2a4b8c"}" stroke="#8fb3ff" stroke-width="1"/><line x1="${x + 13}" y1="${y}" x2="${x + 13}" y2="${y + 22}" stroke="#8fb3ff" stroke-width=".6"/>`;
    }
    // habitat + shielding
    const hx = 300;
    s += `<rect x="${hx}" y="${gy - 40}" width="110" height="40" rx="18" fill="#e9edf2" stroke="#9aa6b8"/><rect x="${hx + 14}" y="${gy - 28}" width="12" height="9" rx="2" fill="${night ? "#ffd27a" : "#3a5b8c"}"/><rect x="${hx + 34}" y="${gy - 28}" width="12" height="9" rx="2" fill="${night ? "#ffd27a" : "#3a5b8c"}"/>`;
    const sh = Sim.tierOf("shield", lo).cut;
    if (sh) s += `<path d="M${hx - 12} ${gy} Q${hx + 55} ${gy - 40 - sh * 40} ${hx + 122} ${gy}Z" fill="${site.ground[0]}" opacity=".95"/><text x="${hx + 55}" y="${gy - 8}" text-anchor="middle" font-size="10" fill="#0008">regolith</text>`;
    if (lo.shelter) s += `<rect x="${hx + 112}" y="${gy - 22}" width="22" height="22" rx="3" fill="#3f6b8a" stroke="#9cd"/>`;
    for (let i = 0; i < (lo.greenhouse || 0); i++) s += `<path d="M${hx + 140 + i * 38} ${gy} a17 17 0 0 1 34 0z" fill="#7ad08a" opacity="${opt.greenOff ? 0.3 : 0.85}" stroke="#bfe"/>`;
    for (let i = 0; i < (lo.battery || 0) && i < 8; i++) s += `<rect x="${250 + (i % 4) * 11}" y="${gy - 12 - Math.floor(i / 4) * 12}" width="9" height="11" fill="#d8b23a" stroke="#776018"/>`;
    if (lo.fission) s += `<line x1="410" y1="${gy - 4}" x2="540" y2="${gy - 4}" stroke="#aaa" stroke-dasharray="3 3"/><rect x="535" y="${gy - 36}" width="20" height="34" rx="3" fill="#cfd5dc" stroke="#777"/><path d="M528 ${gy - 30} h34 M528 ${gy - 22} h34 M528 ${gy - 14} h34" stroke="#888" stroke-width="3"/>`;
    if (lo.moxie) s += `<rect x="255" y="${gy - 40}" width="26" height="18" rx="2" fill="#c8a24a"/><text x="268" y="${gy - 27}" font-size="10" text-anchor="middle" fill="#222">O₂</text>`;
    if (lo.iceminer) s += `<g transform="translate(470 ${gy + 22})"><rect width="34" height="14" rx="3" fill="#ddd"/><circle cx="7" cy="16" r="5" fill="#333"/><circle cx="27" cy="16" r="5" fill="#333"/><path d="M34 6 l12 10" stroke="#ddd" stroke-width="3"/></g>`;
    if (opt.eva) for (let i = 0; i < 2; i++) s += `<g transform="translate(${200 + i * 30} ${gy + 30})"><circle r="6" fill="#fff"/><circle r="3.5" fill="#f2a65a"/><rect x="-6" y="5" width="12" height="16" rx="4" fill="#fff"/></g>`;
    if (storm) s += `<rect width="${W}" height="${H}" fill="#c48a52" opacity=".55"/>`;
    if (night) s += `<rect width="${W}" height="${H}" fill="#000814" opacity=".45"/>`;
    if (opt.spe) s += `<rect width="${W}" height="${H}" fill="#ffe680" opacity=".18"/><text x="${W / 2}" y="24" text-anchor="middle" fill="#ffe680" font-size="14" font-weight="700">SOLAR PARTICLE EVENT</text>`;
    return s;
  }

  /* ---------------- site cards ---------------- */
  function renderSites() {
    const box = $("#site-cards"); box.innerHTML = "";
    Object.values(SITES).forEach((site) => {
      const b = el("button", { class: "site-card" });
      b.innerHTML = `<svg viewBox="0 0 600 260">${scene(site.id, PRESETS[site.id], { k: site.id })}</svg>
        <div class="body"><div class="tag">${site.body} · ${site.region}</div><h2>${site.name}</h2><p>${site.blurb}</p>
        <dl class="facts">${site.facts.map(([a, b2]) => `<dt>${a}</dt><dd>${b2}</dd>`).join("")}</dl></div>`;
      b.onclick = () => { S.siteId = site.id; S.lo = S.saved?.[site.id] || { food: 0, water: 0, o2: 0 }; go("plan"); };
      box.appendChild(b);
    });
  }

  /* ---------------- planner ---------------- */
  function renderPlan() {
    const site = SITES[S.siteId];
    $("#plan-title").textContent = `${site.name} · ${site.body}`;
    const ml = $("#mod-list"); ml.innerHTML = "";
    MODULES.filter((m) => Sim.available(m, S.siteId)).forEach((m) => {
      const row = el("div", { class: "mod" });
      let ctrl;
      if (m.kind === "count") {
        const v = S.lo[m.id] || 0;
        ctrl = `<div class="step"><button data-d="-1" aria-label="less">−</button><b>${v}</b><button data-d="1" aria-label="more">+</button></div>`;
      } else {
        const v = S.lo[m.id] || 0;
        ctrl = `<div class="seg">${m.tiers.map((t, i) => `<button data-t="${i}" class="${i === v ? "on" : ""}">${t.label}</button>`).join("")}</div>`;
      }
      const spec = m.kind === "count" ? `${m.spec} · ${fmt(m.mass)} kg each` : m.tiers.map((t) => t.label + ": " + t.spec + (t.mass ? ` (${fmt(t.mass)} kg)` : "")).join(" · ");
      row.innerHTML = `<div class="ic">${m.icon}</div><div><div class="nm">${m.name}</div><div class="sp">${spec}</div></div>${ctrl}
        <details><summary>Why it matters</summary>${m.learn}${m.src.map((k) => ` <a href="${SOURCES[k].url}" target="_blank" rel="noopener">[source]</a>`).join("")}</details>`;
      row.querySelectorAll("[data-d]").forEach((b) => b.onclick = () => { S.lo[m.id] = Math.max(0, Math.min(m.max, (S.lo[m.id] || 0) + +b.dataset.d)); renderPlan(); });
      row.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => { S.lo[m.id] = +b.dataset.t; renderPlan(); });
      ml.appendChild(row);
    });
    const sl = $("#sup-list"); sl.innerHTML = "";
    SUPPLIES.forEach((p) => {
      const v = S.lo[p.id] || 0;
      const row = el("div", { class: "sup" });
      row.innerHTML = `<div><b>${p.name}</b><div class="sp">Crew of 4 uses ${fmt(p.perDay, 1)} kg/day without recycling${p.massFactor > 1 ? " · tanks add 60% mass" : ""}</div></div>
        <div><b>${fmt(v)} kg</b><div class="sp">${fmt(v / p.perDay, 0)} days</div></div>
        <input type="range" min="0" max="${p.max}" step="${p.step}" value="${v}" aria-label="${p.name}">`;
      const inp = row.querySelector("input");
      inp.oninput = () => { S.lo[p.id] = +inp.value; row.querySelector("div:nth-child(2) b").textContent = fmt(inp.value) + " kg"; row.querySelector("div:nth-child(2) .sp").textContent = fmt(inp.value / p.perDay) + " days"; updateCheck(); };
      inp.onchange = () => renderPlan();
      sl.appendChild(row);
    });
    updateCheck();
    S.saved = S.saved || {}; S.saved[S.siteId] = S.lo;
  }

  function updateCheck() {
    const site = SITES[S.siteId];
    const mass = Sim.massOf(S.lo, S.siteId);
    const pct = mass.total / C.massBudget * 100;
    $("#mass-num").textContent = `${fmt(mass.total)} / ${fmt(C.massBudget)} kg`;
    const bar = $("#mass-bar"); bar.style.width = Math.min(100, pct) + "%"; bar.classList.toggle("over", pct > 100);
    const f = Sim.forecast(S.siteId, S.lo);
    const wing = WING_KWH_1AU * site.solar(0);
    const gen = (S.lo.solar || 0) * wing + (S.lo.fission || 0) * 240;
    const rec = Sim.tierOf("recycler", S.lo);
    const load = C.baseLoad + (rec.r ? rec.kwh : 0) + (S.lo.electrolysis ? Math.max(0, NEED.o2 - (S.lo.moxie ? 2 : 0)) * C.electrolysisKwhPerKg : 0) + (S.lo.moxie ? 50 : 0) + (S.lo.iceminer ? 40 : 0) + (S.lo.greenhouse || 0) * 40;
    $("#power-sum").innerHTML = `<span>Power on a normal ${site.dayWord}</span><b>${fmt(gen)} kWh</b>
      <span>Power the base wants per ${site.dayWord}</span><b>${fmt(load)} kWh</b>
      <span>Battery storage</span><b>${fmt((S.lo.battery || 0) * 100)} kWh</b>
      <span>Cosmic-ray dose inside habitat</span><b style="color:${f.habRate > C.surfaceTarget ? "var(--bad)" : "var(--good)"}">${fmt(f.habRate, 2)} mSv/${site.dayWord}</b>`;
    drawReserve($("#fc-chart"), f.history, DAYS);
    const w = [];
    if (pct > 100) w.push(["bad", `Over the cargo limit by ${fmt(mass.total - C.massBudget)} kg. Remove something.`]);
    for (const k of ["o2", "water", "food"]) if (f.runsOut[k] !== null) w.push(["bad", `${{ o2: "Oxygen", water: "Water", food: "Food" }[k]} runs out on ${site.dayWord} ${f.runsOut[k]}.`]);
    if (f.emergDays) w.push(["bad", `Power emergency on ${f.emergDays} ${site.dayWord}s — batteries empty, habitat freezing.${site.id === "moonEq" ? " The 14.8-day lunar night needs a power source that works in the dark." : site.diurnal ? " Every sol has a night: you need batteries." : ""}`]);
    else if (f.shedDays) w.push(["mid", `Systems switched off for lack of power on ${f.shedDays} ${site.dayWord}s.`]);
    if (f.habRate > C.surfaceTarget) w.push(["mid", `Habitat dose ${fmt(f.habRate, 2)} mSv/${site.dayWord} is above NASA's 0.8 mSv/day surface design target. Add regolith shielding.`]);
    if (!S.lo.shelter) w.push(["mid", "No storm shelter: a solar particle event will hit the crew harder."]);
    if (site.id === "mars" && S.lo.solar && !S.lo.fission) w.push(["mid", "Solar-only Mars base: a dust storm will cut power to a third. Keep a margin."]);
    const ok = !w.some((x) => x[0] === "bad");
    if (ok) w.unshift(["ok", "Engineering check passed: the base survives 60 days with no surprises. Reality will add some…"]);
    $("#fc-warn").innerHTML = w.map(([c, t]) => `<li class="${c}">${t}</li>`).join("");
    $("#btn-launch").disabled = pct > 100;
  }

  $("#btn-auto").onclick = () => { S.lo = { ...PRESETS[S.siteId] }; renderPlan(); };
  $("#btn-launch").onclick = () => {
    const f = Sim.forecast(S.siteId, S.lo);
    const fails = Object.values(f.runsOut).some((x) => x !== null) || f.emergDays;
    if (fails && !confirm("Your engineering check shows the base will fail even without surprises. Launch anyway?")) return;
    S.m = Sim.newMission(S.siteId, S.lo, $("#seed").value.trim() || "ITM");
    S.focus = "maint";
    go("ops"); beginTurn();
  };

  /* ---------------- charts ---------------- */
  function drawReserve(svg, hist, days) {
    const W = 520, H = svg.viewBox.baseVal.height, L = 38, R = 10, T = 14, B = 26;
    const series = [["o2", "Oxygen", "var(--o2)"], ["water", "Water", "var(--water)"], ["food", "Food", "var(--food)"]];
    const vals = hist.map((h) => series.map(([k]) => h[k] / NEED[k]));
    const max = Math.max(30, ...vals.flat().map((v) => Math.min(v, 120)));
    const x = (d) => L + (d / days) * (W - L - R), y = (v) => T + (1 - Math.max(-5, Math.min(v, max)) / max) * (H - T - B);
    let s = "";
    for (let g = 0; g <= max; g += max > 60 ? 30 : 10) s += `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" stroke="#ffffff14"/><text x="${L - 6}" y="${y(g) + 4}" text-anchor="end" class="legend">${g}</text>`;
    s += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--bad)" stroke-dasharray="4 3"/>`;
    for (let d = 0; d <= days; d += 10) s += `<text x="${x(d)}" y="${H - 8}" text-anchor="middle" class="legend">${d}</text>`;
    series.forEach(([k, n, c], i) => {
      if (!hist.length) return;
      const pts = [[0, hist[0][k] / NEED[k]], ...hist.map((h) => [h.day, h[k] / NEED[k]])];
      s += `<polyline fill="none" stroke="${c}" stroke-width="2.4" points="${pts.map(([d, v]) => x(d) + "," + y(v)).join(" ")}"/>`;
      s += `<rect x="${L + 10 + i * 82}" y="${T - 4}" width="10" height="3" fill="${c}"/><text x="${L + 24 + i * 82}" y="${T}" class="legend">${n}</text>`;
    });
    s += `<text x="${W - R}" y="${T}" text-anchor="end" class="legend">days of reserve</text>`;
    svg.innerHTML = s;
  }

  /* ---------------- operations ---------------- */
  function beginTurn() {
    Sim.startTurn(S.m);
    S.focus = S.m.pendingSPE ? "shelter" : S.m.broken.recycler ? "maint" : (S.focus === "shelter" ? "maint" : S.focus);
    renderOps();
  }

  function renderOps() {
    const m = S.m, site = SITES[m.siteId];
    document.querySelectorAll(".dw").forEach((x) => x.textContent = site.dayWord);
    $("#ops-site").textContent = `${site.name} · ${site.body}`;
    $("#ops-day").textContent = `${site.dayWord[0].toUpperCase() + site.dayWord.slice(1)} ${m.day} of ${DAYS} · period ${m.turn + 1}/${C.turns}`;
    $("#scene").innerHTML = scene(m.siteId, m.lo, { k: "ops", night: site.night(m.day), storm: m.storm > 0, eva: S.focus === "eva", spe: m.pendingSPE, greenOff: !m.toggles.greenhouse });
    const g = [
      ["Oxygen", m.o2, "o2", "kg", "var(--o2)"], ["Water", m.water, "water", "kg", "var(--water)"], ["Food", m.food, "food", "kg", "var(--food)"]
    ].map(([l, v, k, u, c]) => { const days = v / NEED[k]; return `<div class="g ${days < 5 ? "low" : ""}"><div class="l">${l}</div><div class="v">${fmt(v)} ${u}</div><div class="s">${fmt(days)} days ${k === "food" ? "left" : k === "water" ? "if recycling stops" : "if O₂ production stops"}</div><div class="mini"><i style="width:${Math.min(100, days / 30 * 100)}%;background:${c}"></i></div></div>`; });
    const bp = m.batteryCap ? m.battery / m.batteryCap * 100 : 0;
    g.push(`<div class="g"><div class="l">Battery</div><div class="v">${m.batteryCap ? fmt(bp) + "%" : "none"}</div><div class="s">${fmt(m.battery)} / ${fmt(m.batteryCap)} kWh</div><div class="mini"><i style="width:${bp}%;background:var(--bat)"></i></div></div>`);
    const days = Math.max(1, m.day);
    g.push(`<div class="g ${m.dose > C.careerLimit * 0.5 ? "low" : ""}"><div class="l">Radiation / crew</div><div class="v">${fmt(m.dose, 1)} mSv</div><div class="s">${fmt(m.dose / C.careerLimit * 100, 1)}% of NASA career limit</div><div class="mini"><i style="width:${Math.min(100, m.dose / C.careerLimit * 100)}%;background:var(--dose)"></i></div></div>`);
    g.push(`<div class="g ${m.morale < 30 ? "low" : ""}"><div class="l">Morale · Science</div><div class="v">${fmt(m.morale)} · ${fmt(m.science)}</div><div class="s">${m.day ? fmt(m.gcrDose / days, 2) + " mSv/" + site.dayWord + " cosmic rays" : "ready"}</div><div class="mini"><i style="width:${m.morale}%;background:var(--acc)"></i></div></div>`);
    $("#gauges").innerHTML = g.join("");
    drawReserve($("#ops-chart"), m.history, DAYS);
    $("#brief").innerHTML = m.events.map((e) => `<li class="${e.t}">${e.msg}</li>`).join("");
    const keys = ["eva", "maint", "rest"].concat(m.pendingSPE ? ["shelter"] : []);
    $("#focus").innerHTML = keys.map((k) => `<button class="fbtn ${S.focus === k ? "on" : ""} ${k === "shelter" ? "hot" : ""}" data-f="${k}">${FOCI[k].icon} <b>${FOCI[k].name}</b><small>${FOCI[k].desc}${k === "shelter" && !m.lo.shelter ? " (no shelter module: −40% only)" : ""}${k === "eva" && m.outcrop ? " <b>×2 today!</b>" : ""}</small></button>`).join("");
    $("#focus").querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { S.focus = b.dataset.f; renderOps(); });
    const tg = [["recycler", Sim.tierOf("recycler", m.lo).r > 0, "Water recycler"], ["electrolysis", m.lo.electrolysis, "Oxygen generator"], ["moxie", m.lo.moxie, "MOXIE plant"], ["iceminer", m.lo.iceminer, "Ice miner"], ["greenhouse", m.lo.greenhouse, "Greenhouse"]].filter((t) => t[1]);
    $("#toggles").innerHTML = tg.length ? tg.map(([k, , n]) => `<button class="tg ${m.toggles[k] ? "on" : ""}" data-k="${k}">${n}${k === "recycler" && m.broken.recycler ? " ⚠ broken" : ""}</button>`).join("") : `<span class="hint">No switchable systems installed.</span>`;
    $("#toggles").querySelectorAll("[data-k]").forEach((b) => b.onclick = () => { m.toggles[b.dataset.k] = !m.toggles[b.dataset.k]; renderOps(); });
    $("#log").innerHTML = m.log.slice().reverse().map((l) => `<li><b>Period ${l.turn} · ${FOCI[l.focus].name}:</b> ${l.results.map((r) => r.msg).join(" ") || "Quiet days."}</li>`).join("");
  }

  $("#btn-turn").onclick = () => {
    Sim.runTurn(S.m, S.focus);
    if (S.m.status !== "active") return showEnd();
    beginTurn();
  };

  /* ---------------- debrief ---------------- */
  function showEnd() {
    const m = S.m, site = SITES[m.siteId], gr = Sim.grade(m);
    go("end");
    $("#grade").textContent = gr.letter; $("#grade").className = "grade " + gr.letter;
    $("#end-title").textContent = m.status === "complete" ? `Mission complete at ${site.name}!` : `Mission aborted on ${site.dayWord} ${m.day}`;
    $("#end-sub").textContent = m.status === "complete"
      ? `All 4 astronauts lift off safely after ${DAYS} ${site.dayWord}s. Score ${gr.score}.`
      : `The crew ran out of ${m.abortReason} and had to evacuate to the ascent vehicle. Every real mission plans reserves for exactly this reason.`;
    const days = Math.max(1, m.day);
    $("#end-stats").innerHTML = [
      ["Science points", fmt(m.science)], ["Final morale", fmt(m.morale)],
      ["Dose per crew member", fmt(m.dose, 1) + " mSv"], ["Habitat cosmic-ray rate", fmt(m.gcrDose / days, 2) + " mSv/" + site.dayWord],
      ["Worst solar storm", m.speDoses.length ? fmt(Math.max(...m.speDoses), 1) + " mSv" : "none"],
      ["Power emergency " + site.dayWord + "s", fmt(m.emergencyDays)], ["Reserves at the end", gr.reserve > 0 ? fmt(gr.reserve, 1) + " days" : "0"]
    ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("");
    drawReserve($("#end-chart"), m.history, DAYS);
    $("#lessons").innerHTML = lessons(m, gr).map((l) => `<div class="lesson"><b>${l.t}</b>${l.x}${l.s ? `<br><a href="${SOURCES[l.s].url}" target="_blank" rel="noopener">Source: ${SOURCES[l.s].title.split(",")[0].split(" — ")[0]}</a>` : ""}</div>`).join("");
  }

  function lessons(m, gr) {
    const site = SITES[m.siteId], L = [], lo = m.lo;
    if (m.status !== "complete") L.push({ t: `Why the ${m.abortReason} ran out`, x: m.abortReason === "oxygen" ? "Oxygen production needs power and water. When a storm or night cut the power, the oxygen generator was switched off first. Carry a reserve of a few days in tanks." : m.abortReason === "water" ? "Without a working recycler, 4 astronauts use ≈15 kg of water every day. The ISS recovers 98% of it — recycling is what makes long missions possible." : "Food cannot be recycled. Pack at least 1.8 kg per person per day plus a margin.", s: m.abortReason === "water" ? "issWater" : "bvad" });
    if (site.id === "moonEq") L.push({ t: "The lunar night decides everything", x: "For 14.8 days there is no sunlight. Batteries for one night would weigh ≈15 tonnes, which is why NASA is developing fission surface power.", s: "kilopower" });
    if (site.id === "moonPole") L.push({ t: "Why Artemis goes to the south pole", x: "Ridges near Shackleton Crater see the Sun most of the time and ice hides in the dark craters. One solar wing there makes ≈8× more power than on Mars.", s: "artemis" });
    if (site.id === "mars") L.push({ t: "Dust is Mars' power problem", x: "Mars gets 43% of Earth's sunlight, and dust storms can block most of the rest. NASA's Opportunity rover went silent during a 2018 global storm.", s: "oppy" });
    L.push({ t: "Radiation: your crew vs NASA limits", x: `Each astronaut received ${fmt(m.dose, 1)} mSv — ${fmt(m.dose / C.careerLimit * 100, 1)}% of NASA's 600 mSv career limit. ${gr.habRate > C.surfaceTarget ? "Your habitat was above the 0.8 mSv/day design target: more regolith would help." : "Your shielding kept the habitat under the 0.8 mSv/day design target."}${site.id === "mars" ? " Curiosity's RAD showed the trip to Mars (1.8 mSv/day) gives more dose than living on the surface." : ""}`, s: site.id === "mars" ? "rad" : "std3001" });
    const rec = Sim.tierOf("recycler", lo);
    L.push({ t: "Water recycling pays for itself", x: `An open-loop base would burn through ≈${fmt(NEED.water * DAYS)} kg of water in ${DAYS} days. ${rec.r ? `Your ${Math.round(rec.r * 100)}% recycler cut that to ≈${fmt(NEED.water * DAYS * (1 - rec.r))} kg (plus water split for oxygen).` : "You flew without a recycler — that water had to come from Earth."}`, s: "issWater" });
    if (lo.moxie) L.push({ t: "Living off the land", x: "Your MOXIE-class plant made oxygen from Martian air. The real MOXIE made 122 g on Perseverance, peaking at 12 g per hour — proof the idea works.", s: "moxie" });
    if (lo.greenhouse) L.push({ t: "Plants are for people, too", x: "In 60 days a greenhouse saves less food mass than it weighs, but it lifted morale. On a 2-year Mars mission the balance flips.", s: "veggie" });
    else L.push({ t: "No greenhouse this time", x: "Packaged food is lighter for short missions, but crews on long missions benefit from fresh food and the calm of tending plants.", s: "veggie" });
    return L.slice(0, 6);
  }

  /* ---------------- library ---------------- */
  $("#lib").innerHTML = Object.values(SOURCES).map((s) => `<div class="src"><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a><p>${s.note}</p></div>`).join("") +
    `<div class="src"><b>Game estimates</b><p>Cargo budget 8,000 kg; habitat base load 5 kW; electrolysis 6 kWh/kg O₂; MOXIE-class plant 2 kg O₂/sol for 50 kWh; regolith shielding −30% / −50%; Mars average solar factor 0.108 (43% sunlight × night, sun angle and dust); dust storm −65% power; storm shelter −80% solar-particle dose; Mars solar-particle event 10 mSv, Moon 100 mSv. They are simplified to keep the game playable and are not engineering values.</p></div>`;

  renderSites();
})();
