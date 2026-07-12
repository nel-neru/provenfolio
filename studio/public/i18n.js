/* Provenfolio Studio i18n — UI string dictionary + lookup helper.
 * Per the language policy, Japanese UI text lives ONLY here (and in *.ja.md
 * docs); app.js and index.html are English-only and look strings up via t().
 * Loaded as a classic script BEFORE app.js — no build step, no modules. */
"use strict";

const STUDIO_I18N = {
  en: {
    // completeness "missing" labels
    missingRole: "Role not set",
    missingDemoLink: "No demo/store/video link",
    missingVisual: "No screenshot or architecture diagram",
    missingCaseStudy: "Case study incomplete",
    missingResults: "Quantitative outcomes not entered (optional)",
    missingHighlights: "Only one highlight",
    missingTimeline: "Timeline is empty",
    missingTranslation: "{lang} translation incomplete",

    // static chrome (index.html, hydrated via data-i18n)
    sidebarProjects: "Projects",
    sidebarPendingIntakes: "Pending intakes",
    btnAddRepo: "+ Add repository",
    btnAddManual: "+ Manual project",
    btnAnalyze: "▶ Run analysis (/analyze --pending)",
    mainEmpty: "Select a project from the list on the left",
    analyzeLogTitle: "Analysis log",

    // sidebar
    completenessScore: "Completeness {score} / 100",
    noProjects: "No projects",
    noPendingIntakes: "No pending intakes",

    // main panel + tabs
    awaitingAnalysisSuffix: " (awaiting analysis)",
    tabOverview: "Overview",
    tabIntake: "Intake",
    tabProse: "Prose",
    tabMedia: "Media",

    // overview tab
    completeness: "Completeness",
    allItemsDone: "✓ All items complete",
    listingSettings: "Listing settings",
    fieldFeatured: "featured (top placement)",
    featureThis: "★ Feature this project",
    fieldPlacement: "placement (site section)",
    fieldOrder: "order (sort order)",
    fieldStatus: "status (state)",
    listingSettingsSaved: "Listing settings saved",
    saveFailed: "Save failed: {message}",
    save: "Save",

    // intake tab
    noIntakeFile:
      'This project has no intake file. Register it via "+ Add repository".',
    basicInfo: "Basic info",
    fieldDisplayName: "Display name (displayName)",
    fieldRepoUrl: "Repository URL (repoUrl)",
    fieldSourceType: "Source type (sourceType)",
    fieldState: "State (state)",
    fieldCategory: "Category (category)",
    fieldIntakeStatus: "Status (status)",
    notSet: "(not set)",
    roleHeading: "Role (role)",
    roleType: "Type",
    roleScope: "Scope (scope)",
    description: "Description",
    fieldWhatIsIt: "In one sentence (whatIsIt)",
    fieldMotivation: "Motivation (motivation)",
    fieldTargetAudience: "Target audience (targetAudience)",
    fieldTeamSize: "Team size (teamSize)",
    fieldVisibilityOverride: "Visibility override (visibilityOverride)",
    fieldNotes: "Notes (notes)",
    outcomeLabelPlaceholder: "Label (e.g. monthly users)",
    outcomeValuePlaceholder: "Value (e.g. 1200)",
    outcomeSourcePlaceholder: "Source (e.g. Cloudflare Analytics)",
    delete: "Delete",
    addOutcome: "+ Add outcome",
    outcomesHeading: "Quantitative outcomes (outcomes)",
    outcomesNote:
      "Case-study numbers may only come from here or measured metrics (golden rule 3)",
    linkLabelPlaceholder: "Label ({lang})",
    addLink: "+ Add link",
    linksHeading: "Links (links)",
    quotePlaceholder: "Quote",
    authorPlaceholder: "Author",
    addTestimonial: "+ Add testimonial",
    testimonialsHeading: "Testimonials (testimonials)",
    tscAddPlaceholder: "Add (comma-separated)",
    tscRemovePlaceholder: "Remove (comma-separated)",
    tscHeading: "Tech stack corrections (techStackCorrections)",
    questionPlaceholder: "Question",
    answerPlaceholder: "Answer",
    addQa: "+ Add Q&A",
    interviewHeading: "Interview (interview)",
    intakeSaved: "Intake saved",
    saveIntake: "Save intake",

    // prose tab
    noChanges: "No changes",
    sectionSaved: "{title} saved",
    summaryHeading: "Summary (summary)",
    caseStudyHeading: "Case study",
    problemLabel: "problem (challenge/motivation)",
    solutionLabel: "solution (approach)",
    resultsLabel: "results (quantitative outcomes — from intake outcomes only)",
    highlightsHeading: "Highlights",
    timelineHeading: "Timeline",
    titleLabel: "Title",
    noTimeline: "No timeline yet (/analyze generates it)",
    proseOwnershipNote:
      'Text edited here becomes "human-owned" and is never overwritten by re-analysis (the contentHashes mismatch is the designed protection).',

    // media tab
    selectFile: "Please select a file",
    uploadedCount: "Uploaded {count} file(s)",
    uploadFailed: "Upload failed: {message}",
    upload: "Upload",
    addScreenshots: "Add screenshots",
    screenshotNote:
      "png / jpg / jpeg / webp / gif, max 10MB. Saved under data/assets/screenshots/.",
    altPlaceholder: "Alt text ({lang})",
    altSaved: "Alt text saved",
    confirmDeleteScreenshot:
      "Delete this screenshot? (The file will also be deleted.)",
    deleted: "Deleted",
    deleteFailed: "Delete failed: {message}",
    noScreenshots: "No screenshots yet",
    registeredHeading: "Registered",

    // analyze + wiring
    analyzeStartFailed: "Failed to start analysis: {message}",
    promptRepoUrl: "GitHub repository URL (or owner/name):",
    intakeCreated: "Intake created: {id}",
    createFailed: "Create failed: {message}",
    promptDisplayName: "Project display name:",
    manualIntakeCreated: "Manual intake created: {id}",
    stateFetchFailed: "Failed to fetch state: {message}",

    // site design (theme.config.mjs control)
    btnDesign: "Site design",
    designTitle: "Site design",
    designDefault: "Default design",
    designDefaultHint:
      "The theme served at your site's main URLs — the first thing visitors and search engines see.",
    designVisitor: "Visitor switcher",
    designVisitorHint:
      "Which themes visitors can flip between on the live site. The default design is always available.",
    designSave: "Save design",
    designSaved: "Design saved. Rebuild or /publish to update the live site.",
    designRebuildNote:
      "Changes take effect after the next build/publish. Restart Studio to update its own colors.",
    designSaveFailed: "Save failed: {message}",
  },

  ja: {
    // completeness "missing" labels
    missingRole: "役割が未設定",
    missingDemoLink: "デモ/ストア/動画リンクがない",
    missingVisual: "スクリーンショットかアーキ図がない",
    missingCaseStudy: "ケーススタディ未完成",
    missingResults: "定量成果が未入力(任意)",
    missingHighlights: "ハイライトが1件のみ",
    missingTimeline: "タイムラインが空",
    missingTranslation: "{lang}翻訳が未完了",

    // static chrome (index.html, hydrated via data-i18n)
    sidebarProjects: "プロジェクト",
    sidebarPendingIntakes: "保留インテーク",
    btnAddRepo: "+ リポジトリ追加",
    btnAddManual: "+ 手動プロジェクト",
    btnAnalyze: "▶ 分析実行 (/analyze --pending)",
    mainEmpty: "左のリストからプロジェクトを選択してください",
    analyzeLogTitle: "分析ログ",

    // sidebar
    completenessScore: "完成度 {score} / 100",
    noProjects: "プロジェクトなし",
    noPendingIntakes: "保留中のインテークなし",

    // main panel + tabs
    awaitingAnalysisSuffix: "(分析待ち)",
    tabOverview: "概要",
    tabIntake: "インテーク",
    tabProse: "プロース",
    tabMedia: "メディア",

    // overview tab
    completeness: "完成度",
    allItemsDone: "✓ すべての項目が揃っています",
    listingSettings: "掲載設定",
    fieldFeatured: "featured(トップ掲載)",
    featureThis: "★ フィーチャーする",
    fieldPlacement: "placement(掲載面)",
    fieldOrder: "order(並び順)",
    fieldStatus: "status(状態)",
    listingSettingsSaved: "掲載設定を保存しました",
    saveFailed: "保存失敗: {message}",
    save: "保存",

    // intake tab
    noIntakeFile:
      "このプロジェクトのインテークファイルがありません。「+ リポジトリ追加」から登録してください。",
    basicInfo: "基本情報",
    fieldDisplayName: "表示名 (displayName)",
    fieldRepoUrl: "リポジトリURL (repoUrl)",
    fieldSourceType: "ソース種別 (sourceType)",
    fieldState: "状態 (state)",
    fieldCategory: "カテゴリ (category)",
    fieldIntakeStatus: "ステータス (status)",
    notSet: "(未設定)",
    roleHeading: "役割 (role)",
    roleType: "種別",
    roleScope: "担当範囲 (scope)",
    description: "説明",
    fieldWhatIsIt: "一言でいうと (whatIsIt)",
    fieldMotivation: "動機 (motivation)",
    fieldTargetAudience: "想定ユーザー (targetAudience)",
    fieldTeamSize: "チーム人数 (teamSize)",
    fieldVisibilityOverride: "公開範囲の上書き (visibilityOverride)",
    fieldNotes: "メモ (notes)",
    outcomeLabelPlaceholder: "ラベル(例: 月間ユーザー)",
    outcomeValuePlaceholder: "値(例: 1200)",
    outcomeSourcePlaceholder: "出典(例: Cloudflare Analytics)",
    delete: "削除",
    addOutcome: "+ 成果を追加",
    outcomesHeading: "定量成果 (outcomes)",
    outcomesNote:
      "ケーススタディの数値はここか計測メトリクスのみが出典になります(golden rule 3)",
    linkLabelPlaceholder: "ラベル ({lang})",
    addLink: "+ リンクを追加",
    linksHeading: "リンク (links)",
    quotePlaceholder: "引用",
    authorPlaceholder: "発言者",
    addTestimonial: "+ 推薦の声を追加",
    testimonialsHeading: "推薦の声 (testimonials)",
    tscAddPlaceholder: "追加(カンマ区切り)",
    tscRemovePlaceholder: "除外(カンマ区切り)",
    tscHeading: "技術スタック補正 (techStackCorrections)",
    questionPlaceholder: "質問",
    answerPlaceholder: "回答",
    addQa: "+ Q&Aを追加",
    interviewHeading: "インタビュー (interview)",
    intakeSaved: "インテークを保存しました",
    saveIntake: "インテークを保存",

    // prose tab
    noChanges: "変更はありません",
    sectionSaved: "{title}を保存しました",
    summaryHeading: "概要文 (summary)",
    caseStudyHeading: "ケーススタディ",
    problemLabel: "problem(課題/動機)",
    solutionLabel: "solution(解決策)",
    resultsLabel: "results(定量成果 — intakeのoutcomes由来のみ)",
    highlightsHeading: "ハイライト",
    timelineHeading: "タイムライン",
    titleLabel: "タイトル",
    noTimeline: "タイムラインはまだありません(/analyzeが生成します)",
    proseOwnershipNote:
      "ここで編集した文章は「人間所有」となり、再分析でも上書きされません(contentHashesの不一致が設計上の保護になります)。",

    // media tab
    selectFile: "ファイルを選択してください",
    uploadedCount: "{count}件アップロードしました",
    uploadFailed: "アップロード失敗: {message}",
    upload: "アップロード",
    addScreenshots: "スクリーンショット追加",
    screenshotNote:
      "png / jpg / jpeg / webp / gif、最大10MB。data/assets/screenshots/ に保存されます。",
    altPlaceholder: "altテキスト ({lang})",
    altSaved: "altテキストを保存しました",
    confirmDeleteScreenshot: "このスクリーンショットを削除しますか?(ファイルも削除されます)",
    deleted: "削除しました",
    deleteFailed: "削除失敗: {message}",
    noScreenshots: "スクリーンショットはまだありません",
    registeredHeading: "登録済み",

    // analyze + wiring
    analyzeStartFailed: "分析の起動に失敗: {message}",
    promptRepoUrl: "GitHubリポジトリのURL(または owner/name):",
    intakeCreated: "インテークを作成しました: {id}",
    createFailed: "作成失敗: {message}",
    promptDisplayName: "プロジェクトの表示名:",
    manualIntakeCreated: "手動インテークを作成しました: {id}",
    stateFetchFailed: "状態の取得に失敗: {message}",

    // site design (theme.config.mjs control)
    btnDesign: "サイトのデザイン",
    designTitle: "サイトのデザイン",
    designDefault: "既定のデザイン",
    designDefaultHint:
      "サイトのメインURLで提供されるテーマ — 訪問者と検索エンジンが最初に目にするデザインです。",
    designVisitor: "訪問者スイッチャー",
    designVisitorHint:
      "公開サイト上で訪問者が切り替えられるテーマ。既定のデザインは常に選べます。",
    designSave: "デザインを保存",
    designSaved: "デザインを保存しました。反映にはリビルドまたは /publish が必要です。",
    designRebuildNote:
      "変更は次回のビルド/公開で反映されます。Studio 自身の配色は再起動で更新されます。",
    designSaveFailed: "保存に失敗: {message}",
  },
};

/** Active UI locale ("en" | "ja"). English until a profile is loaded. */
let studioLang = "en";

/** Pick the UI locale from profile.sourceLang ("ja*" -> ja, anything else -> en). */
function setStudioLang(sourceLang) {
  studioLang = typeof sourceLang === "string" && sourceLang.startsWith("ja") ? "ja" : "en";
}

/** Look up a UI string by key; params replace {name} placeholders. */
function t(key, params) {
  const dict = STUDIO_I18N[studioLang] || STUDIO_I18N.en;
  let text = dict[key] !== undefined ? dict[key] : STUDIO_I18N.en[key];
  if (text === undefined) text = key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split("{" + name + "}").join(String(value));
    }
  }
  return text;
}
