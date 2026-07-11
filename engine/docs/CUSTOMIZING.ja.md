# サイトのカスタマイズ

> English: [CUSTOMIZING.md](CUSTOMIZING.md)

## カスタマイズ契約

**ここを編集する = 永久に安全**(エンジンの更新がこれらのパスに触れることはありません):

| パス | 管理できる内容 |
|---|---|
| `site/src/theme.ts` | すべての色・フォント・角丸 — 外観全体。3D ヒーローと OG 画像も同じトークンを読むため、一度の編集で全体のスキンが変わります。 |
| `site/src/overrides/` | 独自のコンポーネント/スタイル。シャドーイングしたページ(下記)から import します。 |
| `data/**` | すべてのコンテンツ。 |

**エンジンファイルを編集する = merge の責任はあなたが持つ。** `site/src/`、`engine/`、`.claude/` 配下のそれ以外はエンジン領域です。編集してもかまいませんが(あなたのコピーです)、その場合エンジン更新時に手動での merge が必要になります(UPDATING.md を参照)。

## レシピ

### アクセントカラー / パレットの変更
`site/src/theme.ts` → `accent` と `viz` ランプ。ダークのベースも同様です。リビルドすれば、OG 画像とヒーローに自動的に反映されます。

### フォントの差し替え
`theme.ts` の `fontSans`/`fontMono`。セルフホストの Web フォントを使う場合は `site/src/styles/global.css` に `@font-face` を追加してください(`font-display: swap` は維持すること。CJK フォントはサブセット化しないと、読み込みに数秒の代償を払うことになります)。

### ページの追加
`Base` レイアウトと `lib/data.ts` のアクセサを使って `site/src/pages/<name>.astro`(+ `en/<name>.astro` ラッパー)を作成します。新規ページはあなたのものです — エンジン更新と衝突しません。

### オプションの装飾(意図的に同梱していません)
v1 のモーション言語は意図的に控えめにしています(リビール + ヒーロー)。さらに加えたい場合:
- **マグネティックカーソル**: インタラクティブ要素に向けて小さく `mousemove` で lerp させる演出 — `site/src/overrides/cursor.ts` に追加し、Base から読み込みます。必ず `prefers-reduced-motion` ガードの配下に置いてください。
- **フィルムグレイン**: SVG の `feTurbulence` を使った固定オーバーレイ div。低い不透明度(2〜4%)と `pointer-events: none` を指定します。
- **ページ遷移の調整**: Astro View Transitions は `transition:animate` で要素ごとのカスタムアニメーションを受け付けます。

### アナリティクス
`data/profile.json` → `analytics.cloudflareToken`(Cloudflare Web Analytics、無料)— ビーコンは自動で挿入されます。

### レンダリング層を丸ごと置き換える
サイトは `data/*.json` を消費する差し替え可能なコンシューマです。`engine/` を残したまま、任意のフレームワークを同じ契約に向ければ動きます(`engine/schemas` はプレーンな Zod + TS 型をエクスポートしています)。メンテナンス済みテーマは失いますが、パイプラインは何も失いません。

<!-- i18n:source=engine/docs/CUSTOMIZING.md sha256=679e3007418041f52df8fbe5963d1db6461dac679744038525f181b1e42a7334 -->
