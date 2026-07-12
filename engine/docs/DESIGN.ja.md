# デザインシステムとテーマ

> English: [DESIGN.md](DESIGN.md)

サイトは2つの層から組み立てられます。エンジンが所有する**データ結合コンポーネント**(`site/src/components/`)はコンテンツ契約 — 証拠リンク、メトリクスチップ、ケーススタディ — を描画し、見た目が変わっても決して変化しません。**見た目** — 色、フォント、レイアウト、ページ構成 — は差し替え可能な**テーマパッケージ**に住んでいます。WordPress のメンタルモデルです: コンポーネントはプラグイン、テーマはテーマ。テーマを切り替えれば、`data/` の1バイトにも証拠契約の1行にも触れずに、プレゼンテーションのすべてのピクセルが変わります。

## デフォルトテーマ: midnight

ダークで、シネマティックで、静か。漆黒に近いサーフェスの上にペリウィンクルのアクセント(`#7c9aff`)を1色だけ、影なしのフラットな 1px ボーダー、本文は Inter Variable、数値/コードは JetBrains Mono — どちらもセルフホストの woff2。CJK は数 MB 級のフォント積載を避けるためシステムスタック('Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo')で描画します。モーションは控えめ: スクロールリビール、ホームサーフェスの WebGL ヒーロー1つ、すべて `prefers-reduced-motion` でゲートされています。

## テーマパッケージの構造

テーマは `site/src/themes/<name>/` 配下のディレクトリで、厳密な必須形状を持ちます — ファイルが欠けていれば静かなフォールバックではなく、明示的なビルドエラーになります:

| パス | 所有するもの |
|---|---|
| `tokens.ts` | `export const theme: ThemeTokens` — すべての色、フォント、角丸、余白、Webフォント宣言。CSS 変数・3D ヒーロー・OG 画像・Studio がすべてここから導出される単一ソース。 |
| `styles.css` | テーマのスタイルシート。エンジンコンポーネントが期待する共有プリミティブクラスを含みます: `.card`、`.chip`、`.section-title`、`.evidence-link`。 |
| `components/Header.astro`、`Footer.astro` | サイトのクローム。共有レイアウト `Base.astro` から委譲されます。 |
| `components/HomePage.astro`、`ProjectsPage.astro`、`ProjectPage.astro`、`AboutPage.astro`、`HistoryPage.astro`、`OverviewPage.astro` | ページ構成。それぞれがロード済みデータを受け取ってレイアウトします。データ自体はエンジン所有のプリミティブを通って流れます。 |

仕組み:

- **`site/theme.config.mjs`** が買い手向けのスイッチ — 1行だけ: `export const activeTheme = "midnight";`。
- **`@theme` Vite エイリアス** — `astro.config.mjs` が `@theme` を `src/themes/<activeTheme>` に向けるので、Astro コードは `@theme/components/Header.astro` のようにテーマファイルを import します。Astro/Vite のコードは必ずこのエイリアスを使い、`site/src/theme.ts` は決して import しません。
- **`site/src/theme.ts`** は非 Vite コンシューマ(OG エクスポーター、Studio)向けの tsx 側シムです。自力で `activeTheme` を解決し、`theme`、`themeCssVars()`、`themeFontFaces()` を再エクスポートします。
- **切り替え後は再起動。** エイリアスは設定ロード時に解決されるため、`theme.config.mjs` の変更には `npm run dev` の再起動が必要です(素の `npm run build` は常に反映します)。

## トークン語彙

`tokens.ts` は `ThemeTokens` オブジェクト(`site/src/lib/theme-types.ts`)をエクスポートし、`cssVarsFor()`(`site/src/lib/theme-css.ts`)が必須キーを検証(欠けていれば明示的なビルドエラー)した上で CSS カスタムプロパティとして出力します。コンシューマ: **css** = global.css + テーマの styles.css、**hero** = 3D ヒーロー(computed の `--viz-1`/`--accent` を読む)、**og** = OG 画像エクスポーター(トークン値を直接 import)。Studio は `/theme.css` ルートを通じて出力セット全体を消費します。

必須キー(安定契約):

| トークンキー | CSS 変数 | コンシューマ |
|---|---|---|
| `accent` | `--accent` | css, hero, og |
| `accentSoft` | `--accent-soft` | css |
| `bg` / `bgRaised` / `bgOverlay` | `--bg` / `--bg-raised` / `--bg-overlay` | css, og(`bg`、`bgRaised`) |
| `line` | `--line` | css, og |
| `text` / `textDim` / `textFaint` | `--text` / `--text-dim` / `--text-faint` | css, og |
| `ok` / `warn` | `--ok` / `--warn` | css |
| `viz`(5要素タプル、低 → 高) | `--viz-0` … `--viz-4` | css, hero(`--viz-1`) |
| `fontSans` / `fontMono` | `--font-sans` / `--font-mono` | css |
| `radius` / `radiusSmall` | `--radius` / `--radius-sm` | css |
| `maxWidth` | `--max-w` | css |

オプションキー(追加拡張):

| トークンキー | CSS 変数 |
|---|---|
| `error` | `--error` |
| `fontDisplay` | `--font-display` |
| `colorScheme` | `--color-scheme` |
| `space[]` | `--space-1` … `--space-n` |
| `fontSize.{xs,sm,base,lg,xl,display}` | `--text-<key>` |
| `shadow.{sm,md,lg}` | `--shadow-<key>` |
| `showcase.accent2` / `showcase.heroScale` | `--show-accent2` / `--show-hero-scale` |
| `webfonts[]` | `fontFacesFor()` が `@font-face` ブロックとして描画 |

**追加のみのルール。** 必須キーとその出力変数を改名・削除してはいけません — ヒーローと OG エクスポーターはすべてのテーマで名前を頼りに読み取ります。新しい能力は新しい*オプション*キーとして追加し、オプション変数を消費する CSS は必ず `var(--x, fallback)` のフォールバックを持たせて、そのキーを省略したテーマでもビルドが成立するようにします。

## 2つのサーフェス

`Base.astro` は `surface` prop を `<body data-surface="...">` として描画します(デフォルトは `"read"`)。テーマのホームページが `Base` に `surface="showcase"` を渡すことでオプトインします。テーマは大胆なルールを `body[data-surface="showcase"]` のスコープに入れます。

| サーフェス | ページ | 許されること |
|---|---|---|
| `showcase` | ホーム | ぶっ飛んで良い: WebGL、キネティックタイポグラフィ、特大のディスプレイ書体、セカンダリアクセント。 |
| `read` | projects、プロジェクト詳細、about、history、overview | 穏やかなエディトリアル。コンテンツ第一、印刷に近い抑制。 |

サーフェスを問わない、ハードな劣化ルール:

- `prefers-reduced-motion: reduce` には静的なコンポジションを — 遅いアニメーションではなく、デザインされた静止状態を返します。
- JavaScript なしでも名前・ナビゲーション・コンテンツは表示されます。WebGL やキネティック演出はサーバーレンダリング済み HTML の上の強化にすぎません。
- `/overview` は印刷セーフを維持します(「この PDF を採用担当者に渡す」ページです)。

**Studio はデザインサーフェスではありません。** コックピットは `/theme.css` ルートを通じてアクティブテーマのパレットとフォントを継承しますが、そこまでです: レイアウトは固定・実用本位で、編集速度に最適化されています。`/design` の提案が Studio をモックすることはなく、`apply` が `studio/public/**` を再スタイルすることもありません — オーナー自身の道具では、使いやすさがアートディレクションに勝ちます。

## デザイン変更のガードレール

デザインを刷新するエージェント/人間のための MUST リスト。すべて CI 強制または契約の荷重を受けています:

- **決して触れない**: `data/`、`engine/schemas/`、`engine/sources/`、エクスポーターのロジック。デザイン作業は `site/src/themes/` と `theme.config.mjs` に住みます。`site/src/theme.ts` はエンジン側のシムであり、カスタマイズポイントではありません。
- **データは共有プリミティブを通して描画する**(`EvidenceLink`、`MetricChips`、`ProjectCard`、`CaseStudy`、`CategoryBadge`、`TechStackList`、`Screenshots`、`viz/*`)。これが証拠契約です: サイト上のすべての数値はスクリプトが生成した `metrics` から来ており、すべての主張は `evidence` 参照を持ちます。テーマはこれらのコンポーネントをスタイリングします — 再実装はしません。
- **UI 文字列は i18n 辞書のみ**(`site/src/lib/i18n.ts`、`studio/public/i18n.js`)。`en` と `ja` の両方に追加します。テーマコンポーネントに UI コピーをリテラルで書いてはいけません。
- **コード・コメント・ドキュメントは英語のみ**(そうでなければ `npm run check:i18n` が失敗します)。
- **オーナー非依存**: 名前・URL・ロケールをハードコードしない — `data/profile.json` を読みます。
- **a11y を維持**: スキップリンク、`:focus-visible` スタイル、reduced-motion の no-op パス、本文テキストはサーフェスに対して 4.5:1 以上のコントラスト。
- **トークンキー名を維持**: OG エクスポーターと 3D ヒーローが消費するもの(上の表)。
- **新しい npm 依存を追加しない**。Studio はゼロ依存のバニラ JS のまま。
- **終了条件** — デザイン変更の完了前に4つすべてがグリーンであること:

```bash
npx tsc --noEmit
npm run check:i18n
npm run validate
npm run build
```

## オーナーのデザインブリーフ

`data/design/brief.md` はオーナーの恒常的なデザイン方針です: 自由形式、言語も自由(`data/**` 全体が日本語リントの対象外)、オーナー所有、インスタンスリポジトリにコミットされ、エンジンのシードは決して作成しません。存在する場合、**デフォルトの方向性より優先**されます — デザイン作業を行うエージェントは最初にこれを読みます。作成・更新は `/design brief` で行います。典型的なセクション:

- ムードワード
- 憧れのサイト
- サーフェスごとのエネルギーレベル(穏 … ぶっ飛び)
- タイポグラフィの方向性
- 色の直感
- 絶対にやらないこと
- 決定ログ(何を試し、何を却下し、なぜか)

## /design ワークフロー

`/design` には5つのモードがあります: `brief`(オーナーにインタビューして `data/design/brief.md` を作成/更新)、`propose`(競合するデザイン方向を使い捨ての静的 HTML モックアップとして `workspace/design/` に生成し、ポート 4700 で配信して並べて比較)、`apply`(選ばれた方向を `site/src/themes/` 配下の本物のテーマパッケージとして実装)、`switch`(`theme.config.mjs` をインストール済みテーマに切り替え)、`status`(アクティブテーマ、ブリーフの鮮度、モックアップの残骸を報告)。モックアップは `workspace/` の産物です — 一時的で、gitignore 済みで、消しても安全。エンジン品質のコードを生むのは `apply` だけです。

## Webフォントポリシー

- Webフォントは `site/public/fonts/` の**セルフホスト** woff2 ファイルで、テーマごとに `tokens.webfonts`(family、file、weight、style、任意で preload/unicodeRange)で宣言します。`fontFacesFor()` がデフォルト `font-display: swap` で `@font-face` ブロックを描画します。
- **数 MB 級の CJK フォントを同梱しないこと。** CJK テキストはシステムスタックに任せます(`fontSans` に JP フォールバックを列挙)。デザインが本当にカスタム CJK 書体を必要とする場合は、先にサブセット化してください — レシピへのポインタは [CUSTOMIZING.md](CUSTOMIZING.md) にあります。

<!-- i18n:source=engine/docs/DESIGN.md sha256=6fa0402c5c5332cc1ff941cc48517102f30c7a4efbfdc2b132f545113dca4856 -->
