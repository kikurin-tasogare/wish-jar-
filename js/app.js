// ═══════════════════════════════════════════
// Wish Jar — アプリ本体
// ═══════════════════════════════════════════

import {
  initStore, startSync, onChange, getItems, getWishes, getMemories, getItem,
  addItem, updateItem, completeItem, deleteItem, reorderWishes, addPhoto,
  getProfile, saveProfile,
} from './store.js';
import { animalByName, ANIMALS, JAR_SVG, coverJarSVG } from './animals.js';
import { SYNC_ENABLED } from './config.js';

const $ = (id) => document.getElementById(id);

let profile = null;
let detailItemId = null;   // 詳細モーダルで開いているアイテム
let sheetItemId = null;    // アクションシートの対象
let photoItemId = null;    // 写真追加の対象
let calYear, calMonth;     // カレンダー表示中の年月
let calSelected = null;    // 選択中の日付（YYYY-MM-DD）
let openSheetSide = null;  // 「ぜんぶ見る」シートで開いている側（'mine' | 'theirs' | null）

// ═══════════ 起動 ═══════════

async function main() {
  profile = getProfile();
  initStore();

  onChange((_, remoteIds) => {
    renderHome(remoteIds);
    refreshWishSheetIfOpen();
    if (!$('jar').classList.contains('hidden')) renderCalendar();
  });

  setupOnboarding();
  setupCover();
  setupHome();
  setupAddModal();
  setupDetailModal();
  setupActionSheet();
  setupJar();
  setupSettings();
  setupPhotos();

  if (profile && isValidJarCode(profile.jarCode)) {
    renderHome();
    openCover();
    const { mode } = await startSync(profile.jarCode);
    updateSyncStatus(mode);
  } else if (profile) {
    // 名前はすでにあるが、あいことば未設定の端末（あいことば機能追加前に
    // オンボーディングを済ませた端末）。あいことばだけ追加で聞く
    updateSyncStatus('local');
    showJarCodeOnlyOnboarding();
  } else {
    updateSyncStatus('local');
    $('onboarding-jar').innerHTML = JAR_SVG;
    showScreen('onboarding');
  }
}

function updateSyncStatus(mode) {
  $('sync-status').textContent = SYNC_ENABLED && mode === 'firebase'
    ? '☁️ ふたりでリアルタイム共有中'
    : '📱 この端末に保存中';
}

function showScreen(id) {
  ['cover', 'onboarding', 'home', 'jar'].forEach(s => $(s).classList.toggle('hidden', s !== id));
}

// ═══════════ オンボーディング ═══════════

// あいことばは Firestore のパスの一部になる。半角英数字・ハイフン・アンダースコアのみ、
// 8文字以上30文字以下（短すぎる合言葉は他人に推測されやすいため弾く）
const JAR_CODE_PATTERN = /^[A-Za-z0-9_-]{8,30}$/;

function jarCodeError(code) {
  if (code === '') return '';
  if (/^__.*__$/.test(code)) return 'その組み合わせは使えないよ。別のあいことばにしてね';
  if (!JAR_CODE_PATTERN.test(code)) return '半角英数字・ハイフンのみ、8〜30文字で入力してね';
  return '';
}

function isValidJarCode(code) {
  return typeof code === 'string' && code !== '' && jarCodeError(code) === '';
}

// あいことば機能の追加前にオンボーディングを済ませた端末向け：
// 名前欄は隠して、あいことばだけを追加で聞く
function showJarCodeOnlyOnboarding() {
  $('onboarding-jar').innerHTML = JAR_SVG;
  $('onboarding-name-group').classList.add('hidden');
  $('onboarding-title').textContent = 'もうひとつだけ';
  $('onboarding-sub').innerHTML = 'ふたりでリアルタイム共有するために<br>あいことばを決めてね';
  showScreen('onboarding');
}

function setupOnboarding() {
  const nameGroup = $('onboarding-name-group');
  const input = $('onboarding-name');
  const jarcodeInput = $('onboarding-jarcode');
  const jarcodeErrorEl = $('onboarding-jarcode-error');
  const start = $('onboarding-start');

  const checkReady = () => {
    const err = jarCodeError(jarcodeInput.value.trim());
    jarcodeErrorEl.textContent = err;
    jarcodeErrorEl.classList.toggle('hidden', err === '');
    const nameOk = nameGroup.classList.contains('hidden') || input.value.trim() !== '';
    start.disabled = !nameOk || jarcodeInput.value.trim() === '' || err !== '';
  };
  input.addEventListener('input', checkReady);
  jarcodeInput.addEventListener('input', checkReady);

  start.addEventListener('click', async () => {
    const name = nameGroup.classList.contains('hidden') ? profile.name : input.value.trim();
    const jarCode = jarcodeInput.value.trim();
    if (!name || !jarCode || jarCodeError(jarCode) !== '') return;
    profile = { ...profile, name, jarCode };
    saveProfile(profile);
    renderHome();
    openCover();
    const { mode } = await startSync(profile.jarCode);
    updateSyncStatus(mode);
  });
}

// ═══════════ 表紙（起動時のみ） ═══════════

function setupCover() {
  const jar = $('cover-jar');
  let opening = false;

  jar.addEventListener('click', () => {
    if (opening) return;
    opening = true;
    if (navigator.vibrate) navigator.vibrate(20);
    jar.classList.add('opening');
    // ぷるん → ふたが開く → リスト画面へ
    setTimeout(() => {
      showScreen('home');
      jar.classList.remove('opening');
      opening = false;
    }, 620);
  });
}

function openCover() {
  // キャンディは叶えた思い出の数だけ溜まる
  $('cover-jar').innerHTML = coverJarSVG(getMemories().length);
  showScreen('cover');
}

// ═══════════ メイン画面 ═══════════

function setupHome() {
  $('add-btn').addEventListener('click', () => openModal('add-modal'));
  $('jar-btn').addEventListener('click', openJar);
  $('settings-btn').addEventListener('click', () => {
    $('settings-name').value = profile.name;
    $('settings-jarcode').value = profile.jarCode || '';
    $('settings-jarcode-error').classList.add('hidden');
    openModal('settings-modal');
  });
}

const WISH_PREVIEW_COUNT = 2;

function renderHome(remoteIds = []) {
  const cols = $('wish-columns');
  const wishes = getWishes();
  cols.textContent = '';

  $('empty-home').classList.toggle('hidden', wishes.length > 0);
  if (wishes.length === 0 && !$('empty-art').innerHTML) {
    $('empty-art').innerHTML = JAR_SVG;
  }
  if (wishes.length === 0) return;

  // 自分の列と相手の列に分けて半分ずつ表示
  const mine = wishes.filter(w => w.owner === profile.name);
  const theirs = wishes.filter(w => w.owner !== profile.name);

  [
    { name: profile.name, list: mine, cls: 'wish-col-name--mine', side: 'mine' },
    { name: partnerName(), list: theirs, cls: 'wish-col-name--theirs', side: 'theirs' },
  ].forEach(({ name, list, cls, side }) => {
    const col = document.createElement('div');
    col.className = 'wish-col';

    const head = document.createElement('div');
    head.className = `wish-col-name ${cls}`;
    head.textContent = name;
    col.appendChild(head);

    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'wish-col-empty';
      empty.textContent = 'まだないよ';
      col.appendChild(empty);
    }

    list.slice(0, WISH_PREVIEW_COUNT).forEach(item => {
      const card = buildWishCard(item);
      if (remoteIds.includes(item.id)) card.classList.add('remote-new');
      col.appendChild(card);
    });

    if (list.length > WISH_PREVIEW_COUNT) {
      const more = document.createElement('button');
      more.className = `wish-col-more wish-col-more--${side}`;
      more.textContent = `+${list.length - WISH_PREVIEW_COUNT} ぜんぶ見る`;
      more.addEventListener('click', () => openWishSheet(side, name, list));
      col.appendChild(more);
    }
    cols.appendChild(col);
  });
}

function openWishSheet(side, name, list) {
  openSheetSide = side;
  fillWishSheet(name, list);
  openModal('wish-sheet');
}

function fillWishSheet(name, list) {
  $('wish-sheet-title').textContent = `${name}のやりたいこと`;
  const wrap = $('wish-sheet-list');
  wrap.textContent = '';
  list.forEach(item => wrap.appendChild(buildWishCard(item, { compact: true })));
}

// シートを開いたまま相手が完了・削除した場合などに中身を追従させる
function refreshWishSheetIfOpen() {
  if (!openSheetSide || $('wish-sheet').classList.contains('hidden')) return;
  const wishes = getWishes();
  const list = openSheetSide === 'mine'
    ? wishes.filter(w => w.owner === profile.name)
    : wishes.filter(w => w.owner !== profile.name);
  if (list.length === 0) {
    closeModal('wish-sheet');
    return;
  }
  const name = openSheetSide === 'mine' ? profile.name : partnerName();
  fillWishSheet(name, list);
}

// 相手の名前（アイテムの記録から一番新しいものを拾う）
function partnerName() {
  const others = getItems().filter(i => i.owner !== profile.name);
  if (others.length === 0) return 'あいて';
  return others.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0].owner;
}

function buildWishCard(item, { compact = false } = {}) {
  const animal = animalByName(item.animal);

  const card = document.createElement('div');
  card.className = compact ? 'wish-card wish-card--row' : 'wish-card';
  card.dataset.id = item.id;
  card.style.background = item.color;
  card.setAttribute('role', 'listitem');

  const av = document.createElement('div');
  av.className = 'wish-animal';
  av.innerHTML = animal.svg; // 固定SVG（ユーザー入力を含まない）
  card.appendChild(av);

  const title = document.createElement('div');
  title.className = 'wish-title';
  title.textContent = item.title;
  card.appendChild(title);

  if (!compact && (item.place || item.date)) {
    const bits = [];
    if (item.place) bits.push(`📍${item.place}`);
    if (item.date) bits.push(`🗓${formatDateShort(item.date)}${item.time ? ' ' + item.time : ''}`);
    const meta = document.createElement('div');
    meta.className = 'wish-meta';
    meta.textContent = bits.join(' ・ ');
    card.appendChild(meta);
  }

  attachCardGestures(card, item, av, animal);
  return card;
}

// ─── カードのジェスチャー ───
//  タップ       → キャラが反応 → 詳細画面へ
//  長押し(離す) → 完了/削除のアクションシート
//  長押し(動かす)→ ドラッグで並べ替え

function attachCardGestures(card, item, avatarEl, animal) {
  let startY = 0, startX = 0;
  let pressTimer = null;
  let armed = false;     // 長押し成立
  let dragging = false;
  let moved = false;

  card.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    startY = e.clientY;
    startX = e.clientX;
    armed = false;
    dragging = false;
    moved = false;
    pressTimer = setTimeout(() => {
      armed = true;
      card.classList.add('dragging');
      if (navigator.vibrate) navigator.vibrate(15);
      card.setPointerCapture(e.pointerId);
    }, 450);
  });

  card.addEventListener('pointermove', (e) => {
    const dy = e.clientY - startY;
    const dx = e.clientX - startX;
    if (!armed) {
      // 長押し前に動いたら（＝スクロール）長押しは取消
      if (Math.abs(dy) > 8 || Math.abs(dx) > 8) {
        clearTimeout(pressTimer);
        moved = true;
      }
      return;
    }
    // 長押し後に動いた → ドラッグ並べ替え
    if (!dragging && Math.hypot(dx, dy) > 6) dragging = true;
    if (dragging) {
      e.preventDefault();
      card.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;
      swapIfNeeded(card, e.clientX, e.clientY);
    }
  });

  const finish = () => {
    clearTimeout(pressTimer);
    if (dragging) {
      card.style.transform = '';
      card.classList.remove('dragging');
      const ids = [...card.parentElement.querySelectorAll('.wish-card')].map(c => c.dataset.id);
      reorderWishes(ids);
    } else if (armed) {
      // 長押しして離した → アクションシート
      card.classList.remove('dragging');
      openActionSheet(item.id);
    } else if (!moved) {
      // タップ → キャラ反応 → 詳細へ
      avatarEl.classList.remove(animal.anim);
      void avatarEl.offsetWidth; // アニメ再生のためリフロー
      avatarEl.classList.add(animal.anim);
      setTimeout(() => openDetail(item.id), 480);
    }
    armed = false;
    dragging = false;
  };

  card.addEventListener('pointerup', finish);
  card.addEventListener('pointercancel', () => {
    clearTimeout(pressTimer);
    card.style.transform = '';
    card.classList.remove('dragging');
    armed = false;
    dragging = false;
  });
}

// ドラッグ中、指に最も近いカードを見つけて、その前後に入れ替える
// （並べ替えは自分の列の中だけ。相手の列には移動できない）
function swapIfNeeded(card, pointerX, pointerY) {
  const list = card.parentElement;
  const others = [...list.querySelectorAll('.wish-card')].filter(c => c !== card);
  let nearest = null;
  let nearestDist = Infinity;
  for (const c of others) {
    const r = c.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dist = (cx - pointerX) ** 2 + (cy - pointerY) ** 2;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = c;
    }
  }
  if (!nearest) return;
  const r = nearest.getBoundingClientRect();
  // 指がそのカードの後半（右下寄り）にあれば後ろへ、前半なら前へ挿入
  const past = pointerY > r.top + r.height / 2 ||
    (pointerY > r.top && pointerY < r.bottom && pointerX > r.left + r.width / 2);
  list.insertBefore(card, past ? nearest.nextElementSibling : nearest);
}

// ═══════════ 新規追加 ═══════════

function setupAddModal() {
  const input = $('add-input');
  const mascot = $('add-mascot');

  const refreshMascot = () => {
    const a = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    mascot.innerHTML = a.svg;
    mascot.dataset.anim = a.anim;
  };

  $('add-btn').addEventListener('click', () => {
    refreshMascot();
    setTimeout(() => input.focus(), 350);
  });

  const submit = () => {
    const title = input.value.trim();
    if (!title) return;
    addItem(title, profile.name);
    input.value = '';

    // フワッと完了演出
    const toast = $('add-toast');
    toast.classList.remove('hidden');
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = '';
    mascot.classList.remove(mascot.dataset.anim);
    void mascot.offsetWidth;
    mascot.classList.add(mascot.dataset.anim);
    setTimeout(() => toast.classList.add('hidden'), 1400);
    input.focus();
  };

  $('add-submit').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}

// ═══════════ 詳細・編集（自動保存） ═══════════

function setupDetailModal() {
  const save = () => {
    if (!detailItemId) return;
    updateItem(detailItemId, {
      place: $('detail-place').value.trim(),
      date: $('detail-date').value,
      time: $('detail-time').value,
    });
    const note = $('autosave-note');
    note.textContent = '保存したよ ✓';
    note.classList.add('saved');
    setTimeout(() => {
      note.textContent = 'じどうで保存されるよ';
      note.classList.remove('saved');
    }, 1200);
  };

  ['detail-place', 'detail-date', 'detail-time'].forEach(id => {
    $(id).addEventListener('change', save);
  });
  $('detail-place').addEventListener('blur', save);

  $('detail-done').addEventListener('click', () => {
    if (!detailItemId) return;
    const id = detailItemId;
    closeModal('detail-modal');
    completeWithAnimation(id);
  });

  setupTwoTapDelete($('detail-delete'), () => detailItemId, () => closeModal('detail-modal'));
}

function openDetail(id) {
  const item = getItem(id);
  if (!item) return;
  if (!$('wish-sheet').classList.contains('hidden')) closeModal('wish-sheet');
  detailItemId = id;
  $('detail-title').textContent = item.title;
  $('detail-place').value = item.place || '';
  $('detail-date').value = item.date || '';
  $('detail-time').value = item.time || '';
  const animal = animalByName(item.animal);
  $('detail-mascot').innerHTML = animal.svg;
  $('detail-delete').resetDelete?.();
  openModal('detail-modal');
}

// ═══════════ 長押しアクションシート ═══════════

function setupActionSheet() {
  $('sheet-done').addEventListener('click', () => {
    if (!sheetItemId) return;
    const id = sheetItemId;
    closeModal('action-sheet');
    completeWithAnimation(id);
  });

  setupTwoTapDelete($('sheet-delete'), () => sheetItemId, () => closeModal('action-sheet'));
}

// カードをふわっと飛ばしてから思い出にする
function completeWithAnimation(id) {
  const card = document.querySelector(`.wish-card[data-id="${CSS.escape(id)}"]`);
  if (card) {
    card.classList.add('completing');
    setTimeout(() => completeItem(id), 550);
  } else {
    completeItem(id);
  }
}

// 誤タップ防止の2段階削除ボタン
// （1回目のタップで「ほんとに削除する？」に変わり、2回目で実行。3秒で元に戻る）
function setupTwoTapDelete(btn, getId, onDeleted) {
  let armed = false;
  let timer = null;
  const reset = () => {
    armed = false;
    clearTimeout(timer);
    btn.textContent = '削除する';
    btn.classList.remove('armed');
  };
  btn.addEventListener('click', () => {
    const id = getId();
    if (!id) return;
    if (!armed) {
      armed = true;
      btn.textContent = 'ほんとに削除する？';
      btn.classList.add('armed');
      timer = setTimeout(reset, 3000);
      return;
    }
    reset();
    deleteItem(id);
    onDeleted();
  });
  btn.resetDelete = reset;
}

function openActionSheet(id) {
  const item = getItem(id);
  if (!item) return;
  if (!$('wish-sheet').classList.contains('hidden')) closeModal('wish-sheet');
  sheetItemId = id;
  $('sheet-title').textContent = item.title;
  $('sheet-delete').resetDelete?.();
  openModal('action-sheet');
}

// ═══════════ Wish Jar（思い出カレンダー） ═══════════

function setupJar() {
  $('jar-back').addEventListener('click', () => showScreen('home'));
  $('cal-prev').addEventListener('click', () => moveMonth(-1));
  $('cal-next').addEventListener('click', () => moveMonth(1));
}

function openJar() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  // 直近の思い出の日を初期選択
  const memories = getMemories();
  calSelected = memories.length
    ? memories.map(m => m.doneAt).sort().at(-1)
    : ymd(now);
  if (calSelected) {
    const [y, m] = calSelected.split('-').map(Number);
    calYear = y;
    calMonth = m - 1;
  }
  showScreen('jar');
  renderCalendar();
}

function moveMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderCalendar() {
  $('cal-label').textContent = `${calYear}年${calMonth + 1}月`;
  const grid = $('cal-grid');
  grid.textContent = '';

  const memories = getMemories();
  const byDate = {};
  memories.forEach(m => {
    if (!m.doneAt) return;
    (byDate[m.doneAt] ??= []).push(m);
  });

  const first = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr = ymd(new Date());

  for (let i = 0; i < first.getDay(); i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-day blank';
    grid.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.className = 'cal-day';
    const num = document.createElement('span');
    num.className = 'cal-num';
    num.textContent = d;
    btn.appendChild(num);

    if (byDate[dateStr]) {
      btn.classList.add('has-memory');
      const dot = document.createElement('span');
      dot.className = 'cal-dot';
      dot.textContent = byDate[dateStr].length > 1 ? `🎀×${byDate[dateStr].length}` : '🎀';
      btn.appendChild(dot);
    }
    if (dateStr === todayStr) btn.classList.add('today');
    if (dateStr === calSelected) btn.classList.add('selected');

    btn.addEventListener('click', () => {
      calSelected = dateStr;
      renderCalendar();
    });
    grid.appendChild(btn);
  }

  renderJarDay(byDate[calSelected] || []);
}

function renderJarDay(dayMemories) {
  const [y, m, d] = (calSelected || '').split('-').map(Number);
  $('jar-day-label').textContent = calSelected
    ? `${m}月${d}日の思い出`
    : '';

  const wrap = $('jar-day-items');
  wrap.textContent = '';

  if (dayMemories.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = 'この日の思い出はまだないよ';
    wrap.appendChild(p);
    return;
  }

  dayMemories.forEach(item => {
    const animal = animalByName(item.animal);
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.style.background = item.color;

    const head = document.createElement('div');
    head.className = 'memory-head';

    const av = document.createElement('div');
    av.className = 'memory-animal';
    av.innerHTML = animal.svg;
    av.addEventListener('click', () => {
      av.classList.remove(animal.anim);
      void av.offsetWidth;
      av.classList.add(animal.anim);
    });

    const txt = document.createElement('div');
    const t = document.createElement('div');
    t.className = 'memory-title';
    t.textContent = item.title;
    const o = document.createElement('div');
    o.className = 'memory-owner';
    o.textContent = `${item.owner}${item.place ? ' ・📍' + item.place : ''}`;
    txt.append(t, o);
    head.append(av, txt);
    card.appendChild(head);

    const photos = document.createElement('div');
    photos.className = 'memory-photos';
    (item.photos || []).forEach(src => {
      const img = document.createElement('img');
      img.className = 'memory-photo';
      img.src = src;
      img.alt = item.title;
      img.loading = 'lazy';
      img.addEventListener('click', () => openLightbox(src));
      photos.appendChild(img);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'photo-add-btn';
    const cam = document.createElement('span');
    cam.className = 'cam';
    cam.textContent = '📷';
    const lbl = document.createElement('span');
    lbl.textContent = '写真追加';
    addBtn.append(cam, lbl);
    addBtn.addEventListener('click', () => {
      photoItemId = item.id;
      $('photo-input').click();
    });
    photos.appendChild(addBtn);
    card.appendChild(photos);

    wrap.appendChild(card);
  });
}

// ═══════════ 写真 ═══════════

function setupPhotos() {
  $('photo-input').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!photoItemId || files.length === 0) return;
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await compressImage(file);
        addPhoto(photoItemId, dataUrl);
      } catch (err) {
        console.error('写真の読み込みに失敗', err);
      }
    }
    renderCalendar();
  });

  $('lightbox').addEventListener('click', () => $('lightbox').classList.add('hidden'));
}

// 端末容量にやさしいよう、長辺 900px / JPEG 78% に圧縮
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 900;
      let { width, height } = img;
      if (Math.max(width, height) > MAX) {
        const scale = MAX / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function openLightbox(src) {
  $('lightbox-img').src = src;
  $('lightbox').classList.remove('hidden');
}

// ═══════════ 設定 ═══════════

function setupSettings() {
  $('settings-name').addEventListener('change', () => {
    const name = $('settings-name').value.trim();
    if (!name) return;
    const oldName = profile.name;
    profile.name = name;
    saveProfile(profile);
    // 自分のカードも新しい名前に引き継ぐ（列の振り分けがずれないように）
    getItems().forEach(i => {
      if (i.owner === oldName) updateItem(i.id, { owner: name });
    });
    renderHome();
  });

  $('settings-jarcode').addEventListener('change', () => {
    const jarCode = $('settings-jarcode').value.trim();
    const errEl = $('settings-jarcode-error');
    const err = jarCodeError(jarCode);
    if (jarCode === '' || err !== '') {
      errEl.textContent = err || '半角英数字・ハイフンのみ、8〜30文字で入力してね';
      errEl.classList.remove('hidden');
      $('settings-jarcode').value = profile.jarCode || '';
      return;
    }
    if (jarCode === profile.jarCode) return;
    errEl.classList.add('hidden');
    profile.jarCode = jarCode;
    saveProfile(profile);
    // 同期先が変わるので、まっさらな状態からやり直す
    location.reload();
  });
}

// ═══════════ モーダル共通 ═══════════

function openModal(id) {
  $(id).classList.remove('hidden');
}

function closeModal(id) {
  $(id).classList.add('hidden');
  if (id === 'detail-modal') detailItemId = null;
  if (id === 'action-sheet') sheetItemId = null;
  if (id === 'wish-sheet') openSheetSide = null;
}

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) closeModal(m.id);
  });
});

// ═══════════ ユーティリティ ═══════════

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const thisYear = new Date().getFullYear();
  return y === thisYear ? `${m}月${d}日` : `${y}年${m}月${d}日`;
}

// カード表示用の省スペース版（例：7/20）
function formatDateShort(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const thisYear = new Date().getFullYear();
  return y === thisYear ? `${m}/${d}` : `${y}/${m}/${d}`;
}

main();
