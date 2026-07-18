/* Provenfolio Studio GUI — vanilla JS, no framework, no CDN.
 * All user data is inserted via textContent / el() (never innerHTML with
 * interpolated strings) — XSS hygiene even though this is localhost-only.
 * UI strings come from STUDIO_I18N (i18n.js, loaded first); the locale is
 * derived from profile.sourceLang, defaulting to English before load. */
"use strict";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  data: null, // { profile, manifest, projects, intakes }
  theme: null, // { activeTheme, visitorThemes, installed }
  selectedId: null,
  view: null, // null (project view) | "design" | "engine" | "profile"
  tab: "overview",
};

const MISSING_KEYS = {
  role: "missingRole",
  "demo-link": "missingDemoLink",
  visual: "missingVisual",
  "case-study": "missingCaseStudy",
  results: "missingResults",
  highlights: "missingHighlights",
  timeline: "missingTimeline",
};

function missingLabel(key) {
  if (key.startsWith("translation:")) {
    return t("missingTranslation", { lang: key.slice("translation:".length) });
  }
  return MISSING_KEYS[key] ? t(MISSING_KEYS[key]) : key;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an element. attrs: {class, value, type, ...on*: fn}. children: nodes/strings. */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2), v);
    } else if (k === "class") {
      node.className = v;
    } else if (k === "value") {
      node.value = v;
    } else if (k === "checked" || k === "selected" || k === "disabled" || k === "hidden") {
      node[k] = !!v;
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

let toastTimer = null;
function toast(message, isError = false) {
  const box = document.getElementById("toast");
  box.textContent = message;
  box.className = isError ? "error" : "";
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (box.hidden = true), isError ? 8000 : 2500);
}

async function api(path, options = {}) {
  const opts = { ...options };
  if (opts.json !== undefined) {
    opts.body = JSON.stringify(opts.json);
    opts.headers = { "content-type": "application/json", ...(opts.headers || {}) };
    delete opts.json;
  }
  const res = await fetch(path, opts);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: text }; }
  if (!res.ok) {
    throw new Error((body && body.error) || res.status + " " + res.statusText);
  }
  return body;
}

/** Swap the static English defaults in index.html to the active locale. */
function hydrateStaticText() {
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.getAttribute("data-i18n"));
  }
  document.documentElement.lang = studioLang;
}

async function refreshState() {
  state.data = await api("/api/state");
  setStudioLang(state.data.profile.sourceLang);
  hydrateStaticText();
  // Site-design config is best-effort: a failure here must not break the
  // rest of the cockpit, it just hides the design panel's data.
  try { state.theme = await api("/api/theme"); } catch { state.theme = null; }
  render();
}

/** Refresh data + sidebar WITHOUT rebuilding the main panel. Used by
 * background events (an analysis finishing) so an open editor's unsaved
 * working copy is never wiped mid-edit; the main panel updates on the
 * user's next navigation instead. */
async function refreshSidebarOnly() {
  state.data = await api("/api/state");
  setStudioLang(state.data.profile.sourceLang);
  hydrateStaticText();
  renderSidebar();
}

function currentProject() {
  return (state.data.projects || []).find((p) => p.id === state.selectedId) || null;
}
function currentIntake() {
  return (state.data.intakes || []).find((i) => i.id === state.selectedId) || null;
}
function locales() {
  const prof = state.data.profile;
  return [prof.sourceLang, ...(prof.targetLangs || [])];
}
function meterColor(score) {
  return score < 50 ? "var(--error, #e5636e)" : score < 80 ? "var(--warn)" : "var(--ok)";
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------
function selectProject(id) {
  location.hash = "#/project/" + encodeURIComponent(id);
}

/** Registered by editor panels holding an unsaved working copy:
 * { hash, isDirty } — navigation away asks for confirmation while dirty. */
let unsavedGuard = null;
let restoringHash = false;

window.addEventListener("beforeunload", (e) => {
  if (unsavedGuard && unsavedGuard.isDirty()) e.preventDefault();
});

function applyHash() {
  if (restoringHash) { restoringHash = false; return; }
  if (unsavedGuard && location.hash !== unsavedGuard.hash && unsavedGuard.isDirty()) {
    if (!confirm(t("unsavedLeaveConfirm"))) {
      // Put the hash back without re-rendering (a rebuild would wipe the edits).
      restoringHash = true;
      location.hash = unsavedGuard.hash;
      return;
    }
  }
  unsavedGuard = null;
  if (["#/design", "#/engine", "#/profile"].includes(location.hash)) {
    state.view = location.hash.slice(2);
    state.selectedId = null;
    render();
    return;
  }
  const m = location.hash.match(/^#\/project\/([^/]+)$/);
  state.view = null;
  state.selectedId = m ? decodeURIComponent(m[1]) : null;
  state.tab = "overview";
  render();
}
window.addEventListener("hashchange", applyHash);

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function renderSidebar() {
  const { profile, projects, intakes } = state.data;
  document.getElementById("owner-name").textContent = profile.name + " — Studio";

  const projectList = document.getElementById("project-list");
  projectList.replaceChildren();
  for (const p of projects) {
    const score = p.completeness ? p.completeness.score : 0;
    const li = el("li", {
      class: p.id === state.selectedId ? "selected" : "",
      onclick: () => selectProject(p.id),
    }, [
      el("div", { class: "item-name" }, [
        p.featured ? el("span", { class: "star", title: "featured" }, "★") : null,
        el("span", {}, p.name),
      ]),
      el("div", { class: "meter" }, [
        el("span", { style: `width:${score}%;background:${meterColor(score)}` }),
      ]),
      el("div", { class: "meter-score" }, t("completenessScore", { score })),
    ]);
    projectList.append(li);
  }
  if (projects.length === 0) {
    projectList.append(el("div", { class: "empty-hint" }, t("noProjects")));
  }

  const projectIds = new Set(projects.map((p) => p.id));
  const pending = intakes.filter((i) => !projectIds.has(i.id) && !projectIds.has(i.projectId));
  const intakeList = document.getElementById("intake-list");
  intakeList.replaceChildren();
  for (const i of pending) {
    const li = el("li", {
      class: i.id === state.selectedId ? "selected" : "",
      onclick: () => selectProject(i.id),
    }, [
      el("div", { class: "item-name" }, [
        el("span", { class: "pending" }, "⏳"),
        el("span", {}, i.displayName || i.id),
      ]),
    ]);
    intakeList.append(li);
  }
  if (pending.length === 0) {
    intakeList.append(el("div", { class: "empty-hint" }, t("noPendingIntakes")));
  }
}

// ---------------------------------------------------------------------------
// Main panel + tabs
// ---------------------------------------------------------------------------
function render() {
  if (!state.data) return;
  renderSidebar();

  const empty = document.getElementById("main-empty");
  const content = document.getElementById("main-content");

  const panels = {
    design: [designPanel, "designTitle"],
    engine: [enginePanel, "engineTitle"],
    profile: [profilePanel, "profileTitle"],
  };
  if (state.view && panels[state.view]) {
    empty.hidden = true;
    content.hidden = false;
    const [buildPanel, titleKey] = panels[state.view];
    document.getElementById("main-title").textContent = t(titleKey);
    document.getElementById("tabs").replaceChildren();
    document.getElementById("tab-body").replaceChildren(buildPanel());
    return;
  }

  const project = state.selectedId ? currentProject() : null;
  const intake = state.selectedId ? currentIntake() : null;

  if (!project && !intake) {
    empty.hidden = false;
    content.hidden = true;
    return;
  }
  empty.hidden = true;
  content.hidden = false;

  document.getElementById("main-title").textContent =
    project ? project.name : (intake.displayName || intake.id) + t("awaitingAnalysisSuffix");

  const tabs = project
    ? [["overview", t("tabOverview")], ["intake", t("tabIntake")], ["prose", t("tabProse")], ["media", t("tabMedia")]]
    : [["intake", t("tabIntake")]];
  if (!tabs.some(([id]) => id === state.tab)) state.tab = tabs[0][0];

  const nav = document.getElementById("tabs");
  nav.replaceChildren(
    ...tabs.map(([id, label]) =>
      el("button", {
        class: id === state.tab ? "active" : "",
        onclick: () => { state.tab = id; render(); },
      }, label)
    )
  );

  const body = document.getElementById("tab-body");
  body.replaceChildren();
  if (state.tab === "overview") body.append(overviewTab(project));
  else if (state.tab === "intake") body.append(intakeTab(intake, project));
  else if (state.tab === "prose") body.append(proseTab(project));
  else if (state.tab === "media") body.append(mediaTab(project));
}

// ---------------- Overview ----------------
function overviewTab(project) {
  const frag = document.createDocumentFragment();
  const comp = project.completeness || { score: 0, missing: [] };

  frag.append(el("div", { class: "card" }, [
    el("h3", {}, t("completeness")),
    el("div", { class: "big-score", style: `color:${meterColor(comp.score)}` }, String(comp.score)),
    el("div", { class: "meter big-meter" }, [
      el("span", { style: `width:${comp.score}%;background:${meterColor(comp.score)}` }),
    ]),
    comp.missing.length === 0
      ? el("p", { class: "all-done" }, t("allItemsDone"))
      : el("ul", { class: "missing-list" }, comp.missing.map((k) => el("li", {}, missingLabel(k)))),
  ]));

  const featured = el("input", { type: "checkbox", checked: project.featured });
  const placement = el("select", {}, ["products", "lab", "archive"].map((v) =>
    el("option", { value: v, selected: project.placement === v }, v)));
  const order = el("input", { type: "number", step: "1", value: String(project.order ?? 0) });
  const status = el("select", {}, ["active", "maintained", "archived"].map((v) =>
    el("option", { value: v, selected: project.status === v }, v)));

  frag.append(el("div", { class: "card" }, [
    el("h3", {}, t("listingSettings")),
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [
        el("label", {}, t("fieldFeatured")),
        el("label", { style: "display:flex;gap:8px;align-items:center;color:var(--text)" }, [
          featured, el("span", {}, t("featureThis")),
        ]),
      ]),
      el("div", { class: "field" }, [el("label", {}, t("fieldPlacement")), placement]),
      el("div", { class: "field" }, [el("label", {}, t("fieldOrder")), order]),
      el("div", { class: "field" }, [el("label", {}, t("fieldStatus")), status]),
    ]),
    el("button", { class: "accent", onclick: async () => {
      try {
        await api(`/api/project/${encodeURIComponent(project.id)}/meta`, {
          method: "PUT",
          json: {
            featured: featured.checked,
            placement: placement.value,
            order: parseInt(order.value, 10) || 0,
            status: status.value,
          },
        });
        toast(t("listingSettingsSaved"));
        await refreshState();
      } catch (e) { toast(t("saveFailed", { message: e.message }), true); }
    } }, t("save")),
  ]));

  return frag;
}

// ---------------- Intake ----------------
function intakeTab(intake, project) {
  const frag = document.createDocumentFragment();
  if (!intake) {
    frag.append(el("div", { class: "card" }, [
      el("h3", {}, t("tabIntake")),
      el("p", { style: "color:var(--text-dim)" }, t("noIntakeFile")),
    ]));
    return frag;
  }

  // Working copy — mutated by inputs, saved on demand.
  const doc = JSON.parse(JSON.stringify(intake));
  doc.outcomes = doc.outcomes || [];
  doc.links = doc.links || [];
  doc.testimonials = doc.testimonials || [];
  doc.interview = doc.interview || [];
  const sl = state.data.profile.sourceLang;

  const container = el("div");

  const textField = (label, key, opts = {}) => {
    const input = el(opts.multiline ? "textarea" : "input", {
      value: doc[key] ?? "",
      oninput: (e) => {
        const v = e.target.value;
        if (v === "" && !opts.keepEmpty) delete doc[key];
        else doc[key] = v;
      },
    });
    return el("div", { class: "field" }, [el("label", {}, label), input]);
  };

  const selectField = (label, key, options, { allowEmpty = false } = {}) => {
    const sel = el("select", {
      onchange: (e) => {
        if (e.target.value === "") delete doc[key];
        else doc[key] = e.target.value;
      },
    }, [
      allowEmpty ? el("option", { value: "", selected: !doc[key] }, t("notSet")) : null,
      ...options.map((v) => el("option", { value: v, selected: doc[key] === v }, v)),
    ]);
    return el("div", { class: "field" }, [el("label", {}, label), sel]);
  };

  // --- basics ---
  const basics = el("div", { class: "card" }, [
    el("h3", {}, t("basicInfo")),
    el("div", { class: "field" }, [
      el("label", {}, "ID"),
      el("input", { value: intake.id, disabled: true }),
    ]),
    textField(t("fieldDisplayName"), "displayName"),
    textField(t("fieldRepoUrl"), "repoUrl"),
    el("div", { class: "field-row" }, [
      selectField(t("fieldSourceType"), "sourceType", ["github", "manual", "local"]),
      selectField(t("fieldState"), "state", ["pending", "analyzed"]),
      selectField(t("fieldCategory"), "category",
        ["product", "service", "client", "oss", "hobby", "learning"], { allowEmpty: true }),
      selectField(t("fieldIntakeStatus"), "status",
        ["active", "maintained", "archived"], { allowEmpty: true }),
    ]),
  ]);

  // --- role ---
  const roleType = el("select", {
    onchange: (e) => {
      if (e.target.value === "") { delete doc.role; }
      else {
        doc.role = doc.role || {};
        doc.role.type = e.target.value;
      }
      roleScope.disabled = e.target.value === "";
    },
  }, [
    el("option", { value: "", selected: !doc.role }, t("notSet")),
    ...["solo", "lead", "contributor"].map((v) =>
      el("option", { value: v, selected: doc.role && doc.role.type === v }, v)),
  ]);
  const roleScope = el("input", {
    value: (doc.role && doc.role.scope) || "",
    disabled: !doc.role,
    oninput: (e) => {
      if (!doc.role) return;
      if (e.target.value === "") delete doc.role.scope;
      else doc.role.scope = e.target.value;
    },
  });
  const roleCard = el("div", { class: "card" }, [
    el("h3", {}, t("roleHeading")),
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [el("label", {}, t("roleType")), roleType]),
      el("div", { class: "field" }, [el("label", {}, t("roleScope")), roleScope]),
    ]),
  ]);

  // --- narrative ---
  const narrative = el("div", { class: "card" }, [
    el("h3", {}, t("description")),
    textField(t("fieldWhatIsIt"), "whatIsIt", { multiline: true }),
    textField(t("fieldMotivation"), "motivation", { multiline: true }),
    textField(t("fieldTargetAudience"), "targetAudience"),
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [
        el("label", {}, t("fieldTeamSize")),
        el("input", {
          type: "number", min: "1", step: "1", value: doc.teamSize ?? "",
          oninput: (e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isFinite(n) && n > 0) doc.teamSize = n;
            else delete doc.teamSize;
          },
        }),
      ]),
      selectField(t("fieldVisibilityOverride"), "visibilityOverride",
        ["public", "private"], { allowEmpty: true }),
    ]),
    textField(t("fieldNotes"), "notes", { multiline: true }),
  ]);

  // --- dynamic rows: outcomes ---
  const outcomesBox = el("div");
  const renderOutcomes = () => {
    outcomesBox.replaceChildren(
      ...doc.outcomes.map((o, i) =>
        el("div", { class: "dyn-row" }, [
          el("input", { placeholder: t("outcomeLabelPlaceholder"), value: o.label || "",
            oninput: (e) => (o.label = e.target.value) }),
          el("input", { placeholder: t("outcomeValuePlaceholder"), value: o.value || "",
            oninput: (e) => (o.value = e.target.value) }),
          el("input", { placeholder: t("outcomeSourcePlaceholder"), value: o.source || "",
            oninput: (e) => { if (e.target.value === "") delete o.source; else o.source = e.target.value; } }),
          el("button", { class: "small danger", onclick: () => { doc.outcomes.splice(i, 1); renderOutcomes(); } }, t("delete")),
        ])
      ),
      el("button", { class: "small", onclick: () => { doc.outcomes.push({ label: "", value: "" }); renderOutcomes(); } }, t("addOutcome"))
    );
  };
  renderOutcomes();
  const outcomesCard = el("div", { class: "card" }, [
    el("h3", {}, t("outcomesHeading")),
    el("p", { style: "color:var(--text-dim);font-size:12px;margin-top:0" }, t("outcomesNote")),
    outcomesBox,
  ]);

  // --- dynamic rows: links ---
  const linksBox = el("div");
  const renderLinks = () => {
    linksBox.replaceChildren(
      ...doc.links.map((l, i) => {
        l.label = l.label || {};
        return el("div", { class: "dyn-row" }, [
          el("input", { placeholder: t("linkLabelPlaceholder", { lang: sl }), value: l.label[sl] || "",
            oninput: (e) => (l.label[sl] = e.target.value) }),
          el("input", { placeholder: "https://...", value: l.url || "",
            oninput: (e) => (l.url = e.target.value) }),
          el("select", { onchange: (e) => (l.kind = e.target.value) },
            ["demo", "store", "video", "docs", "repo", "article", "other"].map((k) =>
              el("option", { value: k, selected: (l.kind || "other") === k }, k))),
          el("button", { class: "small danger", onclick: () => { doc.links.splice(i, 1); renderLinks(); } }, t("delete")),
        ]);
      }),
      el("button", { class: "small", onclick: () => { doc.links.push({ label: { [sl]: "" }, url: "", kind: "other" }); renderLinks(); } }, t("addLink"))
    );
  };
  renderLinks();
  const linksCard = el("div", { class: "card" }, [el("h3", {}, t("linksHeading")), linksBox]);

  // --- dynamic rows: testimonials ---
  const testiBox = el("div");
  const renderTesti = () => {
    testiBox.replaceChildren(
      ...doc.testimonials.map((tm, i) =>
        el("div", { class: "dyn-row" }, [
          el("input", { placeholder: t("quotePlaceholder"), value: tm.quote || "", oninput: (e) => (tm.quote = e.target.value) }),
          el("input", { placeholder: t("authorPlaceholder"), value: tm.author || "", oninput: (e) => (tm.author = e.target.value) }),
          el("button", { class: "small danger", onclick: () => { doc.testimonials.splice(i, 1); renderTesti(); } }, t("delete")),
        ])
      ),
      el("button", { class: "small", onclick: () => { doc.testimonials.push({ quote: "", author: "" }); renderTesti(); } }, t("addTestimonial"))
    );
  };
  renderTesti();
  const testiCard = el("div", { class: "card" }, [el("h3", {}, t("testimonialsHeading")), testiBox]);

  // --- tech stack corrections ---
  const tscAdd = el("input", {
    placeholder: t("tscAddPlaceholder"),
    value: ((doc.techStackCorrections || {}).add || []).join(", "),
  });
  const tscRemove = el("input", {
    placeholder: t("tscRemovePlaceholder"),
    value: ((doc.techStackCorrections || {}).remove || []).join(", "),
  });
  const syncTsc = () => {
    const parse = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const add = parse(tscAdd.value);
    const remove = parse(tscRemove.value);
    if (add.length === 0 && remove.length === 0) delete doc.techStackCorrections;
    else doc.techStackCorrections = { add, remove };
  };
  tscAdd.addEventListener("input", syncTsc);
  tscRemove.addEventListener("input", syncTsc);
  const tscCard = el("div", { class: "card" }, [
    el("h3", {}, t("tscHeading")),
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [el("label", {}, "add"), tscAdd]),
      el("div", { class: "field" }, [el("label", {}, "remove"), tscRemove]),
    ]),
  ]);

  // --- interview ---
  const interviewBox = el("div");
  const renderInterview = () => {
    interviewBox.replaceChildren(
      ...doc.interview.map((qa, i) =>
        el("div", { class: "dyn-row" }, [
          el("input", { placeholder: t("questionPlaceholder"), value: qa.question || "", oninput: (e) => (qa.question = e.target.value) }),
          el("input", { placeholder: t("answerPlaceholder"), value: qa.answer || "", oninput: (e) => (qa.answer = e.target.value) }),
          el("button", { class: "small danger", onclick: () => { doc.interview.splice(i, 1); renderInterview(); } }, t("delete")),
        ])
      ),
      el("button", { class: "small", onclick: () => { doc.interview.push({ question: "", answer: "" }); renderInterview(); } }, t("addQa"))
    );
  };
  renderInterview();
  const interviewCard = el("div", { class: "card" }, [el("h3", {}, t("interviewHeading")), interviewBox]);

  const saveBtn = el("button", { class: "accent", onclick: async () => {
    try {
      const payload = JSON.parse(JSON.stringify(doc));
      delete payload.id; // filename-derived, not part of the schema
      payload.outcomes = payload.outcomes.filter((o) => o.label && o.value);
      payload.links = payload.links.filter((l) => l.url);
      payload.testimonials = payload.testimonials.filter((tm) => tm.quote && tm.author);
      payload.interview = payload.interview.filter((qa) => qa.question || qa.answer);
      if (payload.role && !payload.role.type) delete payload.role;
      payload.updatedAt = new Date().toISOString();
      await api(`/api/intake/${encodeURIComponent(intake.id)}`, { method: "PUT", json: payload });
      toast(t("intakeSaved"));
      await refreshState();
    } catch (e) { toast(t("saveFailed", { message: e.message }), true); }
  } }, t("saveIntake"));

  container.append(basics, roleCard, narrative, outcomesCard, linksCard,
    testiCard, tscCard, interviewCard, saveBtn);
  frag.append(container);
  return frag;
}

// ---------------- Prose ----------------
function proseTab(project) {
  const frag = document.createDocumentFragment();
  const langs = locales();

  /** One prose field: label + one textarea column per locale. */
  const proseField = (label, pathStr, textObj, edits) => {
    const cols = langs.map((lang) => {
      const ta = el("textarea", {
        value: (textObj && textObj[lang]) || "",
        oninput: (e) => edits.set(pathStr + "\x00" + lang, { path: pathStr, lang, value: e.target.value }),
      });
      return el("div", { class: "prose-col" }, [
        el("div", { class: "lang-tag" }, lang),
        ta,
      ]);
    });
    return el("div", { class: "prose-field" }, [
      el("div", { class: "prose-label" }, label),
      el("div", { class: "prose-cols" }, cols),
    ]);
  };

  /** Section card with its own save button submitting collected edits. */
  const section = (title, build) => {
    const edits = new Map();
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, title));
    build(card, edits);
    card.append(el("button", { class: "accent", onclick: async () => {
      if (edits.size === 0) { toast(t("noChanges")); return; }
      try {
        await api(`/api/project/${encodeURIComponent(project.id)}/prose`, {
          method: "PUT",
          json: { edits: [...edits.values()] },
        });
        toast(t("sectionSaved", { title }));
        await refreshState();
      } catch (e) { toast(t("saveFailed", { message: e.message }), true); }
    } }, t("save")));
    return card;
  };

  frag.append(section(t("summaryHeading"), (card, edits) => {
    card.append(proseField("summary", "summary", project.summary, edits));
  }));

  frag.append(section(t("caseStudyHeading"), (card, edits) => {
    card.append(
      proseField(t("problemLabel"), "caseStudy.problem", project.caseStudy.problem, edits),
      proseField(t("solutionLabel"), "caseStudy.solution", project.caseStudy.solution, edits),
      proseField(t("resultsLabel"), "caseStudy.results",
        project.caseStudy.results, edits),
    );
  }));

  frag.append(section(t("highlightsHeading"), (card, edits) => {
    project.highlights.forEach((h, i) => {
      card.append(proseField(`highlight ${i + 1}`, `highlights[${i}].text`, h.text, edits));
    });
  }));

  frag.append(section(t("timelineHeading"), (card, edits) => {
    project.timeline.forEach((ev, i) => {
      card.append(
        el("h4", {}, `${i + 1}. ${ev.date}`),
        proseField(t("titleLabel"), `timeline[${i}].title`, ev.title, edits),
        proseField(t("description"), `timeline[${i}].description`, ev.description, edits),
      );
    });
    if (project.timeline.length === 0) {
      card.append(el("p", { style: "color:var(--text-dim)" }, t("noTimeline")));
    }
  }));

  frag.append(el("p", { style: "color:var(--text-dim);font-size:12px" }, t("proseOwnershipNote")));
  return frag;
}

// ---------------- Media ----------------
function mediaTab(project) {
  const frag = document.createDocumentFragment();
  const langs = locales();

  const fileInput = el("input", { type: "file", accept: ".png,.jpg,.jpeg,.webp,.gif", multiple: true });
  const uploadBtn = el("button", { class: "accent", onclick: async () => {
    const files = [...fileInput.files];
    if (files.length === 0) { toast(t("selectFile"), true); return; }
    try {
      for (const file of files) {
        await fetch(
          `/api/screenshot/${encodeURIComponent(project.id)}?filename=${encodeURIComponent(file.name)}`,
          { method: "POST", body: file, headers: { "content-type": "application/octet-stream" } }
        ).then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || res.statusText);
          }
        });
      }
      toast(t("uploadedCount", { count: files.length }));
      await refreshState();
    } catch (e) { toast(t("uploadFailed", { message: e.message }), true); }
  } }, t("upload"));

  frag.append(el("div", { class: "card" }, [
    el("h3", {}, t("addScreenshots")),
    el("div", { class: "dyn-row" }, [fileInput, uploadBtn]),
    el("p", { style: "color:var(--text-dim);font-size:12px;margin-bottom:0" }, t("screenshotNote")),
  ]));

  const grid = el("div", { class: "shots-grid" });
  for (const shot of project.screenshots) {
    const altRows = langs.map((lang) => {
      const input = el("input", { placeholder: t("altPlaceholder", { lang }), value: shot.alt[lang] || "" });
      const save = el("button", { class: "small", onclick: async () => {
        try {
          await api(`/api/screenshot/${encodeURIComponent(project.id)}/alt`, {
            method: "PUT",
            json: { src: shot.src, lang, value: input.value },
          });
          toast(t("altSaved"));
          await refreshState();
        } catch (e) { toast(t("saveFailed", { message: e.message }), true); }
      } }, t("save"));
      return el("div", { class: "alt-row" }, [el("span", { class: "lang-tag" }, lang), input, save]);
    });

    grid.append(el("div", { class: "shot-card" }, [
      el("img", { src: "/" + shot.src, alt: shot.alt[state.data.profile.sourceLang] || "" }),
      el("div", { class: "src" }, shot.src),
      ...altRows,
      el("button", { class: "small danger", onclick: async () => {
        if (!confirm(t("confirmDeleteScreenshot"))) return;
        try {
          await api(`/api/screenshot/${encodeURIComponent(project.id)}?src=${encodeURIComponent(shot.src)}`,
            { method: "DELETE" });
          toast(t("deleted"));
          await refreshState();
        } catch (e) { toast(t("deleteFailed", { message: e.message }), true); }
      } }, t("delete")),
    ]));
  }
  if (project.screenshots.length === 0) {
    grid.append(el("p", { style: "color:var(--text-dim)" }, t("noScreenshots")));
  }
  frag.append(el("div", { class: "card" }, [el("h3", {}, t("registeredHeading")), grid]));
  return frag;
}

// ---------------- Profile ----------------
function profilePanel() {
  const frag = document.createDocumentFragment();
  const langs = locales();
  let dirty = false;

  // Working copy — mutated by inputs, saved on demand (avatar acts immediately).
  const doc = JSON.parse(JSON.stringify(state.data.profile));
  doc.role = doc.role || {};
  doc.tagline = doc.tagline || {};
  doc.bio = doc.bio || {};
  doc.seo = doc.seo || { title: {}, description: {} };
  // seo.title became localized in schemaVersion 2; tolerate a legacy string.
  if (typeof doc.seo.title === "string")
    doc.seo.title = doc.seo.title ? { [doc.sourceLang]: doc.seo.title } : {};
  doc.seo.title = doc.seo.title || {};
  doc.seo.description = doc.seo.description || {};
  doc.socials = doc.socials || [];
  doc.skillOverrides = doc.skillOverrides || [];
  doc.identities = doc.identities || [];
  doc.targetLangs = doc.targetLangs || [];

  const textField = (label, key, opts = {}) => {
    const input = el("input", {
      value: doc[key] ?? "",
      oninput: (e) => {
        if (e.target.value.trim() === "" && opts.optional) delete doc[key];
        else doc[key] = e.target.value.trim();
      },
    });
    return el("div", { class: "field" }, [el("label", {}, label), input]);
  };

  /** Localized text: one column per locale, writing straight into `obj`.
   * Columns cover the configured locales PLUS any locale already present in
   * the data, so changing sourceLang/targetLangs never hides existing text. */
  const locField = (label, obj, opts = {}) => {
    const colLangs = [...new Set([...langs, ...Object.keys(obj)])];
    const cols = colLangs.map((lang) => {
      const input = el(opts.multiline ? "textarea" : "input", {
        value: obj[lang] || "",
        oninput: (e) => (obj[lang] = e.target.value),
      });
      return el("div", { class: "prose-col" }, [el("div", { class: "lang-tag" }, lang), input]);
    });
    return el("div", { class: "prose-field" }, [
      el("div", { class: "prose-label" }, label),
      el("div", { class: "prose-cols" }, cols),
    ]);
  };

  const basics = el("div", { class: "card" }, [
    el("h3", {}, t("profileBasicHeading")),
    el("p", { style: "color:var(--text-dim);font-size:12px;margin-top:0" }, t("profileIntro")),
    el("div", { class: "field-row" }, [
      textField(t("profileFieldName"), "name"),
      textField(t("profileFieldGithubUser"), "githubUser"),
    ]),
    el("div", { class: "field-row" }, [
      textField(t("profileFieldEmail"), "email", { optional: true }),
      textField(t("profileFieldSiteUrl"), "siteUrl", { optional: true }),
      textField(t("profileFieldDomain"), "domain", { optional: true }),
    ]),
  ]);

  // --- avatar (uploads/removals apply immediately, like the media tab) ---
  const avatarBox = el("div");
  const avatarFile = el("input", { type: "file", accept: ".png,.jpg,.jpeg,.webp,.gif" });
  const avatarRemoveBtn = el("button", { class: "small danger", onclick: async () => {
    if (!confirm(t("avatarRemoveConfirm"))) return;
    try {
      const saved = await api("/api/profile/avatar", { method: "DELETE" });
      delete doc.avatar;
      delete state.data.profile.avatar;
      // The immediate write bumped updatedAt on disk — keep the working
      // copy's concurrency token current so the next Save doesn't 409.
      doc.updatedAt = saved.updatedAt;
      state.data.profile.updatedAt = saved.updatedAt;
      renderAvatar();
      toast(t("avatarRemoved"));
    } catch (e) { toast(t("deleteFailed", { message: e.message }), true); }
  } }, t("delete"));
  const avatarUploadBtn = el("button", { class: "small", onclick: async () => {
    const file = avatarFile.files[0];
    if (!file) { toast(t("selectFile"), true); return; }
    try {
      const res = await fetch("/api/profile/avatar?filename=" + encodeURIComponent(file.name), {
        method: "POST", body: file, headers: { "content-type": "application/octet-stream" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.statusText);
      doc.avatar = body.avatar;
      state.data.profile.avatar = body.avatar;
      doc.updatedAt = body.updatedAt;
      state.data.profile.updatedAt = body.updatedAt;
      renderAvatar();
      toast(t("avatarSaved"));
    } catch (e) { toast(t("uploadFailed", { message: e.message }), true); }
  } }, t("upload"));
  const renderAvatar = () => {
    avatarBox.replaceChildren(
      doc.avatar
        ? el("img", { class: "avatar-preview", src: "/" + doc.avatar, alt: "" })
        : el("p", { style: "color:var(--text-dim);margin:0 0 8px" }, t("noAvatar"))
    );
    avatarRemoveBtn.hidden = !doc.avatar;
  };
  renderAvatar();
  const avatarCard = el("div", { class: "card" }, [
    el("h3", {}, t("avatarHeading")),
    avatarBox,
    el("div", { class: "dyn-row" }, [avatarFile, avatarUploadBtn, avatarRemoveBtn]),
    el("p", { style: "color:var(--text-dim);font-size:12px;margin-bottom:0" }, t("avatarNote")),
  ]);

  const texts = el("div", { class: "card" }, [
    el("h3", {}, t("profileTextsHeading")),
    locField(t("profileFieldRole"), doc.role),
    locField(t("profileFieldTagline"), doc.tagline),
    locField(t("profileFieldBio"), doc.bio, { multiline: true }),
  ]);

  const seoCard = el("div", { class: "card" }, [
    el("h3", {}, t("seoHeading")),
    locField(t("profileFieldSeoTitle"), doc.seo.title),
    locField(t("profileFieldSeoDescription"), doc.seo.description, { multiline: true }),
  ]);

  // --- dynamic rows: socials ---
  const socialsBox = el("div");
  const renderSocials = () => {
    socialsBox.replaceChildren(
      ...doc.socials.map((s, i) =>
        el("div", { class: "dyn-row" }, [
          el("input", { placeholder: t("socialPlatformPlaceholder"), value: s.platform || "",
            oninput: (e) => (s.platform = e.target.value) }),
          el("input", { placeholder: "https://...", value: s.url || "",
            oninput: (e) => (s.url = e.target.value) }),
          el("input", { placeholder: t("socialHandlePlaceholder"), value: s.handle || "",
            oninput: (e) => { if (e.target.value === "") delete s.handle; else s.handle = e.target.value; } }),
          el("button", { class: "small danger", onclick: () => { doc.socials.splice(i, 1); dirty = true; renderSocials(); } }, t("delete")),
        ])
      ),
      el("button", { class: "small", onclick: () => { doc.socials.push({ platform: "", url: "" }); renderSocials(); } }, t("addSocial"))
    );
  };
  renderSocials();
  const socialsCard = el("div", { class: "card" }, [el("h3", {}, t("socialsHeading")), socialsBox]);

  // --- dynamic rows: skill overrides ---
  const skillsBox = el("div");
  const renderSkills = () => {
    skillsBox.replaceChildren(
      ...doc.skillOverrides.map((o, i) =>
        el("div", { class: "dyn-row" }, [
          el("input", { placeholder: t("skillNamePlaceholder"), value: o.name || "",
            oninput: (e) => (o.name = e.target.value) }),
          el("input", { placeholder: t("skillCategoryPlaceholder"), value: o.category || "",
            oninput: (e) => { if (e.target.value === "") delete o.category; else o.category = e.target.value; } }),
          el("select", { onchange: (e) => (o.action = e.target.value) },
            ["add", "hide"].map((a) => el("option", { value: a, selected: (o.action || "add") === a }, a))),
          el("button", { class: "small danger", onclick: () => { doc.skillOverrides.splice(i, 1); dirty = true; renderSkills(); } }, t("delete")),
        ])
      ),
      el("button", { class: "small", onclick: () => { doc.skillOverrides.push({ name: "", action: "add" }); renderSkills(); } }, t("addSkillOverride"))
    );
  };
  renderSkills();
  const skillsCard = el("div", { class: "card" }, [
    el("h3", {}, t("skillOverridesHeading")),
    el("p", { style: "color:var(--text-dim);font-size:12px;margin-top:0" }, t("skillOverridesNote")),
    skillsBox,
  ]);

  // --- advanced: locales, identities, analytics ---
  const sourceLangInput = el("input", {
    value: doc.sourceLang || "",
    oninput: (e) => (doc.sourceLang = e.target.value.trim()),
  });
  const targetLangsInput = el("input", {
    value: doc.targetLangs.join(", "),
    oninput: (e) => (doc.targetLangs = e.target.value.split(",").map((x) => x.trim()).filter(Boolean)),
  });
  const identitiesArea = el("textarea", {
    value: doc.identities.join("\n"),
    oninput: (e) => (doc.identities = e.target.value.split("\n").map((x) => x.trim()).filter(Boolean)),
  });
  const analyticsInput = el("input", {
    value: (doc.analytics && doc.analytics.cloudflareToken) || "",
    oninput: (e) => {
      const v = e.target.value.trim();
      if (v === "") delete doc.analytics;
      else doc.analytics = { cloudflareToken: v };
    },
  });
  const advancedCard = el("div", { class: "card" }, [
    el("h3", {}, t("profileAdvancedHeading")),
    el("p", { style: "color:var(--text-dim);font-size:12px;margin-top:0" }, t("profileAdvancedNote")),
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [el("label", {}, t("profileFieldSourceLang")), sourceLangInput]),
      el("div", { class: "field" }, [el("label", {}, t("profileFieldTargetLangs")), targetLangsInput]),
    ]),
    el("div", { class: "field" }, [el("label", {}, t("profileFieldIdentities")), identitiesArea]),
    el("div", { class: "field" }, [el("label", {}, t("profileFieldAnalytics")), analyticsInput]),
  ]);

  const saveBtn = el("button", { class: "accent", onclick: async () => {
    // Friendly pre-checks for the common mistakes, so the owner normally
    // never sees a raw schema error. A row someone STARTED filling must not
    // be dropped silently; a fully-empty "+ Add" row is stripped quietly.
    if (!doc.name || !doc.githubUser || !(doc.seo.title[doc.sourceLang] || "").trim()) {
      toast(t("profileRequiredMissing"), true);
      return;
    }
    if (doc.socials.some((s) => (s.platform || s.url || s.handle) && !(s.platform && s.url))) {
      toast(t("socialRowIncomplete"), true);
      return;
    }
    if (doc.skillOverrides.some((o) => !o.name && o.category)) {
      toast(t("skillRowIncomplete"), true);
      return;
    }
    try {
      const payload = JSON.parse(JSON.stringify(doc));
      for (const [lang, value] of Object.entries(payload.seo.title)) {
        const trimmed = (value || "").trim();
        if (trimmed) payload.seo.title[lang] = trimmed;
        else delete payload.seo.title[lang];
      }
      payload.socials = payload.socials.filter((s) => s.platform && s.url);
      payload.skillOverrides = payload.skillOverrides.filter((o) => o.name);
      await api("/api/profile", { method: "PUT", json: payload });
      dirty = false;
      toast(t("profileSaved"));
      await refreshState();
    } catch (e) {
      toast(
        /changed on disk/.test(e.message)
          ? t("profileConflict")
          : t("saveFailed", { message: e.message }),
        true
      );
    }
  } }, t("profileSave"));

  // Any input in the panel marks the working copy dirty (the avatar file
  // picker is excluded — avatar actions apply immediately, not via Save).
  const container = el("div", {
    oninput: (e) => { if (e.target !== avatarFile) dirty = true; },
    onchange: (e) => { if (e.target !== avatarFile) dirty = true; },
  });
  container.append(basics, avatarCard, texts, seoCard, socialsCard, skillsCard, advancedCard, saveBtn);
  frag.append(container);
  unsavedGuard = { hash: "#/profile", isDirty: () => dirty };
  return frag;
}

// ---------------- Site design ----------------
function designPanel() {
  const frag = document.createDocumentFragment();
  const cfg = state.theme;
  if (!cfg || !cfg.installed) {
    frag.append(el("div", { class: "card" }, [
      el("p", { style: "color:var(--text-dim)" }, t("stateFetchFailed", { message: "/api/theme" })),
    ]));
    return frag;
  }
  const installed = cfg.installed;
  const visitorSet = new Set(cfg.visitorThemes === "all" ? installed : (cfg.visitorThemes || []));

  // Default design (activeTheme) — served at the root URLs.
  const select = el(
    "select",
    {},
    installed.map((name) =>
      el("option", { value: name, selected: name === cfg.activeTheme }, name)
    )
  );
  const defaultCard = el("div", { class: "card" }, [
    el("h3", {}, t("designDefault")),
    el("p", { style: "color:var(--text-dim);font-size:12px;margin-top:0" }, t("designDefaultHint")),
    el("div", { class: "field" }, [select]),
  ]);

  // Visitor switcher (visitorThemes) — which themes visitors can flip between.
  const checkboxes = installed.map((name) =>
    el("input", { type: "checkbox", checked: visitorSet.has(name), value: name })
  );
  const visitorCard = el("div", { class: "card" }, [
    el("h3", {}, t("designVisitor")),
    el("p", { style: "color:var(--text-dim);font-size:12px;margin-top:0" }, t("designVisitorHint")),
    el(
      "div",
      { class: "design-checks" },
      checkboxes.map((cb, i) =>
        el("label", { class: "design-check" }, [cb, el("span", {}, installed[i])])
      )
    ),
  ]);

  const saveBtn = el(
    "button",
    {
      class: "accent",
      onclick: async () => {
        const checked = checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
        const visitorThemes = installed.every((n) => checked.includes(n)) ? "all" : checked;
        try {
          state.theme = await api("/api/theme", {
            method: "PUT",
            json: { activeTheme: select.value, visitorThemes },
          });
          toast(t("designSaved"));
          render();
        } catch (e) {
          toast(t("designSaveFailed", { message: e.message }), true);
        }
      },
    },
    t("designSave")
  );

  frag.append(
    defaultCard,
    visitorCard,
    el("div", { class: "card" }, [
      el("p", { style: "color:var(--text-dim);font-size:12px;margin:0" }, t("designRebuildNote")),
    ]),
    el("div", { style: "margin-top:12px" }, [saveBtn])
  );
  return frag;
}

// ---------------- Engine update ----------------
let engineSource = null;

function attachEngineStream(logPre, onDone, onLost) {
  if (engineSource) engineSource.close();
  logPre.hidden = false;
  logPre.textContent = "";
  engineSource = new EventSource("/api/engine/stream");
  // The server replays its whole ring buffer on every (re)connect — start clean.
  engineSource.onopen = () => { logPre.textContent = ""; };
  engineSource.onmessage = (e) => {
    logPre.textContent += e.data + "\n";
    logPre.scrollTop = logPre.scrollHeight;
  };
  engineSource.addEventListener("done", (e) => {
    if (engineSource) { engineSource.close(); engineSource = null; }
    onDone(e.data === "" ? null : Number(e.data));
  });
  engineSource.onerror = () => {
    // CONNECTING = the browser is auto-reconnecting; leave it alone.
    if (engineSource && engineSource.readyState === EventSource.CLOSED) {
      engineSource = null;
      if (onLost) onLost();
    }
  };
}

function enginePanel() {
  const frag = document.createDocumentFragment();

  const versionLine = el("p", { style: "margin:0 0 10px" }, "");
  const statusLine = el("p", { style: "margin:0 0 10px;font-weight:600" }, t("engineIdleHint"));
  const commitsPre = el("pre", { class: "engine-commits", hidden: true });
  const logPre = el("pre", { class: "engine-log", hidden: true });
  const doneNote = el("p", { style: "margin:10px 0 0", hidden: true }, "");

  const onDone = (code) => {
    doneNote.hidden = false;
    if (code === 0) {
      doneNote.style.color = "var(--ok)";
      doneNote.textContent = t("engineDoneNote");
      statusLine.textContent = "";
    } else {
      doneNote.style.color = "var(--error, #e5636e)";
      doneNote.textContent = t("engineFailedNote");
    }
    updateBtn.disabled = false;
    checkBtn.disabled = false;
  };

  const onLost = () => {
    statusLine.textContent = t("engineStreamLost");
    updateBtn.disabled = false;
    checkBtn.disabled = false;
  };

  const checkBtn = el("button", { onclick: () => check(true) }, t("engineCheck"));
  const updateBtn = el("button", {
    class: "accent",
    hidden: true,
    onclick: async () => {
      if (!confirm(t("engineConfirm"))) return;
      updateBtn.disabled = true;
      checkBtn.disabled = true;
      doneNote.hidden = true;
      statusLine.textContent = t("engineRunning");
      try {
        await api("/api/engine/update", { method: "POST" });
      } catch (e) {
        if (!/already running|409/i.test(e.message)) {
          toast(t("engineStartFailed", { message: e.message }), true);
          statusLine.textContent = t("engineIdleHint");
          updateBtn.disabled = false;
          checkBtn.disabled = false;
          return;
        }
      }
      attachEngineStream(logPre, onDone, onLost);
    },
  }, t("engineUpdateNow"));

  async function check(doFetch) {
    checkBtn.disabled = true;
    updateBtn.hidden = true;
    commitsPre.hidden = true;
    doneNote.hidden = true;
    let stillRunning = false;
    if (doFetch) statusLine.textContent = t("engineChecking");
    try {
      const s = await api("/api/engine/status" + (doFetch ? "?fetch=1" : ""));
      versionLine.textContent = t("engineVersion", { version: s.version });
      if (s.running) {
        stillRunning = true;
        statusLine.textContent = t("engineRunning");
        attachEngineStream(logPre, onDone, onLost);
      } else if (!s.remote) {
        statusLine.textContent = t("engineNoRemote");
      } else if (!doFetch) {
        statusLine.textContent = t("engineIdleHint");
        // A finished run's log + outcome are still on the server — surface them.
        if (s.lastExit !== null && s.lastExit !== undefined) {
          attachEngineStream(logPre, onDone, onLost);
        }
      } else if (s.behind === null) {
        statusLine.textContent = t("engineNoRef");
      } else if (s.behind === 0) {
        statusLine.textContent = t("engineUpToDate");
      } else {
        statusLine.textContent = t("engineBehind", { count: s.behind });
        if (s.commits && s.commits.length > 0) {
          commitsPre.textContent = s.commits.join("\n");
          commitsPre.hidden = false;
        }
        updateBtn.hidden = false;
      }
    } catch (e) {
      statusLine.textContent = t("engineCheckFailed", { message: e.message });
    } finally {
      checkBtn.disabled = stillRunning;
    }
  }

  frag.append(el("div", { class: "card" }, [
    el("h3", {}, t("engineTitle")),
    el("p", { style: "color:var(--text-dim);font-size:12px;margin-top:0" }, t("engineIntro")),
    versionLine,
    statusLine,
    commitsPre,
    el("div", { style: "display:flex;gap:8px;margin-top:4px" }, [checkBtn, updateBtn]),
    logPre,
    doneNote,
  ]));

  check(false);
  return frag;
}

// ---------------------------------------------------------------------------
// Analyze drawer (SSE)
// ---------------------------------------------------------------------------
let eventSource = null;

function openDrawer() {
  document.getElementById("drawer").hidden = false;
}

function attachStream() {
  if (eventSource) eventSource.close();
  const log = document.getElementById("analyze-log");
  log.textContent = "";
  eventSource = new EventSource("/api/analyze/stream");
  eventSource.onmessage = (e) => {
    log.textContent += e.data + "\n";
    log.scrollTop = log.scrollHeight;
  };
  eventSource.addEventListener("done", () => {
    eventSource.close();
    eventSource = null;
    // Sidebar-only: a full render here would rebuild whatever editor is open
    // and silently discard the owner's unsaved edits.
    refreshSidebarOnly().catch(() => {});
  });
  eventSource.onerror = () => {
    if (eventSource) { eventSource.close(); eventSource = null; }
  };
}

async function runAnalyze() {
  openDrawer();
  try {
    await api("/api/analyze", { method: "POST" });
  } catch (e) {
    if (!/already running|409/i.test(e.message)) {
      toast(t("analyzeStartFailed", { message: e.message }), true);
    }
  }
  attachStream();
}

// ---------------------------------------------------------------------------
// Wiring + boot
// ---------------------------------------------------------------------------
document.getElementById("btn-add-repo").addEventListener("click", async () => {
  const url = prompt(t("promptRepoUrl"));
  if (!url || !url.trim()) return;
  try {
    const created = await api("/api/intake", { method: "POST", json: { repoUrl: url.trim() } });
    toast(t("intakeCreated", { id: created.id }));
    await refreshState();
    selectProject(created.id);
  } catch (e) { toast(t("createFailed", { message: e.message }), true); }
});

document.getElementById("btn-add-manual").addEventListener("click", async () => {
  const name = prompt(t("promptDisplayName"));
  if (!name || !name.trim()) return;
  try {
    const created = await api("/api/intake", {
      method: "POST",
      json: { manual: true, displayName: name.trim() },
    });
    toast(t("manualIntakeCreated", { id: created.id }));
    await refreshState();
    selectProject(created.id);
  } catch (e) { toast(t("createFailed", { message: e.message }), true); }
});

document.getElementById("btn-profile").addEventListener("click", () => {
  location.hash = "#/profile";
});

document.getElementById("btn-design").addEventListener("click", () => {
  location.hash = "#/design";
});

document.getElementById("btn-engine").addEventListener("click", () => {
  location.hash = "#/engine";
});

document.getElementById("btn-guide").addEventListener("click", () => {
  window.open("/guide", "_blank", "noopener");
});

document.getElementById("btn-analyze").addEventListener("click", runAnalyze);
document.getElementById("drawer-close").addEventListener("click", () => {
  document.getElementById("drawer").hidden = true;
});

refreshState()
  .then(applyHash)
  .catch((e) => toast(t("stateFetchFailed", { message: e.message }), true));
