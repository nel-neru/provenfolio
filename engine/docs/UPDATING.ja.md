# エンジン更新の取り込み

> English: [UPDATING.md](UPDATING.md)

エンジンの更新は無料です — いつでも取り込めます。あなたの `data/` が更新とコンフリクトすることは**構造上**ありません。配布リポジトリは `data/` 配下のパスを一切トラッキングしていないため、エンジンの merge があなたのデータに触れることはできないのです。

## 初回のみのセットアップ

GETTING-STARTED の推奨フローに従った場合、この手順は不要です — その時点で clone の origin はすでに `engine` にリネームされています。

```bash
git remote get-url engine || git remote add engine <the-distribution-repo-url-you-were-given>
```

## Studio から(ターミナル不要)

`npm run studio` →「**エンジン更新**」ボタンで、下記の手順をそのまま GUI から実行できます。「更新を確認」で fetch して新着を一覧表示、「今すぐ更新」で merge と再ビルドをログ表示しながら実行します。クリーンに適用できない merge は自動で中止されます — 中途半端な状態は決して残りません。その場合は Claude Code 側で解決してください。完了後は Studio を再起動すると更新後のエンジンで動きます。

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
| `data/`、`site/theme.config.mjs`、`site/src/themes/<あなたのテーマ>/` のみ | 常にクリーンに merge — `data/` とあなた自身のテーマディレクトリについては構造的に保証（upstream にはどちらも存在しません） |
| エンジン側のファイル（コントラクト外の `site/src/**`、`site/src/themes/midnight/` のようなエンジン同梱テーマ、`engine/**`、`.claude/**`） | コンフリクトの可能性あり — 所有者はあなたなので、通常どおり解決してください |

### テーマシステム以前（0.x の `site/src/theme.ts`）にカスタマイズしていた場合

旧 `site/src/theme.ts` を直接編集していたオーナーへ: トークン値を `site/src/themes/<name>/tokens.ts` にコピーし（`midnight` テーマディレクトリのコピーから始めてください）、`site/theme.config.mjs` の `activeTheme` を設定すれば完了です。旧 `theme.ts` は現在アクティブテーマの上に被さるエンジン側のシムであり、編集を残したままにすると今後の merge でコンフリクトします。

### 配布リポジトリから data/ が削除される前（2026-07）に clone した場合

配布リポジトリが `data/` をトラッキング対象から外す前に作られた clone では、次回の `git merge engine/main` 時に `data/profile.json`、`data/manifest.json`、`data/derived/aggregates.json` で一度だけ modify/delete コンフリクトが発生します（`.gitkeep` プレースホルダは何も表示されずに削除されます）。あなたのバージョンはすでにワーキングツリーにあるので、そのまま残してください: `git add data/ && git commit`。空になったディレクトリはエンジンのスクリプトが自動的に再作成します。この merge を一度済ませれば、以降 `data/` がコンフリクトすることは二度とありません。

## バージョン管理の規律

- エンジンのバージョン = ルートの `package.json` + `CHANGELOG.md`。
- スキーマ変更は `SCHEMA_VERSION` を上げ、必ずマイグレーションを同梱します — あなたのデータが取り残されることはありません。
- zod のメジャーバージョンは Astro が vendor するものに固定されています。どのワークスペースにも別の zod を追加しないでください（CI がこれをガードしています）。

<!-- i18n:source=engine/docs/UPDATING.md sha256=c774b65df85f6cbbe2cbd5eb8ffa74bd52c0cfd6ae970aab9e18fb42fa3488d1 -->
