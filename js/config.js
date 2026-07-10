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
//   5. jarCode をふたりで同じ合言葉にする
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
  apiKey: '',            // ← ここに貼り付け（空ならローカルモード）
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// ふたりで同じ合言葉にすると、同じ「びん」を共有できます
export const JAR_CODE = 'yuki-and-me';

export const SYNC_ENABLED = FIREBASE_CONFIG.apiKey !== '';
