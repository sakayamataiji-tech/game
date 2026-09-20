# NLH Dealer Trainer

ノーリミット・テキサスホールデム（NLH）のディーラー訓練アプリ。問題はすべてランダム生成され、正解は必ずルールエンジン（`src/engine/`）から導出されます（正解のハードコードなし）。

## モード

| モード | 内容 | 入力 |
|---|---|---|
| HAND READING | ボード5枚＋ホール2枚から最強5枚の役を答える | 9択（1〜9キー） |
| WINNER | ショウダウン全員（2〜6人）のハンドを比較し勝者を答える。全員同じ強さなら SPLIT | PLAYER ボタン（1〜6キー）／SPLIT（S） |
| POT | ブラインドからのアクション履歴を追ってポット総額を答える（未コール分は返却後） | 数字入力（テンキー／数字キー、Enter） |
| SIDE POT | オールインを含む履歴から MAIN POT → SIDE POT 1 → … を順に答える。各ポットの Eligible を表示 | 数字入力（Enter で次のポットへ） |
| QUICK TRAINING | 4カテゴリからランダム出題（苦手カテゴリが多め） | 上記に準ずる |

数字入力モードでは 1〜9 キーは選択肢のショートカットに使いません（数字入力専用）。Space で次の問題。

### 難易度 LEVEL 1〜5

| | HAND READING | WINNER | POT | SIDE POT |
|---|---|---|---|---|
| L1 | 明確な役（ペア／ストレート／フラッシュ） | 2人 | プリフロップのみ | 3人・サイドポット1つ |
| L2 | ツーペア／トリップス／フルハウス | 3人 | フロップまで | 3〜4人 |
| L3 | キッカー選択 | 4人（近い役同士） | ターンまで | 4人・サイドポット2つ |
| L4 | ボードプレイ | 5人（キッカー勝負） | リバーまで | フォールド者の投入／未コール返却あり |
| L5 | カウンターフェイト・上位ストレート・6枚同スート・フルハウス比較・ダブルペアボード | 6人（紛らわしい比較） | 6〜9人・レイズ多め | 5〜6人・複数サイドポット |

AUTO は 3問連続正解でレベルアップ、2問連続不正解でレベルダウン。初回起動時の「ディーラー経験」で開始レベルが決まります。

### セッション・スコア・レーティング

- セッションは 10 / 25 / 50 問 / ENDLESS。終了後に SESSION RESULT（Accuracy・Average・Correct・Best Streak・Weakest Skill・Score）。
- 回答時間を計測し FAST / NORMAL / SLOW を表示。スコアは正解 +100、Speed Bonus（+30/+10/0）、Streak ボーナス（連続数×5、上限50）。
- DEALER RATING（S/A/B/C/D）は Accuracy 70%・Speed 15%・Difficulty 15% で算出。OVERALL は単純平均ではなく全回答の合算＋モード網羅率で算出。
- WEAKNESS TRAINING: 出題ごとにスキルタグ（例: Straight Detection, Flush Comparison, Full House Comparison, Side Pot）を記録し、正答率の低いスキルを優先出題。
- REAL TABLE MODE は [docs/real-table-mode.md](docs/real-table-mode.md) に設計のみ。

## スマホゲームとして

- **PWA**: `public/manifest.webmanifest` と `public/sw.js`（オフライン対応のアプリシェル）。Safari の「ホーム画面に追加」／Chrome の「インストール」で全画面アプリとして起動します。アイコンは `public/icons/`。
- **縦持ち・片手操作**: 下部タブバー（HOME / PLAY / STATS / RATING）、親指ゾーンの回答パッド、大きめのタップ領域。トレーニング中はタブバーを隠して画面を広く使います。iPad 横画面では従来の2カラム表示。
- **ゲーム要素**: XP（スコア累計）とディーラーランク（ROOKIE → MASTER DEALER の6段階）、連続プレイ日数、デイリーミッション（今日10問プレイ／7問正解）、連続正解コンボ表示、正誤のバイブレーション（RATING 画面で ON/OFF）。
- ストア配信用のネイティブ化（Capacitor 等）は未対応。静的サイトなのでそのままラップできます。

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

バックエンドはありません。成績はブラウザの localStorage（キー `nlh-dealer-trainer.stats`、`schemaVersion: 2`、v1 からは自動移行）に保存されます。総回答数・正解数・正答率・平均回答時間・カテゴリ別・難易度別・スキル別・日別・連続正解・Best Streak・スコアを保持し、`StorageLike` を差し替えれば Supabase 等に移行できます。

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
    scenarioGenerator.ts  各モードのランダム出題（LEVEL 1〜5、合法手のみで進行を生成し、正解はエンジンで導出）
    skills.ts             出題ごとのスキルタグ（弱点分析用）
    rating.ts             速度評価・スコア・DEALER RATING
    positions.ts          BTN/SB/BB/UTG… のポジション名
  components/             カード・テーブル・アクションログ・選択肢・テンキー・Trainer
  modes/                  HAND READING / WINNER / POT / SIDE POT の画面
  lib/                    統計（localStorage, schemaVersion 2）・セッション集計・表示フォーマット・入力フック
  app/                    Next.js App Router（/ , /train/[mode]/ , /stats/ , /profile/）
docs/real-table-mode.md   REAL TABLE MODE（Phase 2）の設計メモ
test/                     vitest
```
