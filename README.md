# ANITIME 番年史

從故事發生的年代，重新認識動畫。

ANITIME 將動畫作品放回歷史時間線：沿著年代瀏覽，看看同一時期、不同地方的故事如何展開。作品依故事背景排列；年代不明確的作品使用概略時期標示。

[瀏覽番年史](https://rainnie-oh.github.io/anitime/)

## 探索方式

- **總覽與時間線**：先看各地的歷史時期，再展開感興趣的作品。
- **跨地區瀏覽**：日本、歐美與中國共用年代座標，方便對照。
- **系列聚焦**：同系列作品以海報堆疊呈現，展開後查看各部作品。
- **作品詳情**：閱讀故事簡介、年代資訊與作品來源。
- **分享**：複製頁面連結，或分享到 X。

## 本機開發

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

開啟終端顯示的網址，預設路徑為 `/anitime/`。

```sh
npm run build
npm run test:sites
```

靜態網站輸出位於 `dist/client/`。GitHub Pages 使用此目錄部署；前台可直接讀取隨專案提供的作品資料，無需第三方付費 API 或 API 金鑰。

## 專案結構

- `src/`：React 介面、時間線互動與作品資料。
- `public/`：封面與網站靜態素材。
- `scripts/`：建置與素材處理工具。
- `tests/`：行為與部署檢查。

技術：React、Vite、CSS。

## 內容維護

公開作品快照位於 `src/catalog.json`。更新封面後執行 `npm run images:prepare`，產生不同尺寸的圖片。

本機另提供 `/admin` 內容編輯器，首次使用時設定管理員密碼。管理資料保存在 `.cms/`，上傳圖片保存在 `public/uploads/`；兩者均不納入版本控制。GitHub Pages 僅提供靜態前台，不提供編輯器 API。

相關檢查：

```sh
npm run test:cms
npm run test:multitrack
```

## 素材與年代

封面、劇照與作品名稱的權利歸原權利人所有，來源記錄見 [ASSET_SOURCES.md](ASSET_SOURCES.md)。故事年代依作品設定與可查證資料整理；概略年代不代表精確史實。
