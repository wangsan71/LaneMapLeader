# LaneMapLeader

[简体中文](README.md) · **繁體中文** · [English](README.en.md)

---

LaneMapLeader 是面向道路的瀏覽器導航應用，整合路線規劃、GPS 導航、裝置方向感應、道路匹配、車道指引，以及 LaneGo 道路資料編輯工具。

## 功能

- 使用 Nominatim 搜尋地點，或直接在地圖上設定起點和終點。
- 使用 OSRM 規劃多條實際道路路線，不以起終點直線作為導航路線。
- 支援平衡推薦、複雜路況下最快、較少轉彎和較短距離等路線偏好。
- 根據路口密度和轉彎複雜度提供較保守的預計行車時間。
- 使用 GPS 和裝置方向感應跟隨目前位置及行駛方向。
- 顯示繁體中文逐向導航、剩餘距離、剩餘時間和到達狀態。
- 匹配本地道路，顯示目前道路的順向或反向車道指引。
- 提供僅供桌面使用的道路及車道編輯器。
- 提供 OSM PBF 轉換、道路資料庫構建及人工修正 CLI 工具。

## 技術棧

- React 18、TypeScript、Vite
- MapLibre GL、react-map-gl、OpenFreeMap
- Tailwind CSS
- OSRM、Nominatim、OpenStreetMap
- Vitest、ESLint

## 本地開發

建議使用 Node.js 20。

```bash
npm install
npm run dev
```

開啟 Vite 輸出的本地位址。應用會讀取：

```text
public/data/macau/roads.json
```

開發環境下的桌面道路編輯器位址：

```text
http://localhost:5173/editor.html
```

GPS 和裝置方向功能需要 `localhost` 或 HTTPS，並需要瀏覽器授權。

## 專案檢查

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

## 道路資料工具

查詢道路資料（以澳門為例）：

```bash
npm run roads:edit -- info
npm run roads:edit -- search 大學
```

套用人工車道修正：

```bash
npm run roads:apply
```

從現有 OSM JSON 重新構建道路資料庫：

```bash
npm run roads:build
```

該命令需要 `public/data/<city>/osm_fr.json`。

從 OSM PBF 執行完整資料管線（以澳門為例）：

```bash
npm run roads:pipeline -- path/to/macau.osm.pbf macau --keep-json
```

不傳入 `--keep-json` 時，管線會在構建完成後刪除中間 JSON 檔案。

## 部署

專案包含 GitHub Pages 工作流程，推送到 `main` 分支後會自動執行安裝、構建、檢查和部署。

預設 Vite 基礎路徑是：

```text
/LaneMapLeader/
```

對應倉庫：<https://github.com/wangsan71/LaneMapLeader>

部署完成後的預期位址：

```text
https://wangsan71.github.io/LaneMapLeader/
```

若部署到其他倉庫名或路徑，需要同步修改 `vite.config.ts` 中的 `base`。

## 外部服務說明

應用依賴 OpenFreeMap、Nominatim 和公共 OSRM 服務，需要網際網路連線，並可能受服務限流或可用性影響。目前「複雜路況估時」基於路線距離、路口和轉彎複雜度計算，不代表即時交通資料。

地圖、搜尋、路線服務及 OpenStreetMap 道路資料分別受其服務條款和資料授權條款約束。

## License

應用原始碼使用 [MIT License](LICENSE)。
