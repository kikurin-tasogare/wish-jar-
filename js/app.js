// ═══════════════════════════════════════════
// Wish Jar — アプリ本体
// ═══════════════════════════════════════════

import {
  initStore, startSync, onChange, getItems, getWishes, getMemories, getItem,
  addItem, updateItem, completeItem, deleteItem, reorderWishes, addPhoto,
  getProfile, saveProfile,
} from './store.js';
import { animalByName, ANIMALS, PASTELS, JAR_SVG, coverJarSVG } from './animals.js';
import { SYNC_ENABLED } from './config.js';

const $ = (id) => document.getElementById(id);

let profile = null;
let detailItemId = null;   // 詳細モーダルで開いているアイテム
let sheetItemId = null;    // アクションシートの対象
let photoItemId = null;    // 写真追加の対象
let calYear, calMonth;     // カレンダー表示中の年月
let calSelected = null;    // 選択中の日付（YYYY-MM-DD）
let homeFilter = 'all';    // ホームの絞り込み（'all' | 'mine' | 'theirs'）
let sectionExpanded = { soon: true, someday: false };  // セクション展開状態（「いつか」は件数が多くなりがちなので初期状態は畳んでおく）
let addedThisSession = 0;  // 追加モーダルを開いてから閉じるまでに追加した件数（閉じた時にホームでトースト表示）
let lastSeenTs = 0;        // 前回アプリを開いた時刻（相手タブの「新着」バッジ判定に使う）

// ═══════════ 起動 ═══════════

async function main() {
  profile = getProfile();
  initStore();

  // 前回開いた時刻を読み出してから、次回のためにすぐ今の時刻で上書きする
  // （今回のセッション中はずっと「前回開いた時刻」基準でバッジを出す）
  lastSeenTs = Number(localStorage.getItem('wishjar-last-seen') || 0);
  localStorage.setItem('wishjar-last-seen', String(Date.now()));

  onChange((_, remoteIds) => {
    renderHome(remoteIds);
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
    $('rename-old').value = '';
    $('rename-new').value = '';
    $('rename-status').classList.add('hidden');
    openModal('settings-modal');
  });
  $('dup-check-btn').addEventListener('click', () => {
    renderDupList();
    openModal('dup-modal');
  });
  $('rename-btn').addEventListener('click', () => {
    const oldName = $('rename-old').value.trim();
    const newName = $('rename-new').value.trim();
    const status = $('rename-status');
    status.classList.remove('hidden');
    if (!oldName || !newName) {
      status.textContent = '直したい名前と正しい名前、両方入力してね';
      return;
    }
    const targets = getItems().filter(i => i.owner === oldName);
    if (targets.length === 0) {
      status.textContent = `「${oldName}」という名前の項目は見つからなかったよ`;
      return;
    }
    targets.forEach(item => updateItem(item.id, { owner: newName }));
    status.textContent = `${targets.length}件を「${oldName}」→「${newName}」に直したよ ✓`;
    $('rename-old').value = '';
    $('rename-new').value = '';
  });
}

// ═══════════ 重複チェック ═══════════

// 表記ゆれの単純な差（前後の空白・大小文字）だけ吸収して、
// 同じタイトルのやりたいことをまとめる
function normalizeTitle(title) {
  return title.trim().replace(/\s+/g, '').toLowerCase();
}

function renderDupList() {
  const wrap = $('dup-list');
  wrap.textContent = '';

  const groups = {};
  getWishes().forEach(item => {
    const key = normalizeTitle(item.title);
    if (!key) return;
    (groups[key] ||= []).push(item);
  });
  const dupGroups = Object.values(groups).filter(g => g.length > 1);

  if (dupGroups.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dup-empty';
    empty.textContent = '重複はなさそうだよ 🎉';
    wrap.appendChild(empty);
    return;
  }

  dupGroups.forEach(items => {
    const group = document.createElement('div');
    group.className = 'dup-group';

    const title = document.createElement('div');
    title.className = 'dup-group-title';
    title.textContent = `「${items[0].title}」 × ${items.length}`;
    group.appendChild(title);

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'dup-group-item';

      const owner = document.createElement('span');
      owner.className = 'dup-item-owner';
      owner.textContent = item.owner === profile.name ? '💚' : '🩵';
      row.appendChild(owner);

      const meta = document.createElement('span');
      meta.className = 'dup-item-meta';
      const bits = [item.owner];
      if (item.place) bits.push(`📍${item.place}`);
      if (item.date) bits.push(`🗓${formatDateShort(item.date)}`);
      meta.textContent = bits.join(' ・ ');
      row.appendChild(meta);

      const del = document.createElement('button');
      del.className = 'dup-item-delete';
      del.type = 'button';
      del.textContent = 'けす';
      del.addEventListener('click', () => {
        deleteItem(item.id);
        renderDupList();
      });
      row.appendChild(del);

      group.appendChild(row);
    });

    wrap.appendChild(group);
  });
}

function renderHome(remoteIds = []) {
  const stored = localStorage.getItem('wishjar-section-state');
  if (stored) sectionExpanded = JSON.parse(stored);

  const listEl = $('wish-list');
  const wishes = getWishes();
  listEl.textContent = '';

  $('empty-home').classList.toggle('hidden', wishes.length > 0);
  $('owner-filter').classList.toggle('hidden', wishes.length === 0);
  if (wishes.length === 0 && !$('empty-art').innerHTML) {
    $('empty-art').innerHTML = JAR_SVG;
  }
  if (wishes.length === 0) return;

  renderOwnerFilter();

  // ふたりのやりたいことを1つのリストに混ぜて表示。
  // 名前をタップしたときだけその人のものに絞り込む
  const filtered = wishes.filter(w => {
    if (homeFilter === 'mine') return w.owner === profile.name;
    if (homeFilter === 'theirs') return w.owner !== profile.name;
    return true;
  });

  if (filtered.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'wish-col-empty';
    empty.textContent = 'まだないよ';
    listEl.appendChild(empty);
    return;
  }

  // 「近いうちに」と「いつかやりたい」の2段。並びは order のみで決める
  // （クラゲタップは order を最小にして一番上へ動かす）。
  // 「近いうちに」が空のあいだは、今まで通りの1本リストで見た目を変えない
  const soon = filtered.filter(w => w.bucket === 'soon');
  const someday = filtered.filter(w => w.bucket !== 'soon');

  // 隣り合うカードが同じ色に並ばないよう、表示のときだけ色をずらす
  // （保存データは変えないので、並び替えのたびに自然にバラける）
  let prevColor = null;
  const displayColor = (item) => {
    let c = item.color;
    if (c === prevColor) {
      const idx = PASTELS.indexOf(c);
      c = PASTELS[(idx + 1) % PASTELS.length];
      if (c === prevColor) c = PASTELS[(idx + 2) % PASTELS.length];
    }
    prevColor = c;
    return c;
  };

  const appendSection = (key, label, sectionItems) => {
    if (sectionItems.length === 0) return;
    const sec = document.createElement('div');
    sec.className = 'wish-section';
    sec.dataset.sectionKey = key;

    // ラベルなし（1本リスト）のときは常に展開扱い
    const isExpanded = label ? (sectionExpanded[key] ?? true) : true;

    if (label) {
      const btn = document.createElement('button');
      btn.className = 'wish-section-header';
      btn.setAttribute('aria-expanded', isExpanded);
      btn.innerHTML = `<span class="wish-section-icon">${isExpanded ? '▼' : '▶'}</span><span>${label} <span class="wish-section-count">${sectionItems.length}</span></span>`;
      btn.addEventListener('click', () => {
        sectionExpanded[key] = !sectionExpanded[key];
        localStorage.setItem('wishjar-section-state', JSON.stringify(sectionExpanded));
        renderHome(remoteIds);
      });
      sec.appendChild(btn);

      // 縮小中はヘッダーだけ残してアイテムは格納する
      if (!isExpanded) {
        sec.classList.add('collapsed');
        listEl.appendChild(sec);
        return;
      }
    }

    sectionItems.forEach((item, i) => {
      const card = buildWishCard(item, { compact: true, color: displayColor(item) });
      if (remoteIds.includes(item.id)) card.classList.add('remote-new');
      // 段の一番上のクラゲだけ青くする
      if (i === 0) card.querySelector('.wish-star')?.classList.add('on');
      sec.appendChild(card);
    });
    listEl.appendChild(sec);
  };

  if (soon.length === 0) {
    appendSection('someday', null, someday);
  } else {
    appendSection('soon', '🐬 近いうちに', soon);
    appendSection('someday', '🐳 いつかやりたい', someday);
  }
}

// 上部の名前ボタン。タップでその人のやりたいことだけに絞り込み、
// もう一度タップすると全部表示に戻る
function renderOwnerFilter() {
  const wrap = $('owner-filter');
  wrap.textContent = '';
  // 前回開いてから相手が「新しく追加した」件数（「新着」バッジ用）。
  // updatedAtだと名前の一括修正など単なる編集でも新着扱いになってしまうため、
  // 作成日時（createdAt）だけを見る
  const newFromPartner = getItems().filter(i =>
    i.owner !== profile.name && new Date(i.createdAt).getTime() > lastSeenTs).length;

  [
    { side: 'mine', name: profile.name, cls: 'wish-col-name--mine' },
    { side: 'theirs', name: partnerName(), cls: 'wish-col-name--theirs' },
  ].forEach(({ side, name, cls }) => {
    const btn = document.createElement('button');
    btn.className = `wish-col-name ${cls}`;
    btn.textContent = `${side === 'mine' ? '💚' : '🩵'} ${name}`;
    if (homeFilter !== 'all' && homeFilter !== side) btn.classList.add('inactive');
    btn.addEventListener('click', () => {
      homeFilter = homeFilter === side ? 'all' : side;
      renderHome();
    });
    if (side === 'theirs' && newFromPartner > 0) {
      // btnはtext-overflow用にoverflow:hiddenなので、バッジは
      // ラッパー側に載せてボタンの外枠からはみ出せるようにする
      const holder = document.createElement('div');
      holder.className = 'wish-col-name-wrap';
      const badge = document.createElement('span');
      badge.className = 'tab-badge';
      badge.textContent = newFromPartner > 9 ? '9+' : String(newFromPartner);
      holder.append(btn, badge);
      wrap.appendChild(holder);
      return;
    }
    wrap.appendChild(btn);
  });
}

// 相手の名前（アイテムの記録から一番新しいものを拾う）
function partnerName() {
  const others = getItems().filter(i => i.owner !== profile.name);
  if (others.length === 0) return 'あいて';
  // 1件だけの昔のタイプミスなどに引きずられないよう、
  // 「最後に触った1件」ではなく「一番件数が多い名前」を採用する
  // （同数なら、より最近さわった方を優先）
  const counts = {};
  const lastSeen = {};
  others.forEach(i => {
    counts[i.owner] = (counts[i.owner] || 0) + 1;
    lastSeen[i.owner] = Math.max(lastSeen[i.owner] || 0, i.updatedAt ?? 0);
  });
  return Object.keys(counts).sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return lastSeen[b] - lastSeen[a];
  })[0];
}

function buildWishCard(item, { compact = false, color = null } = {}) {
  const animal = animalByName(item.animal);

  const card = document.createElement('div');
  card.className = compact ? 'wish-card wish-card--row' : 'wish-card';
  card.dataset.id = item.id;
  card.style.background = color || item.color;
  card.setAttribute('role', 'listitem');

  // コンパクト行では動物アイコンは付けない（タイトルと名前タグだけ）
  let av = null;
  if (!compact) {
    av = document.createElement('div');
    av.className = 'wish-animal';
    av.innerHTML = animal.svg; // 固定SVG（ユーザー入力を含まない）
    card.appendChild(av);
  }

  if (compact) {
    // クラゲタップでそのやりたいことを一番上へ。カードのタップ・長押しとは独立。
    // 青くなるのは各段の一番上のクラゲだけ（renderHome側で .on を付ける）
    const star = document.createElement('button');
    star.className = 'wish-star';
    star.textContent = '🪼';
    star.setAttribute('aria-label', '一番上に固定');
    star.addEventListener('pointerdown', (e) => e.stopPropagation());
    star.addEventListener('pointerup', (e) => e.stopPropagation());
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      pinToTop(item.id);
    });
    card.appendChild(star);
  }

  const title = document.createElement('div');
  title.className = 'wish-title';
  title.textContent = item.title;
  card.appendChild(title);

  if (compact) {
    // だれのやりたいことか、行の右端にハートで表示（💚=自分 / 🩵=相手）
    const owner = document.createElement('span');
    const side = item.owner === profile.name ? 'mine' : 'theirs';
    owner.className = `wish-owner wish-owner--${side}`;
    owner.textContent = side === 'mine' ? '💚' : '🩵';
    owner.setAttribute('aria-label', item.owner);
    card.appendChild(owner);
  }

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

// クラゲタップ：そのやりたいことをリストの一番上へ（order を全体の最小より小さくする）
function pinToTop(id) {
  const orders = getWishes().map(w => w.order ?? 0);
  const minOrder = orders.length ? Math.min(...orders) : 0;
  updateItem(id, { order: minOrder - 1, starred: true });
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

  const finish = (e) => {
    // タップでモーダルを開いた直後、同じ座標にブラウザが送る合成クリックが
    // 新しく現れたモーダルのボタンに透けて当たってしまうのを防ぐ
    e?.preventDefault();
    clearTimeout(pressTimer);
    if (dragging) {
      card.style.transform = '';
      card.classList.remove('dragging');
      // 段（セクション）をまたいでリスト全体の並び順を保存する
      const ids = [...card.closest('.wish-list').querySelectorAll('.wish-card')].map(c => c.dataset.id);
      reorderWishes(ids);
    } else if (armed) {
      // 長押しして離した → アクションシート
      card.classList.remove('dragging');
      openActionSheet(item.id);
    } else if (!moved) {
      if (avatarEl) {
        // タップ → キャラ反応 → 詳細へ
        avatarEl.classList.remove(animal.anim);
        void avatarEl.offsetWidth; // アニメ再生のためリフロー
        avatarEl.classList.add(animal.anim);
        setTimeout(() => openDetail(item.id), 480);
      } else {
        // アイコンなしのコンパクト行はすぐ詳細へ
        openDetail(item.id);
      }
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
  const bulkInput = $('add-bulk-input');
  const bulkToggle = $('add-bulk-toggle');
  const mascot = $('add-mascot');
  let bulkMode = false;

  const refreshMascot = () => {
    const a = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    mascot.innerHTML = a.svg;
    mascot.dataset.anim = a.anim;
  };

  const setBulkMode = (on) => {
    bulkMode = on;
    input.classList.toggle('hidden', bulkMode);
    bulkInput.classList.toggle('hidden', !bulkMode);
    bulkToggle.textContent = bulkMode ? '1件ずつ追加する' : '📋 まとめて追加する';
  };

  $('add-btn').addEventListener('click', () => {
    setBulkMode(false);
    refreshMascot();
    addedThisSession = 0;
    setTimeout(() => input.focus(), 350);
  });

  bulkToggle.addEventListener('click', () => {
    setBulkMode(!bulkMode);
    (bulkMode ? bulkInput : input).focus();
  });

  const submit = () => {
    let count;
    if (bulkMode) {
      const lines = bulkInput.value.split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length === 0) return;
      lines.forEach(title => addItem(title.slice(0, 60), profile.name));
      count = lines.length;
      bulkInput.value = '';
    } else {
      const title = input.value.trim();
      if (!title) return;
      addItem(title, profile.name);
      count = 1;
      input.value = '';
    }
    addedThisSession += count;

    // フワッと完了演出
    const toast = $('add-toast');
    toast.textContent = count > 1 ? `${count}件まとめて追加したよ 🎉` : '追加したよ 🎉';
    toast.classList.remove('hidden');
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = '';
    mascot.classList.remove(mascot.dataset.anim);
    void mascot.offsetWidth;
    mascot.classList.add(mascot.dataset.anim);
    setTimeout(() => toast.classList.add('hidden'), 1400);
    (bulkMode ? bulkInput : input).focus();
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
    const titleInput = $('detail-title');
    const title = titleInput.value.trim();
    if (!title) {
      // 名前を空にはできない。もとのタイトルへ戻す
      titleInput.value = getItem(detailItemId)?.title || '';
      return;
    }
    updateItem(detailItemId, {
      title,
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

  ['detail-title', 'detail-place', 'detail-date', 'detail-time'].forEach(id => {
    $(id).addEventListener('change', save);
  });
  ['detail-title', 'detail-place'].forEach(id => $(id).addEventListener('blur', save));
  $('detail-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.target.blur();
  });

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
  detailItemId = id;
  $('detail-title').value = item.title;
  $('detail-place').value = item.place || '';
  $('detail-date').value = item.date || '';
  $('detail-time').value = item.time || '';
  const animal = animalByName(item.animal);
  $('detail-mascot').innerHTML = animal.svg;
  $('detail-delete').resetDelete?.();
  // 叶えた思い出（status: done）は既に叶えているので「叶えて思い出にする」は出さない
  $('detail-done').classList.toggle('hidden', item.status !== 'wish');
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

  $('sheet-star').addEventListener('click', () => {
    if (!sheetItemId) return;
    const item = getItem(sheetItemId);
    closeModal('action-sheet');
    if (item) pinToTop(item.id);
  });

  $('sheet-bucket').addEventListener('click', () => {
    if (!sheetItemId) return;
    const item = getItem(sheetItemId);
    closeModal('action-sheet');
    if (item) updateItem(item.id, { bucket: item.bucket === 'soon' ? 'someday' : 'soon' });
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
  sheetItemId = id;
  $('sheet-title').textContent = item.title;
  $('sheet-star').textContent = '🪼 一番上に固定する';
  $('sheet-bucket').textContent = item.bucket === 'soon'
    ? '🐳 「いつかやりたい」にもどす'
    : '🐬 「近いうちに」へうつす';
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
    card.addEventListener('click', (e) => {
      // 動物・写真・写真追加ボタンのタップは編集画面を開かない
      if (e.target.closest('.memory-animal, .memory-photo, .photo-add-btn')) return;
      openDetail(item.id);
    });

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
  if (id === 'add-modal' && addedThisSession > 0) {
    showHomeToast(addedThisSession > 1
      ? `${addedThisSession}件のやりたいことを追加したよ 🎉`
      : 'やりたいことを追加したよ 🎉');
    addedThisSession = 0;
  }
}

function showHomeToast(text) {
  const toast = $('home-toast');
  toast.textContent = text;
  toast.classList.remove('hidden');
  toast.style.animation = 'none';
  void toast.offsetWidth;
  toast.style.animation = '';
  setTimeout(() => toast.classList.add('hidden'), 2200);
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
