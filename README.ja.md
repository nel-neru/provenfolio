# Provenfolio

> English: [README.md](README.md)

**あなたがコミットすると、ポートフォリオもコミットする。**
*The portfolio that stays true without you touching it.*

Provenfolio は、AIエージェント(Claude Code)があなたのリポジトリを徹底分析し、**証拠リンク付きのケーススタディ**と**開発遍歴の可視化**を備えた、日英バイリンガルのポートフォリオサイトを自動生成・自動更新するエンジンです。

> 📘 **非エンジニア向けの完全使用ガイド**: [GUIDE.ja.html](GUIDE.ja.html)(English: [GUIDE.html](GUIDE.html))。リポジトリ取得後にブラウザで開くか、Studio の「📘 使い方ガイド」ボタンからどうぞ。

## なぜ自分で作らずこれを使うのか

| | DIYポートフォリオ | Provenfolio |
|---|---|---|
| 鮮度 | 2ヶ月で陳腐化 | **pushするたび自動更新**(AIコストゼロのrefresh) |
| プライベートリポジトリ | 載せにくい | **ローカル分析** — ソースは手元、クライアント案件も掲載可 |
| ケーススタディ | 自分で書く(書かない) | git履歴+インタビューからAIが執筆、**全主張にコミット単位の証拠** |
| 数値の信頼性 | 自己申告 | **スクリプト実測のみ**(AIは数値を発明できない構造) |
| 情報収集 | — | **Studio**(ローカルGUI)が「何が足りないか」を可視化 |

## クイックスタート

```bash
npm install
# Claude Code を開いて:
/setup        # オンボーディング(〜15分)
/analyze <your-repo-url>
/publish      # Cloudflare Pages へ公開
```

> ⚠️ あなたのインスタンスは必ず**プライベート**リポジトリで運用してください(このリポジトリのフォークは非公開化できません)。手順は `engine/docs/GETTING-STARTED.md` の "Your instance repo must be PRIVATE" を参照。

詳細は `engine/docs/GETTING-STARTED.md` を参照。

## 前提条件

- [Claude Code](https://claude.com/claude-code)(分析エージェントの実行環境)
- Node.js 22+ / git / [gh CLI](https://cli.github.com/)(認証済み)
- Cloudflareアカウント(無料。公開時のみ)

> ⚠️ 分析はあなたのマシン上で実行されます。対象リポジトリのコードの一部は分析のためAnthropic APIに送信されます。詳細は `engine/docs/GETTING-STARTED.md` のデータ取扱いノートを参照。

## アーキテクチャ

```
[エンジン: ソースアダプタ + agents + Studio] → [データ契約: data/*.json (Zod)] → [消費者: サイト / エクスポータ]
```

- `engine/` — 分析パイプライン・スキーマ・エクスポータ(= 製品本体)
- `data/` — あなたのインスタンスデータ(配布リポジトリには含まれない — 初回の validate/build/`/setup` で自動生成)
- `site/` — Astro + Three.js のレンダー層
- `studio/` — ローカル管理GUI(公開されない)

## License

無料で利用できます(プロダクト自体の再販売・再配布は禁止)。詳細は [LICENSE.md](LICENSE.md) — オープンソースではなく source-available です。
