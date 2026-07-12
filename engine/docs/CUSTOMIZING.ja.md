# サイトのカスタマイズ

> English: [CUSTOMIZING.md](CUSTOMIZING.md)

## カスタマイズ契約

**ここを編集する = 永久に安全**(エンジンの更新がこれらのパスに触れることはありません):

| パス | 管理できる内容 |
|---|---|
| `site/theme.config.mjs` | どのテーマをアクティブにするか、そして訪問者スイッチャーがどのテーマを公開するか。 |
| `site/src/themes/<あなた自身のテーマ>/` | あなたのテーマパッケージ — トークン、スタイルシート、ページコンポーネント。外観のすべて。3D ヒーローと OG 画像も同じトークンを読むため、一度の編集で全体のスキンが変わります。 |
| `data/**` | すべてのコンテンツ(デザインブリーフ `data/design/brief.md` を含む)。 |

**エンジンファイルを編集する = merge の責任はあなたが持つ。** `site/src/`、`engine/`、`.claude/` 配下のそれ以外はエンジン領域です。編集してもかまいませんが(あなたのコピーです)、その場合エンジン更新時に手動での merge が必要になります(UPDATING.md を参照)。エンジン同梱テーマも同様です: `site/src/themes/midnight/` をその場で編集しても動きますが、クリーンな merge を保ちたければ先に自分のテーマディレクトリへコピーしてください。(`site/src/theme.ts` はアクティブテーマの上に被さるエンジン側のシムです — 編集しないでください。)

ガイド付きの方法が良いですか? `/design` は自然言語のブリーフを提案群に変換し、選んだものを適用します。テーマ契約の詳細リファレンスは DESIGN.md です。

## レシピ

### アクセントカラー / パレットの変更
あなたのテーマの `tokens.ts` → `accent` と `viz` ランプ(ベースカラーも同様)。まだエンジン同梱テーマを使っていますか? 先に新しいディレクトリへコピーしてください(下記)。リビルドすれば、OG 画像とヒーローに自動的に反映されます。

### フォントの差し替え
あなたのテーマの `tokens.ts` → `fontSans`/`fontMono`、加えてファイルごとの `webfonts` エントリ。`.woff2` ファイルは `site/public/fonts/` に置きます(`display: "swap"` は維持すること)。CJK はサブセットをダウンロードし(例: google-webfonts-helper)、`unicodeRange` エントリを追加してください — 数 MB のフォントを同梱してはいけません。

### 自分のテーマを作る
`site/src/themes/midnight` → `site/src/themes/<name>` にコピーし、`tokens.ts` / `styles.css` / `manifest.ts`(`name` を設定)/ `components/` を編集し、`site/theme.config.mjs` の `activeTheme` を設定して dev サーバーを再起動します。パッケージ形状のすべてのファイルが必須です — 欠けているファイルは静かなフォールバックではなく、明示的なビルドエラーになります。

### 訪問者向けデザインスイッチャー
`site/theme.config.mjs` → `visitorThemes`。`"all"`(デフォルト)はインストール済みの全テーマを公開します: 各テーマは `/t/<name>/` に事前レンダリングされ、「Design」ドックから訪問者がサイト全体のデザインをその場で切り替えられます(`noindex` 付き、canonical はあなたのルート URL のまま)。名前を列挙すればメニューを絞れ、`["<activeTheme>"]` にすればスイッチャーを完全に無効化できます。

### ページの追加
`Base` レイアウトと `lib/data.ts` のアクセサを使って `site/src/pages/<name>.astro`(+ `en/<name>.astro` ラッパー)を作成します。新規ページはあなたのものです — エンジン更新と衝突しません。

### オプションの装飾(意図的に同梱していません)
標準のモーション言語は意図的に控えめにしています(リビール + ヒーロー)。さらに加えたい場合は、あなたのテーマパッケージの中に追加してください:
- **マグネティックカーソル**: インタラクティブ要素に向けて小さく `mousemove` で lerp させる演出 — テーマの `Header.astro` にスクリプトとして追加します(全ページに載ります)。必ず `prefers-reduced-motion` ガードの配下に置いてください。
- **フィルムグレイン**: SVG の `feTurbulence` を使った固定オーバーレイ div。低い不透明度(2〜4%)と `pointer-events: none` を指定します。
- **ページ遷移の調整**: Astro View Transitions は `transition:animate` で要素ごとのカスタムアニメーションを受け付けます。

### アナリティクス
`data/profile.json` → `analytics.cloudflareToken`(Cloudflare Web Analytics、無料)— ビーコンは自動で挿入されます。

### レンダリング層を丸ごと置き換える
サイトは `data/*.json` を消費する差し替え可能なコンシューマです。`engine/` を残したまま、任意のフレームワークを同じ契約に向ければ動きます(`engine/schemas` はプレーンな Zod + TS 型をエクスポートしています)。メンテナンス済みのテーマ群は失いますが、パイプラインは何も失いません。

<!-- i18n:source=engine/docs/CUSTOMIZING.md sha256=3e7d86128a13af3990b9a845de9c5df1777ce911cffaa6f67187dacf16396c09 -->
