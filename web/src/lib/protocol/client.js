(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("protocol-data").textContent);
  var C = D.content;

  var LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
  var YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
  var WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAY_MS = 86400000;

  // ---------- dates ----------
  function d(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(dt) { return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); }
  function fmt(dt, withDay) {
    if (typeof dt === "string") dt = d(dt);
    return dt.toLocaleDateString(undefined, withDay ? { weekday: "long", year: "numeric", month: "long", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" });
  }
  function days(a, b) { return Math.round((b - a) / DAY_MS); }
  function span(n) {
    if (n < 60) return n + (n === 1 ? " day" : " days");
    if (n < 730) return Math.round(n / 30.44) + " months";
    return (n / 365.25).toFixed(1) + " years";
  }
  var now = new Date(); now.setHours(0, 0, 0, 0);
  var todayIso = iso(now);

  // ---------- dom helpers ----------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "cls") e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function $(id) { return document.getElementById(id); }
  function list(items, ordered, cls) {
    return el(ordered ? "ol" : "ul", cls ? { cls: cls } : null, (items || []).map(function (t) { return el("li", { text: t }); }));
  }

  // ---------- dasha arithmetic ----------
  function subs(lord, start, end) {
    var i = LORDS.indexOf(lord), order = LORDS.slice(i).concat(LORDS.slice(0, i));
    var total = end - start, c = start.getTime(), out = [];
    order.forEach(function (L) {
      var e = c + total * YEARS[L] / 120;
      out.push({ lord: L, start: new Date(c), end: new Date(e) });
      c = e;
    });
    return out;
  }
  function within(p) { return d(p.start) <= now && now < d(p.end); }
  var md = D.mahadashas.filter(within)[0] || null;
  var ad = md ? md.antardashas.filter(within)[0] || null : null;
  var pd = null;
  if (ad) {
    subs(ad.lord, d(ad.start), d(ad.end)).forEach(function (p) { if (p.start <= now && now < p.end) pd = p; });
  }
  var season = D.seasons.filter(within)[0] || null;

  // ---------- saturn ----------
  var spans = D.saturnSpans;
  function spanNow(type) { return spans.filter(function (s) { return s.type === type && d(s.start) <= now && (!s.end || now < d(s.end)); })[0] || null; }
  // merge sade sati pieces separated by short retrograde gaps (under a year)
  function merged(type) {
    var out = [];
    spans.filter(function (s) { return s.type === type; }).forEach(function (s) {
      var last = out[out.length - 1];
      if (last && last.end && days(d(last.end), d(s.start)) < 365) last.end = s.end;
      else out.push({ type: s.type, start: s.start, end: s.end });
    });
    return out;
  }
  var sadeRuns = merged("sade_sati");
  function sadeStatus() {
    var cur = sadeRuns.filter(function (s) { return d(s.start) <= now && (!s.end || now < d(s.end)); })[0];
    if (cur) {
      var live = spanNow("sade_sati");
      return { running: true, text: "Sade sati is running", sub: live ? "Ends " + fmt(cur.end) + ", in " + span(days(now, d(cur.end))) : "Saturn has stepped back out briefly; the run resumes and ends " + fmt(cur.end), pct: (now - d(cur.start)) / (d(cur.end) - d(cur.start)) };
    }
    var nx = sadeRuns.filter(function (s) { return d(s.start) > now; })[0];
    return nx ? { running: false, text: "No sade sati now", sub: "Next begins " + fmt(nx.start) + ", in " + span(days(now, d(nx.start))) } : { running: false, text: "No sade sati in range", sub: "" };
  }

  // ---------- storage: window.storage, then localStorage, then memory ----------
  var mem = {};
  var store = {
    kind: "memory",
    get: function (k) {
      try { if (window.storage && window.storage.get) return Promise.resolve(window.storage.get(k)).then(function (v) { return v && v.value !== undefined ? v.value : v; }); } catch {}
      try { var v = localStorage.getItem(k); return Promise.resolve(v); } catch {}
      return Promise.resolve(mem[k] || null);
    },
    set: function (k, v) {
      try { if (window.storage && window.storage.set) return Promise.resolve(window.storage.set(k, v)); } catch {}
      try { localStorage.setItem(k, v); return Promise.resolve(); } catch {}
      mem[k] = v; return Promise.resolve();
    },
  };
  try { if (window.storage && window.storage.get) store.kind = "window.storage"; else { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); store.kind = "localStorage"; } } catch { store.kind = "memory"; }
  var LEDGER_KEY = "jyotish-ledger-" + D.id;

  // ---------- render: masthead ----------
  $("mast-date").textContent = fmt(now, true);

  // ---------- render: today ----------
  var dayIndex = now.getDay();
  function dayBrief(i) { return C.days.filter(function (x) { return x.weekday === WEEK[i]; })[0] || C.days[i]; }

  function renderDay(container, i, big) {
    var b = dayBrief(i);
    container.innerHTML = "";
    container.appendChild(el(big ? "h1" : "h3", { cls: big ? "dayname display" : "display", text: WEEK[i] }));
    container.appendChild(el("p", { cls: "dayplanet", text: b.planet + "’s day · " + b.theme }));
    container.appendChild(el("p", { cls: "condition", text: b.condition }));
    container.appendChild(el("ol", { cls: "instr" }, b.instructions.map(function (x) {
      return el("li", null, [
        el("div", { cls: "act", text: x.action }),
        el("div", { cls: "why" }, [
          el("div", null, [el("b", { text: "As remedy" }), x.asRemedy]),
          el("div", null, [el("b", { text: "As plain practice" }), x.asHygiene]),
        ]),
      ]);
    })));
    container.appendChild(el("div", { cls: "avoid" }, [el("b", { text: "Avoid today" }), b.avoid]));
  }
  renderDay($("today-day"), dayIndex, true);

  function periodRow(k, v, s, pct) {
    return el("div", { cls: "period" }, [
      el("div", { cls: "k", text: k }),
      el("div", null, [el("div", { cls: "v", text: v }), el("div", { cls: "s", text: s }),
        pct != null ? el("div", { cls: "bar", "aria-hidden": "true" }, [el("i", { style: "width:" + Math.max(2, Math.min(100, pct * 100)).toFixed(1) + "%" })]) : null]),
    ]);
  }
  var P = $("periods");
  if (md) P.appendChild(periodRow("Mahadasha", md.lord, "Until " + fmt(md.end) + " · " + span(days(now, d(md.end))) + " left", (now - d(md.start)) / (d(md.end) - d(md.start))));
  if (ad) P.appendChild(periodRow("Antardasha", ad.lord, "Until " + fmt(ad.end) + " · " + span(days(now, d(ad.end))) + " left", (now - d(ad.start)) / (d(ad.end) - d(ad.start))));
  if (pd) P.appendChild(periodRow("Pratyantara", pd.lord, "Until " + fmt(pd.end) + " · " + span(days(now, pd.end)) + " left", (now - pd.start) / (pd.end - pd.start)));
  var ss = sadeStatus();
  P.appendChild(periodRow("Saturn", ss.text, ss.sub, ss.running ? ss.pct : null));
  var other = spanNow("ashtama") ? "Ashtama Shani (Saturn 8th from the Moon) is running." : spanNow("kantaka") ? "Kantaka Shani (Saturn in an angle from the Moon) is running." : "";
  if (other) P.appendChild(el("p", { cls: "s muted", text: other }));
  if (season) {
    P.appendChild(el("div", { cls: "season-box" }, [
      el("div", { cls: "eyebrow", text: "Season of the decade" }),
      el("h3", { cls: "display", text: season.label }),
      el("p", { text: season.summary }),
      el("div", { cls: "s muted", text: fmt(season.start) + " to " + fmt(season.end) }),
    ]));
  }

  // ---------- render: ledger ----------
  var marks = C.ledger;
  var ul = $("marks");
  var history = {};
  function dayFrac(key) { var r = history[key] || {}; var n = 0; marks.forEach(function (m) { if (r[m.id]) n++; }); return n / marks.length; }
  function renderHistory() {
    var h = $("history"); h.innerHTML = "";
    for (var k = 13; k >= 0; k--) {
      var dt = new Date(now.getTime() - k * DAY_MS), key = iso(dt), f = dayFrac(key);
      var cell = el("div", { title: fmt(dt) + ": " + Math.round(f * marks.length) + " of " + marks.length, cls: k === 0 ? "t" : "" }, [el("span", { style: "--f:" + (f * 100) + "%" })]);
      h.appendChild(cell);
    }
  }
  function save() { store.set(LEDGER_KEY, JSON.stringify(history)); renderHistory(); }
  marks.forEach(function (m) {
    var input = el("input", { type: "checkbox", id: "m-" + m.id });
    input.addEventListener("change", function () {
      history[todayIso] = history[todayIso] || {};
      history[todayIso][m.id] = input.checked;
      save();
    });
    ul.appendChild(el("li", null, [el("label", { "for": "m-" + m.id }, [input, el("span", null, [m.label, el("span", { cls: "why", text: m.why })])])]));
  });
  store.get(LEDGER_KEY).then(function (raw) {
    try { history = raw ? JSON.parse(raw) : {}; } catch { history = {}; }
    var t = history[todayIso] || {};
    marks.forEach(function (m) { $("m-" + m.id).checked = !!t[m.id]; });
    renderHistory();
  });
  $("store-note").textContent = store.kind === "memory"
    ? "Storage is unavailable here, so marks last only while this page is open."
    : "Marks are kept in this browser (" + store.kind + ").";

  // ---------- render: week ----------
  var week = $("week"), view = $("dayview");
  WEEK.forEach(function (name, i) {
    var b = dayBrief(i);
    var btn = el("button", { type: "button", "aria-pressed": i === dayIndex ? "true" : "false", cls: i === dayIndex ? "is-today" : "" }, [
      el("span", { cls: "wd", text: name }), el("span", { cls: "wp", text: b.planet }), el("span", { cls: "wt", text: b.theme }),
    ]);
    btn.addEventListener("click", function () {
      Array.prototype.forEach.call(week.children, function (c) { c.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");
      renderDay(view, i, false);
    });
    week.appendChild(btn);
  });
  renderDay(view, dayIndex, false);

  // ---------- render: decade map ----------
  (function () {
    var S = D.seasons; if (!S.length) return;
    var t0 = d(S[0].start), t1 = d(S[S.length - 1].end);
    var W = 1000, X0 = 10, X1 = W - 10, top = 64, h = 46;
    function x(t) { return X0 + (X1 - X0) * (t - t0) / (t1 - t0); }
    var ns = "http://www.w3.org/2000/svg";
    function s(tag, a, txt) { var e = document.createElementNS(ns, tag); for (var k in a) e.setAttribute(k, a[k]); if (txt) e.textContent = txt; return e; }
    var svg = s("svg", { viewBox: "0 0 " + W + " 210", role: "img", "aria-label": "Decade map of dasha seasons with today's position" });
    // year ticks
    for (var y = t0.getFullYear() + 1; y <= t1.getFullYear(); y++) {
      var tx = x(new Date(y, 0, 1));
      svg.appendChild(s("line", { x1: tx, x2: tx, y1: top + h + 4, y2: top + h + 10, stroke: "currentColor", "stroke-opacity": ".4" }));
      svg.appendChild(s("text", { x: tx, y: top + h + 24, "text-anchor": "middle", "class": "sub" }, String(y)));
    }
    S.forEach(function (p) {
      var a = x(d(p.start)), b = x(d(p.end));
      var g = s("g", {});
      g.appendChild(s("rect", { x: a, y: top, width: Math.max(1, b - a), height: h, "class": "seg " + (p.pressure || "light") }));
      if (b - a > 54) {
        g.appendChild(s("text", { x: a + 6, y: top - 22, "class": "lbl" }, p.ad));
        g.appendChild(s("text", { x: a + 6, y: top - 8, "class": "sub" }, p.label.length > Math.floor((b - a) / 6.2) ? p.label.slice(0, Math.floor((b - a) / 6.2) - 1) + "…" : p.label));
      }
      g.appendChild(s("title", {}, p.md + "–" + p.ad + ": " + p.label + " (" + fmt(p.start) + " to " + fmt(p.end) + ")"));
      svg.appendChild(g);
    });
    // sade sati bands
    sadeRuns.forEach(function (r) {
      var a = Math.max(X0, x(d(r.start))), b = Math.min(X1, x(r.end ? d(r.end) : t1));
      if (b <= X0 || a >= X1) return;
      svg.appendChild(s("rect", { x: a, y: top + h + 34, width: b - a, height: 12, "class": "ss" }));
      svg.appendChild(s("text", { x: a + 4, y: top + h + 60, "class": "sub" }, "sade sati"));
    });
    // standing prohibition
    var pr = C.prohibition;
    if (pr && pr.present && pr.start && pr.end) {
      var a2 = Math.max(X0, x(d(pr.start))), b2 = Math.min(X1, x(d(pr.end)));
      if (b2 > a2) {
        svg.appendChild(s("rect", { x: a2, y: top - 4, width: b2 - a2, height: h + 8, "class": "pro" }));
      }
    }
    // needle
    if (now >= t0 && now <= t1) {
      var nx = x(now);
      svg.appendChild(s("line", { x1: nx, x2: nx, y1: top - 36, y2: top + h + 8, "class": "needle" }));
      svg.appendChild(s("circle", { cx: nx, cy: top - 38, r: 4, fill: "currentColor" }));
      svg.appendChild(s("text", { x: nx + 8, y: top - 34, "class": "lbl" }, "today"));
    }
    $("map").appendChild(svg);

    var grid = $("seasons");
    S.forEach(function (p) {
      grid.appendChild(el("article", { cls: within(p) ? "now" : "" }, [
        el("div", { cls: "dates", text: fmt(p.start) + " to " + fmt(p.end) + (within(p) ? " · now" : "") }),
        el("h3", { cls: "display", text: p.label }),
        el("div", { cls: "eyebrow", text: p.md + " / " + p.ad + " · " + p.pressure }),
        el("p", { text: p.summary }),
      ]));
    });
    if (pr && pr.present) {
      $("prohibition").appendChild(el("div", { cls: "prohibition" }, [
        el("div", { cls: "eyebrow", text: "Standing prohibition" + (pr.start ? " · " + fmt(pr.start) + " to " + fmt(pr.end) : "") }),
        el("h3", { cls: "display", text: pr.text }),
        el("p", { cls: "muted", text: pr.reason }),
      ]));
    }
  })();

  // ---------- render: counsel ----------
  var K = C.counsel, co = $("counsel");
  function block(title, node, cls) { return el("div", cls ? { cls: cls } : null, [el("h3", { text: title }), node]); }
  co.appendChild(el("p", { cls: "lead", text: K.principalPressure }));
  co.appendChild(block("Priorities, in order", list(K.priorities, true)));
  co.appendChild(block("Decision rules", list(K.decisionRules, false, "rules"), "wide"));
  co.appendChild(block("Comes naturally", list(K.naturalCapabilities)));
  co.appendChild(block("Must be trained against temperament", list(K.trainedCapabilities)));
  co.appendChild(block("Scriptural study", list(K.scripturalStudies)));
  co.appendChild(block("Embodied study", list(K.embodiedStudies)));
  co.appendChild(block("Warnings", list(K.warnings)));
  co.appendChild(block("Genuine advantages", list(K.advantages)));
  co.appendChild(block("Shifts in perception", list(K.perceptionShifts), "wide"));

  // ---------- render: remedies ----------
  var rm = $("remedies");
  C.remedies.forEach(function (r) {
    rm.appendChild(el("article", null, [
      el("h3", { cls: "display" }, [el("span", { text: r.planet }), " · " + r.practice]),
      el("p", { text: r.whatItDoes }),
      el("p", { cls: "c", text: r.caution }),
    ]));
  });
  $("gem").textContent = C.gemstoneNote;

  // ---------- render: reference ----------
  var pt = $("planet-table");
  D.planets.forEach(function (p) {
    pt.appendChild(el("tr", null, [p.name, p.sign + " " + p.deg, "H" + p.house, p.nakshatra + " " + p.pada, [p.dignity, p.vargottama ? "vargottama" : null, p.retrograde ? "retrograde" : null].filter(Boolean).join(", ")].map(function (t) { return el("td", { text: String(t) }); })));
  });
  var cal = $("calendar");
  D.mahadashas.forEach(function (m) {
    cal.appendChild(el("tr", { cls: within(m) ? "now" : "" }, [el("td", { text: m.lord }), el("td", { text: "" }), el("td", { text: fmt(m.start) }), el("td", { text: fmt(m.end) })]));
    if (d(m.end) > now && d(m.start) < new Date(now.getFullYear() + 25, 0, 1)) {
      m.antardashas.forEach(function (a) {
        cal.appendChild(el("tr", { cls: within(a) ? "now" : "" }, [el("td", { text: "" }), el("td", { text: m.lord + " / " + a.lord }), el("td", { text: fmt(a.start) }), el("td", { text: fmt(a.end) })]));
      });
    }
  });
  function gl(id, rows) { var dl = $(id); rows.forEach(function (r) { dl.appendChild(el("dt", { text: r[0] })); dl.appendChild(el("dd", { text: r[1] })); }); }
  gl("gl-houses", C.glossary.houses.map(function (h) { return ["House " + h.house, h.holds + " " + h.yours]; }));
  gl("gl-planets", C.glossary.planets.map(function (p) { return [p.name, p.character + " " + p.portfolio]; }));
  gl("gl-terms", C.glossary.terms.map(function (t) { return [t.term, t.definition]; }));
})();
