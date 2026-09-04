# 市場調査メモ（2026年9月時点）

個人・少人数で「ゲームアプリを作って収益化する」ための、最初の1本のジャンル選定に向けた調査結果。

## 1. モバイルゲーム市場（マクロ）

- 2025年のモバイルゲーム市場は約820億ドル。DL数は減少傾向だがプレイ時間と収益は増加（Sensor Tower）。
- ハイパーカジュアル（広告のみで稼ぐ超小型ゲーム）は、DL数では依然トップ（2025年 220億DL）だが**構造的に衰退中**。生き残っているタイトルは広告＋課金を組み合わせた「ハイブリッドカジュアル」に移行している。
- ハイブリッドカジュアルは2025年に課金収益が20%増（42億ドル）で、カジュアル領域で唯一成長したセグメント。
- 広告収益ではパズルが圧倒的で、2026年中期時点でモバイルゲーム広告収益の**53%（26.5億ドル）**を占める。サブジャンルでは「ブロックパズル」が首位（5.19億ドル、Block Blast! が牽引）。2026年1月〜夏にかけてブロックパズル系のリリースが急増している。
- 一方でブロックパズルは**完全な過当競争**。Block Blast は1日約58万ドルの広告収益を上げるが、その裏に「動的難易度調整（DDA）」と巨額の広告出稿がある。純粋な模倣は個人では勝てない。
- パズルジャンルの平均リテンションは D7 で 4.5%、D30 で 1.2% と低い。「毎日戻ってくる理由」を設計しないと広告収益は積み上がらない。

## 2. ブラウザ（Web）ゲーム市場

- ブラウザゲーム市場は2025年で118億ドル規模。HTML5ゲームのリリース本数は2025年上半期で15,000本（前年比ほぼ3倍）。
- Poki は月間1億アクティブユーザー（2020年比10倍）、CrazyGames は月間5,000万人超。両者ともインディー開発者の投稿を受け付けている。
- CrazyGames の開発者向け収益分配は**広告収益の60%、課金収益の70%**（2026年 GameMaker ジャム規約より）。支払いは月次、最低100ユーロから。
- Poki の2026年調査：典型的なプレイヤーは**1日複数回、1セッション11〜20分、1セッションで2〜3タイトル**を遊ぶ。86%が週数回以上プレイ。人気ジャンルはパズル・アクション・ストラテジー・レース・スポーツ。
- Webで遊んだ後にアプリをDL/購入した経験があるユーザーが62%。**Web先行→アプリ化**の導線は実績がある。
- モバイルゲーム会社の53%が「今後12か月でブラウザ移植を計画」。競争は激化するが、市場自体が伸びている。

## 3. 個人開発者の成功パターン

- **Wordle**（2021）：個人開発、1日1問、絵文字で結果をシェアする仕組みでバイラル。NYTが7桁ドルで買収。派生の Quordle、Absurdle なども個人開発。
- **The Password Game**（2023）：個人開発、開発期間2か月、1,000万プレイ超。
- **Wikigacha**（2026年2月、日本の個人開発者）：Wikipedia記事をカード化してガチャ・対戦。公開1週間でSNSでバズりサーバー増設。無料10連＋広告視聴で追加、というリワード広告モデル。
- **Peing（質問箱）**：SNSタイムラインに自然にリンクが流れる設計で、広告費ゼロで急成長。
- 共通点：(1) 開発期間が短い、(2) 1画面で完結、(3) **SNSにシェアしたくなる出力**がある、(4) 「毎日」「ランダム」など戻ってくる理由がある。

## 4. 結論：最初の1本のジャンル

**「デイリー・ブロックパズル」（1日1問、Web先行、広告収益）** を選ぶ。

理由：
1. **パズルは広告収益の最大ジャンル**であり、ブロックパズルはその中で最も伸びているサブジャンル。プレイヤー側の学習コストがゼロ。
2. 純粋なブロックパズル模倣では巨大資本に勝てないため、**「毎日1問・全員同じ問題・結果を絵文字でシェア」**というWordle型の仕組みで差別化する。これは個人開発の実証済み勝ちパターンで、広告費ゼロで拡散できる。
3. 「毎日」の仕組みがリテンション（D7 4.5%問題）への直接の対策になる。
4. 言語依存がない（言葉のパズルではない）ので、日本のSNSと海外ポータル（Poki / CrazyGames）の両方に同じビルドで出せる。
5. Phaser で1〜2週間で完成する規模。ステージ生成は乱数で自動化でき、コンテンツ制作コストがない。

### 収益化の段階設計

| 段階 | 施策 | 目安 |
|---|---|---|
| 1 | GitHub Pages で公開。日本語SNS（X）でシェア導線を検証 | 公開後1〜2週間 |
| 2 | Poki / CrazyGames に投稿。SDKでリワード広告（ヒント・追加問題）を接続 | 反応があれば |
| 3 | エンドレスモード + ヒント/スキップのリワード広告、インタースティシャル | DAU 数百〜 |
| 4 | Capacitor 等でストアアプリ化。AdMob + 広告削除課金（ハイブリッドカジュアル化） | Web で継続率が確認できたら |

### 避けるべきこと

- 純粋なハイパーカジュアル（反射神経タップのみ）は衰退中なので選ばない。
- ブロックパズルの単純なクローン（毎回ランダム・無限）は Block Blast 系に埋もれる。
- 最初から課金・ガチャを作り込まない。ユーザーがついてから。

## 出典

- [Hypercasual and hybrid casual in 2026 (Azur Games)](https://azurgames.com/blog/hypercasual-and-hybrid-casual-in-2026-full-report/)
- [State of Mobile 2026 (Deconstructor of Fun)](https://www.deconstructoroffun.com/blog/2026/2/2/state-of-mobile-2026)
- [Casual Games Market in 2026 (Udonis)](https://www.blog.udonis.co/mobile-marketing/mobile-games/casual-games)
- [Sensor Tower: The Gaming Market in H1'26](https://gamedevreports.substack.com/p/sensor-tower-the-gaming-market-in)
- [Sensor Tower: State of Gaming 2026](https://sensortower.com/report/state-of-gaming-2026)
- [2026年版ゲーム市場年鑑（Sensor Tower 日本語）](https://sensortower.com/ja/blog/state-of-gaming-2026-JP)
- [The Post-Block Blast Playbook (Deconstructor of Fun)](https://www.deconstructoroffun.com/blog/2026/1/19/from-tetris-to-block-blast-why-block-puzzles-never-stop-printing)
- [Block Blast Revenue & Statistics (Udonis)](https://www.blog.udonis.co/statistics/block-blast)
- [Puzzle Games Revenue and Usage Statistics 2026 (Business of Apps)](https://www.businessofapps.com/data/puzzle-games-market/)
- [The 2026 State of Web Gaming (Poki)](https://poki.com/blog/state-of-web-gaming-report-2026)
- [Why browser games are the next billion-dollar bet (MCV/DEVELOP)](https://mcvuk.com/business-news/why-browser-games-are-the-next-billion-dollar-bet/)
- [The huge, hidden web game market (Game Developer)](https://www.gamedeveloper.com/business/the-huge-hidden-web-game-market-no-one-talks-about-and-how-to-get-in-)
- [53% plan to port mobile games to browser (PocketGamer.biz)](https://www.pocketgamer.biz/report-53-plan-to-port-mobile-games-to-browser-in-next-12-months/)
- [CrazyGames Developer Guide 2026 (Cinevva)](https://app.cinevva.com/guides/publish-game-crazygames)
- [CrazyGames Payouts](https://docs.crazygames.com/payouts/)
- [Wordle (Wikipedia)](https://en.wikipedia.org/wiki/Wordle)
- [The Password Game (Wikipedia)](https://en.wikipedia.org/wiki/The_Password_Game)
- [Wikigacha が人気 (Forbes JAPAN)](https://forbesjapan.com/articles/detail/93345)
- [Wikipedia Gacha (4Gamer)](https://www.4gamer.net/games/999/G999901/20260303034/)
- [個人開発の成功事例15選 (ShiftB)](https://shiftb.dev/articles/indie-dev-success-stories)
- [What Makes a Game Viral in 2026 (Melior Games)](https://meliorgames.com/best-practices/what-makes-a-game-viral-in-2026/)
