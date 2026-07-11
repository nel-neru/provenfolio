# データコントラクト

> English: [DATA-CONTRACT.md](DATA-CONTRACT.md)

すべてのコンテンツは、唯一の信頼できる情報源である `data/` 配下の検証済み JSON を経由します。スキーマは `engine/schemas/`(Zod)にあり、パイプラインスクリプト(書き込み時)、Astro サイト(ビルド時、コンテンツコレクション経由)、Studio(フォームバリデーション)、各エクスポーターがインポートします。**zod のインスタンスは 1 つだけ。Astro がベンダリングするメジャーバージョンにリポジトリルートで固定**されており、一致は CI が検証します。

## ファイル

| ファイル | スキーマ | 書き込み元 |
|---|---|---|
| `data/profile.json` | `profile.ts` | /setup、Studio |
| `data/manifest.json` | `manifest.ts` | emit(upsert)、Studio(featured/placement/order) |
| `data/projects/<id>.json` | `project.ts` | **emit のみ**(+ /edit および Studio の文章エディタ経由で認められた手動編集) |
| `data/intake/<id>.json` | `intake.ts` | Studio フォーム、/analyze インタビュー |
| `data/activities/*.json` | `activities`(同梱、v1 では未使用) | 将来のアダプター(x、blog) |
| `data/derived/aggregates.json` | `aggregates.ts` | aggregate スクリプト(手動編集禁止) |

## 主要な不変条件

- **`schemaVersion`** はすべてのドキュメントに付与されます。`SCHEMA_VERSION` を上げるエンジン更新にはマイグレーションが同梱されます — `npm run migrate` を実行してください。
- **`localizedText`** = `{ "<lang>": "text" }` 形式のレコード。`profile.sourceLang` が信頼できる情報源で、空文字列は未翻訳を意味します(featured プロジェクトは publish 時にブロックされます)。
- **`metrics` はスクリプトの領域です。** 抽出 → `toProjectMetrics` によってのみ生成されます。`total` と `byOwner` の分離により、チームリポジトリの数値が正直に保たれます。
- **`highlights[].evidence` は必須です**(commit/file/pr/release/ownerInput/url)。emit 時に機械的に検証されます。
- **`caseStudy.results` は意図的にオプションです。** オーナーから提供された成果がない場合、results セクションは生成されません(サイトは代わりにエンジニアリング成果のストリップを表示します)。これが『捏造しない』保証です。
- **`generated.contentHashes`**: emit 時にフィールドごとに計算される SHA-256。ハッシュの不一致 = あなたが編集した = パイプラインが黙って上書きすることは決してありません。Studio や /edit で文章を編集するとハッシュは意図的に古いまま残ります — これはバグではなく保護メカニズムです。
- **`sources[]` は配列です**: 1 つのプロジェクトに複数のリポジトリを束ねられます(`/analyze --attach`)。ソースの `type` ユニオン(`github | manual | local`)が、スキーマ変更なしに将来のアダプターを差し込むための接続点です。

## 編集ルール(手動で触ってよいもの)

直接編集しても安全なもの(次回ビルド時に検証されます):
- `profile.json` — すべて編集可。
- `manifest.json` — `featured`、`order`(Studio を使う方が簡単です)。
- プロジェクトの文章フィールド — `/edit` または Studio 経由を推奨します(翻訳の同期を保ち、下記の制約を守ってくれます)。

手動編集にも引き続き適用される制約:
- 新しい数値には出典が必要です。まず intake の `outcomes` に追加してください。
- `metrics`、`generated`、`completeness` には触れないでください — スクリプトの領域であり、refresh 時に上書きされます。
- 残す highlight から `evidence` を削除しないでください。

手動編集後は `npm run validate` を実行してください。いずれにせよ、ビルドはコントラクトに違反するデータを拒否します。

<!-- i18n:source=engine/docs/DATA-CONTRACT.md sha256=3b68335057f6b25646b63e2ad075511a1d3e525c2c1318615f87bb6a4d044a6c -->
