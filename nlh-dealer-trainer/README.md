# NLH Dealer Trainer

ノーリミット・テキサスホールデム（NLH）のディーラー訓練アプリ。問題はすべてランダム生成され、正解は必ずルールエンジン（`src/engine/`）から導出されます（正解のハードコードなし）。

## モード

| モード | 内容 | 入力 |
|---|---|---|
| HAND READING | ボード5枚＋ホール2枚から最強5枚の役を答える | 9択（1〜9キー） |
| WINNER | ショウダウン全員のハンドを比較し勝者を答える。全員同じ強さなら SPLIT | 席ボタン（1〜4キー）／SPLIT（S） |
| POT | ブラインドからのアクション履歴を追ってポット総額を答える（未コール分は返却後） | 数字入力（テンキー／数字キー、Enter） |
| SIDE POT | オールインを含む履歴からメイン／サイドポットの金額と参加資格者を答える | 数字入力＋席トグル |

数字入力モードでは 1〜9 キーは選択肢のショートカットに使いません（数字入力専用）。

## ルール（固定）

- レイズは「レイズ to（そのストリートの合計投入額）」で統一。
- ミニマムレイズは直前のベット／レイズ幅以上。ショートオールイン（ミニマム未満のオールイン）は、すでにアクション済みのプレイヤーのレイズ権を再開しない。
- 相手が全員オールイン（誰も応じられない）の場合はコール／フォールドのみ。
- 未コールのベット／レイズ分は本人に返却し、ポットに含めない。
- アンテなし。ヘッズアップはボタンが SB を出しプリフロップ先行。
- SPLIT は MVP では「全員が同じ強さ」の完全スプリットのみ出題（エンジン自体は複数勝者を返せる）。

## 開発

```bash
cd nlh-dealer-trainer
npm install
npm run dev        # http://localhost:3000
npm test           # Poker Engine / 統計のユニットテスト（vitest）
npm run typecheck
npm run build      # out/ に静的サイトを出力（output: "export"）
NEXT_PUBLIC_BASE_PATH=/game/nlh-dealer-trainer npm run build   # サブパス配信用
```

バックエンドはありません。成績はブラウザの localStorage（キー `nlh-dealer-trainer.stats`、`schemaVersion` 付き）に保存されます。

## 構成

```
src/
  engine/                 ルールエンジン（UI 非依存・全モジュールにテストあり）
    cards.ts              カード型・パース
    deck.ts               52枚デッキ
    shuffle.ts            シード付き乱数（mulberry32）と Fisher-Yates
    handEvaluator.ts      5〜7枚から最強5枚を評価（ホイール、ロイヤル、複数トリップス等対応）
    handComparator.ts     ハンド比較・勝者判定（複数勝者を返す）
    betting.ts            NLH ベッティング状態機械（raise-to、ミニマムレイズ、ショートオールイン規則）
    potCalculator.ts      履歴を再生してポット／ストリート別内訳を計算
    sidePotCalculator.ts  投入額とフォールド状態からメイン／サイドポットと返却額を計算
    scenarioGenerator.ts  各モードのランダム出題（合法手のみで進行を生成し、正解はエンジンで導出）
    positions.ts          BTN/SB/BB/UTG… のポジション名
  components/             カード・テーブル・アクションログ・選択肢・テンキー・Trainer
  modes/                  HAND READING / WINNER / POT / SIDE POT の画面
  lib/                    統計（localStorage, schemaVersion）・表示フォーマット・入力フック
  app/                    Next.js App Router（/ , /train/[mode]/ , /stats/）
test/                     vitest
```
