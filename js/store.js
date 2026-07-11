// ═══════════════════════════════════════════
// データストア
//   ローカル保存（localStorage）を基本とし、
//   Firebase 設定があればリアルタイム同期を重ねる
// ═══════════════════════════════════════════

import { SYNC_ENABLED } from './config.js';
import { randomAnimal, randomColor } from './animals.js';

const ITEMS_KEY = 'wishjar-items-v1';
const PROFILE_KEY = 'wishjar-profile-v1';

let items = [];
let listeners = [];
let sync = null; // Firebase アダプタ（有効時のみ）

// ─── 読み込み・保存 ───

function loadLocal() {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch {
    items = [];
  }
}

function saveLocal() {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch (e) {
    // 容量オーバー（写真の入れすぎ）など
    console.error('保存に失敗しました', e);
    alert('保存できませんでした。写真が多すぎるかもしれません🙏');
  }
}

function notify(remoteIds = []) {
  listeners.forEach(fn => fn(getItems(), remoteIds));
}

// ─── 公開API ───

export function onChange(fn) {
  listeners.push(fn);
}

export function getItems() {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getWishes() {
  return getItems().filter(i => i.status === 'wish');
}

export function getMemories() {
  return getItems().filter(i => i.status === 'done');
}

export function getItem(id) {
  return items.find(i => i.id === id);
}

export function addItem(title, owner) {
  const maxOrder = items.reduce((m, i) => Math.max(m, i.order ?? 0), 0);
  const item = {
    id: crypto.randomUUID(),
    owner,
    title,
    createdAt: new Date().toISOString(),
    status: 'wish',      // 'wish'（候補） | 'done'（完了 → Wish Jar）
    doneAt: null,        // 完了した日（YYYY-MM-DD）
    place: '',
    date: '',
    time: '',
    photos: [],
    animal: randomAnimal(),
    color: randomColor(),
    order: maxOrder + 1,
    updatedAt: Date.now(),
  };
  items.push(item);
  saveLocal();
  notify();
  sync?.push(item);
  return item;
}

export function updateItem(id, patch) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  Object.assign(item, patch, { updatedAt: Date.now() });
  saveLocal();
  notify();
  sync?.push(item);
}

export function completeItem(id) {
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  updateItem(id, { status: 'done', doneAt: ymd });
}

export function deleteItem(id) {
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return;
  const [removed] = items.splice(idx, 1);
  saveLocal();
  notify();
  sync?.remove(removed.id);
}

export function reorderWishes(orderedIds) {
  // 並べ替え対象は候補のみ。order を振り直す
  orderedIds.forEach((id, i) => {
    const item = items.find(x => x.id === id);
    if (item) {
      item.order = i + 1;
      item.updatedAt = Date.now();
    }
  });
  saveLocal();
  notify();
  orderedIds.forEach(id => {
    const item = items.find(x => x.id === id);
    if (item) sync?.push(item);
  });
}

export function addPhoto(id, dataUrl) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.photos.push(dataUrl);
  item.updatedAt = Date.now();
  saveLocal();
  notify();
  sync?.push(item);
}

// ─── プロフィール ───

export function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ─── 同期の初期化 ───

export function initStore() {
  loadLocal();

  // 別タブ・別ウィンドウとの同期（ローカルモードでも動く）
  window.addEventListener('storage', (e) => {
    if (e.key !== ITEMS_KEY) return;
    const before = new Set(items.map(i => i.id));
    loadLocal();
    const remoteIds = items.filter(i => !before.has(i.id)).map(i => i.id);
    notify(remoteIds);
  });
}

// あいことば（jarCode）が判明してから呼ぶ。ふたりの「びん」をつなぐ
export async function startSync(jarCode) {
  if (!SYNC_ENABLED || !jarCode) return { mode: 'local' };

  try {
    const mod = await import('./firebase-sync.js');
    sync = await mod.createSync(jarCode, (remoteItems) => {
      // リモートの変更をローカルへマージ（新しい updatedAt が勝つ）
      const before = new Set(items.map(i => i.id));
      const newIds = [];
      remoteItems.forEach(r => {
        const local = items.find(i => i.id === r.id);
        if (!local) {
          items.push(r);
          if (!before.has(r.id)) newIds.push(r.id);
        } else if ((r.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
          Object.assign(local, r);
        }
      });
      // リモートで削除されたものを反映
      const remoteIdSet = new Set(remoteItems.map(r => r.id));
      items = items.filter(i => remoteIdSet.has(i.id) || !i.syncedOnce);
      items.forEach(i => { if (remoteIdSet.has(i.id)) i.syncedOnce = true; });
      saveLocal();
      notify(newIds);
    });
    // 手元のデータを一度アップロード
    items.forEach(i => sync.push(i));
    return { mode: 'firebase' };
  } catch (e) {
    console.error('同期の初期化に失敗。ローカルモードで動きます', e);
    return { mode: 'local', error: e };
  }
}
