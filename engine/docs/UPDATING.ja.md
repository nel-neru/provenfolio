# エンジン更新の取り込み

> English: [UPDATING.md](UPDATING.md)

エンジンの更新は無料です — いつでも取り込めます。あなたの `data/` が更新とコンフリクトすることは**構造上**ありません。配布リポジトリは `data/` 配下のパスを一切トラッキングしていないため、エンジンの merge があなたのデータに触れることはできないのです。

## 初回のみのセットアップ

GETTING-STARTED の推奨フローに従った場合、この手順は不要です — その時点で clone の origin はすでに `engine` にリネームされています。

```bash
git remote get-url engine || git remote add engine <the-distribution-repo-url-you-were-given>
```

## 更新手順

```bash
git fetch engine
git log --oneline HEAD..engine/main        # see what's new (CHANGELOG.md too)
git merge engine/main
npm install                                 # deps may have moved
npm run migrate                             # applies schema migrations to your data/ (no-op when none or when files are missing)
npm run validate && npm run build           # green = done
```

## 想定されるコンフリクト

| 編集した範囲 | merge の結果 |
|---|---|
| `data/`、`site/src/theme.ts`、`site/src/overrides/` のみ | 常にクリーンに merge — `data/` については構造的に保証（upstream には `data/` 配下のパスが一切存在しません） |
| エンジン側のファイル（コントラクト外の `site/src/**`、`engine/**`、`.claude/**`） | コンフリクトの可能性あり — 所有者はあなたなので、通常どおり解決してください |

### 配布リポジトリから data/ が削除される前（2026-07）に clone した場合

配布リポジトリが `data/` をトラッキング対象から外す前に作られた clone では、次回の `git merge engine/main` 時に `data/profile.json`、`data/manifest.json`、`data/derived/aggregates.json` で一度だけ modify/delete コンフリクトが発生します（`.gitkeep` プレースホルダは何も表示されずに削除されます）。あなたのバージョンはすでにワーキングツリーにあるので、そのまま残してください: `git add data/ && git commit`。空になったディレクトリはエンジンのスクリプトが自動的に再作成します。この merge を一度済ませれば、以降 `data/` がコンフリクトすることは二度とありません。

## バージョン管理の規律

- エンジンのバージョン = ルートの `package.json` + `CHANGELOG.md`。
- スキーマ変更は `SCHEMA_VERSION` を上げ、必ずマイグレーションを同梱します — あなたのデータが取り残されることはありません。
- zod のメジャーバージョンは Astro が vendor するものに固定されています。どのワークスペースにも別の zod を追加しないでください（CI がこれをガードしています）。

<!-- i18n:source=engine/docs/UPDATING.md sha256=ed73d2f76db6b42d976a1bdd465e286843b8277ea795cecd6213ce7430996f69 -->
