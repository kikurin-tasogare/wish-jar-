# 🫙 Wish Jar

ふたりの「行きたい・やりたい」を集めるびん。
やりたいことをサッとメモして、叶えたら思い出として写真つきで永遠に保存するアプリです。

## ✨ できること

- **やりたいことメモ**：「＋ 追加」からサッと入力。パステルカラーのカードに動物キャラ（全14種、カバ・クラゲも！）がランダムでつきます
- **タップでキャラが反応**：カードをタップすると動物がぴょん・ふわり。そのあと詳細画面へ
- **詳細メモ**：場所・日付・時間を後から追加（自動保存）
- **ドラッグ並べ替え**：カードを長押ししてから動かすと順序を変更できます
- **完了 → Wish Jar へ**：カードを長押しして「完了」。思い出フォルダに永遠に保存されます
- **思い出カレンダー**：Wish Jar 画面で月別カレンダー表示。日付をタップすると、その日の思い出と写真が見られます
- **写真追加**：思い出ごとに写真を何枚でも（自動で軽く圧縮されます）

## 🚀 使い方

ビルド不要の静的アプリです。そのままブラウザで動きます。

### ローカルで動かす

```bash
cd wishーjar
python3 -m http.server 8000
```

ブラウザで <http://localhost:8000> を開くだけ。

### スマホで使う（おすすめ）

GitHub Pages・Netlify・Vercel などにこのフォルダをそのまま置けば、
スマホの Safari / Chrome で開いて「ホーム画面に追加」するとアプリのように使えます。

## ☁️ ふたりでリアルタイム共有する（Firebase 設定）

初期状態は**ローカルモード**（各端末に保存）。
ふたりの端末をリアルタイム同期するには、無料の Firebase を設定します。

1. <https://console.firebase.google.com> で新規プロジェクトを作成（無料の Spark プランでOK）
2. 「ウェブアプリを追加」→ 表示される `firebaseConfig` の値を [js/config.js](js/config.js) に貼り付け
3. **Firestore Database** を作成し、ルールタブに以下を貼り付けて公開：

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /jars/{jar}/items/{item} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. **Authentication** → ログイン方法 → 「匿名」を有効化
5. [js/config.js](js/config.js) の `JAR_CODE` をふたりだけの合言葉に変更（両方の端末で同じ値に）

設定後にアプリを開き直すと、設定画面（👤）に「☁️ ふたりでリアルタイム共有中」と表示されます。

> 💡 通知は届きません。アプリを開いたときに「あ、新しく入ってる」と気づく設計です。
> 相手が追加したカードはキラッと光って現れます。

## 📁 構成

```
index.html          … 画面（ホーム / 追加 / 詳細 / Wish Jar / 設定）
css/style.css       … パステル & ポップなスタイル
js/app.js           … アプリ本体（画面・ジェスチャー・カレンダー）
js/store.js         … データ管理（ローカル保存 + 同期のマージ）
js/animals.js       … 動物キャラ14種の SVG とアニメーション
js/firebase-sync.js … Firebase リアルタイム同期（設定時のみ読み込み）
js/config.js        … Firebase 設定と合言葉
manifest.webmanifest… ホーム画面追加用（PWA）
```

## 🔒 セキュリティメモ

- ユーザー入力はすべて `textContent` で描画（XSS 対策）
- 写真はアップロード前に画像として読み込み・再エンコード（長辺900px / JPEG）するため、画像以外のファイルは弾かれます
- Firebase 利用時は匿名認証 + Firestore ルールでログインユーザーのみアクセス可
- `JAR_CODE` は推測されにくい合言葉にしてください
