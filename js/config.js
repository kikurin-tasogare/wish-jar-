// ═══════════════════════════════════════════
// Wish Jar 設定ファイル
//
// 【ローカルモード（初期状態）】
//   このままでOK。データは各端末に保存されます。
//
// 【ふたりでリアルタイム共有するには】
//   1. https://console.firebase.google.com で無料プロジェクトを作成
//   2. 「ウェブアプリを追加」して firebaseConfig をここに貼り付け
//   3. Firestore Database を有効化（本番モード + 下記ルール）
//   4. Authentication で「匿名ログイン」を有効化
//   5. あいことば（jarCode）はアプリの初回起動画面で入力する
//      （ふたりで同じあいことばを入れると同じ「びん」につながる）
//
//   Firestore セキュリティルール（コンソールに貼り付け）:
//     rules_version = '2';
//     service cloud.firestore {
//       match /databases/{database}/documents {
//         match /jars/{jar}/items/{item} {
//           allow read, write: if request.auth != null;
//         }
//       }
//     }
// ═══════════════════════════════════════════

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCkBdRPZcgfCJ60FnGevOHckNtk_cDZdRE',
  authDomain: 'wish-jar-fbf98.firebaseapp.com',
  projectId: 'wish-jar-fbf98',
  storageBucket: 'wish-jar-fbf98.firebasestorage.app',
  messagingSenderId: '484976961978',
  appId: '1:484976961978:web:c311320f5b40cc64f31583',
};

export const SYNC_ENABLED = FIREBASE_CONFIG.apiKey !== '';
