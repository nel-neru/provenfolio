# ソースの拡張 — 設計ノート

> English: [EXTENDING-SOURCES.md](EXTENDING-SOURCES.md)

正直な現状: v1 に同梱されるアダプタは **2 つ** — `github`(フル構成: fetch/extract/enrich/emit)と `manual`(薄い構成: intake → prose → `emit --manual`)です。以下の抽象化はこの 2 つによってのみ実証されています。それ以外の内容はすべて、出荷済みスキーマに基づいて書かれた設計意図であり、約束ではありません。

## アダプタの形

```
engine/sources/<type>/
  fetch    — get raw material into workspace/<id>/   (scripts; network allowed)
  extract  — deterministic numbers → workspace/<id>/stats.json-like artifacts
  enrich   — agent judgment over the raw material    (writes workspace/ only)
  emit     — normalize into the contract             (extend emit.ts or a sibling)
```

スキーマ変更なしでコントラクトがすでにサポートしているもの:

- `sources[]` は、enum を 1 つ拡張するだけで新しい `type` 値を受け入れます(`engine/schemas/source.ts`)。
- `metrics` はオプションです — git 履歴を持たないソースは単に省略すればよく、サイト側の density ゲートが欠落を処理します。
- `data/activities/`(スキーマは出荷済み、v1 では空): `relatedProjectIds[]` を持つタイムスタンプ付きアイテム(投稿、記事)— コンテンツストリーム系ソースの受け皿で、プロジェクトに紐づきます。

## 候補アダプタ(おおよそ価値/工数の順)

### zenn / qiita / blog RSS(次に作るべき最有力アダプタ)
無料 API / 素の RSS。fetch = 投稿の取得、extract = 件数・日付・タグ、enrich = 投稿ごとの関連度評価と、あなたのプロジェクトの技術スタックに対する `relatedProjectIds` のマッチング、emit → `data/activities/`。サイトには「執筆」セクションとプロジェクトごとの関連記事が追加されます。認証不要、コストゼロ — しかも activities スキーマをエンドツーエンドで検証できます。

### x (twitter)
**まずはアーカイブインポート**: X では全アーカイブをダウンロードできます(Settings → Your account → Download an archive)。アダプタは `tweets.js` をローカルでパースします — API コストゼロ、認証ゼロ、全履歴を取得。extract = 投稿頻度、トピック、エンゲージメント数(すべての数値はアーカイブ由来 = 出所の面で安全)、enrich = スレッド/トピックのクラスタリングとプロジェクトへの紐づけ。有料 API による継続的な refresh は意図的にスコープ外としています(利用者ごとに発生する継続コストに加え、ベーシックティアの読み取り制限では割に合わないため — 必要になったらアーカイブを再インポートしてください)。

### local(同梱スタブのフル版)
`.git` はあるがホスト先リモートのないディレクトリを分析します: `workspace/<id>/repo` に配置(またはジャンクション)し、github の extract を実行(任意の git リポジトリで動作)、`fetch-github-meta` はスキップします。リンクを張れないクライアントワークが、正直なメトリクスと `visibility: "private"` を備えた完全なケーススタディになります。

### monorepo subtree
`sources[].path` はスキーマ上で予約済みです。抽出では `git log -- <path>` とファイル一覧をサブツリーに絞り込むことになります。clone/detect の配管は存在しますが、フィルタリングはまだありません。

## 新しいアダプタのチェックリスト

1. `sourceType` enum を拡張する(1 行)+ 標準ブロックを emit するならコントラクトの他の部分は一切変更しない。
2. 数値は必ず extract ステップからのみ生成する。エージェントに渡すのは findings ファイルであり、API ではない。
3. enrich ステージが生成するすべての主張には、emit が検証できる evidence kind が必要(kind を追加する場合は emit に verifier も追加する)。
4. コストのガードレールを守る: エージェントに読ませる量に予算を設け、大きな入力は事前チェックする。
5. `/analyze` のモードディスパッチを配線し、ソースがオーナー由来の情報を必要とするなら Studio の intake バリアントも用意する。

<!-- i18n:source=engine/docs/EXTENDING-SOURCES.md sha256=bad73dc58891b6105914705785e53877aaee88160c48844d1d938eea1e1a7df2 -->
