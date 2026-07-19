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
//           allow read, delete: if request.auth != null;
//           allow create, update: if request.auth != null
//             && request.resource.data.keys().hasOnly([
//                  'id', 'owner', 'title', 'createdAt', 'status', 'doneAt',
//                  'place', 'date', 'time', 'photos', 'animal', 'color',
//                  'order', 'updatedAt', 'bucket', 'starred'
//                ])
//             && request.resource.data.id is string
//             && request.resource.data.id == item
//             && request.resource.data.owner is string
//             && request.resource.data.owner.size() <= 20
//             && request.resource.data.title is string
//             && request.resource.data.title.size() <= 200
//             && request.resource.data.status in ['wish', 'done']
//             && request.resource.data.place is string
//             && request.resource.data.place.size() <= 100
//             && request.resource.data.date is string
//             && request.resource.data.time is string
//             && request.resource.data.animal is string
//             && request.resource.data.color is string
//             && request.resource.data.order is number
//             && request.resource.data.updatedAt is number
//             && (!('bucket' in request.resource.data)
//                  || request.resource.data.bucket in ['soon', 'someday'])
//             && (!('starred' in request.resource.data)
//                  || request.resource.data.starred is bool)
//             && request.resource.data.photos is list
//             && request.resource.data.photos.size() <= 6;
//         }
//       }
//     }
//
//   あいことばは Firestore の実質的なアクセスキーです。認証済みユーザーなら
//   誰でもその文字列を知っていればアクセスできるため、推測されにくい
//   長め（8文字以上）のものにしてください（アプリ側でも強制しています）。
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
