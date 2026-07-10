// ═══════════════════════════════════════════
// Firebase リアルタイム同期アダプタ
//   config.js に Firebase 設定がある時だけ読み込まれる
//   （CDN から SDK を動的 import するため、未設定でも
// 　 アプリ本体はオフラインで完全動作する）
// ═══════════════════════════════════════════

import { FIREBASE_CONFIG, JAR_CODE } from './config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

export async function createSync(onRemoteChange) {
  const { initializeApp } = await import(`${SDK}/firebase-app.js`);
  const { getAuth, signInAnonymously } = await import(`${SDK}/firebase-auth.js`);
  const {
    getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot,
  } = await import(`${SDK}/firebase-firestore.js`);

  const app = initializeApp(FIREBASE_CONFIG);
  await signInAnonymously(getAuth(app));

  const db = getFirestore(app);
  const itemsCol = collection(db, 'jars', JAR_CODE, 'items');

  onSnapshot(itemsCol, (snap) => {
    const remoteItems = snap.docs.map(d => d.data());
    onRemoteChange(remoteItems);
  });

  return {
    push(item) {
      // 写真は base64 のまま Firestore に保存（1枚あたり圧縮済み ~150KB）
      // Firestore ドキュメント上限 1MB のため、写真は1アイテム最大6枚に制限
      const data = { ...item };
      delete data.syncedOnce;
      if (data.photos && data.photos.length > 6) {
        data.photos = data.photos.slice(0, 6);
      }
      setDoc(doc(itemsCol, item.id), data).catch(e =>
        console.error('同期エラー（あとで再送されます）', e));
    },
    remove(id) {
      deleteDoc(doc(itemsCol, id)).catch(e => console.error('削除の同期エラー', e));
    },
  };
}
