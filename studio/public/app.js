/* Provenfolio Studio GUI — vanilla JS, no framework, no CDN.
 * All user data is inserted via textContent / el() (never innerHTML with
 * interpolated strings) — XSS hygiene even though this is localhost-only. */
"use strict";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  data: null, // { profile, manifest, projects, intakes }
  selectedId: null,
  tab: "overview",
};

const MISSING_LABELS = {
  role: "役割が未設定",
  "demo-link": "デモ/ストア/動画リンクがない",
  visual: "スクリーンショットかアーキ図がない",
  "case-study": "ケーススタディ未完成",
  results: "定量成果が未入力(任意)",
  highlights: "ハイライトが1件のみ",
  timeline: "タイムラインが空",
};

function missingLabel(key) {
  if (key.startsWith("translation:")) {
    return key.slice("translation:".length) + "翻訳が未完了";
  }
  return MISSING_LABELS[key] || key;
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

async function refreshState() {
  state.data = await api("/api/state");
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
  return score < 50 ? "var(--red)" : score < 80 ? "var(--yellow)" : "var(--green)";
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
      el("div", { class: "meter-score" }, `完成度 ${score} / 100`),
    ]);
    projectList.append(li);
  }
  if (projects.length === 0) {
    projectList.append(el("div", { class: "empty-hint" }, "プロジェクトなし"));
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
    intakeList.append(el("div", { class: "empty-hint" }, "保留中のインテークなし"));
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
    project ? project.name : (intake.displayName || intake.id) + "(分析待ち)";

  const tabs = project
    ? [["overview", "概要"], ["intake", "インテーク"], ["prose", "プロース"], ["media", "メディア"]]
    : [["intake", "インテーク"]];
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

// ---------------- 概要 ----------------
function overviewTab(project) {
  const frag = document.createDocumentFragment();
  const comp = project.completeness || { score: 0, missing: [] };

  frag.append(el("div", { class: "card" }, [
    el("h3", {}, "完成度"),
    el("div", { class: "big-score", style: `color:${meterColor(comp.score)}` }, String(comp.score)),
    el("div", { class: "meter big-meter" }, [
      el("span", { style: `width:${comp.score}%;background:${meterColor(comp.score)}` }),
    ]),
    comp.missing.length === 0
      ? el("p", { class: "all-done" }, "✓ すべての項目が揃っています")
      : el("ul", { class: "missing-list" }, comp.missing.map((k) => el("li", {}, missingLabel(k)))),
  ]));

  const featured = el("input", { type: "checkbox", checked: project.featured });
  const placement = el("select", {}, ["products", "lab", "archive"].map((v) =>
    el("option", { value: v, selected: project.placement === v }, v)));
  const order = el("input", { type: "number", step: "1", value: String(project.order ?? 0) });
  const status = el("select", {}, ["active", "maintained", "archived"].map((v) =>
    el("option", { value: v, selected: project.status === v }, v)));

  frag.append(el("div", { class: "card" }, [
    el("h3", {}, "掲載設定"),
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [
        el("label", {}, "featured(トップ掲載)"),
        el("label", { style: "display:flex;gap:8px;align-items:center;color:var(--text)" }, [
          featured, el("span", {}, "★ フィーチャーする"),
        ]),
      ]),
      el("div", { class: "field" }, [el("label", {}, "placement(掲載面)"), placement]),
      el("div", { class: "field" }, [el("label", {}, "order(並び順)"), order]),
      el("div", { class: "field" }, [el("label", {}, "status(状態)"), status]),
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
        toast("掲載設定を保存しました");
        await refreshState();
      } catch (e) { toast("保存失敗: " + e.message, true); }
    } }, "保存"),
  ]));

  return frag;
}

// ---------------- インテーク ----------------
function intakeTab(intake, project) {
  const frag = document.createDocumentFragment();
  if (!intake) {
    frag.append(el("div", { class: "card" }, [
      el("h3", {}, "インテーク"),
      el("p", { style: "color:var(--dim)" },
        "このプロジェクトのインテークファイルがありません。「+ リポジトリ追加」から登録してください。"),
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
      allowEmpty ? el("option", { value: "", selected: !doc[key] }, "(未設定)") : null,
      ...options.map((v) => el("option", { value: v, selected: doc[key] === v }, v)),
    ]);
    return el("div", { class: "field" }, [el("label", {}, label), sel]);
  };

  // --- basics ---
  const basics = el("div", { class: "card" }, [
    el("h3", {}, "基本情報"),
    el("div", { class: "field" }, [
      el("label", {}, "ID"),
      el("input", { value: intake.id, disabled: true }),
    ]),
    textField("表示名 (displayName)", "displayName"),
    textField("リポジトリURL (repoUrl)", "repoUrl"),
    el("div", { class: "field-row" }, [
      selectField("ソース種別 (sourceType)", "sourceType", ["github", "manual", "local"]),
      selectField("状態 (state)", "state", ["pending", "analyzed"]),
      selectField("カテゴリ (category)", "category",
        ["product", "service", "client", "oss", "hobby", "learning"], { allowEmpty: true }),
      selectField("ステータス (status)", "status",
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
    el("option", { value: "", selected: !doc.role }, "(未設定)"),
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
    el("h3", {}, "役割 (role)"),
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [el("label", {}, "種別"), roleType]),
      el("div", { class: "field" }, [el("label", {}, "担当範囲 (scope)"), roleScope]),
    ]),
  ]);

  // --- narrative ---
  const narrative = el("div", { class: "card" }, [
    el("h3", {}, "説明"),
    textField("一言でいうと (whatIsIt)", "whatIsIt", { multiline: true }),
    textField("動機 (motivation)", "motivation", { multiline: true }),
    textField("想定ユーザー (targetAudience)", "targetAudience"),
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [
        el("label", {}, "チーム人数 (teamSize)"),
        el("input", {
          type: "number", min: "1", step: "1", value: doc.teamSize ?? "",
          oninput: (e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isFinite(n) && n > 0) doc.teamSize = n;
            else delete doc.teamSize;
          },
        }),
      ]),
      selectField("公開範囲の上書き (visibilityOverride)", "visibilityOverride",
        ["public", "private"], { allowEmpty: true }),
    ]),
    textField("メモ (notes)", "notes", { multiline: true }),
  ]);

  // --- dynamic rows: outcomes ---
  const outcomesBox = el("div");
  const renderOutcomes = () => {
    outcomesBox.replaceChildren(
      ...doc.outcomes.map((o, i) =>
        el("div", { class: "dyn-row" }, [
          el("input", { placeholder: "ラベル(例: 月間ユーザー)", value: o.label || "",
            oninput: (e) => (o.label = e.target.value) }),
          el("input", { placeholder: "値(例: 1200)", value: o.value || "",
            oninput: (e) => (o.value = e.target.value) }),
          el("input", { placeholder: "出典(例: Cloudflare Analytics)", value: o.source || "",
            oninput: (e) => { if (e.target.value === "") delete o.source; else o.source = e.target.value; } }),
          el("button", { class: "small danger", onclick: () => { doc.outcomes.splice(i, 1); renderOutcomes(); } }, "削除"),
        ])
      ),
      el("button", { class: "small", onclick: () => { doc.outcomes.push({ label: "", value: "" }); renderOutcomes(); } }, "+ 成果を追加")
    );
  };
  renderOutcomes();
  const outcomesCard = el("div", { class: "card" }, [
    el("h3", {}, "定量成果 (outcomes)"),
    el("p", { style: "color:var(--dim);font-size:12px;margin-top:0" },
      "ケーススタディの数値はここか計測メトリクスのみが出典になります(golden rule 3)"),
    outcomesBox,
  ]);

  // --- dynamic rows: links ---
  const linksBox = el("div");
  const renderLinks = () => {
    linksBox.replaceChildren(
      ...doc.links.map((l, i) => {
        l.label = l.label || {};
        return el("div", { class: "dyn-row" }, [
          el("input", { placeholder: `ラベル (${sl})`, value: l.label[sl] || "",
            oninput: (e) => (l.label[sl] = e.target.value) }),
          el("input", { placeholder: "https://...", value: l.url || "",
            oninput: (e) => (l.url = e.target.value) }),
          el("select", { onchange: (e) => (l.kind = e.target.value) },
            ["demo", "store", "video", "docs", "repo", "article", "other"].map((k) =>
              el("option", { value: k, selected: (l.kind || "other") === k }, k))),
          el("button", { class: "small danger", onclick: () => { doc.links.splice(i, 1); renderLinks(); } }, "削除"),
        ]);
      }),
      el("button", { class: "small", onclick: () => { doc.links.push({ label: { [sl]: "" }, url: "", kind: "other" }); renderLinks(); } }, "+ リンクを追加")
    );
  };
  renderLinks();
  const linksCard = el("div", { class: "card" }, [el("h3", {}, "リンク (links)"), linksBox]);

  // --- dynamic rows: testimonials ---
  const testiBox = el("div");
  const renderTesti = () => {
    testiBox.replaceChildren(
      ...doc.testimonials.map((t, i) =>
        el("div", { class: "dyn-row" }, [
          el("input", { placeholder: "引用", value: t.quote || "", oninput: (e) => (t.quote = e.target.value) }),
          el("input", { placeholder: "発言者", value: t.author || "", oninput: (e) => (t.author = e.target.value) }),
          el("button", { class: "small danger", onclick: () => { doc.testimonials.splice(i, 1); renderTesti(); } }, "削除"),
        ])
      ),
      el("button", { class: "small", onclick: () => { doc.testimonials.push({ quote: "", author: "" }); renderTesti(); } }, "+ 推薦の声を追加")
    );
  };
  renderTesti();
  const testiCard = el("div", { class: "card" }, [el("h3", {}, "推薦の声 (testimonials)"), testiBox]);

  // --- tech stack corrections ---
  const tscAdd = el("input", {
    placeholder: "追加(カンマ区切り)",
    value: ((doc.techStackCorrections || {}).add || []).join(", "),
  });
  const tscRemove = el("input", {
    placeholder: "除外(カンマ区切り)",
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
    el("h3", {}, "技術スタック補正 (techStackCorrections)"),
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
          el("input", { placeholder: "質問", value: qa.question || "", oninput: (e) => (qa.question = e.target.value) }),
          el("input", { placeholder: "回答", value: qa.answer || "", oninput: (e) => (qa.answer = e.target.value) }),
          el("button", { class: "small danger", onclick: () => { doc.interview.splice(i, 1); renderInterview(); } }, "削除"),
        ])
      ),
      el("button", { class: "small", onclick: () => { doc.interview.push({ question: "", answer: "" }); renderInterview(); } }, "+ Q&Aを追加")
    );
  };
  renderInterview();
  const interviewCard = el("div", { class: "card" }, [el("h3", {}, "インタビュー (interview)"), interviewBox]);

  const saveBtn = el("button", { class: "accent", onclick: async () => {
    try {
      const payload = JSON.parse(JSON.stringify(doc));
      delete payload.id; // filename-derived, not part of the schema
      payload.outcomes = payload.outcomes.filter((o) => o.label && o.value);
      payload.links = payload.links.filter((l) => l.url);
      payload.testimonials = payload.testimonials.filter((t) => t.quote && t.author);
      payload.interview = payload.interview.filter((qa) => qa.question || qa.answer);
      if (payload.role && !payload.role.type) delete payload.role;
      payload.updatedAt = new Date().toISOString();
      await api(`/api/intake/${encodeURIComponent(intake.id)}`, { method: "PUT", json: payload });
      toast("インテークを保存しました");
      await refreshState();
    } catch (e) { toast("保存失敗: " + e.message, true); }
  } }, "インテークを保存");

  container.append(basics, roleCard, narrative, outcomesCard, linksCard,
    testiCard, tscCard, interviewCard, saveBtn);
  frag.append(container);
  return frag;
}

// ---------------- プロース ----------------
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
      if (edits.size === 0) { toast("変更はありません"); return; }
      try {
        await api(`/api/project/${encodeURIComponent(project.id)}/prose`, {
          method: "PUT",
          json: { edits: [...edits.values()] },
        });
        toast(title + "を保存しました");
        await refreshState();
      } catch (e) { toast("保存失敗: " + e.message, true); }
    } }, "保存"));
    return card;
  };

  frag.append(section("概要文 (summary)", (card, edits) => {
    card.append(proseField("summary", "summary", project.summary, edits));
  }));

  frag.append(section("ケーススタディ", (card, edits) => {
    card.append(
      proseField("problem(課題/動機)", "caseStudy.problem", project.caseStudy.problem, edits),
      proseField("solution(解決策)", "caseStudy.solution", project.caseStudy.solution, edits),
      proseField("results(定量成果 — intakeのoutcomes由来のみ)", "caseStudy.results",
        project.caseStudy.results, edits),
    );
  }));

  frag.append(section("ハイライト", (card, edits) => {
    project.highlights.forEach((h, i) => {
      card.append(proseField(`highlight ${i + 1}`, `highlights[${i}].text`, h.text, edits));
    });
  }));

  frag.append(section("タイムライン", (card, edits) => {
    project.timeline.forEach((ev, i) => {
      card.append(
        el("h4", {}, `${i + 1}. ${ev.date}`),
        proseField("タイトル", `timeline[${i}].title`, ev.title, edits),
        proseField("説明", `timeline[${i}].description`, ev.description, edits),
      );
    });
    if (project.timeline.length === 0) {
      card.append(el("p", { style: "color:var(--dim)" }, "タイムラインはまだありません(/analyzeが生成します)"));
    }
  }));

  frag.append(el("p", { style: "color:var(--dim);font-size:12px" },
    "ここで編集した文章は「人間所有」となり、再分析でも上書きされません(contentHashesの不一致が設計上の保護になります)。"));
  return frag;
}

// ---------------- メディア ----------------
function mediaTab(project) {
  const frag = document.createDocumentFragment();
  const langs = locales();

  const fileInput = el("input", { type: "file", accept: ".png,.jpg,.jpeg,.webp,.gif", multiple: true });
  const uploadBtn = el("button", { class: "accent", onclick: async () => {
    const files = [...fileInput.files];
    if (files.length === 0) { toast("ファイルを選択してください", true); return; }
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
      toast(`${files.length}件アップロードしました`);
      await refreshState();
    } catch (e) { toast("アップロード失敗: " + e.message, true); }
  } }, "アップロード");

  frag.append(el("div", { class: "card" }, [
    el("h3", {}, "スクリーンショット追加"),
    el("div", { class: "dyn-row" }, [fileInput, uploadBtn]),
    el("p", { style: "color:var(--dim);font-size:12px;margin-bottom:0" },
      "png / jpg / jpeg / webp / gif、最大10MB。data/assets/screenshots/ に保存されます。"),
  ]));

  const grid = el("div", { class: "shots-grid" });
  for (const shot of project.screenshots) {
    const altRows = langs.map((lang) => {
      const input = el("input", { placeholder: `altテキスト (${lang})`, value: shot.alt[lang] || "" });
      const save = el("button", { class: "small", onclick: async () => {
        try {
          await api(`/api/screenshot/${encodeURIComponent(project.id)}/alt`, {
            method: "PUT",
            json: { src: shot.src, lang, value: input.value },
          });
          toast("altテキストを保存しました");
          await refreshState();
        } catch (e) { toast("保存失敗: " + e.message, true); }
      } }, "保存");
      return el("div", { class: "alt-row" }, [el("span", { class: "lang-tag" }, lang), input, save]);
    });

    grid.append(el("div", { class: "shot-card" }, [
      el("img", { src: "/" + shot.src, alt: shot.alt[state.data.profile.sourceLang] || "" }),
      el("div", { class: "src" }, shot.src),
      ...altRows,
      el("button", { class: "small danger", onclick: async () => {
        if (!confirm("このスクリーンショットを削除しますか?(ファイルも削除されます)")) return;
        try {
          await api(`/api/screenshot/${encodeURIComponent(project.id)}?src=${encodeURIComponent(shot.src)}`,
            { method: "DELETE" });
          toast("削除しました");
          await refreshState();
        } catch (e) { toast("削除失敗: " + e.message, true); }
      } }, "削除"),
    ]));
  }
  if (project.screenshots.length === 0) {
    grid.append(el("p", { style: "color:var(--dim)" }, "スクリーンショットはまだありません"));
  }
  frag.append(el("div", { class: "card" }, [el("h3", {}, "登録済み"), grid]));
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
      toast("分析の起動に失敗: " + e.message, true);
    }
  }
  attachStream();
}

// ---------------------------------------------------------------------------
// Wiring + boot
// ---------------------------------------------------------------------------
document.getElementById("btn-add-repo").addEventListener("click", async () => {
  const url = prompt("GitHubリポジトリのURL(または owner/name):");
  if (!url || !url.trim()) return;
  try {
    const created = await api("/api/intake", { method: "POST", json: { repoUrl: url.trim() } });
    toast("インテークを作成しました: " + created.id);
    await refreshState();
    selectProject(created.id);
  } catch (e) { toast("作成失敗: " + e.message, true); }
});

document.getElementById("btn-add-manual").addEventListener("click", async () => {
  const name = prompt("プロジェクトの表示名:");
  if (!name || !name.trim()) return;
  try {
    const created = await api("/api/intake", {
      method: "POST",
      json: { manual: true, displayName: name.trim() },
    });
    toast("手動インテークを作成しました: " + created.id);
    await refreshState();
    selectProject(created.id);
  } catch (e) { toast("作成失敗: " + e.message, true); }
});

document.getElementById("btn-analyze").addEventListener("click", runAnalyze);
document.getElementById("drawer-close").addEventListener("click", () => {
  document.getElementById("drawer").hidden = true;
});

refreshState()
  .then(applyHash)
  .catch((e) => toast("状態の取得に失敗: " + e.message, true));
