# REAL TABLE MODE — 設計メモ（Phase 2）

MVP には含めない。ただし現在のエンジン／UI 構造のまま追加できるよう、依存関係と拡張点を先に決めておく。

## コンセプト

6〜9 人テーブル。ユーザーはディーラー。1 ハンドが実際に進行し、ディーラーは
**Deal → Burn → Flop → Turn → River → Pot → Winner** を操作する。
ミスは即時指摘ではなく、ハンド終了後にまとめてフィードバックするモードを想定する（即時指摘モードも設定で選べるようにする）。

## 既存モジュールの再利用

| 必要な機能 | 既存モジュール | 追加が必要なもの |
|---|---|---|
| デッキ／シャッフル／バーン | `engine/deck.ts`, `engine/shuffle.ts` | `Dealer` 状態機械（配札順、バーン、ボードのオープン手順） |
| ベッティング進行・合法手 | `engine/betting.ts`（`legalActions` / `applyAction` / `startStreet`） | 仮想プレイヤーの行動ポリシー（`scenarioGenerator.ts` の `pickDeepAction` / `pickShoveAction` を分離して再利用） |
| ポット／サイドポット | `engine/potCalculator.ts`, `engine/sidePotCalculator.ts` | なし |
| 勝者判定・ベスト5 | `engine/handEvaluator.ts`, `engine/handComparator.ts` | 各ポットごとの勝者判定（`determineWinners` を `Pot.eligible` で絞って呼ぶ） |
| テーブル表示 | `components/TableView.tsx` | チップ移動アニメーション、バーンカード置き場 |
| 成績記録 | `lib/stats.ts`（skills 集計） | 新スキル ID（`deal-order`, `burn`, `board-open`, `pot-push`, `winner-call`, `misdeal` など）を `engine/skills.ts` に追加するだけ |

## ディーラー操作と正解の導出

ユーザー操作はすべて「エンジンが次に期待する操作」と比較する。正解のハードコードはしない。

```
DealerStep =
  | { kind: "deal"; toSeat: number }          // 配札順（SB から時計回り、2 周）
  | { kind: "burn" }
  | { kind: "open"; street: "flop"|"turn"|"river" }
  | { kind: "collect-bets" }                  // ストリート終了時にベットをポットへ
  | { kind: "push-pot"; potIndex: number; toSeat: number[] } // 各ポットの勝者へ
  | { kind: "announce-winner"; seats: number[] }
```

`DealerEngine.expected(state): DealerStep` が次の正しい手順を返し、`DealerEngine.apply(state, userStep)` は
一致／不一致を記録して進める（不一致でもハンドは続行し、`mistakes[]` に積む）。ハンド終了後に
`mistakes[]` をまとめて表示し、各ミスをスキル ID にマッピングして `recordAttempt` に渡す。

## 将来項目との対応

- **Action 順判定 / Minimum Raise 判定**: `legalActions` の結果（`toAct[0]`, `raise.min`）をそのまま出題に使える。
- **Misdeal / Exposed Card**: `Dealer` 状態機械にイベント（`exposed`, `boxed-card`）を注入し、期待手順（再配札／バーンカードとして扱う等）をハウスルール設定から引く。
- **Odd Chip / Split Pot**: `sidePotCalculator` の各ポットに `determineWinners` を適用したうえで、`bb` 単位で割り切れない端数を「ボタンから最も近い勝者」に渡すルールを `settlePots(pots, winnersByPot, buttonSeat, unit)` として追加する。
- **店舗別ハウスルール**: `HouseRules` オブジェクト（例: `oddChipRule`, `exposedCardRule`, `misdealRule`）を `HandHistory` と並べてエンジンに渡す。
- **研修管理 / Supabase**: `lib/stats.ts` の `Stats` はプレーンな JSON なので、`StorageLike` を Supabase 実装に差し替えるだけで同期できる。

## 画面

- 既存 `Trainer` の `Phase` に `"real-table"` を追加するのではなく、`/real-table/` を別ルートにして `TableView` を共有する。
- iPad 横画面: テーブルを全幅、下部にディーラー操作バー（DEAL / BURN / OPEN / PUSH / WINNER）。
