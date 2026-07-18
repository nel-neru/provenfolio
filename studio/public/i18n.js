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

    // profile (data/profile.json editor)
    btnProfile: "Profile",
    profileTitle: "Profile",
    profileIntro:
      "Your identity as shown on the site — display name, intro texts, SEO, and social links. Saved to data/profile.json; the live site updates on the next build/publish.",
    profileBasicHeading: "Basic info",
    profileFieldName: "Display name (name)",
    profileFieldGithubUser: "GitHub username (githubUser)",
    profileFieldEmail: "Email (email)",
    profileFieldSiteUrl: "Site URL (siteUrl)",
    profileFieldDomain: "Custom domain (domain)",
    avatarHeading: "Avatar (avatar)",
    avatarNote:
      'png / jpg / jpeg / webp / gif, max 10MB. Stored in data/assets/. Uploads and removals apply immediately — every other field waits for "Save profile".',
    avatarSaved: "Avatar updated",
    avatarRemoveConfirm:
      "Remove the avatar from the site? (The uploaded file itself is kept in data/assets/.)",
    avatarRemoved: "Avatar removed",
    noAvatar: "No avatar set",
    profileTextsHeading: "Intro texts",
    profileFieldRole: "Role / job title (role)",
    profileFieldTagline: "Tagline (tagline)",
    profileFieldBio: "Bio (bio)",
    seoHeading: "Search & sharing (seo)",
    profileFieldSeoTitle: "Page title (seo.title)",
    profileFieldSeoDescription: "Description (seo.description)",
    socialsHeading: "Social links (socials)",
    socialPlatformPlaceholder: "Platform (e.g. X, Zenn)",
    socialHandlePlaceholder: "Handle (optional)",
    addSocial: "+ Add link",
    skillOverridesHeading: "Skill display corrections (skillOverrides)",
    skillOverridesNote:
      "Site skills are computed from analyzed evidence; use this only to add what analysis can't see or to hide noise.",
    skillNamePlaceholder: "Skill (e.g. AWS)",
    skillCategoryPlaceholder: "Category (optional)",
    addSkillOverride: "+ Add correction",
    profileAdvancedHeading: "Advanced",
    profileAdvancedNote:
      "These drive analysis and translation. Changing languages does not translate existing text by itself — ask Claude Code to re-translate afterwards. Changing identities needs /refresh to recompute ownership metrics.",
    profileFieldSourceLang: "Source language (sourceLang)",
    profileFieldTargetLangs: "Target languages (targetLangs, comma-separated)",
    profileFieldIdentities: "Git identities (identities, one per line)",
    profileFieldAnalytics: "Cloudflare Web Analytics token (analytics.cloudflareToken)",
    profileSave: "Save profile",
    profileSaved: "Profile saved. Rebuild or /publish to update the live site.",
    profileRequiredMissing:
      "Display name, GitHub username, and page title (seo.title) are required.",
    socialRowIncomplete:
      "A social link is missing its platform or URL — fill it in or delete that row.",
    skillRowIncomplete:
      "A skill correction is missing its skill name — fill it in or delete that row.",
    profileConflict:
      "profile.json changed outside this panel (another tab, /setup, or Claude Code). Reopen the Profile panel and redo the edit.",
    unsavedLeaveConfirm: "You have unsaved profile changes. Leave and discard them?",

    // engine update (git-tracked distribution repo)
    btnEngine: "Engine update",
    btnGuide: "📘 Guide",
    engineTitle: "Engine update",
    engineIntro:
      "Pull the latest engine (features, themes, fixes) from the distribution repository. Your data/ — projects, prose, screenshots — is never touched (engine/docs/UPDATING.md).",
    engineVersion: "Current engine version: {version}",
    engineIdleHint: 'Press "Check for updates" to contact the engine repository.',
    engineCheck: "Check for updates",
    engineChecking: "Checking ...",
    engineUpToDate: "✓ You are up to date.",
    engineBehind: "{count} engine update(s) available:",
    engineNoRemote:
      'No "engine" git remote is configured. One-time setup in a terminal: git remote add engine <distribution-repo-url> (see engine/docs/UPDATING.md).',
    engineUpdateNow: "Update now",
    engineConfirm:
      "Merge the engine updates and rebuild now? Your data/ is not touched. Restart Studio afterwards.",
    engineRunning: "An engine update is running ...",
    engineDoneNote:
      "✓ Engine update finished. Restart Studio (stop it, then npm run studio) to run the updated version.",
    engineFailedNote:
      "The update stopped — see the log above. Nothing was left half-merged. You can also ask Claude Code to pull the engine update.",
    engineCheckFailed: "Check failed: {message}",
    engineStartFailed: "Failed to start the update: {message}",
    engineNoRef:
      "Fetched, but engine/main was not found — the distribution repository may use a different branch name. Ask Claude Code to pull the update instead.",
    engineStreamLost:
      'Lost the connection to the update log. The update itself may still be running — press "Check for updates" to re-attach.',
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

    // profile (data/profile.json editor)
    btnProfile: "プロフィール",
    profileTitle: "プロフィール",
    profileIntro:
      "サイトに表示されるあなたの情報 — 表示名・紹介文・SEO・ソーシャルリンク。data/profile.json に保存され、公開サイトには次回のビルド/公開で反映されます。",
    profileBasicHeading: "基本情報",
    profileFieldName: "表示名 (name)",
    profileFieldGithubUser: "GitHubユーザー名 (githubUser)",
    profileFieldEmail: "メールアドレス (email)",
    profileFieldSiteUrl: "サイトURL (siteUrl)",
    profileFieldDomain: "独自ドメイン (domain)",
    avatarHeading: "アバター (avatar)",
    avatarNote:
      "png / jpg / jpeg / webp / gif、最大10MB。data/assets/ に保存されます。アバターの追加・削除はその場で反映されます — 他の項目は「プロフィールを保存」で確定します。",
    avatarSaved: "アバターを更新しました",
    avatarRemoveConfirm:
      "アバターをサイトから外しますか?(アップロード済みのファイル自体は data/assets/ に残ります)",
    avatarRemoved: "アバターを外しました",
    noAvatar: "アバターは未設定です",
    profileTextsHeading: "紹介文",
    profileFieldRole: "肩書き (role)",
    profileFieldTagline: "キャッチコピー (tagline)",
    profileFieldBio: "自己紹介 (bio)",
    seoHeading: "検索・シェア設定 (seo)",
    profileFieldSeoTitle: "ページタイトル (seo.title)",
    profileFieldSeoDescription: "説明文 (seo.description)",
    socialsHeading: "ソーシャルリンク (socials)",
    socialPlatformPlaceholder: "プラットフォーム(例: X, Zenn)",
    socialHandlePlaceholder: "ハンドル(任意)",
    addSocial: "+ リンクを追加",
    skillOverridesHeading: "スキル表示の補正 (skillOverrides)",
    skillOverridesNote:
      "サイトのスキル一覧は分析結果から自動計算されます。分析では見えないものの追加やノイズの非表示にだけ使ってください。",
    skillNamePlaceholder: "スキル(例: AWS)",
    skillCategoryPlaceholder: "カテゴリ(任意)",
    addSkillOverride: "+ 補正を追加",
    profileAdvancedHeading: "上級設定",
    profileAdvancedNote:
      "分析と翻訳の動作に関わる設定です。言語を変えても既存の文章が自動で翻訳されるわけではありません — 変更後に Claude Code へ再翻訳を頼んでください。identities の変更後は /refresh で本人コミット率の再計算が必要です。",
    profileFieldSourceLang: "元の言語 (sourceLang)",
    profileFieldTargetLangs: "翻訳先の言語 (targetLangs、カンマ区切り)",
    profileFieldIdentities: "Gitの本人識別子 (identities、1行に1つ)",
    profileFieldAnalytics: "Cloudflare Web Analytics トークン (analytics.cloudflareToken)",
    profileSave: "プロフィールを保存",
    profileSaved: "プロフィールを保存しました。反映にはリビルドまたは /publish が必要です。",
    profileRequiredMissing:
      "表示名・GitHubユーザー名・ページタイトル (seo.title) は必須です。",
    socialRowIncomplete:
      "ソーシャルリンクにプラットフォームまたはURLが未入力の行があります — 入力するか行を削除してください。",
    skillRowIncomplete:
      "スキル補正にスキル名が未入力の行があります — 入力するか行を削除してください。",
    profileConflict:
      "profile.json がこのパネルの外(別タブ・/setup・Claude Code)で変更されています。プロフィールパネルを開き直してから編集し直してください。",
    unsavedLeaveConfirm: "保存していないプロフィールの変更があります。破棄して移動しますか?",

    // engine update (git-tracked distribution repo)
    btnEngine: "エンジン更新",
    btnGuide: "📘 使い方ガイド",
    engineTitle: "エンジン更新",
    engineIntro:
      "配布リポジトリから最新のエンジン(新機能・新テーマ・修正)を取り込みます。あなたの data/(作品・文章・スクリーンショット)には一切触れません(engine/docs/UPDATING.md)。",
    engineVersion: "現在のエンジンバージョン: {version}",
    engineIdleHint: "「更新を確認」を押すとエンジンのリポジトリに問い合わせます。",
    engineCheck: "更新を確認",
    engineChecking: "確認中 ...",
    engineUpToDate: "✓ 最新の状態です。",
    engineBehind: "{count}件のエンジン更新があります:",
    engineNoRemote:
      "「engine」リモートが未設定です。初回のみターミナルで git remote add engine <配布リポジトリのURL> を実行してください(engine/docs/UPDATING.md 参照)。",
    engineUpdateNow: "今すぐ更新",
    engineConfirm:
      "エンジン更新を取り込んで再ビルドしますか? data/ には触れません。完了後は Studio の再起動が必要です。",
    engineRunning: "エンジン更新を実行中 ...",
    engineDoneNote:
      "✓ エンジン更新が完了しました。Studio を再起動(停止して npm run studio)すると新しいバージョンで動きます。",
    engineFailedNote:
      "更新が途中で停止しました — 上のログを確認してください。中途半端な状態は残っていません。Claude Code に「エンジンの更新を取り込んで」と頼むこともできます。",
    engineCheckFailed: "確認に失敗: {message}",
    engineStartFailed: "更新の開始に失敗: {message}",
    engineNoRef:
      "取得はできましたが engine/main が見つかりません — 配布リポジトリのブランチ名が異なる可能性があります。Claude Code に「エンジンの更新を取り込んで」と頼んでください。",
    engineStreamLost:
      "更新ログへの接続が切れました。更新自体は続いている可能性があります —「更新を確認」を押すと再接続します。",
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
