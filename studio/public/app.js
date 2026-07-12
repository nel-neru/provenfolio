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
  selectedId: null,
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
  render();
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

function applyHash() {
  const m = location.hash.match(/^#\/project\/([^/]+)$/);
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
    refreshState().catch(() => {});
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

document.getElementById("btn-analyze").addEventListener("click", runAnalyze);
document.getElementById("drawer-close").addEventListener("click", () => {
  document.getElementById("drawer").hidden = true;
});

refreshState()
  .then(applyHash)
  .catch((e) => toast(t("stateFetchFailed", { message: e.message }), true));
