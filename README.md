# ブロックル（Blockle）

毎日1問、世界中で同じブロックパズル。ピースをドラッグで置き、タップで回転させて盤面をぴったり埋めるだけ。
クリアすると Wordle 風の絵文字グリッドで結果をシェアできます。

- Web 先行（ブラウザで即プレイ、審査不要）。GitHub Pages で公開。
- Phaser 3 + Vite。サーバー不要。日替わり問題は日付をシードにした乱数で全端末同じ問題になる。
- ジャンル選定の根拠は [docs/market-research.md](docs/market-research.md)、収益化の手順は [docs/monetization-roadmap.md](docs/monetization-roadmap.md)。

## 遊び方

1. 下のトレイにあるピースを盤面にドラッグ。
2. ピースをタップすると 90 度回転。
3. 全マスを埋めたらクリア。タイム・手数・連続日数が記録される。
4. 「結果をシェア」でクリップボードにコピー、「X に投稿」で投稿画面を開く。
5. 「エンドレス」でランダム問題を何問でも。

## 開発

```bash
npm install
npm run dev        # http://localhost:5173/game/
npm test           # パズル生成・盤面ロジックのユニットテスト
npm run build      # dist/ に出力（base は /game/）
VITE_BASE=/ npm run build && npx vite preview   # ルート配信で確認したいとき
```

## 公開（GitHub Pages）

`.github/workflows/deploy.yml` が `main` への push で自動的にビルドして Pages にデプロイします。
初回だけリポジトリの Settings → Pages → Source を「GitHub Actions」にしてください。
公開 URL は `https://<ユーザー名>.github.io/game/` になります。

## 構成

```
src/
  main.js               Phaser 起動。広告プロバイダの初期化後にゲーム開始
  i18n.js               日本語 / 英語の文言（ブラウザ言語で自動切替）
  puzzle/
    rng.js              シード付き乱数（mulberry32 / FNV-1a）
    shapes.js           ポリオミノの正規化・回転
    generator.js        盤面をランダム分割してピースを作る（必ず解ける）
    daily.js            日付 → 問題番号・シード・難易度（週末は 7x7）
    board.js            配置状態の純ロジック（テスト対象）
    share.js            シェア用テキスト（絵文字グリッド）
  scenes/GameScene.js   画面・入力・クリア演出・結果パネル
  services/
    ads.js              広告アダプタ（none / Poki / CrazyGames）。ゲーム側は差し替え不要
    analytics.js        イベント計測の窓口（gtag があれば送信）
    storage.js          localStorage（日次記録・連続日数）
test/puzzle.test.js     node --test
docs/market-research.md 市場調査と収益化ロードマップ
```

## 収益化の設計（実装済みのフック）

| フック | 現状 | 次にやること |
|---|---|---|
| ヒント（リワード広告） | `ads.showRewarded('hint')` を呼ぶ。プロバイダ未接続時は無料で付与 | Poki / CrazyGames に投稿すると SDK が自動検出され、実広告になる |
| エンドレス 3 問ごとのインタースティシャル | `ads.showInterstitial('endless_next')` | 同上 |
| 計測 | `track()` でイベント発火（開始・クリア・シェア・ヒント・広告） | GA4 の gtag を index.html に入れるだけで送信される |
| シェア導線 | コピー / X 投稿 / モバイルはネイティブ共有 | 公開 URL に差し替え、OGP 画像を用意 |

## ロードマップ

1. **公開・検証**：Pages で公開し、X で数日シェアして「シェア率」「翌日戻り率」を見る。
2. **ポータル投稿**：Poki / CrazyGames に投稿（広告収益 60% 前後の分配）。
3. **リテンション強化**：クリア履歴カレンダー、実績、週末の難問、友達とのタイム比較。
4. **アプリ化**：Web で継続率が確認できたら Capacitor でストア版。AdMob + 広告削除課金。
