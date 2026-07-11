# はじめに

> English: [GETTING-STARTED.md](GETTING-STARTED.md)

クローンから公開ポートフォリオまで、45分以内で完了します。

## 前提条件(正直なリスト)

| 必要なもの | 理由 | 費用 |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | 分析エージェントを実行します。本プロダクトは **すでに Claude Code を使っている開発者のために作られています** — あなたがそうでなければ、これはあなたのためのツールではありません。 | 既存のサブスクリプション / API 利用料 |
| Node.js 22+ | エンジンスクリプトとサイトのビルド | 無料 |
| git + [gh CLI](https://cli.github.com/)(認証済み: `gh auth login`) | クローン、GitHub メタデータ取得、プライベートリポジトリへのアクセス | 無料 |
| Cloudflare アカウント | ホスティング(無料プランで十分。`*.pages.dev` の URL、カスタムドメインは任意) | 無料 |

**分析 1 回あたりのトークン費用**(概算、一般的な API 価格の場合): 小規模リポジトリ(コミット 300 未満、ファイル 500 未満)≈ $0.5–2、中規模(コミット 3,000 未満)≈ $2–6。大規模リポジトリでは事前にサイズ警告が出て、ファイルサンプリングの予算が適用されます。再分析は安く済みます(変更のないステージはスキップされます)。`npm run refresh` によるメトリクス更新の AI トークン費用は **ゼロ** です。

## インスタンスリポジトリは必ず PRIVATE に

あなたのクローンはあなたの **インスタンス** になります。`data/` には実名、連絡先リンク、プロジェクト履歴、スクリーンショットが格納され、それらすべてを commit することになります。したがって:

- **配布リポジトリを GitHub 上で fork しないでください。** 公開リポジトリの fork はプライベートにできません — インスタンスデータが公開されてしまいます。
- 配布リポジトリには **`data/` は一切含まれていません**。空のシードは初回の `npm run validate`/`build`(または `/setup`)で生成されます。あなた自身のプライベートリポジトリでは `data/` を自由に commit してください — それが設計どおりの使い方です。
- 推奨フロー:

```bash
gh repo create <you>/<your-portfolio-repo> --private
git clone https://github.com/nel-neru/provenfolio.git <dir> && cd <dir>
git remote rename origin engine        # engine updates arrive from here (see UPDATING.md)
git remote add origin https://github.com/<you>/<your-portfolio-repo>.git
git push -u origin main
```

`origin` が配布リポジトリを指したままの間は、`/setup` と `/publish` はインスタンスデータの commit を拒否します。

## データの取り扱い(NDA の制約がある場合は必読)

分析は **あなたのマシン上で** 実行されます。クローンしたリポジトリが外部に出ることはありません。ただし例外として、エンリッチ処理の際に、選択されたファイル内容・コミットメッセージ・PR タイトルがエージェントのコンテキストとして Anthropic API に送信されます。メトリクス抽出(`refresh`)は完全にローカル + GitHub API のみで動作します。プライベートリポジトリはあなた自身の `gh` 認証を通じて扱われます。プロジェクトの intake で `visibilityOverride: "private"` を設定すると、ソースへのリンクをサイトに表示しないようにできます。

## セットアップ

```bash
npm install
claude        # open Claude Code in the repo
> /setup      # interview → writes YOUR profile
```

クローン直後は `data/` が存在しません — `/setup`(および任意の `npm run validate`/`build`)が空のシードを自動的に作成します。

## 最初のプロジェクト

```bash
> /analyze https://github.com/you/your-best-repo
```

パイプラインはリポジトリをクローンし、決定的な git メトリクスを抽出し、根拠に基づく質問を 3〜8 個あなたに尋ね(成果に関する主張の情報源として許されるのは、あなたの回答だけです)、分析エージェントを実行して、エビデンスにリンクされたケーススタディを出力します。その後:

1. **文章のレビュー**: `npm run studio` → http://localhost:4600(または `/edit <id>` で対話的に)。
2. **スクリーンショットの追加**: Studio にドラッグ&ドロップ(または `data/assets/screenshots/<id>/` にファイルを置く)。
3. **注目プロジェクトに設定**: Studio で ★ を切り替え。
4. **プレビュー**: `/update-site`(または `npm run dev`)。

## 公開する

```bash
npx wrangler login      # once, browser OAuth
> /publish              # gates → build → confirm → deploy to *.pages.dev
```

### カスタムドメイン(あとで、任意)

Cloudflare ダッシュボード → Workers & Pages → 対象プロジェクト → Custom domains → ドメインを追加。リポジトリ側の変更は不要です(`profile.siteUrl` は情報提供用の項目です — canonical/OG URL を正しくするために更新してください)。

### 自動的な鮮度維持(推奨)

`.github/workflows/refresh.yml` を有効化してください(ファイル先頭のコメント参照)。毎週、リポジトリからメトリクスを再抽出し、リビルドして再 deploy します。ヒートマップや言語構成が **AI 費用ゼロ・手間ゼロ** で最新に保たれます — あなたが commit すれば、ポートフォリオも commit するのです。リポジトリの secrets に `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` を、variable に `CF_PAGES_PROJECT` を設定してください。

## 日常的に使うコマンド

| コマンド | 内容 |
|---|---|
| `/analyze <url>` | リポジトリの追加 / 再分析 |
| `npm run studio` | ローカル GUI: intake フォーム、完成度メーター、文章エディタ、メディア管理 |
| `/refresh` | 全メトリクスを今すぐ更新 + 鮮度レポート |
| `/edit <id>` | 文章を対話的に修正(翻訳も同期されます) |
| `/update-site` | 検証 + ビルド + 目視確認 |
| `/publish` | デプロイ(ゲートチェック + 確認つき) |

<!-- i18n:source=engine/docs/GETTING-STARTED.md sha256=940bf53dd1cf17b8907d7a2029f01740f2372c87307f88013ec2fa69d1fa12df -->
