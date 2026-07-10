// ═══════════════════════════════════════════
// 動物キャラクター（たべっこ動物風・全14種）
// 各キャラ：name / svg / anim（タップ時のリアクション）
// ═══════════════════════════════════════════

const INK = '#5B4A47';

// 共通の顔パーツ（目・ほっぺ・くち）
function face(x1 = 24, x2 = 40, y = 34, blushY = 40) {
  return `
    <circle cx="${x1}" cy="${y}" r="2.6" fill="${INK}"/>
    <circle cx="${x2}" cy="${y}" r="2.6" fill="${INK}"/>
    <circle cx="${x1 - 6.5}" cy="${blushY}" r="3.6" fill="#FFAABE" opacity=".65"/>
    <circle cx="${x2 + 6.5}" cy="${blushY}" r="3.6" fill="#FFAABE" opacity=".65"/>
    <path d="M ${(x1 + x2) / 2 - 3} ${y + 6} Q ${(x1 + x2) / 2} ${y + 9} ${(x1 + x2) / 2 + 3} ${y + 6}"
          stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
}

function wrap(inner) {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

export const ANIMALS = [
  {
    name: 'カバ',
    anim: 'anim-nom',
    svg: wrap(`
      <ellipse cx="16" cy="16" rx="6" ry="7" fill="#B9A8E8"/>
      <ellipse cx="48" cy="16" rx="6" ry="7" fill="#B9A8E8"/>
      <ellipse cx="16" cy="16" rx="3" ry="4" fill="#D8CCF5"/>
      <ellipse cx="48" cy="16" rx="3" ry="4" fill="#D8CCF5"/>
      <ellipse cx="32" cy="36" rx="24" ry="21" fill="#C6B7EE"/>
      <ellipse cx="32" cy="45" rx="16" ry="11" fill="#DED4F7"/>
      <circle cx="26" cy="44" r="2.2" fill="${INK}"/>
      <circle cx="38" cy="44" r="2.2" fill="${INK}"/>
      <circle cx="24" cy="30" r="2.6" fill="${INK}"/>
      <circle cx="40" cy="30" r="2.6" fill="${INK}"/>
      <circle cx="15" cy="35" r="3.6" fill="#FFAABE" opacity=".65"/>
      <circle cx="49" cy="35" r="3.6" fill="#FFAABE" opacity=".65"/>`)
  },
  {
    name: 'クラゲ',
    anim: 'anim-float',
    svg: wrap(`
      <path d="M 10 34 Q 10 10 32 10 Q 54 10 54 34 Q 54 40 48 40 L 16 40 Q 10 40 10 34 Z" fill="#AEE3F5"/>
      <path d="M 16 40 Q 14 50 18 56 M 26 40 Q 24 52 28 58 M 38 40 Q 40 52 36 58 M 48 40 Q 50 50 46 56"
            stroke="#8FD4EE" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="24" cy="18" rx="5" ry="3.5" fill="#E1F6FC" opacity=".9"/>
      ${face(25, 39, 28, 33)}`)
  },
  {
    name: 'ウサギ',
    anim: 'anim-hop',
    svg: wrap(`
      <ellipse cx="22" cy="13" rx="6.5" ry="12" fill="#FDEDF2" stroke="#F5D4DE" stroke-width="1.5"/>
      <ellipse cx="42" cy="13" rx="6.5" ry="12" fill="#FDEDF2" stroke="#F5D4DE" stroke-width="1.5"/>
      <ellipse cx="22" cy="14" rx="3" ry="8" fill="#FFC7D6"/>
      <ellipse cx="42" cy="14" rx="3" ry="8" fill="#FFC7D6"/>
      <circle cx="32" cy="38" r="21" fill="#FFF5F8"/>
      <circle cx="32" cy="38" r="21" fill="none" stroke="#F5D4DE" stroke-width="1.5"/>
      ${face(24, 40, 36, 42)}`)
  },
  {
    name: 'クマ',
    anim: 'anim-wiggle',
    svg: wrap(`
      <circle cx="15" cy="17" r="8" fill="#C89B72"/>
      <circle cx="49" cy="17" r="8" fill="#C89B72"/>
      <circle cx="15" cy="17" r="4" fill="#E8C9A8"/>
      <circle cx="49" cy="17" r="4" fill="#E8C9A8"/>
      <circle cx="32" cy="37" r="22" fill="#D9AF85"/>
      <ellipse cx="32" cy="44" rx="9" ry="7" fill="#F2DFC9"/>
      <ellipse cx="32" cy="41.5" rx="3" ry="2.4" fill="${INK}"/>
      ${face(23, 41, 32, 38)}`)
  },
  {
    name: 'パンダ',
    anim: 'anim-nom',
    svg: wrap(`
      <circle cx="15" cy="16" r="8" fill="#4A4442"/>
      <circle cx="49" cy="16" r="8" fill="#4A4442"/>
      <circle cx="32" cy="37" r="22" fill="#FFFDFA"/>
      <circle cx="32" cy="37" r="22" fill="none" stroke="#E8E0D8" stroke-width="1.5"/>
      <ellipse cx="23" cy="33" rx="6.5" ry="8" fill="#4A4442" transform="rotate(-14 23 33)"/>
      <ellipse cx="41" cy="33" rx="6.5" ry="8" fill="#4A4442" transform="rotate(14 41 33)"/>
      <circle cx="24" cy="33" r="2.6" fill="#fff"/>
      <circle cx="40" cy="33" r="2.6" fill="#fff"/>
      <ellipse cx="32" cy="44" rx="3" ry="2.4" fill="#4A4442"/>
      <path d="M 29 49 Q 32 51.5 35 49" stroke="#4A4442" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="15" cy="42" r="3.6" fill="#FFAABE" opacity=".65"/>
      <circle cx="49" cy="42" r="3.6" fill="#FFAABE" opacity=".65"/>`)
  },
  {
    name: 'ライオン',
    anim: 'anim-wiggle',
    svg: wrap(`
      <circle cx="32" cy="34" r="26" fill="#F5B76B"/>
      <circle cx="32" cy="34" r="26" fill="none" stroke="#E8A251" stroke-width="1.5"/>
      <circle cx="32" cy="36" r="18" fill="#FBDCA8"/>
      <ellipse cx="32" cy="43" rx="3" ry="2.4" fill="${INK}"/>
      ${face(24, 40, 33, 39)}`)
  },
  {
    name: 'ペンギン',
    anim: 'anim-hop',
    svg: wrap(`
      <ellipse cx="32" cy="36" rx="21" ry="23" fill="#7A9BC4"/>
      <ellipse cx="32" cy="42" rx="14" ry="15" fill="#FFFDFA"/>
      <ellipse cx="10" cy="40" rx="4.5" ry="8" fill="#7A9BC4" transform="rotate(18 10 40)"/>
      <ellipse cx="54" cy="40" rx="4.5" ry="8" fill="#7A9BC4" transform="rotate(-18 54 40)"/>
      <path d="M 29 36 L 35 36 L 32 41 Z" fill="#F5B76B"/>
      ${face(24, 40, 30, 36)}`)
  },
  {
    name: 'キリン',
    anim: 'anim-wiggle',
    svg: wrap(`
      <line x1="24" y1="12" x2="22" y2="5" stroke="#E8A251" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="40" y1="12" x2="42" y2="5" stroke="#E8A251" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="22" cy="4.5" r="3" fill="#E8A251"/>
      <circle cx="42" cy="4.5" r="3" fill="#E8A251"/>
      <ellipse cx="12" cy="22" rx="5" ry="6.5" fill="#FBD98E" transform="rotate(-24 12 22)"/>
      <ellipse cx="52" cy="22" rx="5" ry="6.5" fill="#FBD98E" transform="rotate(24 52 22)"/>
      <circle cx="32" cy="37" r="22" fill="#FBD98E"/>
      <circle cx="16" cy="27" r="4" fill="#F0BC6A" opacity=".8"/>
      <circle cx="47" cy="25" r="3.4" fill="#F0BC6A" opacity=".8"/>
      <circle cx="44" cy="53" r="4" fill="#F0BC6A" opacity=".8"/>
      <ellipse cx="32" cy="46" rx="10" ry="7.5" fill="#FCEBC4"/>
      <circle cx="28" cy="45" r="1.8" fill="${INK}"/>
      <circle cx="36" cy="45" r="1.8" fill="${INK}"/>
      ${face(24, 40, 32, 38)}`)
  },
  {
    name: 'ゾウ',
    anim: 'anim-nom',
    svg: wrap(`
      <ellipse cx="10" cy="32" rx="8" ry="11" fill="#A8C4DE"/>
      <ellipse cx="54" cy="32" rx="8" ry="11" fill="#A8C4DE"/>
      <ellipse cx="10" cy="32" rx="4.5" ry="7" fill="#CFE2F1"/>
      <ellipse cx="54" cy="32" rx="4.5" ry="7" fill="#CFE2F1"/>
      <circle cx="32" cy="34" r="21" fill="#BAD3E8"/>
      <path d="M 32 40 Q 32 52 26 57 Q 24 59 26 60" stroke="#A8C4DE" stroke-width="7" fill="none" stroke-linecap="round"/>
      ${face(24, 40, 31, 37)}`)
  },
  {
    name: 'イヌ',
    anim: 'anim-hop',
    svg: wrap(`
      <ellipse cx="13" cy="26" rx="7" ry="12" fill="#D9B48C" transform="rotate(16 13 26)"/>
      <ellipse cx="51" cy="26" rx="7" ry="12" fill="#D9B48C" transform="rotate(-16 51 26)"/>
      <circle cx="32" cy="37" r="21" fill="#F3E3CB"/>
      <ellipse cx="32" cy="44" rx="8" ry="6" fill="#FCF6EA"/>
      <ellipse cx="32" cy="41.5" rx="2.8" ry="2.2" fill="${INK}"/>
      ${face(24, 40, 33, 39)}`)
  },
  {
    name: 'ネコ',
    anim: 'anim-wiggle',
    svg: wrap(`
      <path d="M 12 26 L 15 8 L 27 17 Z" fill="#C9C2D8"/>
      <path d="M 52 26 L 49 8 L 37 17 Z" fill="#C9C2D8"/>
      <path d="M 15.5 21 L 17 12 L 23 16.5 Z" fill="#F0B7C8"/>
      <path d="M 48.5 21 L 47 12 L 41 16.5 Z" fill="#F0B7C8"/>
      <circle cx="32" cy="37" r="21" fill="#DDD7E8"/>
      <path d="M 6 36 L 14 38 M 6 42 L 14 42" stroke="#B8AFC9" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M 58 36 L 50 38 M 58 42 L 50 42" stroke="#B8AFC9" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M 30 41 Q 32 43 34 41" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="32" cy="39.5" rx="2" ry="1.6" fill="#F27DA0"/>
      ${face(24, 40, 33, 39)}`)
  },
  {
    name: 'キツネ',
    anim: 'anim-spin',
    svg: wrap(`
      <path d="M 10 28 L 12 7 L 27 16 Z" fill="#F0A868"/>
      <path d="M 54 28 L 52 7 L 37 16 Z" fill="#F0A868"/>
      <path d="M 14 23 L 15 12 L 23 17 Z" fill="#FCEBD8"/>
      <path d="M 50 23 L 49 12 L 41 17 Z" fill="#FCEBD8"/>
      <circle cx="32" cy="37" r="21" fill="#F7BE85"/>
      <path d="M 32 58 Q 12 56 13 40 L 32 47 L 51 40 Q 52 56 32 58 Z" fill="#FCEBD8"/>
      <ellipse cx="32" cy="46" rx="2.6" ry="2.2" fill="${INK}"/>
      ${face(24, 40, 33, 39)}`)
  },
  {
    name: 'ヒツジ',
    anim: 'anim-float',
    svg: wrap(`
      <circle cx="18" cy="22" r="9" fill="#FDF6EC"/>
      <circle cx="32" cy="17" r="10" fill="#FDF6EC"/>
      <circle cx="46" cy="22" r="9" fill="#FDF6EC"/>
      <circle cx="12" cy="34" r="8" fill="#FDF6EC"/>
      <circle cx="52" cy="34" r="8" fill="#FDF6EC"/>
      <circle cx="18" cy="22" r="9" fill="none" stroke="#EDE0CC" stroke-width="1.4"/>
      <circle cx="32" cy="17" r="10" fill="none" stroke="#EDE0CC" stroke-width="1.4"/>
      <circle cx="46" cy="22" r="9" fill="none" stroke="#EDE0CC" stroke-width="1.4"/>
      <ellipse cx="32" cy="41" rx="17" ry="15" fill="#F5DDC4"/>
      <ellipse cx="13" cy="38" rx="4.5" ry="6" fill="#E8C9A8" transform="rotate(-20 13 38)"/>
      <ellipse cx="51" cy="38" rx="4.5" ry="6" fill="#E8C9A8" transform="rotate(20 51 38)"/>
      ${face(25, 39, 38, 44)}`)
  },
  {
    name: 'ハリネズミ',
    anim: 'anim-spin',
    svg: wrap(`
      <path d="M 32 6 L 37 16 L 45 9 L 46 20 L 56 16 L 52 26 L 62 27 L 54 34 L 60 42 L 49 42 L 51 52 L 41 47 L 38 57 L 32 48 L 26 57 L 23 47 L 13 52 L 15 42 L 4 42 L 10 34 L 2 27 L 12 26 L 8 16 L 18 20 L 19 9 L 27 16 Z" fill="#B08A66"/>
      <circle cx="32" cy="38" r="17" fill="#F5E3CE"/>
      <ellipse cx="32" cy="44" rx="2.8" ry="2.4" fill="${INK}"/>
      ${face(25, 39, 36, 42)}`)
  }
];

// パステルカラー（カード背景用）
export const PASTELS = [
  'var(--pastel-pink)',
  'var(--pastel-cream)',
  'var(--pastel-blue)',
  'var(--pastel-yellow)',
  'var(--pastel-mint)',
  'var(--pastel-lavender)',
  'var(--pastel-peach)',
];

export function randomAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)].name;
}

export function randomColor() {
  return PASTELS[Math.floor(Math.random() * PASTELS.length)];
}

export function animalByName(name) {
  return ANIMALS.find(a => a.name === name) || ANIMALS[0];
}

// びん（Wish Jar）のイラスト
export const JAR_SVG = `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect x="22" y="4" width="20" height="7" rx="3" fill="#E8A251"/>
  <path d="M 18 12 L 46 12 Q 52 20 52 32 L 52 50 Q 52 58 44 58 L 20 58 Q 12 58 12 50 L 12 32 Q 12 20 18 12 Z"
        fill="#DFF3FA" opacity=".85" stroke="#AEDcEE" stroke-width="2"/>
  <circle cx="24" cy="42" r="5" fill="#FFD9E3"/>
  <circle cx="36" cy="48" r="5" fill="#FFF7B3"/>
  <circle cx="40" cy="36" r="5" fill="#D2F5DF"/>
  <circle cx="28" cy="30" r="4" fill="#E8DFFF"/>
  <path d="M 20 18 Q 24 15 30 15" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>
</svg>`;
