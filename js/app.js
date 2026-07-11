// ═══════════════════════════════════════════
// Wish Jar — アプリ本体
// ═══════════════════════════════════════════

import {
  initStore, onChange, getWishes, getMemories, getItem,
  addItem, updateItem, completeItem, deleteItem, reorderWishes, addPhoto,
  getProfile, saveProfile,
} from './store.js';
import { animalByName, ANIMALS, JAR_SVG } from './animals.js';
import { SYNC_ENABLED } from './config.js';

const $ = (id) => document.getElementById(id);

let profile = null;
let detailItemId = null;   // 詳細モーダルで開いているアイテム
let sheetItemId = null;    // アクションシートの対象
let photoItemId = null;    // 写真追加の対象
let calYear, calMonth;     // カレンダー表示中の年月
let calSelected = null;    // 選択中の日付（YYYY-MM-DD）

// ═══════════ 起動 ═══════════

async function main() {
  profile = getProfile();
  const { mode } = await initStore();

  onChange((_, remoteIds) => {
    renderHome(remoteIds);
    if (!$('jar').classList.contains('hidden')) renderCalendar();
  });

  $('sync-status').textContent = SYNC_ENABLED && mode === 'firebase'
    ? '☁️ ふたりでリアルタイム共有中'
    : '📱 この端末に保存中（共有設定は README を見てね）';

  setupOnboarding();
  setupHome();
  setupAddModal();
  setupDetailModal();
  setupActionSheet();
  setupJar();
  setupSettings();
  setupPhotos();

  if (profile) {
    showScreen('home');
    renderHome();
  } else {
    $('onboarding-jar').innerHTML = JAR_SVG;
    showScreen('onboarding');
  }
}

function showScreen(id) {
  ['onboarding', 'home', 'jar'].forEach(s => $(s).classList.toggle('hidden', s !== id));
}

// ═══════════ オンボーディング ═══════════

function setupOnboarding() {
  const input = $('onboarding-name');
  const start = $('onboarding-start');

  input.addEventListener('input', () => {
    start.disabled = input.value.trim() === '';
  });

  start.addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) return;
    profile = { name };
    saveProfile(profile);
    showScreen('home');
    renderHome();
  });
}

// ═══════════ メイン画面 ═══════════

function setupHome() {
  $('add-btn').addEventListener('click', () => openModal('add-modal'));
  $('jar-btn').addEventListener('click', openJar);
  $('settings-btn').addEventListener('click', () => {
    $('settings-name').value = profile.name;
    openModal('settings-modal');
  });
}

function renderHome(remoteIds = []) {
  const list = $('wish-list');
  const wishes = getWishes();
  list.textContent = '';

  $('empty-home').classList.toggle('hidden', wishes.length > 0);
  if (wishes.length === 0 && !$('empty-art').innerHTML) {
    $('empty-art').innerHTML = JAR_SVG;
  }

  wishes.forEach(item => {
    const card = buildWishCard(item);
    if (remoteIds.includes(item.id)) card.classList.add('remote-new');
    list.appendChild(card);
  });
}

function buildWishCard(item) {
  const animal = animalByName(item.animal);

  const card = document.createElement('div');
  card.className = 'wish-card';
  card.dataset.id = item.id;
  card.style.background = item.color;
  card.setAttribute('role', 'listitem');

  const owner = document.createElement('div');
  owner.className = 'wish-owner';
  owner.textContent = item.owner;
  card.appendChild(owner);

  const av = document.createElement('div');
  av.className = 'wish-animal';
  av.innerHTML = animal.svg; // 固定SVG（ユーザー入力を含まない）
  card.appendChild(av);

  const title = document.createElement('div');
  title.className = 'wish-title';
  title.textContent = item.title;
  card.appendChild(title);

  if (item.place || item.date) {
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
      const ids = [...$('wish-list').children].map(c => c.dataset.id);
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
// （2列グリッド表示に対応するため、上下左右どちらの隣接カードも判定する）
function swapIfNeeded(card, pointerX, pointerY) {
  const list = $('wish-list');
  const others = [...list.children].filter(c => c !== card);
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
}

function openDetail(id) {
  const item = getItem(id);
  if (!item) return;
  detailItemId = id;
  $('detail-title').textContent = item.title;
  $('detail-place').value = item.place || '';
  $('detail-date').value = item.date || '';
  $('detail-time').value = item.time || '';
  const animal = animalByName(item.animal);
  $('detail-mascot').innerHTML = animal.svg;
  openModal('detail-modal');
}

// ═══════════ 長押しアクションシート ═══════════

function setupActionSheet() {
  $('sheet-done').addEventListener('click', () => {
    if (!sheetItemId) return;
    const id = sheetItemId;
    closeModal('action-sheet');
    const card = document.querySelector(`.wish-card[data-id="${CSS.escape(id)}"]`);
    if (card) {
      card.classList.add('completing');
      setTimeout(() => completeItem(id), 550);
    } else {
      completeItem(id);
    }
  });

  $('sheet-delete').addEventListener('click', () => {
    if (!sheetItemId) return;
    const item = getItem(sheetItemId);
    if (item && confirm(`「${item.title}」を削除する？`)) {
      deleteItem(sheetItemId);
    }
    closeModal('action-sheet');
  });
}

function openActionSheet(id) {
  const item = getItem(id);
  if (!item) return;
  sheetItemId = id;
  $('sheet-title').textContent = item.title;
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
    profile.name = name;
    saveProfile(profile);
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
