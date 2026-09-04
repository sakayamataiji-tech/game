const strings = {
  ja: {
    title: 'ブロックル',
    daily: '今日の問題',
    endless: 'エンドレス',
    puzzleNo: (n) => `#${n}`,
    reset: 'リセット',
    hint: 'ヒント',
    hintAd: '広告を見てヒント',
    cleared: 'クリア！',
    time: 'タイム',
    moves: '手数',
    share: '結果をシェア',
    shareX: 'Xに投稿',
    copied: 'コピーしました！',
    next: '次の問題',
    playEndless: 'エンドレスで遊ぶ',
    backToDaily: '今日の問題へ',
    dailyShort: '今日の問題',
    doneToday: '今日の問題はクリア済み',
    nextIn: (t) => `次の問題まで ${t}`,
    streak: (n) => `🔥 ${n}日連続`,
    howTo: 'ドラッグで置く・タップで回転',
    hintNone: 'ヒントはありません',
    hintFail: '広告が見られなかったのでヒントは出ません',
    dayNames: ['日', '月', '火', '水', '木', '金', '土'],
  },
  en: {
    title: 'Blockle',
    daily: 'Daily',
    endless: 'Endless',
    puzzleNo: (n) => `#${n}`,
    reset: 'Reset',
    hint: 'Hint',
    hintAd: 'Watch ad for hint',
    cleared: 'Solved!',
    time: 'Time',
    moves: 'Moves',
    share: 'Share result',
    shareX: 'Post on X',
    copied: 'Copied!',
    next: 'Next puzzle',
    playEndless: 'Play endless',
    backToDaily: "Today's puzzle",
    dailyShort: 'Daily',
    doneToday: 'Daily puzzle done',
    nextIn: (t) => `Next puzzle in ${t}`,
    streak: (n) => `🔥 ${n} day streak`,
    howTo: 'Drag to place, tap to rotate',
    hintNone: 'No hint available',
    hintFail: 'Ad not completed, no hint',
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
};

export function detectLang() {
  const l = (typeof navigator !== 'undefined' && navigator.language) || 'ja';
  return l.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export function t(lang) {
  return strings[lang] ?? strings.ja;
}
