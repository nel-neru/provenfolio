# 分析パイプライン

> English: [PIPELINE.md](PIPELINE.md)

```
[fetch/extract: scripts] → [intake: owner] → [enrich: agents] → [emit: script] → data/*.json → [site/exporters]
```

この分業体制こそが、本プロダクトの信頼モデルです。

| 決定論的処理 → スクリプト | 判断 → エージェント | 事実 → オーナー(intake) |
|---|---|---|
| commit 数、アクティブ日数、期間 | アーキテクチャの読み込み | カテゴリ、役割、チーム規模 |
| 日別アクティビティ(ヒートマップの元データ) | 「なぜこの技術スタックか」のナラティブ | 動機、想定オーディエンス |
| ベロシティ、ピーク日 | ハイライトの選定 | デモ/ストアのリンク |
| 言語別バイト数(GitHub API) | 開発フェーズと転換点 | **定量的な成果** |
| PR/リリース/コントリビューター数 | ケーススタディの文章 | スクリーンショット |
| オーナー分と全体の帰属分析 | 翻訳 | 修正 |

## ステップ(`/analyze <url>` が実際に実行する内容)

1. `engine/sources/github/clone-repo.ts <url>` — `workspace/<id>/repo` への冪等な clone/fetch(`--filter=blob:none`: 全履歴のメタデータを取得し、blob はオンデマンド。Windows セーフな設定)。
2. `extract-git-stats.ts <id>` — git log → `workspace/<id>/stats.json`。パイプ文字に安全な `%x1f` 区切り、明示的な maxBuffer、merge commit の除外、退化リポジトリへのガード。**byOwner メトリクス**は `profile.identities` でフィルタされるため、チームリポジトリや fork によって数値が水増しされることはありません。
3. `fetch-github-meta.ts <id> <owner/name>` — `gh api`: 言語構成、スター数、マージ済み PR のタイトル/本文(squash-merge 運用のリポジトリにおけるナラティブの情報源)、リリース/コントリビューター数。オフライン時はソフトに失敗します。
4. Intake チェック → 不完全な場合はインタビューを実施(`data/intake/<id>.json`)。
5. `repo-analyzer` エージェント → `workspace/<id>/findings/architecture.md` + Mermaid 図。ファイルをサンプリング(ツリー + マニフェスト + 主要ファイル)。予算内で実行され、網羅的ではありません。
6. `git-historian` エージェント → `findings/phases.md`: 意思決定の考古学 — フェーズと転換点を、それぞれ commit/PR の裏付け付きで記録します。
7. `case-study-writer` エージェント → `workspace/<id>/prose.json`(ソース言語)。カテゴリに応じてテンプレートを選択: business(課題→解決→成果)と craft(動機→アプローチ→学び)。
8. `translator` エージェント → prose.json のターゲットロケールを埋めます(文体: 簡潔で成果ファースト。数値は正確にそのままコピー)。
9. `emit.ts <id>` — `data/projects/` に書き込む**唯一**の存在:
   - メトリクスは stats.json から**無条件に**再注入(エージェントは数値を改変できません)、
   - **数値リント**: 文章中のすべての数値は metrics/intake の成果/検証済み事実のいずれかに存在しなければなりません、
   - **禁止フレーズリント**: 検証不能な誇大表現は却下されます、
   - **エビデンス検証**: commit SHA は `git cat-file` で、ファイルパスはディスク上で、PR 番号はマージ済み PR と照合して確認 — 捏造された裏付けはパイプラインを失敗させます、
   - **人間による編集の保護**: SHA-256 の contentHashes により、あなたが編集したフィールドは diff の確認なしに上書きされることはありません、
   - マニフェストの upsert、アグリゲートの再計算、完全性スコアリング。
10. `validate-data.ts` — 同じ Zod スキーマがサイトのビルド時にも再度ゲートとして機能します(二重の強制)。

## 失敗と再開

各 enrich ステージは出力ファイルを永続化するため、`/analyze` を再実行すると出力が既に存在するステージはスキップされます。リント失敗時は問題のフィールド名が示されます — `workspace/<id>/prose.json` を修正して emit を再実行してください。`data/` を直接編集してリントを回避することは絶対にしないでください。

## リフレッシュループ

`npm run refresh` = ステップ 1–3 + 全プロジェクトへの `emit --metrics-only`: 数値は更新され、文章は変更されず、AI コストはゼロです。しきい値(30 commit / 60 日)を超えるドリフトは `generated.staleSince` にフラグを立て → Studio に表示され → `/refresh <id>` があなたの編集を保持したまま enrich を再実行します。

<!-- i18n:source=engine/docs/PIPELINE.md sha256=ab47f4dc69602d91469fb0d3b8c13ff67484932c7118caed0cf39125ccad0f0b -->
